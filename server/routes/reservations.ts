import { Router } from "express";
import { storage } from "../storage";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { createReservationSchema } from "@shared/schema";
import { EmailService } from "../services/emailService";

const router = Router();

router.get("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const hunterId = req.user?.role === 'HUNTER' ? req.user.id : undefined;
    const reservations = await storage.getReservations(hunterId);
    res.json(reservations);
  } catch (error) {
    console.error("Error fetching reservations:", error);
    res.status(500).json({ message: "Errore nel recupero delle prenotazioni" });
  }
});

router.post("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    console.log("Creating reservation with data:", req.body);
    console.log("User:", req.user);
    
    if (req.user?.role !== 'HUNTER') {
      return res.status(403).json({ message: "Solo i cacciatori possono prenotare" });
    }

    const reservationData = createReservationSchema.parse({
      ...req.body,
      hunterId: req.user.id,
    });

    console.log("Parsed reservation data:", reservationData);

    // Check if zone exists and is active
    const zone = await storage.getZone(reservationData.zoneId);
    if (!zone || !zone.isActive) {
      return res.status(400).json({ message: "Zona non valida o non attiva" });
    }

    // Validate and parse the hunt date
    const huntDateStr = reservationData.huntDate;
    if (!huntDateStr || typeof huntDateStr !== 'string') {
      return res.status(400).json({ message: "Data non valida" });
    }

    const huntDate = new Date(huntDateStr + 'T12:00:00Z'); // Add time to avoid timezone issues
    if (isNaN(huntDate.getTime())) {
      return res.status(400).json({ message: "Formato data non valido" });
    }

    // Check for hunting day restrictions
    const dayOfWeek = huntDate.getDay();
    if (dayOfWeek === 2 || dayOfWeek === 5) { // Tuesday or Friday
      return res.status(400).json({ 
        message: "Caccia non permessa nei giorni di silenzio venatorio (martedì e venerdì)" 
      });
    }

    // Check if hunter already has a reservation for this date and time slot
    const existingReservations = await storage.getReservations(req.user.id);
    const dateStr = huntDateStr; // Use original string format
    const hasConflict = existingReservations.some(r => {
      const reservationDate = new Date(r.huntDate).toISOString().split('T')[0];
      return reservationDate === dateStr && 
             r.timeSlot === reservationData.timeSlot && 
             r.status === 'active';
    });

    if (hasConflict) {
      return res.status(400).json({ 
        message: "Hai già una prenotazione per questa fascia oraria" 
      });
    }

    console.log("Creating reservation with final data:", {
      hunterId: req.user.id,
      zoneId: reservationData.zoneId,
      huntDate,
      timeSlot: reservationData.timeSlot,
      status: 'active',
    });

    const reservation = await storage.createReservation({
      hunterId: req.user.id,
      zoneId: reservationData.zoneId,
      huntDate,
      timeSlot: reservationData.timeSlot,
      status: 'active',
    });

    console.log("Reservation created successfully:", reservation);

    // Invia email di conferma
    try {
      const timeSlotText = reservation.timeSlot === 'morning' 
        ? 'morning' 
        : reservation.timeSlot === 'afternoon' 
        ? 'afternoon' 
        : 'full_day';

      await EmailService.sendReservationConfirmation({
        hunterEmail: req.user.email,
        hunterName: `${req.user.firstName} ${req.user.lastName}`,
        zoneName: zone.name,
        huntDate: reservation.huntDate.toISOString(),
        timeSlot: timeSlotText,
        reservationId: reservation.id
      });
    } catch (emailError) {
      console.error("Errore invio email conferma:", emailError);
      // Non fallire la prenotazione se l'email non viene inviata
    }

    res.status(201).json(reservation);
  } catch (error) {
    console.error("Error creating reservation:", error);
    res.status(500).json({ 
      message: "Errore nella creazione della prenotazione",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

router.delete("/:id", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const reservationId = parseInt(req.params.id);
    
    if (isNaN(reservationId)) {
      return res.status(400).json({ message: "ID prenotazione non valido" });
    }

    console.log(`Admin/Hunter ${req.user?.email} attempting to cancel reservation ${reservationId}`);

    // Per admin: ottieni tutte le prenotazioni, per hunter: solo le proprie
    const reservations = await storage.getReservations(req.user?.role === 'ADMIN' ? undefined : req.user?.id);
    const reservation = reservations.find(r => r.id === reservationId);
    
    console.log(`Found ${reservations.length} reservations, looking for ID ${reservationId}`);
    console.log('Available reservation IDs:', reservations.map(r => r.id));
    
    if (!reservation) {
      return res.status(404).json({ message: "Prenotazione non trovata" });
    }

    console.log(`Found reservation:`, { id: reservation.id, status: reservation.status, hunterId: reservation.hunterId });

    // Verifica autorizzazioni
    if (req.user?.role === 'HUNTER' && reservation.hunterId !== req.user.id) {
      return res.status(403).json({ message: "Non puoi cancellare questa prenotazione" });
    }

    // Verifica che sia attiva
    if (reservation.status !== 'active') {
      return res.status(400).json({ message: "Impossibile cancellare una prenotazione non attiva" });
    }

    await storage.cancelReservation(reservationId);
    console.log(`Successfully cancelled reservation ${reservationId}`);

    // Invia email di notifica cancellazione
    try {
      const cancelledBy = req.user?.role === 'ADMIN' && reservation.hunterId !== req.user.id ? 'admin' : 'hunter';
      
      await EmailService.sendReservationCancellation({
        hunterEmail: reservation.hunter.email,
        hunterName: `${reservation.hunter.firstName} ${reservation.hunter.lastName}`,
        zoneName: reservation.zone.name,
        huntDate: reservation.huntDate.toISOString(),
        timeSlot: reservation.timeSlot,
        reservationId: reservation.id
      }, cancelledBy);
    } catch (emailError) {
      console.error("Errore invio email cancellazione:", emailError);
      // Non fallire la cancellazione se l'email non viene inviata
    }

    res.json({ message: "Prenotazione cancellata" });
  } catch (error) {
    console.error("Error cancelling reservation:", error);
    res.status(500).json({ message: "Errore nella cancellazione della prenotazione" });
  }
});

export default router;

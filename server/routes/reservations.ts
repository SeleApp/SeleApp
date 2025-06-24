import { Router } from "express";
import { storage } from "../storage";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { createReservationSchema } from "@shared/schema";

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
    const { id } = req.params;
    const reservations = await storage.getReservations(req.user?.id);
    const reservation = reservations.find(r => r.id === parseInt(id));
    
    if (!reservation) {
      return res.status(404).json({ message: "Prenotazione non trovata" });
    }

    if (req.user?.role === 'HUNTER' && reservation.hunterId !== req.user.id) {
      return res.status(403).json({ message: "Non puoi cancellare questa prenotazione" });
    }

    await storage.cancelReservation(parseInt(id));
    res.json({ message: "Prenotazione cancellata" });
  } catch (error) {
    console.error("Error cancelling reservation:", error);
    res.status(500).json({ message: "Errore nella cancellazione della prenotazione" });
  }
});

export default router;

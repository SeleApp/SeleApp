// © 2025 Alessandro Favero - Tutti i diritti riservati
// Licenza: Uso riservato esclusivamente alle riserve attivate tramite contratto
// Vietata la riproduzione, distribuzione o modifica non autorizzata

import { Router } from "express";
import { storage } from "../storage";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { createReservationSchema } from "@shared/schema";
import { EmailService } from "../services/emailService";

const router = Router();

router.get("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const hunterId = req.user?.role === 'HUNTER' ? req.user.id : undefined;
    const reservations = await storage.getReservations(req.user.reserveId, hunterId);
    res.json(reservations);
  } catch (error) {
    console.error("Error fetching reservations:", error);
    res.status(500).json({ message: "Errore nel recupero delle prenotazioni" });
  }
});

router.post("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    console.log("🔥 Ricevuto body request:", JSON.stringify(req.body, null, 2));
    console.log("🔑 User info:", { id: req.user.id, reserveId: req.user.reserveId });
    
    if (req.user?.role !== 'HUNTER') {
      return res.status(403).json({ message: "Solo i cacciatori possono prenotare" });
    }

    const reservationData = createReservationSchema.parse({
      ...req.body,
      hunterId: req.user.id,
      reserveId: req.user.reserveId,
    });

    console.log("✅ Dati validati con successo:", reservationData);

    // Check if zone exists and is active for this reserve
    const zone = await storage.getZone(reservationData.zoneId, req.user.reserveId);
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
    const existingReservations = await storage.getReservations(req.user.reserveId, req.user.id);
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

    // Check zone cooldown rules
    const zoneCooldownCheck = await storage.checkZoneCooldown(
      req.user.reserveId, 
      req.user.id, 
      reservationData.zoneId
    );

    if (!zoneCooldownCheck.allowed) {
      return res.status(400).json({ 
        message: zoneCooldownCheck.reason || "Non puoi prenotare questa zona al momento",
        cooldownInfo: {
          waitUntil: zoneCooldownCheck.waitUntil,
          reason: zoneCooldownCheck.reason
        }
      });
    }

    // Prepare target species data if provided
    const targetSpeciesData: any = {};
    if (reservationData.targetSpecies) {
      targetSpeciesData.targetSpecies = reservationData.targetSpecies;
      if (reservationData.targetSpecies === 'roe_deer' && reservationData.targetRoeDeerCategory) {
        targetSpeciesData.targetRoeDeerCategory = reservationData.targetRoeDeerCategory;
      }
      if (reservationData.targetSpecies === 'red_deer' && reservationData.targetRedDeerCategory) {
        targetSpeciesData.targetRedDeerCategory = reservationData.targetRedDeerCategory;
      }
      if (reservationData.targetSex) {
        targetSpeciesData.targetSex = reservationData.targetSex;
      }
      if (reservationData.targetAgeClass) {
        targetSpeciesData.targetAgeClass = reservationData.targetAgeClass;
      }
      if (reservationData.targetNotes) {
        targetSpeciesData.targetNotes = reservationData.targetNotes;
      }
    }

    console.log("Creating reservation with final data:", {
      hunterId: req.user.id,
      zoneId: reservationData.zoneId,
      huntDate,
      timeSlot: reservationData.timeSlot,
      status: 'active',
      ...targetSpeciesData,
    });

    const reservation = await storage.createReservation({
      hunterId: req.user.id,
      zoneId: reservationData.zoneId,
      huntDate,
      timeSlot: reservationData.timeSlot,
      status: 'active',
      reserveId: req.user.reserveId,
      ...targetSpeciesData,
    });

    console.log("Reservation created successfully:", reservation);

    // Invia email di conferma al cacciatore
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

    // Invia notifica all'admin della riserva
    try {
      // Trova l'admin della riserva
      const admins = await storage.getAllAdmins();
      const reserveAdmin = admins.find(admin => 
        admin.reserveId === req.user.reserveId && admin.role === 'ADMIN'
      );

      if (reserveAdmin) {
        await EmailService.sendAdminNewReservationAlert({
          adminEmail: reserveAdmin.email,
          hunterName: `${req.user.firstName} ${req.user.lastName}`,
          zoneName: zone.name,
          huntDate: reservation.huntDate.toLocaleDateString('it-IT'),
          timeSlot: reservation.timeSlot
        });
      }
    } catch (emailError) {
      console.error("Errore invio notifica admin:", emailError);
      // Non fallire la prenotazione se l'email non viene inviata
    }

    res.status(201).json(reservation);
  } catch (error) {
    console.error("❌ ERRORE CRITICO durante creazione prenotazione:", error);
    console.error("❌ Stack trace:", error instanceof Error ? error.stack : "No stack trace");
    console.error("❌ Dati richiesta:", JSON.stringify(req.body, null, 2));
    console.error("❌ User info:", req.user);
    
    res.status(500).json({ 
      message: "Errore nella creazione della prenotazione",
      error: error instanceof Error ? error.message : "Unknown error",
      details: error instanceof Error ? error.stack : undefined
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
    const reservations = await storage.getReservations(req.user.reserveId, req.user?.role === 'ADMIN' ? undefined : req.user?.id);
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

    await storage.cancelReservation(reservationId, req.user.reserveId);
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

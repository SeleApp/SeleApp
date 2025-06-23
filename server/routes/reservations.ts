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
    if (req.user?.role !== 'HUNTER') {
      return res.status(403).json({ message: "Solo i cacciatori possono prenotare" });
    }

    const reservationData = createReservationSchema.parse({
      ...req.body,
      hunterId: req.user.id,
    });

    // Check if zone exists and is active
    const zone = await storage.getZone(reservationData.zoneId);
    if (!zone || !zone.isActive) {
      return res.status(400).json({ message: "Zona non valida o non attiva" });
    }

    // Check for hunting day restrictions
    const huntDate = new Date(reservationData.huntDate);
    const dayOfWeek = huntDate.getDay();
    if (dayOfWeek === 2 || dayOfWeek === 5) { // Tuesday or Friday
      return res.status(400).json({ 
        message: "Caccia non permessa nei giorni di silenzio venatorio (martedì e venerdì)" 
      });
    }

    // Check if hunter already has a reservation for this date and time slot
    const existingReservations = await storage.getReservations(req.user.id);
    const dateStr = huntDate.toISOString().split('T')[0];
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

    // Check if zone is already booked for this time slot
    const zoneReservations = await storage.getZoneReservations(
      reservationData.zoneId,
      dateStr,
      reservationData.timeSlot
    );

    if (zoneReservations.length > 0) {
      return res.status(400).json({ 
        message: "Zona già prenotata per questa fascia oraria" 
      });
    }

    // Check if there are available quotas in the zone
    const quotas = await storage.getZoneQuotas(reservationData.zoneId);
    const hasAvailableQuotas = quotas.some(q => q.harvested < q.totalQuota);
    
    if (!hasAvailableQuotas) {
      return res.status(400).json({ 
        message: "Quote esaurite per questa zona" 
      });
    }

    const reservation = await storage.createReservation({
      hunterId: req.user.id,
      zoneId: reservationData.zoneId,
      huntDate: new Date(reservationData.huntDate),
      timeSlot: reservationData.timeSlot,
      status: 'active',
    });

    res.status(201).json(reservation);
  } catch (error) {
    console.error("Error creating reservation:", error);
    if (error instanceof Error && error.message.includes('venatorio')) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Errore nella creazione della prenotazione" });
    }
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

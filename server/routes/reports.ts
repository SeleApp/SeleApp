import { Router } from "express";
import { storage } from "../storage";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { insertHuntReportSchema } from "@shared/schema";

const router = Router();

router.get("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const reports = await storage.getHuntReports();
    res.json(reports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ message: "Errore nel recupero dei report" });
  }
});

router.post("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'HUNTER') {
      return res.status(403).json({ message: "Solo i cacciatori possono inviare report" });
    }

    const reportData = insertHuntReportSchema.parse(req.body);

    // Verify that the reservation belongs to the hunter
    const reservations = await storage.getReservations(req.user.id);
    const reservation = reservations.find(r => r.id === reportData.reservationId);
    
    if (!reservation) {
      return res.status(404).json({ message: "Prenotazione non trovata" });
    }

    if (reservation.hunterId !== req.user.id) {
      return res.status(403).json({ message: "Non puoi inviare report per questa prenotazione" });
    }

    // Validate harvest details if outcome is harvest
    if (reportData.outcome === 'harvest') {
      if (!reportData.species || !reportData.sex || !reportData.ageClass) {
        return res.status(400).json({ 
          message: "Specie, sesso e classe sono richiesti per i prelievi" 
        });
      }

      // Check if quota is available for this harvest
      const quotas = await storage.getZoneQuotas(reservation.zoneId);
      const matchingQuota = quotas.find(q => 
        q.species === reportData.species &&
        q.sex === reportData.sex &&
        q.ageClass === reportData.ageClass
      );

      if (!matchingQuota || matchingQuota.harvested >= matchingQuota.totalQuota) {
        return res.status(400).json({ 
          message: "Quota non disponibile per questo tipo di capo" 
        });
      }
    }

    const report = await storage.createHuntReport(reportData);
    res.status(201).json(report);
  } catch (error) {
    console.error("Error creating report:", error);
    res.status(500).json({ message: "Errore nella creazione del report" });
  }
});

export default router;

// © 2025 Alessandro Favero - Tutti i diritti riservati
// Licenza: Uso riservato esclusivamente alle riserve attivate tramite contratto
// Vietata la riproduzione, distribuzione o modifica non autorizzata

import { Router } from "express";
import { storage } from "../storage";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { insertHuntReportSchema } from "@shared/schema";
import { EmailService } from "../services/emailService.js";

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

    // Invia email di conferma al cacciatore
    try {
      await EmailService.sendReportSubmissionConfirmation({
        hunterEmail: req.user.email,
        hunterName: `${req.user.firstName} ${req.user.lastName}`,
        zoneName: reservation.zone.name,
        huntDate: reservation.huntDate.toLocaleDateString('it-IT')
      });
    } catch (emailError) {
      console.error("Errore invio email conferma report:", emailError);
    }

    // Invia notifica all'admin della riserva
    try {
      const admins = await storage.getAllAdmins();
      const reserveAdmin = admins.find(admin => 
        admin.reserveId === req.user.reserveId && admin.role === 'ADMIN'
      );

      if (reserveAdmin) {
        await EmailService.sendAdminReportSubmittedAlert({
          adminEmail: reserveAdmin.email,
          hunterName: `${req.user.firstName} ${req.user.lastName}`,
          zoneName: reservation.zone.name,
          huntDate: reservation.huntDate.toLocaleDateString('it-IT'),
          outcome: reportData.outcome
        });
      }
    } catch (emailError) {
      console.error("Errore invio notifica admin report:", emailError);
    }

    res.status(201).json(report);
  } catch (error) {
    console.error("Error creating report:", error);
    res.status(500).json({ message: "Errore nella creazione del report" });
  }
});

export default router;

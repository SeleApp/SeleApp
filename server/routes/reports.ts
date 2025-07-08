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
    const reservations = await storage.getReservations(req.user.reserveId, req.user.id);
    const reservation = reservations.find(r => r.id === reportData.reservationId);
    
    if (!reservation) {
      return res.status(404).json({ message: "Prenotazione non trovata" });
    }

    if (reservation.hunterId !== req.user.id) {
      return res.status(403).json({ message: "Non puoi inviare report per questa prenotazione" });
    }

    // Validate harvest details if outcome is harvest
    if (reportData.outcome === 'harvest') {
      if (!reportData.species) {
        return res.status(400).json({ 
          message: "Specie è richiesta per i prelievi" 
        });
      }
      
      // Validate category based on species
      if (reportData.species === 'roe_deer' && !reportData.roeDeerCategory) {
        return res.status(400).json({ 
          message: "Categoria capriolo è richiesta per i prelievi di capriolo" 
        });
      }
      
      if (reportData.species === 'red_deer' && !reportData.redDeerCategory) {
        return res.status(400).json({ 
          message: "Categoria cervo è richiesta per i prelievi di cervo" 
        });
      }
      
      // Check if regional quota is available for this harvest
      const speciesCategory = reportData.species === 'roe_deer' 
        ? reportData.roeDeerCategory 
        : reportData.redDeerCategory;
      
      const isAvailable = await storage.isSpeciesCategoryAvailable(
        reportData.species, 
        speciesCategory, 
        req.user.reserveId
      );
      
      if (!isAvailable) {
        return res.status(400).json({ 
          message: `Quota esaurita per ${reportData.species === 'roe_deer' ? 'Capriolo' : 'Cervo'} ${speciesCategory}` 
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
        await EmailService.sendReportNotificationToAdmin({
          adminEmail: reserveAdmin.email,
          adminName: `${reserveAdmin.firstName} ${reserveAdmin.lastName}`,
          hunterName: `${req.user.firstName} ${req.user.lastName}`,
          zoneName: reservation.zone.name,
          huntDate: reservation.huntDate.toLocaleDateString('it-IT'),
          outcome: reportData.outcome === 'harvest' ? 'prelievo' : 'nessun prelievo'
        });
      }
    } catch (emailError) {
      console.error("Errore invio email notifica admin:", emailError);
    }

    res.status(201).json(report);
  } catch (error) {
    console.error("Error creating report:", error);
    res.status(500).json({ message: "Errore nella creazione del report" });
  }
});

export default router;

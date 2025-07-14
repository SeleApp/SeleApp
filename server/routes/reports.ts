// © 2025 Alessandro Favero - Tutti i diritti riservati
// Licenza: Uso riservato esclusivamente alle riserve attivate tramite contratto
// Vietata la riproduzione, distribuzione o modifica non autorizzata

import { Router } from "express";
import { storage } from "../storage";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { insertHuntReportSchema } from "@shared/schema";
import { z } from "zod";
import { EmailService } from "../services/emailService";

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

// PUT /api/reports/:id - Admin può modificare report esistenti
router.put("/:id", authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: "Solo gli amministratori possono modificare report" });
    }

    const reportId = parseInt(req.params.id);
    if (isNaN(reportId)) {
      return res.status(400).json({ message: "ID report non valido" });
    }

    // Verifica che il report esista nella riserva dell'admin
    const reports = await storage.getHuntReports(req.user.reserveId);
    const existingReport = reports.find(r => r.id === reportId);
    
    if (!existingReport) {
      return res.status(404).json({ message: "Report non trovato nella tua riserva" });
    }

    // Aggiungi reserveId ai dati di aggiornamento
    const updateData = {
      ...req.body,
      reserveId: req.user.reserveId,
      killCardPhoto: req.body.killCardPhoto || ""
    };
    
    const reportData = insertHuntReportSchema.partial().parse(updateData);

    // Aggiorna il report
    const updatedReport = await storage.updateHuntReport(reportId, req.user.reserveId, reportData);
    
    if (!updatedReport) {
      return res.status(404).json({ message: "Errore nell'aggiornamento del report" });
    }

    // Invia email di notifica modifica
    try {
      await EmailService.sendAccountChangeNotification(
        existingReport.reservation.hunter.email,
        existingReport.reservation.hunter.firstName,
        "Report di caccia modificato dall'amministratore"
      );
    } catch (emailError) {
      console.warn("Email notification failed:", emailError);
    }

    res.json({
      message: "Report aggiornato con successo",
      report: updatedReport
    });

  } catch (error) {
    console.error("Error updating hunt report:", error);
    res.status(500).json({ 
      message: "Errore nell'aggiornamento del report",
      error: error instanceof Error ? error.message : "Errore sconosciuto"
    });
  }
});

router.post("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'HUNTER') {
      return res.status(403).json({ message: "Solo i cacciatori possono inviare report" });
    }

    // Aggiungi reserveId dai dati utente
    const reportDataWithReserve = {
      ...req.body,
      reserveId: req.user.reserveId,
      killCardPhoto: req.body.killCardPhoto || "" // Rendi opzionale per ora
    };
    
    const reportData = insertHuntReportSchema.parse(reportDataWithReserve);

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

        // Se è un prelievo con foto, invia anche la scheda di abbattimento
        if (reportData.outcome === 'harvest' && reportData.killCardPhoto) {
          const speciesCategory = reportData.species === 'roe_deer' 
            ? reportData.roeDeerCategory 
            : reportData.redDeerCategory;

          const timeSlotText = reservation.timeSlot === 'morning' ? 'Alba-12:00' :
                              reservation.timeSlot === 'afternoon' ? '12:00-Tramonto' : 'Alba-Tramonto';

          await EmailService.sendKillCardToAdmin({
            adminEmail: reserveAdmin.email,
            adminName: `${reserveAdmin.firstName} ${reserveAdmin.lastName}`,
            hunterName: `${req.user.firstName} ${req.user.lastName}`,
            zoneName: reservation.zone.name,
            huntDate: reservation.huntDate.toLocaleDateString('it-IT'),
            timeSlot: timeSlotText,
            species: reportData.species,
            category: speciesCategory,
            killCardPhoto: reportData.killCardPhoto,
            notes: reportData.notes
          });
        }
      }
    } catch (emailError) {
      console.error("Errore invio email notifica admin:", emailError);
    }

    res.status(201).json(report);
  } catch (error) {
    console.error("Error creating report:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Errori di validazione", 
        errors: error.errors.map(e => ({ 
          field: e.path.join('.'), 
          message: e.message 
        }))
      });
    }
    
    res.status(500).json({ message: "Errore nella creazione del report" });
  }
});

// DELETE /api/reports/:id - Solo ADMIN può eliminare report
router.delete("/:id", authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPERADMIN') {
      return res.status(403).json({ 
        message: "Solo gli amministratori possono eliminare report" 
      });
    }

    const reportId = parseInt(req.params.id);
    if (isNaN(reportId)) {
      return res.status(400).json({ 
        message: "ID report non valido" 
      });
    }

    console.log(`🗑️ Admin ${req.user.email} sta eliminando report ${reportId}`);

    // Ottieni il report prima di eliminarlo per verifica e logging
    const reports = await storage.getHuntReports(req.user.reserveId);
    const reportToDelete = reports.find(r => r.id === reportId);
    
    if (!reportToDelete) {
      return res.status(404).json({ 
        message: "Report non trovato" 
      });
    }

    // Elimina il report dal database
    const deleteResult = await storage.deleteHuntReport(reportId, req.user.reserveId);
    
    if (!deleteResult) {
      return res.status(500).json({ 
        message: "Errore nell'eliminazione del report" 
      });
    }

    console.log(`✅ Report ${reportId} eliminato con successo. Outcome era: ${reportToDelete.outcome}`);

    res.json({ 
      success: true,
      message: "Report eliminato con successo",
      info: reportToDelete.outcome === 'harvest' 
        ? "Le quote regionali sono state ripristinate automaticamente"
        : "Nessuna quota da ripristinare (report senza prelievo)"
    });

  } catch (error) {
    console.error("❌ Errore nell'eliminazione del report:", error);
    res.status(500).json({ 
      message: "Errore nell'eliminazione del report",
      error: error instanceof Error ? error.message : "Errore sconosciuto"
    });
  }
});

export default router;

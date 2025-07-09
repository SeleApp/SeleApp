// © 2025 Alessandro Favero - Tutti i diritti riservati
// Licenza: Uso riservato esclusivamente alle riserve attivate tramite contratto
// Vietata la riproduzione, distribuzione o modifica non autorizzata

import { Router } from "express";
import { storage } from "../storage";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = Router();

/**
 * DELETE /api/reports/:id
 * Elimina un report di caccia e ripristina automaticamente le quote regionali
 * Solo ADMIN può eliminare report nella propria riserva
 */
router.delete("/:id", authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'ADMIN') {
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

    // Verifica che il report esista nella riserva dell'admin
    const reports = await storage.getHuntReports(req.user.reserveId);
    const reportExists = reports.find(r => r.id === reportId);
    
    if (!reportExists) {
      return res.status(404).json({ 
        message: "Report non trovato nella tua riserva" 
      });
    }

    // Elimina il report e ripristina le quote
    await storage.deleteHuntReport(reportId, req.user.reserveId);

    res.json({ 
      message: "Report eliminato con successo",
      info: reportExists.outcome === 'harvest' 
        ? "Le quote regionali sono state ripristinate automaticamente"
        : "Nessuna quota da ripristinare (report senza prelievo)"
    });

  } catch (error) {
    console.error("Error deleting hunt report:", error);
    res.status(500).json({ 
      message: "Errore nell'eliminazione del report",
      error: error instanceof Error ? error.message : "Errore sconosciuto"
    });
  }
});

export default router;
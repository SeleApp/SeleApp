// © 2025 Alessandro Favero - Tutti i diritti riservati
// Licenza: Uso riservato esclusivamente alle riserve attivate tramite contratto
// Vietata la riproduzione, distribuzione o modifica non autorizzata

import { Router } from "express";
import { storage } from "../storage";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();

// Admin statistics
router.get("/stats", authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const stats = await storage.getAdminStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ message: "Errore nel recupero delle statistiche" });
  }
});

// All quotas management
router.get("/quotas", authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const quotasByZone = await storage.getAllQuotas();
    res.json(quotasByZone);
  } catch (error) {
    console.error("Error fetching quotas:", error);
    res.status(500).json({ message: "Errore nel recupero delle quote" });
  }
});

// Update quota
router.patch("/quotas/:id", authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { harvested, totalQuota } = req.body;
    
    if (harvested !== undefined && (typeof harvested !== 'number' || harvested < 0)) {
      return res.status(400).json({ message: "Numero di capi prelevati non valido" });
    }
    
    if (totalQuota !== undefined && (typeof totalQuota !== 'number' || totalQuota < 0)) {
      return res.status(400).json({ message: "Quota totale non valida" });
    }
    
    const quota = await storage.updateQuota(parseInt(id), harvested, totalQuota);
    
    if (!quota) {
      return res.status(404).json({ message: "Quota non trovata" });
    }
    
    res.json(quota);
  } catch (error) {
    console.error("Error updating quota:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento della quota" });
  }
});

export default router;

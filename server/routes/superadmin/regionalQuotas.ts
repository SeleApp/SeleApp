import { Router } from "express";
import { authenticateToken, requireRole, type AuthRequest } from "../../middleware/auth";
import { storage } from "../../storage";
import { insertRegionalQuotaSchema } from "@shared/schema";

const router = Router();

// GET quote regionali per una riserva specifica (SUPERADMIN only)
router.get("/:reserveId", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const { reserveId } = req.params;
    
    console.log(`SuperAdmin fetching regional quotas for reserve: ${reserveId}`);
    const quotas = await storage.getRegionalQuotas(reserveId);
    
    console.log(`Found ${quotas.length} regional quotas for reserve ${reserveId}`);
    res.json(quotas);
  } catch (error) {
    console.error("Error fetching regional quotas:", error);
    res.status(500).json({ message: "Errore nel recupero dei piani di prelievo regionali" });
  }
});

// POST nuova quota regionale (SUPERADMIN only)
router.post("/", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const validatedData = insertRegionalQuotaSchema.parse(req.body);
    
    console.log(`SuperAdmin creating regional quota:`, validatedData);
    const quota = await storage.createRegionalQuota(validatedData);
    
    console.log(`Created regional quota with ID: ${quota.id}`);
    res.json({
      message: "Quota regionale creata con successo",
      quota
    });
  } catch (error) {
    console.error("Error creating regional quota:", error);
    if (error instanceof Error && error.message.includes('duplicate key')) {
      res.status(400).json({ message: "Quota già esistente per questa categoria" });
    } else {
      res.status(500).json({ message: "Errore nella creazione della quota regionale" });
    }
  }
});

// PATCH aggiorna quota regionale (SUPERADMIN only)
router.patch("/:id", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const quotaId = parseInt(req.params.id);
    const updateData = req.body;
    
    console.log(`SuperAdmin updating regional quota ${quotaId} with data:`, updateData);
    
    // Validate data types
    if (updateData.totalQuota !== undefined) {
      updateData.totalQuota = parseInt(updateData.totalQuota);
    }
    if (updateData.harvested !== undefined) {
      updateData.harvested = parseInt(updateData.harvested);
    }

    const updatedQuota = await storage.updateRegionalQuota(quotaId, updateData);
    
    if (!updatedQuota) {
      return res.status(404).json({ message: "Quota regionale non trovata" });
    }

    console.log(`Updated regional quota:`, updatedQuota);
    res.json({
      message: "Quota regionale aggiornata con successo",
      quota: updatedQuota
    });
  } catch (error) {
    console.error("Error updating regional quota:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento della quota regionale" });
  }
});

// DELETE quota regionale (SUPERADMIN only)
router.delete("/:id", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const quotaId = parseInt(req.params.id);
    
    console.log(`SuperAdmin deleting regional quota ${quotaId}`);
    const success = await storage.deleteRegionalQuota(quotaId);
    
    if (!success) {
      return res.status(404).json({ message: "Quota regionale non trovata" });
    }

    console.log(`Deleted regional quota ${quotaId}`);
    res.json({ message: "Quota regionale eliminata con successo" });
  } catch (error) {
    console.error("Error deleting regional quota:", error);
    res.status(500).json({ message: "Errore nell'eliminazione della quota regionale" });
  }
});

// GET statistiche quote regionali per tutte le riserve (SUPERADMIN only)
router.get("/", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    console.log(`SuperAdmin fetching all regional quotas statistics`);
    
    // Per ora restituisce un array vuoto, ma può essere implementato
    // per fornire statistiche aggregate di tutte le riserve
    const stats = {
      totalReserves: 0,
      totalQuotas: 0,
      totalHarvested: 0,
      bySpecies: {}
    };
    
    res.json(stats);
  } catch (error) {
    console.error("Error fetching regional quotas statistics:", error);
    res.status(500).json({ message: "Errore nel recupero delle statistiche" });
  }
});

export default router;
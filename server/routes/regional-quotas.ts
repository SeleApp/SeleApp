import { Router } from "express";
import { storage } from "../storage";
import { authenticateToken, requireRole, type AuthRequest } from "../middleware/auth";
import { insertRegionalQuotaSchema } from "@shared/schema";

const router = Router();

// Get all regional quotas with availability status
router.get("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const reserveId = req.user?.reserveId;
    if (!reserveId) {
      return res.status(403).json({ message: "Utente non associato a una riserva" });
    }
    
    console.log(`Fetching regional quotas for reserve: ${reserveId}`);
    const quotas = await storage.getRegionalQuotas(reserveId);
    console.log(`Found ${quotas.length} quotas for reserve ${reserveId}`);
    res.json(quotas);
  } catch (error) {
    console.error("Error fetching regional quotas:", error);
    res.status(500).json({ message: "Errore nel recupero delle quote regionali" });
  }
});

// Update regional quota (admin only)
router.patch("/:id", authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const quotaId = parseInt(req.params.id);
    const updateData = req.body;
    const reserveId = req.user?.reserveId;
    
    if (!reserveId) {
      return res.status(403).json({ message: "Utente non associato a una riserva" });
    }

    const updatedQuota = await storage.updateRegionalQuota(quotaId, reserveId, updateData);
    
    if (!updatedQuota) {
      return res.status(404).json({ message: "Quota non trovata" });
    }

    res.json(updatedQuota);
  } catch (error) {
    console.error("Error updating regional quota:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento della quota regionale" });
  }
});

// Create or update regional quota (when region communicates new numbers)
router.post("/", authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const quotaData = insertRegionalQuotaSchema.parse(req.body);
    const quota = await storage.createOrUpdateRegionalQuota(quotaData);
    res.json(quota);
  } catch (error) {
    console.error("Error creating/updating regional quota:", error);
    res.status(500).json({ message: "Errore nella creazione/aggiornamento della quota regionale" });
  }
});

// Bulk update quotas (when region provides all new numbers)
router.post("/bulk", authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { quotas } = req.body;
    const results = [];

    for (const quotaData of quotas) {
      const validatedQuota = insertRegionalQuotaSchema.parse(quotaData);
      const quota = await storage.createOrUpdateRegionalQuota(validatedQuota);
      results.push(quota);
    }

    res.json({ 
      message: `Aggiornate ${results.length} quote regionali`,
      quotas: results 
    });
  } catch (error) {
    console.error("Error bulk updating regional quotas:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento massivo delle quote" });
  }
});

// Check if species/category is available for hunting
router.get("/availability/:species/:category", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { species, category } = req.params;
    const isAvailable = await storage.isSpeciesCategoryAvailable(
      species as 'roe_deer' | 'red_deer', 
      category
    );
    
    res.json({ available: isAvailable });
  } catch (error) {
    console.error("Error checking availability:", error);
    res.status(500).json({ message: "Errore nella verifica di disponibilità" });
  }
});

export default router;
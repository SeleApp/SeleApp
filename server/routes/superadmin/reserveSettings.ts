import { Router } from "express";
import { authenticateToken, requireRole, type AuthRequest } from "../../middleware/auth";
import { storage } from "../../storage";
import { insertReserveSettingsSchema } from "@shared/schema";

const router = Router();

// GET settings per una riserva specifica (SUPERADMIN only)
router.get("/:reserveId", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const { reserveId } = req.params;
    const settings = await storage.getReserveSettings(reserveId);
    
    if (!settings) {
      // Crea impostazioni di default se non esistono
      const defaultSettings = await storage.createReserveSettings({
        reserveId,
        logoUrl: null,
        silenceDays: "[]",
        emailTemplateCustomizations: "{}"
      });
      return res.json(defaultSettings);
    }
    
    res.json(settings);
  } catch (error) {
    console.error("Error fetching reserve settings:", error);
    res.status(500).json({ message: "Errore nel recupero delle impostazioni" });
  }
});

// POST/PUT aggiorna impostazioni riserva (SUPERADMIN only)
router.post("/:reserveId", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const { reserveId } = req.params;
    const validatedData = insertReserveSettingsSchema.parse({
      ...req.body,
      reserveId
    });

    const existingSettings = await storage.getReserveSettings(reserveId);
    
    let settings;
    if (existingSettings) {
      settings = await storage.updateReserveSettings(reserveId, validatedData);
    } else {
      settings = await storage.createReserveSettings(validatedData);
    }

    res.json({
      message: "Impostazioni aggiornate con successo",
      settings
    });
  } catch (error) {
    console.error("Error updating reserve settings:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento delle impostazioni" });
  }
});

export default router;
// © 2025 Alessandro Favero - Tutti i diritti riservati
// Licenza: Uso riservato esclusivamente alle riserve attivate tramite contratto
// Vietata la riproduzione, distribuzione o modifica non autorizzata

import { Router, Response } from "express";
import { storage } from "../storage";
import { insertReserveRuleSchema, type InsertReserveRule } from "@shared/schema";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();

// Get all rules for current reserve
router.get("/", authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user?.reserveId) {
      return res.status(400).json({ message: "Utente non associato a nessuna riserva" });
    }

    const rules = await storage.getReserveRules(user.reserveId);
    res.json(rules);
  } catch (error) {
    console.error("Error fetching reserve rules:", error);
    res.status(500).json({ message: "Errore nel recupero delle regole" });
  }
});

// Create new rule
router.post("/", authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user?.reserveId) {
      return res.status(400).json({ message: "Utente non associato a nessuna riserva" });
    }

    const data = insertReserveRuleSchema.parse(req.body);
    const ruleData: InsertReserveRule = {
      ...data,
      reserveId: user.reserveId
    };

    const rule = await storage.createReserveRule(ruleData);
    res.status(201).json(rule);
  } catch (error: any) {
    console.error("Error creating reserve rule:", error);
    res.status(400).json({ message: error.message || "Errore nella creazione della regola" });
  }
});

// Update rule
router.patch("/:id", authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const rule = await storage.updateReserveRule(parseInt(id), data);
    if (!rule) {
      return res.status(404).json({ message: "Regola non trovata" });
    }

    res.json(rule);
  } catch (error: any) {
    console.error("Error updating reserve rule:", error);
    res.status(400).json({ message: error.message || "Errore nell'aggiornamento della regola" });
  }
});

// Delete rule
router.delete("/:id", authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    await storage.deleteReserveRule(parseInt(id));
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting reserve rule:", error);
    res.status(400).json({ message: error.message || "Errore nell'eliminazione della regola" });
  }
});

// Check zone cooldown for user
router.get("/check-zone-cooldown/:zoneId", authenticateToken, requireRole('HUNTER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user?.reserveId) {
      return res.status(400).json({ message: "Utente non associato a nessuna riserva" });
    }

    const { zoneId } = req.params;
    const result = await storage.checkZoneCooldown(user.reserveId, user.id, parseInt(zoneId));
    res.json(result);
  } catch (error: any) {
    console.error("Error checking zone cooldown:", error);
    res.status(500).json({ message: error.message || "Errore nel controllo del cooldown zona" });
  }
});

// Check harvest limits for user
router.get("/check-harvest-limits/:species", authenticateToken, requireRole('HUNTER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user?.reserveId) {
      return res.status(400).json({ message: "Utente non associato a nessuna riserva" });
    }

    const { species } = req.params;
    const result = await storage.checkHarvestLimits(user.reserveId, user.id, species);
    res.json(result);
  } catch (error: any) {
    console.error("Error checking harvest limits:", error);
    res.status(500).json({ message: error.message || "Errore nel controllo dei limiti di prelievo" });
  }
});

export default router;
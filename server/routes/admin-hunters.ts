import { Router } from "express";
import { storage } from "../storage";
import { authenticateToken, requireRole, type AuthRequest } from "../middleware/auth";

const router = Router();

// Get all hunters
router.get("/", authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const hunters = await storage.getAllHunters();
    res.json(hunters);
  } catch (error) {
    console.error("Error fetching hunters:", error);
    res.status(500).json({ message: "Errore nel recupero dei cacciatori" });
  }
});

// Update hunter status
router.patch("/:id/status", authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    
    const hunter = await storage.updateHunterStatus(parseInt(id), isActive);
    if (!hunter) {
      return res.status(404).json({ message: "Cacciatore non trovato" });
    }
    
    res.json(hunter);
  } catch (error) {
    console.error("Error updating hunter status:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento dello stato" });
  }
});

// Update hunter data
router.patch("/:id", authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const hunter = await storage.updateHunter(parseInt(id), updateData);
    if (!hunter) {
      return res.status(404).json({ message: "Cacciatore non trovato" });
    }
    
    res.json(hunter);
  } catch (error) {
    console.error("Error updating hunter:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento del cacciatore" });
  }
});

// Create new hunter
router.post("/", authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const hunterData = req.body;
    const hunter = await storage.createHunter(hunterData);
    res.status(201).json(hunter);
  } catch (error) {
    console.error("Error creating hunter:", error);
    res.status(500).json({ message: "Errore nella creazione del cacciatore" });
  }
});

// Delete hunter
router.delete("/:id", authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await storage.deleteHunter(parseInt(id));
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting hunter:", error);
    res.status(500).json({ message: "Errore nell'eliminazione del cacciatore" });
  }
});

export default router;
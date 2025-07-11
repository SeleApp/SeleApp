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
    const adminUser = req.user;
    
    // Verifica che l'admin sia associato a una riserva
    if (!adminUser?.reserveId) {
      return res.status(400).json({ message: "Admin non associato a nessuna riserva" });
    }
    
    // Hash della password se fornita
    if (hunterData.password) {
      const bcrypt = await import('bcrypt');
      hunterData.password = await bcrypt.hash(hunterData.password, 12);
    }
    
    // Assegna la riserva dell'admin al cacciatore
    hunterData.reserveId = adminUser.reserveId;
    hunterData.role = 'HUNTER';
    
    const hunter = await storage.createHunter(hunterData);
    
    // Invia email di benvenuto al cacciatore
    try {
      const { EmailService } = await import("../services/emailService");
      const reserve = await storage.getReserve(adminUser.reserveId);
      if (reserve) {
        await EmailService.sendHunterWelcome({
          hunterEmail: hunter.email,
          hunterName: `${hunter.firstName} ${hunter.lastName}`,
          reserveName: reserve.name,
          loginUrl: `${process.env.REPLIT_DOMAIN || 'http://localhost:5000'}/app`
        });
      }
    } catch (emailError) {
      console.error("Errore invio email benvenuto cacciatore:", emailError);
      // Non bloccare la creazione per errori email
    }
    
    res.status(201).json({
      message: "Cacciatore creato con successo",
      hunter: {
        id: hunter.id,
        email: hunter.email,
        firstName: hunter.firstName,
        lastName: hunter.lastName,
        role: hunter.role,
        isActive: hunter.isActive,
        reserveId: hunter.reserveId
      }
    });
  } catch (error) {
    console.error("Error creating hunter:", error);
    res.status(500).json({ message: "Errore nella creazione del cacciatore" });
  }
});

// Delete hunter
router.delete("/:id", authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const adminUser = req.user;
    
    if (!adminUser?.reserveId) {
      return res.status(400).json({ message: "Admin non associato a nessuna riserva" });
    }
    
    await storage.deleteHunter(parseInt(id), adminUser.reserveId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting hunter:", error);
    res.status(500).json({ message: "Errore nell'eliminazione del cacciatore" });
  }
});

export default router;
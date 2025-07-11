import { Router } from "express";
import { storage } from "../storage";
import { authenticateToken, requireRole, type AuthRequest } from "../middleware/auth";

const router = Router();

// Get all hunters for admin's reserve only
router.get("/", authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const adminUser = req.user;
    
    // Verifica che l'admin sia associato a una riserva
    if (!adminUser?.reserveId) {
      return res.status(403).json({ message: "Admin non associato a nessuna riserva" });
    }
    
    // Recupera solo i cacciatori della riserva dell'admin
    const hunters = await storage.getHuntersByReserve(adminUser.reserveId);
    res.json(hunters);
  } catch (error) {
    console.error("Error fetching hunters:", error);
    res.status(500).json({ message: "Errore nel recupero dei cacciatori" });
  }
});

// Update hunter status (only for admin's reserve)
router.patch("/:id/status", authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const adminUser = req.user;
    
    // Verifica che l'admin sia associato a una riserva
    if (!adminUser?.reserveId) {
      return res.status(403).json({ message: "Admin non associato a nessuna riserva" });
    }
    
    // Verifica che il cacciatore appartenga alla riserva dell'admin
    const hunter = await storage.getHunterByIdAndReserve(parseInt(id), adminUser.reserveId);
    if (!hunter) {
      return res.status(404).json({ message: "Cacciatore non trovato nella tua riserva" });
    }
    
    const updatedHunter = await storage.updateHunterStatus(parseInt(id), isActive, adminUser.reserveId);
    res.json(updatedHunter);
  } catch (error) {
    console.error("Error updating hunter status:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento dello stato" });
  }
});

// Update hunter data (only for admin's reserve)
router.patch("/:id", authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const adminUser = req.user;
    
    // Verifica che l'admin sia associato a una riserva
    if (!adminUser?.reserveId) {
      return res.status(403).json({ message: "Admin non associato a nessuna riserva" });
    }
    
    // Verifica che il cacciatore appartenga alla riserva dell'admin
    const hunter = await storage.getHunterByIdAndReserve(parseInt(id), adminUser.reserveId);
    if (!hunter) {
      return res.status(404).json({ message: "Cacciatore non trovato nella tua riserva" });
    }
    
    const updatedHunter = await storage.updateHunter(parseInt(id), updateData, adminUser.reserveId);
    res.json(updatedHunter);
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

// Delete hunter (only for admin's reserve)
router.delete("/:id", authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const adminUser = req.user;
    
    if (!adminUser?.reserveId) {
      return res.status(400).json({ message: "Admin non associato a nessuna riserva" });
    }
    
    // Verifica che il cacciatore appartenga alla riserva dell'admin
    const hunter = await storage.getHunterByIdAndReserve(parseInt(id), adminUser.reserveId);
    if (!hunter) {
      return res.status(404).json({ message: "Cacciatore non trovato nella tua riserva" });
    }
    
    // Elimina il cacciatore dalla riserva
    await storage.deleteHunter(parseInt(id), adminUser.reserveId);
    
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting hunter:", error);
    res.status(500).json({ message: "Errore nell'eliminazione del cacciatore" });
  }
});

export default router;
import { Router } from "express";
import { storage } from "../storage";
import { authenticateToken, requireRole, type AuthRequest } from "../middleware/auth";
import { insertReserveSchema } from "@shared/schema";
import { z } from "zod";
import { nanoid } from "nanoid";

const router = Router();

// Get active reserves for public registration (NO AUTH REQUIRED)
router.get("/active", async (req, res) => {
  try {
    const activeReserves = await storage.getActiveReserves();
    res.json(activeReserves);
  } catch (error) {
    console.error("Error fetching active reserves:", error);
    res.status(500).json({ message: "Errore nel recupero delle riserve attive" });
  }
});

// Get all reserves (SUPERADMIN only)
router.get("/", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const reserves = await storage.getAllReserves();
    const reservesWithStats = await Promise.all(
      reserves.map(async (reserve) => {
        const stats = await storage.getReserveStats(reserve.id);
        return {
          ...reserve,
          stats
        };
      })
    );
    res.json(reservesWithStats);
  } catch (error) {
    console.error("Error fetching reserves:", error);
    res.status(500).json({ message: "Errore nel recupero delle riserve" });
  }
});

// Create new reserve (SUPERADMIN only)
router.post("/", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const validatedData = insertReserveSchema.parse({
      ...req.body,
      id: nanoid(12) // Generate unique ID
    });

    const reserve = await storage.createReserve(validatedData);
    
    // Force refresh stats after creation
    const stats = await storage.getReserveStats(reserve.id);
    
    res.status(201).json({
      ...reserve,
      stats
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: "Dati non validi", errors: error.errors });
    } else {
      console.error("Error creating reserve:", error);
      res.status(500).json({ message: "Errore nella creazione della riserva" });
    }
  }
});

// Get reserve details (SUPERADMIN only)
router.get("/:id", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const reserve = await storage.getReserve(req.params.id);
    if (!reserve) {
      return res.status(404).json({ message: "Riserva non trovata" });
    }

    const stats = await storage.getReserveStats(reserve.id);
    res.json({
      ...reserve,
      stats
    });
  } catch (error) {
    console.error("Error fetching reserve:", error);
    res.status(500).json({ message: "Errore nel recupero della riserva" });
  }
});

// PATCH /:id - Aggiorna riserva con supporto per tutti i campi (solo SUPERADMIN)
router.patch('/:id', authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Valida solo i campi presenti nel body
    const allowedFields = ['name', 'comune', 'emailContatto', 'presidentName', 'huntingType', 'species', 'accessCode', 'managementType', 'assignmentMode', 'isActive', 'codeActive'];
    const filteredData: any = {};
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    });

    const updatedReserve = await storage.updateReserve(id, filteredData);
    
    if (!updatedReserve) {
      return res.status(404).json({ message: "Riserva non trovata" });
    }

    res.json({
      message: "Riserva aggiornata con successo",
      reserve: updatedReserve
    });
  } catch (error) {
    console.error("Error updating reserve:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento della riserva" });
  }
});

// DELETE /:id - Elimina riserva (solo SUPERADMIN)
router.delete('/:id', authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Verifica se la riserva esiste
    const reserve = await storage.getReserve(id);
    if (!reserve) {
      return res.status(404).json({ message: "Riserva non trovata" });
    }

    // Elimina la riserva e tutti i dati associati
    await storage.deleteReserve(id);

    res.json({
      message: "Riserva eliminata con successo"
    });
  } catch (error) {
    console.error("Error deleting reserve:", error);
    res.status(500).json({ message: "Errore nell'eliminazione della riserva" });
  }
});

export default router;
import { Router } from "express";
import { authenticateToken, requireRole, type AuthRequest } from "../../middleware/auth";
import { storage } from "../../storage";
import { insertMaterialSchema } from "@shared/schema";

const router = Router();

// GET tutti i materiali formativi (SUPERADMIN only)
router.get("/", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const materials = await storage.getAllMaterials();
    res.json(materials);
  } catch (error) {
    console.error("Error fetching materials:", error);
    res.status(500).json({ message: "Errore nel recupero dei materiali formativi" });
  }
});

// GET materiale singolo (SUPERADMIN only)
router.get("/:id", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const materialId = parseInt(req.params.id);
    const material = await storage.getMaterial(materialId);
    
    if (!material) {
      return res.status(404).json({ message: "Materiale non trovato" });
    }
    
    res.json(material);
  } catch (error) {
    console.error("Error fetching material:", error);
    res.status(500).json({ message: "Errore nel recupero del materiale" });
  }
});

// POST crea nuovo materiale (SUPERADMIN only)
router.post("/", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const validatedData = insertMaterialSchema.parse(req.body);
    const material = await storage.createMaterial(validatedData);
    
    res.status(201).json({
      message: "Materiale formativo creato con successo",
      material
    });
  } catch (error) {
    console.error("Error creating material:", error);
    res.status(500).json({ message: "Errore nella creazione del materiale" });
  }
});

// PUT aggiorna materiale (SUPERADMIN only)
router.put("/:id", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const materialId = parseInt(req.params.id);
    const updateData = req.body;
    
    const material = await storage.updateMaterial(materialId, updateData);
    
    if (!material) {
      return res.status(404).json({ message: "Materiale non trovato" });
    }
    
    res.json({
      message: "Materiale aggiornato con successo",
      material
    });
  } catch (error) {
    console.error("Error updating material:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento del materiale" });
  }
});

// DELETE elimina materiale (SUPERADMIN only)
router.delete("/:id", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const materialId = parseInt(req.params.id);
    await storage.deleteMaterial(materialId);
    
    res.json({ message: "Materiale eliminato con successo" });
  } catch (error) {
    console.error("Error deleting material:", error);
    res.status(500).json({ message: "Errore nell'eliminazione del materiale" });
  }
});

// GET log accessi materiale (SUPERADMIN only)
router.get("/:id/access-logs", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const materialId = parseInt(req.params.id);
    const logs = await storage.getMaterialAccessLogs(materialId);
    
    res.json(logs);
  } catch (error) {
    console.error("Error fetching access logs:", error);
    res.status(500).json({ message: "Errore nel recupero dei log di accesso" });
  }
});

// POST traccia accesso materiale (per utenti che visualizzano materiali)
router.post("/:id/access", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const materialId = parseInt(req.params.id);
    const userId = req.user!.id;
    
    const accessLog = await storage.logMaterialAccess(materialId, userId);
    
    res.status(201).json({
      message: "Accesso registrato",
      accessLog
    });
  } catch (error) {
    console.error("Error logging material access:", error);
    res.status(500).json({ message: "Errore nella registrazione dell'accesso" });
  }
});

export default router;
import { Router } from "express";
import { authenticateToken, requireRole, type AuthRequest } from "../../middleware/auth";
import { storage } from "../../storage";
import { insertBillingSchema } from "@shared/schema";

const router = Router();

// GET tutti i record di fatturazione (SUPERADMIN only)
router.get("/", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const billing = await storage.getAllBilling();
    res.json(billing);
  } catch (error) {
    console.error("Error fetching billing records:", error);
    res.status(500).json({ message: "Errore nel recupero dei dati di fatturazione" });
  }
});

// GET fatturazione per riserva specifica (SUPERADMIN only)
router.get("/:reserveId", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const { reserveId } = req.params;
    const billing = await storage.getBillingByReserve(reserveId);
    
    if (!billing) {
      return res.status(404).json({ message: "Record di fatturazione non trovato" });
    }
    
    res.json(billing);
  } catch (error) {
    console.error("Error fetching billing record:", error);
    res.status(500).json({ message: "Errore nel recupero del record di fatturazione" });
  }
});

// POST crea nuovo record di fatturazione (SUPERADMIN only)
router.post("/", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const validatedData = insertBillingSchema.parse(req.body);
    const billing = await storage.createBilling(validatedData);
    
    res.status(201).json({
      message: "Record di fatturazione creato con successo",
      billing
    });
  } catch (error) {
    console.error("Error creating billing record:", error);
    res.status(500).json({ message: "Errore nella creazione del record di fatturazione" });
  }
});

// PUT aggiorna record di fatturazione (SUPERADMIN only)
router.put("/:id", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const billingId = parseInt(req.params.id);
    const updateData = req.body;
    
    const billing = await storage.updateBilling(billingId, updateData);
    
    if (!billing) {
      return res.status(404).json({ message: "Record di fatturazione non trovato" });
    }
    
    res.json({
      message: "Record di fatturazione aggiornato con successo",
      billing
    });
  } catch (error) {
    console.error("Error updating billing record:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento del record di fatturazione" });
  }
});

export default router;
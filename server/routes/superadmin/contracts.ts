import { Router } from "express";
import { authenticateToken, requireRole, type AuthRequest } from "../../middleware/auth";
import { storage } from "../../storage";
import { insertContractSchema } from "@shared/schema";

const router = Router();

// GET tutti i contratti (SUPERADMIN only)
router.get("/", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const contracts = await storage.getAllContracts();
    res.json(contracts);
  } catch (error) {
    console.error("Error fetching contracts:", error);
    res.status(500).json({ message: "Errore nel recupero dei contratti" });
  }
});

// GET contratto per riserva specifica (SUPERADMIN only)
router.get("/:reserveId", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const { reserveId } = req.params;
    const contract = await storage.getContractByReserve(reserveId);
    
    if (!contract) {
      return res.status(404).json({ message: "Contratto non trovato" });
    }
    
    res.json(contract);
  } catch (error) {
    console.error("Error fetching contract:", error);
    res.status(500).json({ message: "Errore nel recupero del contratto" });
  }
});

// POST crea nuovo contratto (SUPERADMIN only)
router.post("/", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const validatedData = insertContractSchema.parse(req.body);
    const contract = await storage.createContract(validatedData);
    
    res.status(201).json({
      message: "Contratto creato con successo",
      contract
    });
  } catch (error) {
    console.error("Error creating contract:", error);
    res.status(500).json({ message: "Errore nella creazione del contratto" });
  }
});

// PUT aggiorna contratto (SUPERADMIN only)
router.put("/:id", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const contractId = parseInt(req.params.id);
    const updateData = req.body;
    
    const contract = await storage.updateContract(contractId, updateData);
    
    if (!contract) {
      return res.status(404).json({ message: "Contratto non trovato" });
    }
    
    res.json({
      message: "Contratto aggiornato con successo",
      contract
    });
  } catch (error) {
    console.error("Error updating contract:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento del contratto" });
  }
});

// DELETE elimina contratto (SUPERADMIN only)
router.delete("/:id", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const contractId = parseInt(req.params.id);
    await storage.deleteContract(contractId);
    
    res.json({ message: "Contratto eliminato con successo" });
  } catch (error) {
    console.error("Error deleting contract:", error);
    res.status(500).json({ message: "Errore nell'eliminazione del contratto" });
  }
});

export default router;
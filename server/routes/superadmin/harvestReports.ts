import { Router } from "express";
import { authenticateToken, requireRole, type AuthRequest } from "../../middleware/auth";
import { storage } from "../../storage";

const router = Router();

// GET tutti i report di abbattimento per analisi biologiche (SUPERADMIN only)
router.get("/", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    console.log('SuperAdmin fetching all harvest reports for biological analysis');
    
    // Ottieni tutti i report di caccia con dati biologici
    const harvestReports = await storage.getAllHarvestReports();
    
    console.log(`Found ${harvestReports.length} harvest reports across all reserves`);
    res.json(harvestReports);
  } catch (error) {
    console.error("Error fetching harvest reports:", error);
    res.status(500).json({ message: "Errore nel recupero dei report di abbattimento" });
  }
});

// GET statistiche biologiche aggregate per specie
router.get("/biological-stats", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    console.log('SuperAdmin fetching biological statistics');
    
    const stats = await storage.getBiologicalStatistics();
    
    res.json(stats);
  } catch (error) {
    console.error("Error fetching biological statistics:", error);
    res.status(500).json({ message: "Errore nel recupero delle statistiche biologiche" });
  }
});

export default router;
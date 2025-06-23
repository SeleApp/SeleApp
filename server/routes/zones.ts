import { Router } from "express";
import { storage } from "../storage";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const zones = await storage.getAllZones();
    const zonesWithQuotas = await Promise.all(
      zones.map(async (zone) => {
        const quotas = await storage.getZoneQuotas(zone.id);
        
        // Calculate quota status
        let quotaStatus = "🟢";
        let quotaText = "Disponibile";
        
        const totalQuotas = quotas.reduce((sum, q) => sum + q.totalQuota, 0);
        const totalHarvested = quotas.reduce((sum, q) => sum + q.harvested, 0);
        
        if (totalQuotas > 0) {
          const percentage = totalHarvested / totalQuotas;
          if (percentage >= 1) {
            quotaStatus = "🔴";
            quotaText = "Esaurita";
          } else if (percentage >= 0.8) {
            quotaStatus = "🟡";
            quotaText = "Bassa";
          }
        }
        
        return {
          ...zone,
          quotas: quotas.reduce((acc, quota) => {
            const key = `${quota.species}_${quota.sex}_${quota.ageClass}`;
            acc[key] = {
              harvested: quota.harvested,
              total: quota.totalQuota,
              available: quota.totalQuota - quota.harvested,
            };
            return acc;
          }, {} as Record<string, any>),
          quotaStatus,
          quotaText,
        };
      })
    );
    
    res.json(zonesWithQuotas);
  } catch (error) {
    console.error("Error fetching zones:", error);
    res.status(500).json({ message: "Errore nel recupero delle zone" });
  }
});

router.get("/:id/availability", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: "Data richiesta" });
    }
    
    const morningReservations = await storage.getZoneReservations(
      parseInt(id),
      date as string,
      "morning"
    );
    
    const afternoonReservations = await storage.getZoneReservations(
      parseInt(id),
      date as string,
      "afternoon"
    );
    
    res.json({
      morning: morningReservations.length === 0,
      afternoon: afternoonReservations.length === 0,
    });
  } catch (error) {
    console.error("Error checking availability:", error);
    res.status(500).json({ message: "Errore nel controllo disponibilità" });
  }
});

export default router;

import { Router } from "express";
import { storage } from "../storage";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user?.reserveId) {
      return res.status(403).json({ message: "Utente non associato a una riserva" });
    }
    
    const zones = await storage.getAllZones(user.reserveId);
    const regionalQuotas = await storage.getRegionalQuotas(user.reserveId);
    
    const zonesWithQuotas = zones.map((zone) => {
      // Calculate overall quota status based on regional quotas
      let quotaStatus = "🟢";
      let quotaText = "Disponibile";
      
      const exhaustedQuotas = regionalQuotas.filter(q => q.isExhausted).length;
      const totalQuotas = regionalQuotas.length;
      
      if (exhaustedQuotas > 0) {
        if (exhaustedQuotas >= totalQuotas * 0.8) {
          quotaStatus = "🔴";
          quotaText = "Quote Limitate";
        } else if (exhaustedQuotas >= totalQuotas * 0.5) {
          quotaStatus = "🟡";
          quotaText = "Quote Basse";
        }
      }
      
      // Create quota structure for compatibility
      const quotas: Record<string, any> = {};
      regionalQuotas.forEach(quota => {
        const key = quota.species === 'roe_deer' 
          ? `roe_deer_${quota.roeDeerCategory}` 
          : `red_deer_${quota.redDeerCategory}`;
        quotas[key] = {
          harvested: quota.harvested,
          total: quota.totalQuota,
          available: quota.available,
        };
      });
      
      return {
        ...zone,
        quotas,
        quotaStatus,
        quotaText,
      };
    });
    
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
    const user = req.user;
    
    if (!user?.reserveId) {
      return res.status(403).json({ message: "Utente non associato a una riserva" });
    }
    
    if (!date) {
      return res.status(400).json({ message: "Data richiesta" });
    }
    
    const morningReservations = await storage.getZoneReservations(
      parseInt(id),
      date as string,
      "morning",
      user.reserveId
    );
    
    const afternoonReservations = await storage.getZoneReservations(
      parseInt(id),
      date as string,
      "afternoon", 
      user.reserveId
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

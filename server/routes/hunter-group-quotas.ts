// © 2025 Alessandro Favero - Tutti i diritti riservati
// Licenza: Uso riservato esclusivamente alle riserve attivate tramite contratto
// Vietata la riproduzione, distribuzione o modifica non autorizzata

import { Router } from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { db } from "../db";
import { groupQuotas, users } from "../../shared/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

// GET /api/hunter-group-quotas - Ottiene le quote solo per il gruppo del cacciatore corrente
router.get("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user || req.user.role !== 'HUNTER') {
      return res.status(403).json({ message: "Solo i cacciatori possono accedere alle proprie quote" });
    }

    // Trova il gruppo del cacciatore
    const hunter = await db.select()
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (!hunter[0] || !hunter[0].hunterGroup) {
      return res.status(400).json({ message: "Gruppo cacciatore non definito" });
    }

    // Ottieni solo le quote del gruppo del cacciatore con disponibilità > 0
    const hunterGroupQuotas = await db.select()
      .from(groupQuotas)
      .where(and(
        eq(groupQuotas.reserveId, req.user.reserveId!),
        eq(groupQuotas.hunterGroup, hunter[0].hunterGroup!)
      ));

    // Filtra solo le quote disponibili e aggiungi campo available
    const availableQuotas = hunterGroupQuotas
      .map(quota => ({
        ...quota,
        available: quota.totalQuota - quota.harvested
      }))
      .filter(quota => quota.available > 0);

    console.log(`Found ${availableQuotas.length} available quotas for hunter group ${hunter[0].hunterGroup}`);
    res.json(availableQuotas);
  } catch (error) {
    console.error("Error fetching hunter group quotas:", error);
    res.status(500).json({ message: "Errore nel recupero delle quote del gruppo" });
  }
});

export default router;
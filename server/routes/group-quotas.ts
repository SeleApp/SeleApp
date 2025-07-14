// © 2025 Alessandro Favero - Tutti i diritti riservati
// Licenza: Uso riservato esclusivamente alle riserve attivate tramite contratto
// Vietata la riproduzione, distribuzione o modifica non autorizzata

import { Router, Request, Response } from "express";
import { db } from "../db";
import { groupQuotas, reserves } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/group-quotas - Recupera le quote per gruppo di una riserva
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user?.reserveId) {
      return res.status(400).json({ error: "Riserva non identificata" });
    }

    console.log(`Fetching group quotas for reserve: ${user.reserveId}`);
    
    const quotas = await db
      .select()
      .from(groupQuotas)
      .where(eq(groupQuotas.reserveId, user.reserveId))
      .orderBy(groupQuotas.hunterGroup, groupQuotas.species);

    console.log(`Found ${quotas.length} group quotas for reserve ${user.reserveId}`);
    res.json(quotas);
  } catch (error: any) {
    console.error("Error fetching group quotas:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// GET /api/group-quotas/:group - Recupera le quote per un gruppo specifico
router.get("/:group", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { group } = req.params;
    
    if (!user?.reserveId) {
      return res.status(400).json({ error: "Riserva non identificata" });
    }

    if (!['A', 'B', 'C', 'D'].includes(group)) {
      return res.status(400).json({ error: "Gruppo non valido" });
    }

    console.log(`Fetching quotas for group ${group} in reserve: ${user.reserveId}`);
    
    const quotas = await db
      .select()
      .from(groupQuotas)
      .where(
        and(
          eq(groupQuotas.reserveId, user.reserveId),
          eq(groupQuotas.hunterGroup, group as 'A' | 'B' | 'C' | 'D')
        )
      )
      .orderBy(groupQuotas.species);

    console.log(`Found ${quotas.length} quotas for group ${group}`);
    res.json(quotas);
  } catch (error: any) {
    console.error("Error fetching group quotas:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// POST /api/group-quotas - Crea o aggiorna quote per gruppo (ADMIN only)
router.post("/", authenticateToken, requireRole(['ADMIN', 'SUPERADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user?.reserveId && user.role !== 'SUPERADMIN') {
      return res.status(400).json({ error: "Riserva non identificata" });
    }

    const { quotas } = req.body;
    
    if (!Array.isArray(quotas)) {
      return res.status(400).json({ error: "Formato quotas non valido" });
    }

    const reserveId = user.reserveId || req.body.reserveId;
    
    // Verifica che la riserva utilizzi il sistema "zones_groups"
    const reserve = await db
      .select()
      .from(reserves)
      .where(eq(reserves.id, reserveId))
      .limit(1);

    if (!reserve.length || reserve[0].managementType !== 'zones_groups') {
      return res.status(400).json({ 
        error: "Questa riserva non utilizza il sistema 'Zone & gruppi'" 
      });
    }

    const results = [];
    
    for (const quota of quotas) {
      const { hunterGroup, species, category, totalQuota } = quota;
      
      // Verifica se la quota esiste già
      const existingQuota = await db
        .select()
        .from(groupQuotas)
        .where(
          and(
            eq(groupQuotas.reserveId, reserveId),
            eq(groupQuotas.hunterGroup, hunterGroup),
            eq(groupQuotas.species, species),
            species === 'roe_deer' ? eq(groupQuotas.roeDeerCategory, category) :
            species === 'red_deer' ? eq(groupQuotas.redDeerCategory, category) :
            species === 'fallow_deer' ? eq(groupQuotas.fallowDeerCategory, category) :
            species === 'mouflon' ? eq(groupQuotas.mouflonCategory, category) :
            eq(groupQuotas.chamoisCategory, category)
          )
        )
        .limit(1);

      if (existingQuota.length > 0) {
        // Aggiorna quota esistente
        const [updated] = await db
          .update(groupQuotas)
          .set({ 
            totalQuota,
            updatedAt: new Date()
          })
          .where(eq(groupQuotas.id, existingQuota[0].id))
          .returning();
        results.push(updated);
      } else {
        // Crea nuova quota
        const categoryData: any = {
          reserveId,
          hunterGroup,
          species,
          totalQuota,
          harvested: 0
        };

        if (species === 'roe_deer') categoryData.roeDeerCategory = category;
        else if (species === 'red_deer') categoryData.redDeerCategory = category;
        else if (species === 'fallow_deer') categoryData.fallowDeerCategory = category;
        else if (species === 'mouflon') categoryData.mouflonCategory = category;
        else if (species === 'chamois') categoryData.chamoisCategory = category;

        const [created] = await db
          .insert(groupQuotas)
          .values(categoryData)
          .returning();
        results.push(created);
      }
    }

    console.log(`Updated ${results.length} group quotas for reserve ${reserveId}`);
    res.json({ message: "Quote per gruppo aggiornate con successo", quotas: results });
  } catch (error: any) {
    console.error("Error updating group quotas:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// PUT /api/group-quotas/:id - Aggiorna una quota specifica (ADMIN only)
router.put("/:id", authenticateToken, requireRole(['ADMIN', 'SUPERADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { totalQuota, harvested } = req.body;

    const [updated] = await db
      .update(groupQuotas)
      .set({ 
        totalQuota,
        harvested,
        updatedAt: new Date()
      })
      .where(eq(groupQuotas.id, parseInt(id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Quota non trovata" });
    }

    console.log(`Updated group quota ${id}`);
    res.json({ message: "Quota aggiornata con successo", quota: updated });
  } catch (error: any) {
    console.error("Error updating group quota:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

export default router;
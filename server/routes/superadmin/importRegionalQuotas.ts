import { Router } from "express";
import { authenticateToken, requireRole, type AuthRequest } from "../../middleware/auth";
import { storage } from "../../storage";

const router = Router();

// POST importa quote regionali ufficiali da PDF (SUPERADMIN only)
router.post("/", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const { reserveId } = req.body;
    
    if (!reserveId) {
      return res.status(400).json({ message: "ID riserva richiesto" });
    }

    console.log(`SuperAdmin importing official regional quotas for reserve: ${reserveId}`);
    
    // Dati ufficiali per Cison di Valmarino (CA 28) estratti dai PDF 2025-2026
    const cisonQuotas = [
      // CAPRIOLO - Piano 2025-2026 (M1=4, M2=7, F1/FF=12, PM=2, PF=3)
      // Mappatura: M1→M1, M2→MA, F1/FF→F0, PM→M0, PF→FA
      {
        reserveId,
        species: 'roe_deer',
        roeDeerCategory: 'M0', // PM (piccoli maschi) 
        totalQuota: 2,
        harvested: 0,
        isActive: true,
        huntingStartDate: new Date('2025-10-01'),
        huntingEndDate: new Date('2026-01-31'),
        notes: 'Quota ufficiale Regione Veneto 2025-2026 - Piccoli Maschi'
      },
      {
        reserveId,
        species: 'roe_deer',
        roeDeerCategory: 'F0', // F1/FF (femmine fertili)
        totalQuota: 12,
        harvested: 0,
        isActive: true,
        huntingStartDate: new Date('2025-10-01'),
        huntingEndDate: new Date('2026-01-31'),
        notes: 'Quota ufficiale Regione Veneto 2025-2026 - Femmine Fertili'
      },
      {
        reserveId,
        species: 'roe_deer',
        roeDeerCategory: 'FA', // PF (piccole femmine)
        totalQuota: 3,
        harvested: 0,
        isActive: true,
        huntingStartDate: new Date('2025-10-01'),
        huntingEndDate: new Date('2026-01-31'),
        notes: 'Quota ufficiale Regione Veneto 2025-2026 - Piccole Femmine'
      },
      {
        reserveId,
        species: 'roe_deer',
        roeDeerCategory: 'M1', // M1 (maschi giovani)
        totalQuota: 4,
        harvested: 0,
        isActive: true,
        huntingStartDate: new Date('2025-10-01'),
        huntingEndDate: new Date('2026-01-31'),
        notes: 'Quota ufficiale Regione Veneto 2025-2026 - Maschi I Testa'
      },
      {
        reserveId,
        species: 'roe_deer',
        roeDeerCategory: 'MA', // M2 (maschi adulti)
        totalQuota: 7,
        harvested: 0,
        isActive: true,
        huntingStartDate: new Date('2025-10-01'),
        huntingEndDate: new Date('2026-01-31'),
        notes: 'Quota ufficiale Regione Veneto 2025-2026 - Maschi Adulti'
      },
      
      // CERVO - Piano 2025-2026 (CL0=2, MCL1=3, MM=3, FF=8)
      {
        reserveId,
        species: 'red_deer',
        redDeerCategory: 'CL0', // Cerbiatti/piccoli
        totalQuota: 2,
        harvested: 0,
        isActive: true,
        huntingStartDate: new Date('2025-09-01'),
        huntingEndDate: new Date('2026-01-31'),
        notes: 'Quota ufficiale Regione Veneto 2025-2026 - Cerbiatti'
      },
      {
        reserveId,
        species: 'red_deer',
        redDeerCategory: 'MCL1', // Maschi di I classe
        totalQuota: 3,
        harvested: 0,
        isActive: true,
        huntingStartDate: new Date('2025-09-01'),
        huntingEndDate: new Date('2026-01-31'),
        notes: 'Quota ufficiale Regione Veneto 2025-2026 - Maschi I Classe'
      },
      {
        reserveId,
        species: 'red_deer',
        redDeerCategory: 'MM', // Maschi maturi
        totalQuota: 3,
        harvested: 0,
        isActive: true,
        huntingStartDate: new Date('2025-09-01'),
        huntingEndDate: new Date('2026-01-31'),
        notes: 'Quota ufficiale Regione Veneto 2025-2026 - Maschi Maturi'
      },
      {
        reserveId,
        species: 'red_deer',
        redDeerCategory: 'FF', // Femmine fertili
        totalQuota: 8,
        harvested: 0,
        isActive: true,
        huntingStartDate: new Date('2025-09-01'),
        huntingEndDate: new Date('2026-01-31'),
        notes: 'Quota ufficiale Regione Veneto 2025-2026 - Femmine Fertili'
      }
    ];

    // Rimuovi quote esistenti per questa riserva
    console.log(`Removing existing quotas for reserve ${reserveId}`);
    await storage.deleteAllRegionalQuotasForReserve(reserveId);

    // Importa le nuove quote ufficiali
    const importedQuotas = [];
    for (const quota of cisonQuotas) {
      const imported = await storage.createRegionalQuota(quota);
      importedQuotas.push(imported);
      console.log(`✅ Imported official quota: ${quota.species} ${quota.roeDeerCategory || quota.redDeerCategory} = ${quota.totalQuota}`);
    }

    console.log(`🎯 Successfully imported ${importedQuotas.length} official quotas for ${reserveId}`);
    
    res.json({
      message: `Importate ${importedQuotas.length} quote regionali ufficiali da PDF Regione Veneto 2025-2026`,
      quotas: importedQuotas,
      summary: {
        capriolo: { M0: 2, F0: 12, FA: 3, M1: 4, MA: 7, totale: 28 },
        cervo: { CL0: 2, MCL1: 3, MM: 3, FF: 8, totale: 16 },
        camoscio: { totale: 0, note: "Nessuna quota assegnata per CA 28 Cison" }
      }
    });
  } catch (error) {
    console.error("Error importing official regional quotas:", error);
    res.status(500).json({ message: "Errore nell'importazione delle quote regionali" });
  }
});

export default router;
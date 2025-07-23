import { Router } from "express";
import { authenticateToken, requireRole, type AuthRequest } from "../../middleware/auth";
import { storage } from "../../storage";

// Dati ufficiali dai PDF Regione Veneto 2025-2026
const OFFICIAL_QUOTAS_2025_2026 = {
  // Capriolo (Piano Abbattimento Capriolo 2025-2026)
  roe_deer: {
    "ca-tv01": { M0: 0, F0: 10, FA: 0, M1: 4, MA: 4 }, // Cordignano: M1:1, M2:2, F1/FF:3, PM:1, PF:1 = 8 -> M1+M2=3=MA, F1/FF=3=F0, PM+PF=2=M0+FA
    "ca-tv02": { M0: 1, F0: 6, FA: 2, M1: 2, MA: 4 }, // Conegliano: 15 totale
    "ca-tv03": { M0: 1, F0: 6, FA: 1, M1: 2, MA: 3 }, // Susegana: 13 totale
    "ca-tv04": { M0: 1, F0: 3, FA: 1, M1: 1, MA: 3 }, // Nervesa: 9 totale
    "ca-tv05": { M0: 2, F0: 5, FA: 1, M1: 1, MA: 3 }, // Giavera-Volpago: 12 totale
    "ca-tv06": { M0: 0, F0: 2, FA: 0, M1: 2, MA: 1 }, // Montebelluna: 5 totale
    "ca-tv07": { M0: 1, F0: 2, FA: 1, M1: 2, MA: 2 }, // Cornuda-Caerano: 8 totale
    "ca-tv08": { M0: 1, F0: 3, FA: 1, M1: 2, MA: 3 }, // Maser: 10 totale
    "ca-tv09": { M0: 0, F0: 3, FA: 0, M1: 2, MA: 1 }, // Asolo: 6 totale
    "ca-tv10": { M0: 2, F0: 5, FA: 2, M1: 3, MA: 5 }, // Borso del Grappa: 17 totale
    "ca-tv11": { M0: 2, F0: 10, FA: 3, M1: 3, MA: 6 }, // Crespano del Grappa: 24 totale
    "ca-tv12": { M0: 2, F0: 7, FA: 2, M1: 3, MA: 4 }, // Paderno del Grappa: 18 totale
    "ca-tv13": { M0: 1, F0: 3, FA: 0, M1: 1, MA: 2 }, // Castelcucco: 7 totale
    "ca-tv14": { M0: 1, F0: 5, FA: 1, M1: 1, MA: 4 }, // Monfumo: 12 totale
    "ca-tv15": { M0: 2, F0: 7, FA: 2, M1: 2, MA: 5 }, // Possagno: 18 totale
    "ca-tv16": { M0: 1, F0: 5, FA: 2, M1: 2, MA: 4 }, // Cavaso del Tomba: 14 totale
    "ca-tv17": { M0: 2, F0: 7, FA: 1, M1: 2, MA: 5 }, // Pederobba: 17 totale
    "ca-tv18": { M0: 1, F0: 2, FA: 1, M1: 1, MA: 2 }, // Segusino: 7 totale
    "ca-tv19": { M0: 5, F0: 10, FA: 3, M1: 4, MA: 9 }, // Valdobbiadene: 31 totale
    "ca-tv20": { M0: 1, F0: 8, FA: 3, M1: 3, MA: 7 }, // Miane: 22 totale
    "ca-tv21": { M0: 0, F0: 2, FA: 0, M1: 1, MA: 2 }, // Vidor: 5 totale
    "ca-tv22": { M0: 1, F0: 3, FA: 2, M1: 2, MA: 2 }, // Crocetta del Montello: 10 totale
    "ca-tv24": { M0: 1, F0: 8, FA: 2, M1: 3, MA: 7 }, // Farra di Soligo: 21 totale
    "ca-tv25": { M0: 1, F0: 3, FA: 1, M1: 2, MA: 3 }, // Sernaglia della B.: 10 totale
    "ca-tv26": { M0: 1, F0: 4, FA: 2, M1: 2, MA: 3 }, // Pieve di Soligo: 12 totale
    "ca-tv27": { M0: 1, F0: 3, FA: 1, M1: 2, MA: 3 }, // Follina: 10 totale
    "ca-tv28": { M0: 2, F0: 12, FA: 3, M1: 4, MA: 7 }, // Cison di Valmarino: 28 totale
    "ca-tv29": { M0: 2, F0: 10, FA: 4, M1: 4, MA: 7 }, // Tarzo: 27 totale
    "ca-tv30": { M0: 2, F0: 8, FA: 2, M1: 2, MA: 3 }, // Revine Lago: 17 totale
    "ca-tv31": { M0: 2, F0: 13, FA: 3, M1: 2, MA: 10 }, // Vittorio Veneto: 30 totale
    "ca-tv32": { M0: 1, F0: 4, FA: 1, M1: 1, MA: 2 }, // S. Pietro di Feletto: 9 totale
    "ca-tv33": { M0: 0, F0: 3, FA: 2, M1: 1, MA: 3 }, // Refrontolo: 9 totale
    "ca-tv34": { M0: 0, F0: 4, FA: 1, M1: 0, MA: 3 }, // Fregona: 8 totale
    "ca-tv36": { M0: 0, F0: 3, FA: 0, M1: 1, MA: 2 }, // Sarmede: 6 totale
    "ca-tv37": { M0: 0, F0: 2, FA: 0, M1: 1, MA: 2 }, // Fonte: 5 totale
    "ca-tv38": { M0: 0, F0: 2, FA: 1, M1: 2, MA: 2 }, // San Zenone: 7 totale
  },
  
  // Cervo (Piano Prelievo Cervo 2025-2026)
  red_deer: {
    "ca-tv18": { CL0: 5, FF: 11, MM: 6, MCL1: 4 }, // 26 totale
    "ca-tv19": { CL0: 8, FF: 10, MM: 15, MCL1: 8 }, // 41 totale
    "ca-tv20": { CL0: 12, FF: 16, MM: 9, MCL1: 8 }, // 45 totale
    "ca-tv24": { CL0: 2, FF: 2, MM: 2, MCL1: 1 }, // 7 totale
    "ca-tv25": { CL0: 2, FF: 3, MM: 3, MCL1: 2 }, // 10 totale
    "ca-tv26": { CL0: 0, FF: 2, MM: 2, MCL1: 1 }, // 5 totale
    "ca-tv27": { CL0: 6, FF: 9, MM: 3, MCL1: 3 }, // 21 totale
    "ca-tv28": { CL0: 2, FF: 8, MM: 3, MCL1: 3 }, // 16 totale
    "ca-tv29": { CL0: 2, FF: 2, MM: 3, MCL1: 1 }, // 8 totale
    "ca-tv30": { CL0: 9, FF: 11, MM: 4, MCL1: 6 }, // 30 totale
    "ca-tv01": { CL0: 10, FF: 8, MM: 4, MCL1: 4 }, // 26 totale
    "ca-tv31": { CL0: 2, FF: 12, MM: 10, MCL1: 4 }, // 28 totale
    "ca-tv34": { CL0: 16, FF: 20, MM: 13, MCL1: 5 }, // 54 totale
    "ca-tv36": { CL0: 4, FF: 6, MM: 1, MCL1: 2 }, // 13 totale
    "ca-tv03": { CL0: 0, FF: 1, MM: 0, MCL1: 0 }, // 1 totale
    "ca-tv04": { CL0: 0, FF: 1, MM: 0, MCL1: 1 }, // 2 totale
    "ca-tv05": { CL0: 0, FF: 1, MM: 0, MCL1: 1 }, // 2 totale
    "ca-tv06": { CL0: 0, FF: 0, MM: 1, MCL1: 0 }, // 1 totale
    "ca-tv08": { CL0: 0, FF: 1, MM: 0, MCL1: 1 }, // 2 totale
    "ca-tv09": { CL0: 0, FF: 1, MM: 0, MCL1: 0 }, // 1 totale
    "ca-tv10": { CL0: 1, FF: 1, MM: 1, MCL1: 1 }, // 4 totale
    "ca-tv11": { CL0: 1, FF: 2, MM: 4, MCL1: 1 }, // 8 totale
    "ca-tv12": { CL0: 2, FF: 3, MM: 3, MCL1: 2 }, // 10 totale
    "ca-tv13": { CL0: 0, FF: 2, MM: 1, MCL1: 1 }, // 4 totale
    "ca-tv14": { CL0: 1, FF: 3, MM: 3, MCL1: 1 }, // 8 totale
    "ca-tv15": { CL0: 2, FF: 4, MM: 3, MCL1: 1 }, // 10 totale
    "ca-tv16": { CL0: 1, FF: 3, MM: 2, MCL1: 2 }, // 8 totale
    "ca-tv17": { CL0: 2, FF: 4, MM: 3, MCL1: 1 }, // 10 totale
    "ca-tv22": { CL0: 1, FF: 2, MM: 2, MCL1: 0 }, // 5 totale
    "ca-tv07": { CL0: 0, FF: 1, MM: 0, MCL1: 1 }, // 2 totale
    "ca-tv38": { CL0: 0, FF: 1, MM: 0, MCL1: 0 }, // 1 totale
  },
  
  // Camoscio (Piano Camoscio 2025-2026)
  chamois: {
    "ca-tv10": { "CA-M-0": 0, "CA-M-I": 1, "CA-M-II": 0, "CA-M-III": 2, "CA-F-I": 1, "CA-F-II": 3 }, // 7 totale
    "ca-tv11": { "CA-M-0": 0, "CA-M-I": 7, "CA-M-II": 2, "CA-M-III": 4, "CA-F-I": 2, "CA-F-II": 6 }, // 21 totale
    "ca-tv12": { "CA-M-0": 0, "CA-M-I": 11, "CA-M-II": 2, "CA-M-III": 7, "CA-F-I": 2, "CA-F-II": 10 }, // 32 totale
    "ca-tv15": { "CA-M-0": 0, "CA-M-I": 5, "CA-M-II": 1, "CA-M-III": 3, "CA-F-I": 2, "CA-F-II": 2 }, // 13 totale
    "ca-tv31": { "CA-M-0": 0, "CA-M-I": 4, "CA-M-II": 1, "CA-M-III": 2, "CA-F-I": 0, "CA-F-II": 2 }, // 9 totale
    "ca-tv28": { "CA-M-0": 0, "CA-M-I": 0, "CA-M-II": 0, "CA-M-III": 0, "CA-F-I": 0, "CA-F-II": 0 }, // 0 totale
    "ca-tv34": { "CA-M-0": 0, "CA-M-I": 1, "CA-M-II": 0, "CA-M-III": 0, "CA-F-I": 0, "CA-F-II": 1 }, // 2 totale
  },
  
  // Muflone (Piano Muflone 2025-2026)
  mouflon: {
    "ca-tv11": { "MU-M-0": 0, "MU-M-I": 0, "MU-M-II": 0, "MU-F-0": 0, "MU-F-I": 1, "MU-F-II": 0 }, // 1 totale
    "ca-tv12": { "MU-M-0": 0, "MU-M-I": 0, "MU-M-II": 0, "MU-F-0": 0, "MU-F-I": 1, "MU-F-II": 0 }, // 1 totale
    "ca-tv20": { "MU-M-0": 1, "MU-M-I": 1, "MU-M-II": 1, "MU-F-0": 1, "MU-F-I": 1, "MU-F-II": 0 }, // 5 totale
    "ca-tv28": { "MU-M-0": 0, "MU-M-I": 0, "MU-M-II": 0, "MU-F-0": 0, "MU-F-I": 1, "MU-F-II": 0 }, // 1 totale (Follina)
    "ca-tv31": { "MU-M-0": 3, "MU-M-I": 3, "MU-M-II": 4, "MU-F-0": 1, "MU-F-I": 3, "MU-F-II": 0 }, // 14 totale
  }
};
import { insertRegionalQuotaSchema } from "@shared/schema";
import { importAllQuotasFromPDFs } from "../../utils/pdfImporter";

const router = Router();

// GET TUTTE le quote regionali per SuperAdmin dashboard (SUPERADMIN only)
router.get("/", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    console.log('SuperAdmin fetching all regional quotas for all reserves');
    
    // Ottieni TUTTE le quote regionali per la tabella riassuntiva
    const allQuotas = await storage.getAllRegionalQuotas();
    
    console.log(`Found ${allQuotas.length} total regional quotas across all reserves`);
    res.json(allQuotas);
  } catch (error) {
    console.error("Error fetching all regional quotas:", error);
    res.status(500).json({ message: "Errore nel recupero di tutti i piani di prelievo regionali" });
  }
});

// GET quote regionali per una riserva specifica (SUPERADMIN only)
router.get("/:reserveId", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const { reserveId } = req.params;
    
    console.log(`SuperAdmin fetching regional quotas for reserve: ${reserveId}`);
    const quotas = await storage.getRegionalQuotas(reserveId);
    
    console.log(`Found ${quotas.length} regional quotas for reserve ${reserveId}`);
    res.json(quotas);
  } catch (error) {
    console.error("Error fetching regional quotas:", error);
    res.status(500).json({ message: "Errore nel recupero dei piani di prelievo regionali" });
  }
});

// POST nuova quota regionale (SUPERADMIN only)
router.post("/", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const validatedData = insertRegionalQuotaSchema.parse(req.body);
    
    console.log(`SuperAdmin creating regional quota:`, validatedData);
    const quota = await storage.createRegionalQuota(validatedData);
    
    console.log(`Created regional quota with ID: ${quota.id}`);
    res.json({
      message: "Quota regionale creata con successo",
      quota
    });
  } catch (error) {
    console.error("Error creating regional quota:", error);
    if (error instanceof Error && error.message.includes('duplicate key')) {
      res.status(400).json({ message: "Quota già esistente per questa categoria" });
    } else {
      res.status(500).json({ message: "Errore nella creazione della quota regionale" });
    }
  }
});

// PATCH aggiorna quota regionale (SUPERADMIN only)
router.patch("/:id", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const quotaId = parseInt(req.params.id);
    const updateData = req.body;
    
    console.log(`SuperAdmin updating regional quota ${quotaId} with data:`, updateData);
    
    // Validate data types
    if (updateData.totalQuota !== undefined) {
      updateData.totalQuota = parseInt(updateData.totalQuota);
    }
    if (updateData.harvested !== undefined) {
      updateData.harvested = parseInt(updateData.harvested);
    }

    const updatedQuota = await storage.updateRegionalQuota(quotaId, updateData);
    
    if (!updatedQuota) {
      return res.status(404).json({ message: "Quota regionale non trovata" });
    }

    console.log(`Updated regional quota:`, updatedQuota);
    res.json({
      message: "Quota regionale aggiornata con successo",
      quota: updatedQuota
    });
  } catch (error) {
    console.error("Error updating regional quota:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento della quota regionale" });
  }
});

// DELETE quota regionale (SUPERADMIN only)
router.delete("/:id", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const quotaId = parseInt(req.params.id);
    
    console.log(`SuperAdmin deleting regional quota ${quotaId}`);
    const success = await storage.deleteRegionalQuota(quotaId);
    
    if (!success) {
      return res.status(404).json({ message: "Quota regionale non trovata" });
    }

    console.log(`Deleted regional quota ${quotaId}`);
    res.json({ message: "Quota regionale eliminata con successo" });
  } catch (error) {
    console.error("Error deleting regional quota:", error);
    res.status(500).json({ message: "Errore nell'eliminazione della quota regionale" });
  }
});

// GET tutte le quote regionali per tutte le riserve (SUPERADMIN only)
router.get("/", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    console.log(`SuperAdmin fetching all regional quotas for all reserves`);
    
    // Ottieni tutte le quote regionali da tutte le riserve
    const allQuotas = await storage.getAllRegionalQuotas();
    
    console.log(`Found ${allQuotas.length} total regional quotas across all reserves`);
    res.json(allQuotas);
  } catch (error) {
    console.error("Error fetching all regional quotas:", error);
    res.status(500).json({ message: "Errore nel recupero delle quote regionali" });
  }
});

// POST importa tutti i dati dai PDF ufficiali (SUPERADMIN only)
router.post("/import-from-pdfs", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    console.log('SuperAdmin importing all quotas from PDFs...');
    
    const result = await importAllQuotasFromPDFs();
    
    if (result.success) {
      res.json({
        message: `Importazione completata con successo! Importate ${result.imported} quote regionali dai PDF ufficiali 2025-2026.`,
        imported: result.imported,
        errors: []
      });
    } else {
      res.status(207).json({
        message: `Importazione parzialmente completata. Importate ${result.imported} quote, ${result.errors.length} errori.`,
        imported: result.imported,
        errors: result.errors
      });
    }
    
  } catch (error) {
    console.error("Error importing quotas from PDFs:", error);
    res.status(500).json({ 
      message: "Errore durante l'importazione dai PDF",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// POST importa quote per specie specifica (SUPERADMIN only)
router.post("/import-quotas-by-species", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const { species } = req.body;
    
    if (!species) {
      return res.status(400).json({ message: "Specie non specificata" });
    }
    
    console.log(`SuperAdmin importing quotas for species: ${species}`);
    
    const speciesData = OFFICIAL_QUOTAS_2025_2026[species as keyof typeof OFFICIAL_QUOTAS_2025_2026];
    
    if (!speciesData) {
      return res.status(400).json({ message: `Specie ${species} non trovata nei dati ufficiali` });
    }
    
    let totalImported = 0;
    let totalReserves = 0;
    
    // Importa le quote per ogni riserva
    for (const [reserveId, quotas] of Object.entries(speciesData)) {
      totalReserves++;
      
      // Per ogni categoria della specie
      for (const [category, totalQuota] of Object.entries(quotas)) {
        try {
          // Crea o aggiorna la quota regionale
          await storage.createRegionalQuota({
            reserveId,
            species: species as any,
            roeDeerCategory: species === 'roe_deer' ? category as any : null,
            redDeerCategory: species === 'red_deer' ? category as any : null,
            fallowDeerCategory: null,
            mouflonCategory: species === 'mouflon' ? category as any : null,
            chamoisCategory: species === 'chamois' ? category as any : null,
            totalQuota: totalQuota as number,
            harvested: 0,
            season: "2025-2026",
            isActive: true,
            notes: `Importato da Piano ufficiale Regione Veneto ${species} 2025-2026`
          });
          
          totalImported++;
          console.log(`Imported ${species} quota: ${reserveId} - ${category}: ${totalQuota}`);
        } catch (error) {
          console.log(`Quota already exists or error: ${reserveId} - ${category}`);
        }
      }
    }
    
    // Per le riserve non presenti nei PDF, crea quote con valore 0
    const allReserves = await storage.getReserves();
    const activeCATVReserves = allReserves.filter(r => r.id.startsWith('ca-tv'));
    
    for (const reserve of activeCATVReserves) {
      if (!speciesData[reserve.id]) {
        // Crea quote con valore 0 per le riserve non presenti nei PDF
        const defaultCategories = getDefaultCategoriesForSpecies(species);
        
        for (const category of defaultCategories) {
          try {
            await storage.createRegionalQuota({
              reserveId: reserve.id,
              species: species as any,
              roeDeerCategory: species === 'roe_deer' ? category as any : null,
              redDeerCategory: species === 'red_deer' ? category as any : null,
              fallowDeerCategory: null,
              mouflonCategory: species === 'mouflon' ? category as any : null,
              chamoisCategory: species === 'chamois' ? category as any : null,
              totalQuota: 0,
              harvested: 0,
              season: "2025-2026",
              isActive: true,
              notes: `Riserva non presente nel Piano ${species} 2025-2026 - quota 0`
            });
            
            totalImported++;
          } catch (error) {
            // Quota già esistente, ignora
          }
        }
      }
    }
    
    res.json({
      message: `Importazione completata per ${species}`,
      imported: totalImported,
      totalQuotas: totalImported,
      totalReserves: totalReserves
    });
  } catch (error) {
    console.error("Error importing quotas by species:", error);
    res.status(500).json({ message: "Errore nell'importazione per specie" });
  }
});

function getDefaultCategoriesForSpecies(species: string): string[] {
  switch (species) {
    case 'roe_deer':
      return ['M0', 'F0', 'FA', 'M1', 'MA'];
    case 'red_deer':
      return ['CL0', 'FF', 'MM', 'MCL1'];
    case 'chamois':
      return ['CA-M-0', 'CA-M-I', 'CA-M-II', 'CA-M-III', 'CA-F-I', 'CA-F-II'];
    case 'mouflon':
      return ['MU-M-0', 'MU-M-I', 'MU-M-II', 'MU-F-0', 'MU-F-I', 'MU-F-II'];
    default:
      return [];
  }
}

export default router;
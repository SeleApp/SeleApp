import { Request, Response } from 'express';
import { requireRole, type AuthRequest } from '../../middleware/auth.js';
import { storage } from '../../storage.js';

// Specie complete con relative categorie ufficiali
const COMPLETE_SPECIES_DATA = {
  roe_deer: {
    species: 'roe_deer',
    categories: ['M0', 'F0', 'FA', 'M1', 'MA'],
    defaultQuotas: { M0: 2, F0: 12, FA: 3, M1: 4, MA: 7 }
  },
  red_deer: {
    species: 'red_deer', 
    categories: ['CL0', 'FF', 'MM', 'MCL1'],
    defaultQuotas: { CL0: 2, FF: 8, MM: 3, MCL1: 3 }
  },
  fallow_deer: {
    species: 'fallow_deer',
    categories: ['DA-M-0', 'DA-M-I', 'DA-M-II', 'DA-F-0', 'DA-F-I', 'DA-F-II'],
    defaultQuotas: { 'DA-M-0': 2, 'DA-M-I': 3, 'DA-M-II': 4, 'DA-F-0': 3, 'DA-F-I': 4, 'DA-F-II': 5 }
  },
  mouflon: {
    species: 'mouflon',
    categories: ['MU-M-0', 'MU-M-I', 'MU-M-II', 'MU-F-0', 'MU-F-I', 'MU-F-II'], 
    defaultQuotas: { 'MU-M-0': 1, 'MU-M-I': 2, 'MU-M-II': 2, 'MU-F-0': 1, 'MU-F-I': 2, 'MU-F-II': 2 }
  },
  chamois: {
    species: 'chamois',
    categories: ['CA-M-0', 'CA-M-I', 'CA-M-II', 'CA-M-III', 'CA-F-0', 'CA-F-I', 'CA-F-II', 'CA-F-III'],
    defaultQuotas: { 'CA-M-0': 1, 'CA-M-I': 1, 'CA-M-II': 2, 'CA-M-III': 2, 'CA-F-0': 1, 'CA-F-I': 1, 'CA-F-II': 2, 'CA-F-III': 2 }
  }
};

export default [
  requireRole('SUPERADMIN'),
  async (req: AuthRequest, res: Response) => {
    console.log('🔧 Populate missing species endpoint called');
    
    try {
      // Ottieni tutte le riserve
      const reserves = await storage.getReserves();
      
      let totalReserveProcessed = 0;
      let totalQuotasCreated = 0;
      const missingReports: string[] = [];

      for (const reserve of reserves) {
        // Ottieni le quote regionali esistenti per questa riserva 
        const existingQuotas = await storage.getAllRegionalQuotas();
        const reserveQuotas = existingQuotas.filter((q: any) => q.reserveId === reserve.id);
        
        // Crea un set delle specie già presenti
        const existingSpecies = new Set(reserveQuotas.map((q: any) => q.species));
        
        // Identifica le specie presenti nella configurazione della riserva
        const reserveSpecies = JSON.parse(reserve.species || '[]');
        const speciesMapping: { [key: string]: string } = {
          'Capriolo': 'roe_deer',
          'Cervo': 'red_deer', 
          'Daino': 'fallow_deer',
          'Muflone': 'mouflon',
          'Camoscio': 'chamois'
        };

        let quotasCreatedForReserve = 0;
        
        // Per ogni specie configurata nella riserva
        for (const reserveSpeciesName of reserveSpecies) {
          const speciesKey = speciesMapping[reserveSpeciesName];
          
          if (!speciesKey || !COMPLETE_SPECIES_DATA[speciesKey as keyof typeof COMPLETE_SPECIES_DATA]) {
            continue;
          }
          
          // Se questa specie non ha quote esistenti, creale
          if (!existingSpecies.has(speciesKey)) {
            const speciesData = COMPLETE_SPECIES_DATA[speciesKey as keyof typeof COMPLETE_SPECIES_DATA];
            
            missingReports.push(`${reserve.name}: Mancante specie ${reserveSpeciesName} (${speciesKey})`);
            
            // Crea quote per tutte le categorie di questa specie
            for (const category of speciesData.categories) {
              const defaultQuota = speciesData.defaultQuotas[category as keyof typeof speciesData.defaultQuotas] || 1;
              
              await storage.createRegionalQuota({
                reserveId: reserve.id,
                species: speciesKey as any,
                roeDeerCategory: speciesKey === 'roe_deer' ? category as any : undefined,
                redDeerCategory: speciesKey === 'red_deer' ? category as any : undefined,
                fallowDeerCategory: speciesKey === 'fallow_deer' ? category as any : undefined,
                mouflonCategory: speciesKey === 'mouflon' ? category as any : undefined,
                chamoisCategory: speciesKey === 'chamois' ? category as any : undefined,
                totalQuota: defaultQuota,
                harvestedCount: 0,
                notes: `Quota generata automaticamente - ${new Date().toLocaleDateString('it-IT')}`
              });
              
              quotasCreatedForReserve++;
              totalQuotasCreated++;
            }
          }
        }
        
        if (quotasCreatedForReserve > 0) {
          totalReserveProcessed++;
          console.log(`✅ Create ${quotasCreatedForReserve} quote per ${reserve.name}`);
        }
      }

      console.log(`🎯 Processo completato: ${totalReserveProcessed} riserve aggiornate, ${totalQuotasCreated} quote create`);

      res.json({
        success: true,
        message: `Quote mancanti popolate con successo`,
        reservesProcessed: totalReserveProcessed,
        totalQuotasCreated,
        missingReports: missingReports.slice(0, 10), // Prime 10 per non sovraccaricare la risposta
        totalMissingCount: missingReports.length
      });

    } catch (error) {
      console.error('❌ Error populating missing species:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Errore durante il popolamento delle specie mancanti',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
];
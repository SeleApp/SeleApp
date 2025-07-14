import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { z } from "zod";

// Interface per le limitazioni
interface LimitationConfig {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  value: number;
  unit: string;
  category: 'prenotazioni' | 'zone' | 'cacciatori' | 'capi';
  metadata?: {
    timeLimit?: number; // Per limitazioni orarie
    speciesConfig?: {
      [species: string]: {
        enabled: boolean;
        limits: { [category: string]: number };
      };
    };
  };
}

// Schema per validare le limitazioni
const simpleLimitationSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  value: z.number().min(0), // Cambiato da min(1) a min(0) per supportare orari 0-23
  unit: z.string(),
  category: z.enum(['prenotazioni', 'zone', 'cacciatori', 'capi']),
  metadata: z.object({
    timeLimit: z.number().min(0).max(23).optional(),
    speciesConfig: z.record(z.object({
      enabled: z.boolean(),
      limits: z.record(z.number())
    })).optional()
  }).optional()
});

const limitationsRequestSchema = z.object({
  limitations: z.array(simpleLimitationSchema)
});

// Storage in memoria per le limitazioni (in produzione usare database)
let limitationsStorage: Record<string, LimitationConfig[]> = {};

// Limitazioni di default per ogni riserva
const defaultLimitations: LimitationConfig[] = [
  {
    id: 'max_reservations_per_week',
    title: 'Prenotazioni per Settimana',
    description: 'Massimo numero di prenotazioni che un cacciatore può fare in una settimana',
    enabled: false,
    value: 2,
    unit: 'prenotazioni',
    category: 'prenotazioni'
  },
  {
    id: 'zone_cooldown_hours',
    title: 'Attesa Riprenotazione Zona',
    description: 'Ore di attesa prima di poter prenotare di nuovo la stessa zona',
    enabled: false,
    value: 24,
    unit: 'ore',
    category: 'zone'
  },
  {
    id: 'max_hunters_per_zone',
    title: 'Cacciatori per Zona',
    description: 'Massimo numero di cacciatori che possono prenotare la stessa zona nello stesso giorno',
    enabled: true,
    value: 1,
    unit: 'cacciatori',
    category: 'cacciatori'
  },
  {
    id: 'booking_time_limit',
    title: 'Limitazione Oraria',
    description: 'Orario limite entro cui i cacciatori possono effettuare prenotazioni (formato 24h)',
    enabled: false,
    value: 18,
    unit: 'ore',
    category: 'prenotazioni',
    metadata: {
      timeLimit: 18
    }
  },
  {
    id: 'species_limitations',
    title: 'Limitazioni per Specie',
    description: 'Configurazione limitazioni specifiche per ogni specie presente nella riserva',
    enabled: false,
    value: 0,
    unit: 'specie',
    category: 'capi',
    metadata: {
      speciesConfig: {
        'roe_deer': {
          enabled: true,
          limits: {
            'M0': 10, 'F0': 15, 'FA': 20, 'M1': 8, 'MA': 5
          }
        },
        'red_deer': {
          enabled: true,
          limits: {
            'CL0': 3, 'FF': 5, 'MM': 2, 'MCL1': 4
          }
        }
      }
    }
  },
  {
    id: 'daily_reservations_limit',
    title: 'Prenotazioni Giornaliere',
    description: 'Massimo numero di prenotazioni che un cacciatore può fare nello stesso giorno',
    enabled: false,
    value: 1,
    unit: 'prenotazioni',
    category: 'prenotazioni'
  }
];

export async function saveLimitations(req: AuthRequest, res: Response) {
  try {
    const user = req.user;
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
      console.log('🚫 Access denied - User role:', user?.role);
      return res.status(403).json({ error: "Accesso negato - Solo ADMIN e SUPERADMIN" });
    }

    const userId = user.id;
    const reserveId = user.reserveId;
    
    if (!userId) {
      return res.status(401).json({ error: "Utente non identificato" });
    }

    console.log('✅ Limitations access granted for user:', { userId, role: user.role, reserveId });

    // Valida i dati in input
    const validatedData = limitationsRequestSchema.parse(req.body);
    
    // Salva le limitazioni per questa riserva (usa un ID di default se SUPERADMIN senza reserveId)
    const storageKey = reserveId || `superadmin_${userId}`;
    limitationsStorage[storageKey] = validatedData.limitations;

    console.log(`Limitazioni salvate per riserva ${storageKey}:`, {
      activeLimitations: validatedData.limitations.filter(l => l.enabled).length,
      totalLimitations: validatedData.limitations.length,
      bookingTimeLimit: validatedData.limitations.find(l => l.id === 'booking_time_limit')?.enabled ? validatedData.limitations.find(l => l.id === 'booking_time_limit')?.value : 'disattivata',
      speciesLimitations: validatedData.limitations.find(l => l.id === 'species_limitations')?.enabled ? 'attive' : 'disattivate'
    });

    res.json({
      success: true,
      message: "Limitazioni salvate con successo",
      data: limitationsStorage[storageKey]
    });

  } catch (error: any) {
    console.error("Errore nel salvataggio limitazioni:", error);
    
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: "Dati non validi",
        details: error.errors
      });
    }

    res.status(500).json({
      error: "Errore interno del server",
      message: error.message
    });
  }
}

export async function getLimitations(req: AuthRequest, res: Response) {
  try {
    const user = req.user;
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
      console.log('🚫 Get limitations access denied - User role:', user?.role);
      return res.status(403).json({ error: "Accesso negato - Solo ADMIN e SUPERADMIN" });
    }

    const reserveId = user.reserveId;
    console.log('✅ Get limitations access granted for user:', { userId: user.id, role: user.role, reserveId });

    // Recupera le limitazioni per questa riserva (usa un ID di default se SUPERADMIN senza reserveId)
    const storageKey = reserveId || `superadmin_${user.id}`;
    const limitations = limitationsStorage[storageKey];
    
    if (!limitations) {
      // Inizializza con limitazioni di default
      limitationsStorage[storageKey] = [...defaultLimitations];
      console.log(`Inizializzate limitazioni di default per riserva ${storageKey}`);
      
      return res.json({
        limitations: defaultLimitations
      });
    }

    res.json({
      limitations: limitations
    });

  } catch (error: any) {
    console.error("Errore nel recupero limitazioni:", error);
    res.status(500).json({
      error: "Errore interno del server",
      message: error.message
    });
  }
}

export async function checkLimitationViolation(
  reserveId: string, 
  hunterId: number, 
  limitationType: string, 
  currentValue: number
): Promise<{ violated: boolean; message?: string }> {
  
  const limitations = limitationsStorage[reserveId];
  
  if (!limitations || !limitations.limitations) {
    return { violated: false };
  }

  const activeLimitations = limitations.limitations.filter((l: any) => l.enabled);
  
  for (const limitation of activeLimitations) {
    // Controlla violazioni specifiche
    if (limitation.id === limitationType && currentValue >= limitation.value) {
      return {
        violated: true,
        message: `Limite superato: ${limitation.title} (max ${limitation.value} ${limitation.unit})`
      };
    }
  }

  return { violated: false };
}
// © 2025 Alessandro Favero - Tutti i diritti riservati
// Licenza: Uso riservato esclusivamente alle riserve attivate tramite contratto
// Vietata la riproduzione, distribuzione o modifica non autorizzata

import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { storage } from "../storage";
import { db } from "../db";
import { groupQuotas } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Schema per controllo specie (più semplice)
const checkSpeciesSchema = z.object({
  species: z.enum(['roe_deer', 'red_deer', 'fallow_deer', 'mouflon', 'chamois']),
  category: z.string(),
  lockType: z.literal('species')
});

// POST /api/reservation-locks/check-species - Controlla disponibilità categoria per gruppo
router.post('/check-species', authenticateToken, async (req: any, res: any) => {
  try {
    const validatedData = checkSpeciesSchema.parse(req.body);
    const { species, category } = validatedData;
    
    const userId = req.user.id;
    const reserveId = req.user.reserveId;
    
    if (!reserveId) {
      return res.status(400).json({ error: "Utente non associato a una riserva" });
    }

    // Trova il gruppo del cacciatore
    const hunter = await storage.getUser(userId);
    if (!hunter?.hunterGroup) {
      return res.status(400).json({ error: "Gruppo cacciatore non definito" });
    }

    // Verifica se la categoria è disponibile per il gruppo
    const categoryField = species === 'roe_deer' ? 'roeDeerCategory' : 'redDeerCategory';
    const groupQuota = await db.select()
      .from(groupQuotas)
      .where(
        and(
          eq(groupQuotas.reserveId, reserveId),
          eq(groupQuotas.hunterGroup, hunter.hunterGroup),
          eq(groupQuotas.species, species),
          eq(groupQuotas[categoryField as 'roeDeerCategory' | 'redDeerCategory'], category)
        )
      )
      .limit(1);

    if (groupQuota.length === 0) {
      return res.status(400).json({ 
        error: `Categoria ${category} non disponibile per il gruppo ${hunter.hunterGroup}` 
      });
    }

    const quota = groupQuota[0];
    const available = quota.totalQuota - quota.harvested;
    
    if (available <= 0) {
      return res.status(400).json({ 
        error: `Quota esaurita per ${category} nel gruppo ${hunter.hunterGroup} (${quota.harvested}/${quota.totalQuota})` 
      });
    }

    // Verifica se c'è già un lock attivo per questa categoria
    const existingLock = await storage.getActiveLockForSpecies(reserveId, species, category);
    if (existingLock && existingLock.userId !== userId) {
      return res.status(400).json({ 
        error: `Un altro cacciatore sta prenotando ${category}. Riprova tra qualche minuto.` 
      });
    }

    console.log(`✅ Species check passed: ${category} - ${available} available for group ${hunter.hunterGroup}`);
    res.json({ 
      available: true, 
      quota: available,
      group: hunter.hunterGroup 
    });
  } catch (error: any) {
    console.error("Error checking species availability:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Dati non validi" });
    }
    res.status(500).json({ error: error.message || "Errore nel controllo disponibilità" });
  }
});

// Schema per validazione check availability (specie o zona)
const checkAvailabilitySchema = z.object({
  lockType: z.enum(['species', 'zone']), // Tipo di lock: animale o zona
  species: z.enum(['roe_deer', 'red_deer', 'fallow_deer', 'mouflon', 'chamois']).optional(),
  category: z.string().optional(),
  zoneId: z.number().optional(),
  huntDate: z.string(),
  timeSlot: z.enum(['morning', 'afternoon', 'full_day']),
  sessionId: z.string()
});

// Schema per creazione lock (specie o zona) - validazione condizionale
const createLockSchema = z.object({
  lockType: z.enum(['species', 'zone']), // Tipo di lock: animale o zona
  species: z.enum(['roe_deer', 'red_deer', 'fallow_deer', 'mouflon', 'chamois']).optional(),
  roeDeerCategory: z.enum(['PM', 'PF', 'M1', 'M2', 'F1_FF']).optional(),
  redDeerCategory: z.enum(['CL0', 'FF', 'MM', 'MCL1']).optional(),
  fallowDeerCategory: z.enum(['DA-M-0', 'DA-M-I', 'DA-M-II', 'DA-F-0', 'DA-F-I', 'DA-F-II']).optional(),
  mouflonCategory: z.enum(['MU-M-0', 'MU-M-I', 'MU-M-II', 'MU-F-0', 'MU-F-I', 'MU-F-II']).optional(),
  chamoisCategory: z.enum(['CA-M-0', 'CA-M-I', 'CA-M-II', 'CA-M-III', 'CA-F-0', 'CA-F-I', 'CA-F-II', 'CA-F-III']).optional(),
  zoneId: z.number().optional(),
  huntDate: z.string(),
  timeSlot: z.enum(['morning', 'afternoon', 'full_day']),
  sessionId: z.string()
}).refine((data) => {
  // Se lockType è 'species', species è obbligatorio
  if (data.lockType === 'species' && !data.species) {
    return false;
  }
  // Se lockType è 'zone', zoneId è obbligatorio
  if (data.lockType === 'zone' && !data.zoneId) {
    return false;
  }
  return true;
}, {
  message: "Per species lock è necessario specificare la specie, per zone lock è necessario specificare zoneId"
});

// Controlla disponibilità di una specie/categoria o zona per prenotazione
router.post('/check-availability', authenticateToken, async (req: any, res: any) => {
  try {
    const validatedData = checkAvailabilitySchema.parse(req.body);
    const { lockType, species, category, zoneId, huntDate, timeSlot, sessionId } = validatedData;
    
    const userId = req.user.id;
    const reserveId = req.user.reserveId;
    
    if (!reserveId) {
      return res.status(400).json({ error: "Utente non associato a una riserva" });
    }

    let result;
    if (lockType === 'species') {
      result = await storage.checkSpeciesAvailability(
        userId, 
        reserveId, 
        species!, 
        category!, 
        huntDate, 
        timeSlot, 
        sessionId
      );
    } else if (lockType === 'zone') {
      result = await storage.checkZoneAvailability(
        userId,
        reserveId,
        zoneId!,
        huntDate,
        timeSlot,
        sessionId
      );
    } else {
      return res.status(400).json({ error: "Tipo di lock non valido" });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error checking availability:', error);
    res.status(400).json({ error: error.message || "Errore durante la verifica disponibilità" });
  }
});

// Crea un lock temporaneo per una prenotazione (specie o zona)
router.post('/create-lock', authenticateToken, async (req: any, res: any) => {
  try {
    const validatedData = createLockSchema.parse(req.body);
    const { lockType } = validatedData;
    
    const userId = req.user.id;
    const reserveId = req.user.reserveId;
    
    if (!reserveId) {
      return res.status(400).json({ error: "Utente non associato a una riserva" });
    }

    let availability;
    let lock;
    let successMessage;

    if (lockType === 'species') {
      // Determina la categoria corretta in base alla specie
      let categoryValue = '';
      if (validatedData.species === 'roe_deer' && validatedData.roeDeerCategory) {
        categoryValue = validatedData.roeDeerCategory;
      } else if (validatedData.species === 'red_deer' && validatedData.redDeerCategory) {
        categoryValue = validatedData.redDeerCategory;
      } else if (validatedData.species === 'fallow_deer' && validatedData.fallowDeerCategory) {
        categoryValue = validatedData.fallowDeerCategory;
      } else if (validatedData.species === 'mouflon' && validatedData.mouflonCategory) {
        categoryValue = validatedData.mouflonCategory;
      } else if (validatedData.species === 'chamois' && validatedData.chamoisCategory) {
        categoryValue = validatedData.chamoisCategory;
      }

      // Controlla disponibilità specie prima di creare il lock
      availability = await storage.checkSpeciesAvailability(
        userId, 
        reserveId, 
        validatedData.species!, 
        categoryValue, 
        validatedData.huntDate, 
        validatedData.timeSlot, 
        validatedData.sessionId
      );

      if (!availability.available) {
        return res.status(409).json({ 
          error: availability.message || "Capo non disponibile per prenotazione" 
        });
      }

      // Crea il lock temporaneo per specie
      lock = await storage.createReservationLock({
        userId,
        reserveId,
        species: validatedData.species!,
        roeDeerCategory: validatedData.roeDeerCategory || null,
        redDeerCategory: validatedData.redDeerCategory || null,
        fallowDeerCategory: validatedData.fallowDeerCategory || null,
        mouflonCategory: validatedData.mouflonCategory || null,
        chamoisCategory: validatedData.chamoisCategory || null,
        zoneId: null,
        huntDate: validatedData.huntDate,
        timeSlot: validatedData.timeSlot,
        sessionId: validatedData.sessionId,
        status: 'active',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minuti da ora
      });
      
      successMessage = "Capo temporaneamente riservato per 10 minuti";

    } else if (lockType === 'zone') {
      // Controlla disponibilità zona prima di creare il lock
      availability = await storage.checkZoneAvailability(
        userId,
        reserveId,
        validatedData.zoneId!,
        validatedData.huntDate,
        validatedData.timeSlot,
        validatedData.sessionId
      );

      if (!availability.available) {
        return res.status(409).json({ 
          error: availability.message || "Zona non disponibile per prenotazione" 
        });
      }

      // Crea il lock temporaneo per zona
      lock = await storage.createReservationLock({
        userId,
        reserveId,
        species: null,
        roeDeerCategory: null,
        redDeerCategory: null,
        fallowDeerCategory: null,
        mouflonCategory: null,
        chamoisCategory: null,
        zoneId: validatedData.zoneId!,
        huntDate: validatedData.huntDate,
        timeSlot: validatedData.timeSlot,
        sessionId: validatedData.sessionId,
        status: 'active',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minuti da ora
      });
      
      successMessage = `Zona ${validatedData.zoneId} temporaneamente riservata per 10 minuti`;

    } else {
      return res.status(400).json({ error: "Tipo di lock non valido" });
    }

    res.status(201).json({ 
      success: true, 
      lockId: lock.id,
      message: successMessage,
      expiresAt: lock.expiresAt
    });

  } catch (error: any) {
    console.error('Error creating reservation lock:', error);
    res.status(400).json({ error: error.message || "Errore durante la creazione del lock" });
  }
});

// Rilascia un lock temporaneo (annulla prenotazione)
router.post('/release-lock', authenticateToken, async (req: any, res: any) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: "SessionId richiesto" });
    }

    await storage.releaseReservationLock(sessionId);
    
    res.json({ success: true, message: "Lock rilasciato con successo" });
  } catch (error: any) {
    console.error('Error releasing reservation lock:', error);
    res.status(500).json({ error: "Errore durante il rilascio del lock" });
  }
});

// Consuma un lock (conferma prenotazione)
router.post('/consume-lock', authenticateToken, async (req: any, res: any) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: "SessionId richiesto" });
    }

    await storage.consumeReservationLock(sessionId);
    
    res.json({ success: true, message: "Lock consumato con successo" });
  } catch (error: any) {
    console.error('Error consuming reservation lock:', error);
    res.status(500).json({ error: "Errore durante il consumo del lock" });
  }
});

// Pulizia automatica dei lock scaduti (endpoint per manutenzione)
router.post('/cleanup-expired', authenticateToken, async (req: any, res: any) => {
  try {
    await storage.cleanupExpiredLocks();
    res.json({ success: true, message: "Lock scaduti puliti con successo" });
  } catch (error: any) {
    console.error('Error cleaning up expired locks:', error);
    res.status(500).json({ error: "Errore durante la pulizia dei lock scaduti" });
  }
});

export default router;
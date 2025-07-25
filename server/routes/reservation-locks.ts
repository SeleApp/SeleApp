// © 2025 Alessandro Favero - Tutti i diritti riservati
// Licenza: Uso riservato esclusivamente alle riserve attivate tramite contratto
// Vietata la riproduzione, distribuzione o modifica non autorizzata

import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { storage } from "../storage";
import { z } from "zod";

const router = Router();

// Schema per validazione check availability
const checkAvailabilitySchema = z.object({
  species: z.enum(['roe_deer', 'red_deer', 'fallow_deer', 'mouflon', 'chamois']),
  category: z.string(),
  huntDate: z.string(),
  timeSlot: z.enum(['morning', 'afternoon', 'full_day']),
  sessionId: z.string(),
  zoneId: z.number().optional()
});

// Schema per creazione lock
const createLockSchema = z.object({
  species: z.enum(['roe_deer', 'red_deer', 'fallow_deer', 'mouflon', 'chamois']),
  roeDeerCategory: z.enum(['PM', 'PF', 'M1', 'M2', 'F1_FF']).optional(),
  redDeerCategory: z.enum(['CL0', 'FF', 'MM', 'MCL1']).optional(),
  fallowDeerCategory: z.enum(['DA-M-0', 'DA-M-I', 'DA-M-II', 'DA-F-0', 'DA-F-I', 'DA-F-II']).optional(),
  mouflonCategory: z.enum(['MU-M-0', 'MU-M-I', 'MU-M-II', 'MU-F-0', 'MU-F-I', 'MU-F-II']).optional(),
  chamoisCategory: z.enum(['CA-M-0', 'CA-M-I', 'CA-M-II', 'CA-M-III', 'CA-F-0', 'CA-F-I', 'CA-F-II', 'CA-F-III']).optional(),
  huntDate: z.string(),
  timeSlot: z.enum(['morning', 'afternoon', 'full_day']),
  sessionId: z.string(),
  zoneId: z.number().optional()
});

// Controlla disponibilità di una specie/categoria per prenotazione
router.post('/check-availability', authenticateToken, async (req: any, res: any) => {
  try {
    const validatedData = checkAvailabilitySchema.parse(req.body);
    const { species, category, huntDate, timeSlot, sessionId } = validatedData;
    
    const userId = req.user.id;
    const reserveId = req.user.reserveId;
    
    if (!reserveId) {
      return res.status(400).json({ error: "Utente non associato a una riserva" });
    }

    const result = await storage.checkSpeciesAvailability(
      userId, 
      reserveId, 
      species, 
      category, 
      huntDate, 
      timeSlot, 
      sessionId
    );

    res.json(result);
  } catch (error: any) {
    console.error('Error checking species availability:', error);
    res.status(400).json({ error: error.message || "Errore durante la verifica disponibilità" });
  }
});

// Crea un lock temporaneo per una prenotazione
router.post('/create-lock', authenticateToken, async (req: any, res: any) => {
  try {
    const validatedData = createLockSchema.parse(req.body);
    
    const userId = req.user.id;
    const reserveId = req.user.reserveId;
    
    if (!reserveId) {
      return res.status(400).json({ error: "Utente non associato a una riserva" });
    }

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

    // Controlla disponibilità prima di creare il lock
    const availability = await storage.checkSpeciesAvailability(
      userId, 
      reserveId, 
      validatedData.species, 
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

    // Crea il lock temporaneo
    const lock = await storage.createReservationLock({
      userId,
      reserveId,
      species: validatedData.species,
      roeDeerCategory: validatedData.roeDeerCategory || null,
      redDeerCategory: validatedData.redDeerCategory || null,
      fallowDeerCategory: validatedData.fallowDeerCategory || null,
      mouflonCategory: validatedData.mouflonCategory || null,
      chamoisCategory: validatedData.chamoisCategory || null,
      zoneId: validatedData.zoneId || null,
      huntDate: validatedData.huntDate,
      timeSlot: validatedData.timeSlot,
      sessionId: validatedData.sessionId,
      status: 'active',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minuti da ora
    });

    res.status(201).json({ 
      success: true, 
      lockId: lock.id,
      message: "Capo temporaneamente riservato per 10 minuti",
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
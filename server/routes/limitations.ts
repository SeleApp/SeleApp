import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { z } from "zod";

// Schema per validare le limitazioni
const simpleLimitationSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  value: z.number().min(1),
  unit: z.string(),
  category: z.enum(['prenotazioni', 'zone', 'cacciatori', 'capi'])
});

const limitationsRequestSchema = z.object({
  limitations: z.array(simpleLimitationSchema)
});

// Storage in memoria per le limitazioni (in produzione usare database)
let limitationsStorage: Record<string, any> = {};

export async function saveLimitations(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const reserveId = req.user?.reserveId;
    
    if (!userId || !reserveId) {
      return res.status(401).json({ error: "Non autorizzato" });
    }

    // Valida i dati in input
    const validatedData = limitationsRequestSchema.parse(req.body);
    
    // Salva le limitazioni per questa riserva
    limitationsStorage[reserveId] = {
      reserveId,
      limitations: validatedData.limitations,
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    };

    console.log(`Limitazioni salvate per riserva ${reserveId}:`, {
      activeLimitations: validatedData.limitations.filter(l => l.enabled).length,
      totalLimitations: validatedData.limitations.length
    });

    res.json({
      success: true,
      message: "Limitazioni salvate con successo",
      data: limitationsStorage[reserveId]
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
    const reserveId = req.user?.reserveId;
    
    if (!reserveId) {
      return res.status(401).json({ error: "Non autorizzato" });
    }

    // Recupera le limitazioni per questa riserva
    const limitations = limitationsStorage[reserveId];
    
    if (!limitations) {
      return res.json({
        limitations: [], // Nessuna limitazione salvata ancora
        message: "Nessuna limitazione configurata"
      });
    }

    res.json({
      success: true,
      data: limitations
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
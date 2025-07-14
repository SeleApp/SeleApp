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
    limitationsStorage[storageKey] = {
      reserveId: storageKey,
      limitations: validatedData.limitations,
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    };

    console.log(`Limitazioni salvate per riserva ${storageKey}:`, {
      activeLimitations: validatedData.limitations.filter(l => l.enabled).length,
      totalLimitations: validatedData.limitations.length
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
import { Router } from "express";
import { authenticateToken, requireRole, type AuthRequest } from "../middleware/auth";
import { storage } from "../storage";
import { nanoid } from "nanoid";

const router = Router();

// Funzione per generare codici di accesso casuali
function generateRandomCode(length = 6): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Ottieni il codice di accesso di una riserva (solo SUPERADMIN)
router.get("/:reserveId", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const { reserveId } = req.params;
    const reserve = await storage.getReserve(reserveId);
    
    if (!reserve) {
      return res.status(404).json({ message: "Riserva non trovata" });
    }

    res.json({
      reserveId,
      accessCode: reserve.accessCode,
      codeActive: reserve.codeActive,
      name: reserve.name
    });
  } catch (error) {
    console.error("Error fetching access code:", error);
    res.status(500).json({ message: "Errore nel recupero del codice di accesso" });
  }
});

// Aggiorna il codice di accesso di una riserva (solo SUPERADMIN)
router.patch("/:reserveId", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const { reserveId } = req.params;
    const { accessCode, codeActive, generateNew } = req.body;

    const reserve = await storage.getReserve(reserveId);
    if (!reserve) {
      return res.status(404).json({ message: "Riserva non trovata" });
    }

    let newAccessCode = accessCode;

    // Se richiesta generazione automatica
    if (generateNew) {
      let attempts = 0;
      do {
        newAccessCode = generateRandomCode(6);
        attempts++;
        
        // Verifica che il codice non sia già in uso
        const existingReserves = await storage.getAllReserves();
        const codeExists = existingReserves.some(r => r.accessCode === newAccessCode && r.id !== reserveId);
        
        if (!codeExists) break;
        
        if (attempts > 10) {
          return res.status(500).json({ message: "Impossibile generare un codice univoco" });
        }
      } while (true);
    }

    // Valida il codice se inserito manualmente
    if (accessCode && !generateNew) {
      if (accessCode.length < 4 || accessCode.length > 20) {
        return res.status(400).json({ message: "Il codice deve essere tra 4 e 20 caratteri" });
      }

      // Verifica che il codice non sia già in uso
      const existingReserves = await storage.getAllReserves();
      const codeExists = existingReserves.some(r => r.accessCode === accessCode && r.id !== reserveId);
      
      if (codeExists) {
        return res.status(400).json({ message: "Codice già in uso da un'altra riserva" });
      }
    }

    const updatedReserve = await storage.updateReserveAccessCode(reserveId, {
      accessCode: newAccessCode,
      codeActive: codeActive !== undefined ? codeActive : reserve.codeActive
    });

    if (!updatedReserve) {
      return res.status(404).json({ message: "Impossibile aggiornare la riserva" });
    }

    res.json({
      message: "Codice di accesso aggiornato con successo",
      reserve: {
        id: updatedReserve.id,
        name: updatedReserve.name,
        accessCode: updatedReserve.accessCode,
        codeActive: updatedReserve.codeActive
      }
    });
  } catch (error) {
    console.error("Error updating access code:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento del codice di accesso" });
  }
});

export default router;
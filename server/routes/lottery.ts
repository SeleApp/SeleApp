// © 2025 Alessandro Favero - Tutti i diritti riservati
// Licenza: Uso riservato esclusivamente alle riserve attivate tramite contratto
// Vietata la riproduzione, distribuzione o modifica non autorizzata

import { Router } from "express";
import { storage } from "../storage";
import { authenticateToken, requireRole, type AuthRequest } from "../middleware/auth";
import { insertLotterySchema } from "@shared/schema";

const router = Router();

// Get all lotteries for a reserve (filtered by management type)
router.get("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const reserveId = req.user?.reserveId || 'cison-valmarino'; // Fallback per compatibilità
    const lotteries = await storage.getLotteries(reserveId);
    res.json(lotteries);
  } catch (error) {
    console.error("Error fetching lotteries:", error);
    res.status(500).json({ message: "Errore nel recupero dei sorteggi" });
  }
});

// Get active lotteries for hunter participation
router.get("/active", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const reserveId = req.user?.reserveId || 'cison-valmarino';
    const activeLotteries = await storage.getActiveLotteries(reserveId);
    res.json(activeLotteries);
  } catch (error) {
    console.error("Error fetching active lotteries:", error);
    res.status(500).json({ message: "Errore nel recupero dei sorteggi attivi" });
  }
});

// Create new lottery (admin only)
router.post("/", authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const reserveId = req.user?.reserveId || 'cison-valmarino';
    const lotteryData = insertLotterySchema.parse({ ...req.body, reserveId });
    const lottery = await storage.createLottery(lotteryData);
    res.json(lottery);
  } catch (error) {
    console.error("Error creating lottery:", error);
    res.status(500).json({ message: "Errore nella creazione del sorteggio" });
  }
});

// Join lottery (hunter only)
router.post("/:id/join", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const lotteryId = parseInt(req.params.id);
    const hunterId = req.user!.id;
    const reserveId = req.user?.reserveId || 'cison-valmarino';
    
    const participation = await storage.joinLottery(lotteryId, hunterId, reserveId);
    res.json(participation);
  } catch (error) {
    console.error("Error joining lottery:", error);
    res.status(500).json({ message: "Errore nell'iscrizione al sorteggio" });
  }
});

// Draw lottery winners (admin only)
router.post("/:id/draw", authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const lotteryId = parseInt(req.params.id);
    const reserveId = req.user?.reserveId || 'cison-valmarino';
    
    const winners = await storage.drawLotteryWinners(lotteryId, reserveId);
    res.json({ winners, message: `${winners.length} vincitori estratti` });
  } catch (error) {
    console.error("Error drawing lottery winners:", error);
    res.status(500).json({ message: "Errore nell'estrazione dei vincitori" });
  }
});

// Get lottery participations
router.get("/:id/participations", authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const lotteryId = parseInt(req.params.id);
    const reserveId = req.user?.reserveId || 'cison-valmarino';
    
    const participations = await storage.getLotteryParticipations(lotteryId, reserveId);
    res.json(participations);
  } catch (error) {
    console.error("Error fetching lottery participations:", error);
    res.status(500).json({ message: "Errore nel recupero delle partecipazioni" });
  }
});

// Get my participations (hunter)
router.get("/my-participations", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const hunterId = req.user!.id;
    const reserveId = req.user?.reserveId || 'cison-valmarino';
    
    const myParticipations = await storage.getHunterParticipations(hunterId, reserveId);
    res.json(myParticipations);
  } catch (error) {
    console.error("Error fetching hunter participations:", error);
    res.status(500).json({ message: "Errore nel recupero delle tue partecipazioni" });
  }
});

export default router;
import { Router } from "express";
import { z } from "zod";
import { authenticateToken, requireRole, type AuthRequest } from "../middleware/auth";
import { storage } from "../storage";
import { insertOsservazioneFaunisticaSchema, type OsservazioneFaunistica, type InsertOsservazioneFaunistica } from "../../shared/schema";

const router = Router();

// Filtri per le query delle osservazioni faunistiche
const getFaunaFiltersSchema = z.object({
  dataInizio: z.string().optional(),
  dataFine: z.string().optional(),
  specie: z.string().optional(),
  sesso: z.enum(['M', 'F']).optional(),
  zonaId: z.string().optional(),
  tipo: z.enum(['prelievo', 'avvistamento', 'fototrappola']).optional(),
  sezione: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional()
});

// GET /api/fauna - Lista osservazioni filtrabile (BIOLOGO/PROVINCIA)
router.get("/", authenticateToken, requireRole(['BIOLOGO', 'PROVINCIA']), async (req: AuthRequest, res) => {
  try {
    const filters = getFaunaFiltersSchema.parse(req.query);
    console.log('Fetching fauna observations with filters:', filters);
    
    // Per ora limitiamo alla riserva dell'utente se presente
    const reserveId = req.user?.reserveId || '';
    
    const observations = await storage.getFaunaObservations(filters, reserveId);
    
    res.json(observations);
  } catch (error: any) {
    console.error("Error fetching fauna observations:", error);
    res.status(500).json({ 
      message: "Errore nel recupero delle osservazioni faunistiche",
      error: error.message 
    });
  }
});

// POST /api/fauna - Inserisce nuova osservazione (BIOLOGO/PROVINCIA)
router.post("/", authenticateToken, requireRole(['BIOLOGO', 'PROVINCIA']), async (req: AuthRequest, res) => {
  try {
    const validatedData = insertOsservazioneFaunisticaSchema.parse(req.body);
    console.log('Creating new fauna observation:', validatedData);
    
    // Aggiungi informazioni dell'utente
    const observationData = {
      ...validatedData,
      biologo: `${req.user?.firstName} ${req.user?.lastName}`,
      reserveId: req.user?.reserveId || validatedData.reserveId
    };
    
    const newObservation = await storage.createFaunaObservation(observationData);
    
    console.log('Fauna observation created successfully:', newObservation.id);
    res.status(201).json(newObservation);
  } catch (error: any) {
    console.error("Error creating fauna observation:", error);
    res.status(500).json({ 
      message: "Errore nella creazione dell'osservazione faunistica",
      error: error.message 
    });
  }
});

// GET /api/fauna/statistiche - Restituisce statistiche biologiche aggregate (BIOLOGO/PROVINCIA)
router.get("/statistiche", authenticateToken, requireRole(['BIOLOGO', 'PROVINCIA']), async (req: AuthRequest, res) => {
  try {
    console.log('Generating fauna statistics for user:', req.user?.email);
    
    const reserveId = req.user?.reserveId || '';
    const stats = await storage.getFaunaStatistics(reserveId);
    
    res.json(stats);
  } catch (error: any) {
    console.error("Error generating fauna statistics:", error);
    res.status(500).json({ 
      message: "Errore nella generazione delle statistiche faunistiche",
      error: error.message 
    });
  }
});

// GET /api/fauna/export/excel - Esporta dati in formato Excel (BIOLOGO/PROVINCIA)
router.get("/export/excel", authenticateToken, requireRole(['BIOLOGO', 'PROVINCIA']), async (req: AuthRequest, res) => {
  try {
    const filters = getFaunaFiltersSchema.parse(req.query);
    console.log('Exporting fauna data to Excel with filters:', filters);
    
    const reserveId = req.user?.reserveId || '';
    const excelBuffer = await storage.exportFaunaToExcel(filters, reserveId);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=osservazioni_faunistiche.xlsx');
    res.send(excelBuffer);
  } catch (error: any) {
    console.error("Error exporting fauna data to Excel:", error);
    res.status(500).json({ 
      message: "Errore nell'esportazione dei dati faunistici",
      error: error.message 
    });
  }
});

// DELETE /api/fauna/:id - Elimina osservazione (BIOLOGO/PROVINCIA)
router.delete("/:id", authenticateToken, requireRole(['BIOLOGO', 'PROVINCIA']), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID osservazione non valido" });
    }
    
    await storage.deleteFaunaObservation(id, req.user?.reserveId || '');
    
    console.log('Fauna observation deleted:', id);
    res.json({ message: "Osservazione eliminata con successo" });
  } catch (error: any) {
    console.error("Error deleting fauna observation:", error);
    res.status(500).json({ 
      message: "Errore nell'eliminazione dell'osservazione",
      error: error.message 
    });
  }
});

export default router;
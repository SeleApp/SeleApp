import { Router } from "express";
import { z } from "zod";
import { authenticateToken, requireRole, type AuthRequest } from "../middleware/auth";
import { storage } from "../storage";
import { 
  insertOsservazioneFaunisticaSchema, 
  insertQuotaPianoSchema,
  insertDocumentoGestioneSchema,
  type OsservazioneFaunistica, 
  type InsertOsservazioneFaunistica,
  type QuotaPiano,
  type InsertQuotaPiano,
  type DocumentoGestione,
  type InsertDocumentoGestione
} from "../../shared/schema";

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

// GET /api/fauna/quote - Gestione quote piano di gestione
router.get("/quote", authenticateToken, requireRole(['BIOLOGO', 'PROVINCIA', 'SUPERADMIN']), async (req: AuthRequest, res) => {
  try {
    const reserveId = req.user?.reserveId || '';
    const quotes = await storage.getQuotePiano(reserveId);
    res.json(quotes);
  } catch (error: any) {
    console.error("Error fetching quota piano:", error);
    res.status(500).json({ 
      message: "Errore nel recupero delle quote piano",
      error: error.message 
    });
  }
});

// POST /api/fauna/quote - Crea/aggiorna quota piano
router.post("/quote", authenticateToken, requireRole(['BIOLOGO', 'PROVINCIA', 'SUPERADMIN']), async (req: AuthRequest, res) => {
  try {
    const validatedData = insertQuotaPianoSchema.parse(req.body);
    const quotaData = {
      ...validatedData,
      reserveId: req.user?.reserveId || validatedData.reserveId
    };
    
    const newQuota = await storage.createQuotaPiano(quotaData);
    console.log('Quota piano created successfully:', newQuota.id);
    res.status(201).json(newQuota);
  } catch (error: any) {
    console.error("Error creating quota piano:", error);
    res.status(500).json({ 
      message: "Errore nella creazione della quota piano",
      error: error.message 
    });
  }
});

// POST /api/fauna/validazione - Valida osservazioni faunistiche
router.post("/validazione", authenticateToken, requireRole(['BIOLOGO', 'PROVINCIA']), async (req: AuthRequest, res) => {
  try {
    const { observationId, validato } = req.body;
    
    if (!observationId || typeof validato !== 'boolean') {
      return res.status(400).json({ message: "ID osservazione e stato validazione richiesti" });
    }
    
    const updatedObservation = await storage.validateFaunaObservation(observationId, validato);
    
    console.log('Fauna observation validation updated:', observationId, validato);
    res.json(updatedObservation);
  } catch (error: any) {
    console.error("Error validating fauna observation:", error);
    res.status(500).json({ 
      message: "Errore nella validazione dell'osservazione",
      error: error.message 
    });
  }
});

// GET /api/fauna/documenti - Lista documenti di gestione
router.get("/documenti", authenticateToken, requireRole(['BIOLOGO', 'PROVINCIA', 'SUPERADMIN']), async (req: AuthRequest, res) => {
  try {
    const reserveId = req.user?.reserveId || '';
    const documents = await storage.getDocumentiGestione(reserveId);
    res.json(documents);
  } catch (error: any) {
    console.error("Error fetching documenti gestione:", error);
    res.status(500).json({ 
      message: "Errore nel recupero dei documenti",
      error: error.message 
    });
  }
});

// POST /api/fauna/documenti - Upload documento gestione
router.post("/documenti", authenticateToken, requireRole(['BIOLOGO', 'PROVINCIA', 'SUPERADMIN']), async (req: AuthRequest, res) => {
  try {
    const validatedData = insertDocumentoGestioneSchema.parse(req.body);
    const documentData = {
      ...validatedData,
      caricatoreId: req.user?.id!,
      reserveId: req.user?.reserveId || validatedData.reserveId
    };
    
    const newDocument = await storage.createDocumentoGestione(documentData);
    console.log('Document created successfully:', newDocument.id);
    res.status(201).json(newDocument);
  } catch (error: any) {
    console.error("Error creating document:", error);
    res.status(500).json({ 
      message: "Errore nella creazione del documento",
      error: error.message 
    });
  }
});

// POST /api/fauna/import-excel - Import osservazioni da file Excel
router.post("/import-excel", authenticateToken, requireRole(['BIOLOGO', 'PROVINCIA']), async (req: AuthRequest, res) => {
  try {
    const { excelData } = req.body; // Array di osservazioni dal file Excel
    
    if (!Array.isArray(excelData)) {
      return res.status(400).json({ message: "Dati Excel non validi" });
    }
    
    const results = [];
    const reserveId = req.user?.reserveId || '';
    
    for (const row of excelData) {
      try {
        const validatedData = insertOsservazioneFaunisticaSchema.parse({
          ...row,
          biologo: `${req.user?.firstName} ${req.user?.lastName}`,
          reserveId: reserveId,
          autoreId: req.user?.id
        });
        
        const observation = await storage.createFaunaObservation(validatedData);
        results.push({ success: true, id: observation.id });
      } catch (error: any) {
        results.push({ success: false, error: error.message, row });
      }
    }
    
    console.log(`Excel import completed: ${results.filter(r => r.success).length}/${results.length} successful`);
    res.json({ 
      message: "Import completato",
      results,
      successful: results.filter(r => r.success).length,
      total: results.length
    });
  } catch (error: any) {
    console.error("Error importing Excel data:", error);
    res.status(500).json({ 
      message: "Errore nell'importazione dei dati Excel",
      error: error.message 
    });
  }
});

// GET /api/fauna/export - Export dati per ricerca (Excel, CSV, PDF)
router.get("/export", authenticateToken, requireRole(['BIOLOGO', 'PROVINCIA']), async (req: AuthRequest, res) => {
  try {
    const { format = 'excel', dataInizio, dataFine, specie } = req.query;
    
    const filters = {
      dataInizio: dataInizio as string,
      dataFine: dataFine as string,
      specie: specie as string
    };
    
    const reserveId = req.user?.reserveId || '';
    const observations = await storage.getFaunaObservations(filters, reserveId);
    
    // Qui si implementerebbe la logica di export in base al formato
    // Per ora restituiamo i dati grezzi
    res.json({
      format,
      data: observations,
      count: observations.length,
      filters: filters
    });
  } catch (error: any) {
    console.error("Error exporting fauna data:", error);
    res.status(500).json({ 
      message: "Errore nell'export dei dati",
      error: error.message 
    });
  }
});

export default router;
import { Router } from "express";
import { authenticateToken, requireRole, type AuthRequest } from "../../middleware/auth";
import { storage } from "../../storage";
import { insertSupportTicketSchema } from "@shared/schema";

const router = Router();

// GET tutti i ticket di supporto (SUPERADMIN only)
router.get("/", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const { status, priority, reserveId } = req.query;
    const tickets = await storage.getAllSupportTickets({
      status: status as string,
      priority: priority as string,
      reserveId: reserveId as string
    });
    res.json(tickets);
  } catch (error) {
    console.error("Error fetching support tickets:", error);
    res.status(500).json({ message: "Errore nel recupero dei ticket di supporto" });
  }
});

// GET ticket singolo (SUPERADMIN only)
router.get("/:id", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const ticket = await storage.getSupportTicket(ticketId);
    
    if (!ticket) {
      return res.status(404).json({ message: "Ticket non trovato" });
    }
    
    res.json(ticket);
  } catch (error) {
    console.error("Error fetching support ticket:", error);
    res.status(500).json({ message: "Errore nel recupero del ticket" });
  }
});

// POST crea nuovo ticket (accessibile anche agli admin delle riserve)
router.post("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const validatedData = insertSupportTicketSchema.parse({
      ...req.body,
      adminId: req.user?.id,
      reserveId: req.user?.reserveId || req.body.reserveId
    });
    
    const ticket = await storage.createSupportTicket(validatedData);
    
    res.status(201).json({
      message: "Ticket di supporto creato con successo",
      ticket
    });
  } catch (error) {
    console.error("Error creating support ticket:", error);
    res.status(500).json({ message: "Errore nella creazione del ticket" });
  }
});

// PUT risponde al ticket (SUPERADMIN only)
router.put("/:id/respond", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const { response, status } = req.body;
    
    const ticket = await storage.respondToSupportTicket(ticketId, response, status);
    
    if (!ticket) {
      return res.status(404).json({ message: "Ticket non trovato" });
    }
    
    res.json({
      message: "Risposta inviata con successo",
      ticket
    });
  } catch (error) {
    console.error("Error responding to support ticket:", error);
    res.status(500).json({ message: "Errore nell'invio della risposta" });
  }
});

// PATCH aggiorna stato ticket (SUPERADMIN only)
router.patch("/:id/status", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const { status } = req.body;
    
    const ticket = await storage.updateSupportTicketStatus(ticketId, status);
    
    if (!ticket) {
      return res.status(404).json({ message: "Ticket non trovato" });
    }
    
    res.json({
      message: "Stato del ticket aggiornato",
      ticket
    });
  } catch (error) {
    console.error("Error updating ticket status:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento dello stato" });
  }
});

export default router;
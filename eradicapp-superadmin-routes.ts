// EradicApp 1.0 - SuperAdmin API Routes
// Adattamento dell'architettura SeleApp per controllo fauna selvatica

import { Express, Request, Response } from "express";
import { authenticateToken, requireRole, AuthRequest } from "./auth-middleware";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { sendEmail } from "./email-service";

export function registerSuperAdminRoutes(app: Express) {

  // ==========================================
  // GESTIONE ZONE OPERATIVE (Multi-Tenant)
  // ==========================================

  // Get all operational zones (SuperAdmin only)
  app.get("/api/superadmin/zones", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
    try {
      const zones = await storage.getAllOperationalZones();
      const zonesWithStats = await Promise.all(zones.map(async (zone) => {
        const stats = await storage.getZoneStats(zone.id);
        return { ...zone, ...stats };
      }));
      res.json(zonesWithStats);
    } catch (error) {
      console.error('Error fetching zones:', error);
      res.status(500).json({ error: "Errore nel recupero delle zone operative" });
    }
  });

  // Create new operational zone
  app.post("/api/superadmin/zones", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
    try {
      const { name, territoryType, province, contactEmail, decreeReference } = req.body;
      
      // Generate unique zone ID
      const zoneId = name.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      // Generate access code
      const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const newZone = await storage.createOperationalZone({
        id: zoneId,
        name,
        territoryType,
        province,
        contactEmail,
        accessCode,
        decreeReference: decreeReference || 'Decreto Regione Veneto 277/2023'
      });

      // Send welcome email to zone contact
      await sendEmail({
        to: contactEmail,
        subject: 'Benvenuto in EradicApp - Zona Operativa Attivata',
        template: 'zone_activation',
        data: {
          zoneName: name,
          accessCode,
          loginUrl: process.env.APP_URL || 'https://eradicapp.replit.app'
        }
      });

      res.status(201).json(newZone);
    } catch (error) {
      console.error('Error creating zone:', error);
      res.status(500).json({ error: "Errore nella creazione della zona operativa" });
    }
  });

  // Update zone access code
  app.patch("/api/superadmin/zones/:id/access-code", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { accessCode, codeActive } = req.body;
      
      const updatedZone = await storage.updateZoneAccessCode(id, { accessCode, codeActive });
      
      if (!updatedZone) {
        return res.status(404).json({ error: "Zona operativa non trovata" });
      }
      
      res.json(updatedZone);
    } catch (error) {
      console.error('Error updating access code:', error);
      res.status(500).json({ error: "Errore nell'aggiornamento del codice d'accesso" });
    }
  });

  // ==========================================
  // GESTIONE AMMINISTRATORI ZONE
  // ==========================================

  // Get all zone administrators
  app.get("/api/superadmin/admins", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
    try {
      const admins = await storage.getAllZoneAdmins();
      // Remove password from response
      const safeAdmins = admins.map(admin => {
        const { password, ...safeAdmin } = admin;
        return safeAdmin;
      });
      res.json(safeAdmins);
    } catch (error) {
      console.error('Error fetching admins:', error);
      res.status(500).json({ error: "Errore nel recupero degli amministratori" });
    }
  });

  // Create new zone administrator
  app.post("/api/superadmin/create-admin", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
    try {
      const { email, firstName, lastName, zoneId, password } = req.body;
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email già registrata nel sistema" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create admin account
      const newAdmin = await storage.createZoneAdmin({
        email,
        firstName,
        lastName,
        password: hashedPassword,
        role: 'ADMIN' as const,
        zoneId,
        isActive: true
      });
      
      // Send welcome email
      await sendEmail({
        to: email,
        subject: 'Account Amministratore EradicApp Creato',
        template: 'admin_welcome',
        data: {
          firstName,
          lastName,
          email,
          tempPassword: password,
          zoneId,
          loginUrl: process.env.APP_URL || 'https://eradicapp.replit.app'
        }
      });
      
      // Remove password from response
      const { password: _, ...safeAdmin } = newAdmin;
      res.status(201).json(safeAdmin);
    } catch (error) {
      console.error('Error creating admin:', error);
      res.status(500).json({ error: "Errore nella creazione dell'amministratore" });
    }
  });

  // Update zone administrator
  app.patch("/api/superadmin/admins/:id", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Hash password if provided
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 10);
      }
      
      const updatedAdmin = await storage.updateZoneAdmin(parseInt(id), updates);
      
      if (!updatedAdmin) {
        return res.status(404).json({ error: "Amministratore non trovato" });
      }
      
      // Remove password from response
      const { password, ...safeAdmin } = updatedAdmin;
      res.json(safeAdmin);
    } catch (error) {
      console.error('Error updating admin:', error);
      res.status(500).json({ error: "Errore nell'aggiornamento dell'amministratore" });
    }
  });

  // ==========================================
  // GESTIONE CONTRATTI/CONVENZIONI
  // ==========================================

  // Get all zone contracts
  app.get("/api/superadmin/contracts", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
    try {
      const contracts = await storage.getAllZoneContracts();
      res.json(contracts);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      res.status(500).json({ error: "Errore nel recupero dei contratti" });
    }
  });

  // Create new contract
  app.post("/api/superadmin/contracts", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
    try {
      const contractData = req.body;
      const newContract = await storage.createZoneContract(contractData);
      res.status(201).json(newContract);
    } catch (error) {
      console.error('Error creating contract:', error);
      res.status(500).json({ error: "Errore nella creazione del contratto" });
    }
  });

  // Update contract
  app.patch("/api/superadmin/contracts/:id", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const updatedContract = await storage.updateZoneContract(parseInt(id), updates);
      
      if (!updatedContract) {
        return res.status(404).json({ error: "Contratto non trovato" });
      }
      
      res.json(updatedContract);
    } catch (error) {
      console.error('Error updating contract:', error);
      res.status(500).json({ error: "Errore nell'aggiornamento del contratto" });
    }
  });

  // ==========================================
  // SISTEMA SUPPORT TICKETS
  // ==========================================

  // Get all support tickets with filters
  app.get("/api/superadmin/support", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
    try {
      const { status, priority, zoneId, category } = req.query;
      const filters = {
        status: status as string,
        priority: priority as string,
        zoneId: zoneId as string,
        category: category as string
      };
      
      const tickets = await storage.getAllSupportTickets(filters);
      res.json(tickets);
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      res.status(500).json({ error: "Errore nel recupero dei ticket di supporto" });
    }
  });

  // Respond to support ticket
  app.patch("/api/superadmin/support/:id/respond", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { response, status } = req.body;
      
      const updatedTicket = await storage.respondToSupportTicket(parseInt(id), response, status);
      
      if (!updatedTicket) {
        return res.status(404).json({ error: "Ticket non trovato" });
      }
      
      // Send email notification to zone admin
      if (updatedTicket.admin) {
        await sendEmail({
          to: updatedTicket.admin.email,
          subject: `Risposta al Ticket #${id} - ${updatedTicket.subject}`,
          template: 'support_response',
          data: {
            ticketId: id,
            subject: updatedTicket.subject,
            response,
            status,
            adminName: updatedTicket.admin.firstName
          }
        });
      }
      
      res.json(updatedTicket);
    } catch (error) {
      console.error('Error responding to ticket:', error);
      res.status(500).json({ error: "Errore nella risposta al ticket" });
    }
  });

  // ==========================================
  // GESTIONE FATTURAZIONE
  // ==========================================

  // Get all zone billing information
  app.get("/api/superadmin/billing", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
    try {
      const billing = await storage.getAllZoneBilling();
      res.json(billing);
    } catch (error) {
      console.error('Error fetching billing:', error);
      res.status(500).json({ error: "Errore nel recupero delle informazioni di fatturazione" });
    }
  });

  // Update billing information
  app.patch("/api/superadmin/billing/:id", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const updatedBilling = await storage.updateZoneBilling(parseInt(id), updates);
      
      if (!updatedBilling) {
        return res.status(404).json({ error: "Informazioni di fatturazione non trovate" });
      }
      
      res.json(updatedBilling);
    } catch (error) {
      console.error('Error updating billing:', error);
      res.status(500).json({ error: "Errore nell'aggiornamento della fatturazione" });
    }
  });

  // ==========================================
  // GESTIONE MATERIALI FORMATIVI
  // ==========================================

  // Get all training materials
  app.get("/api/superadmin/materials", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
    try {
      const materials = await storage.getAllTrainingMaterials();
      res.json(materials);
    } catch (error) {
      console.error('Error fetching materials:', error);
      res.status(500).json({ error: "Errore nel recupero dei materiali formativi" });
    }
  });

  // Create new training material
  app.post("/api/superadmin/materials", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
    try {
      const materialData = req.body;
      const newMaterial = await storage.createTrainingMaterial(materialData);
      res.status(201).json(newMaterial);
    } catch (error) {
      console.error('Error creating material:', error);
      res.status(500).json({ error: "Errore nella creazione del materiale formativo" });
    }
  });

  // Update training material
  app.patch("/api/superadmin/materials/:id", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const updatedMaterial = await storage.updateTrainingMaterial(parseInt(id), updates);
      
      if (!updatedMaterial) {
        return res.status(404).json({ error: "Materiale formativo non trovato" });
      }
      
      res.json(updatedMaterial);
    } catch (error) {
      console.error('Error updating material:', error);
      res.status(500).json({ error: "Errore nell'aggiornamento del materiale formativo" });
    }
  });

  // Get material access logs
  app.get("/api/superladmin/materials/:id/access-log", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const accessLogs = await storage.getMaterialAccessLogs(parseInt(id));
      res.json(accessLogs);
    } catch (error) {
      console.error('Error fetching access logs:', error);
      res.status(500).json({ error: "Errore nel recupero dei log di accesso" });
    }
  });

  // ==========================================
  // STATISTICHE E DASHBOARD
  // ==========================================

  // Get SuperAdmin dashboard statistics
  app.get("/api/superadmin/stats", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
    try {
      const stats = await storage.getSuperAdminStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: "Errore nel recupero delle statistiche" });
    }
  });

  // Get zone-specific detailed statistics
  app.get("/api/superadmin/zones/:id/detailed-stats", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { period } = req.query; // 'week', 'month', 'quarter', 'year'
      
      const stats = await storage.getZoneDetailedStats(id, period as string);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching detailed stats:', error);
      res.status(500).json({ error: "Errore nel recupero delle statistiche dettagliate" });
    }
  });

  // Generate and download zone compliance report
  app.get("/api/superladmin/zones/:id/compliance-report", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { format } = req.query; // 'pdf', 'excel'
      
      const reportData = await storage.generateComplianceReport(id);
      
      if (format === 'excel') {
        // Generate Excel report
        const excelBuffer = await storage.generateExcelReport(reportData);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="compliance-report-${id}.xlsx"`);
        res.send(excelBuffer);
      } else {
        // Generate PDF report (default)
        const pdfBuffer = await storage.generatePDFReport(reportData);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="compliance-report-${id}.pdf"`);
        res.send(pdfBuffer);
      }
    } catch (error) {
      console.error('Error generating compliance report:', error);
      res.status(500).json({ error: "Errore nella generazione del report di conformità" });
    }
  });

}
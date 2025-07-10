// © 2025 Alessandro Favero - Tutti i diritti riservati
// Licenza: Uso riservato esclusivamente alle riserve attivate tramite contratto
// Vietata la riproduzione, distribuzione o modifica non autorizzata

import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import { z } from "zod";
import authRoutes from "./routes/auth";
import zonesRoutes from "./routes/zones";
import reservationsRoutes from "./routes/reservations";
import reportsRoutes from "./routes/reports";
import adminRoutes from "./routes/admin";
import regionalQuotasRoutes from "./routes/regional-quotas";
import reservesRoutes from "./routes/reserves";
import { authenticateToken, requireRole, type AuthRequest } from "./middleware/auth";
import { storage } from "./storage";
import { registerHunterBackendSchema, createAdminSchema } from "@shared/schema";
import { EmailService } from "./services/emailService.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  app.use("/api/auth", authRoutes);
  app.use("/api/zones", zonesRoutes);
  app.use("/api/reservations", reservationsRoutes);
  app.use("/api/reports", reportsRoutes);
  
  // Delete reports route (ADMIN only)
  const deleteReportRoutes = await import("./routes/deleteReport");
  app.use("/api/reports", deleteReportRoutes.default);
  app.use("/api/admin", adminRoutes);
  app.use("/api/regional-quotas", regionalQuotasRoutes);
  app.use("/api/reserves", reservesRoutes);
  
  // Admin hunters routes
  const adminHuntersRoutes = await import("./routes/admin-hunters");
  app.use("/api/admin/hunters", adminHuntersRoutes.default);
  
  // Access codes routes (SUPERADMIN only)
  const accessCodesRoutes = await import("./routes/access-codes");
  app.use("/api/superadmin/access-codes", accessCodesRoutes.default);
  
  // SuperAdmin reserves management routes
  app.use("/api/superadmin/reserves", reservesRoutes);
  
  // SuperAdmin advanced features routes
  const reserveSettingsRoutes = await import("./routes/superadmin/reserveSettings");
  app.use("/api/superadmin/reserve-settings", reserveSettingsRoutes.default);
  
  const contractsRoutes = await import("./routes/superadmin/contracts");
  app.use("/api/superadmin/contracts", contractsRoutes.default);
  
  const supportRoutes = await import("./routes/superadmin/support");
  app.use("/api/superadmin/support", supportRoutes.default);
  
  const billingRoutes = await import("./routes/superadmin/billing");
  app.use("/api/superadmin/billing", billingRoutes.default);
  
  const materialsRoutes = await import("./routes/superadmin/materials");
  app.use("/api/superadmin/materials", materialsRoutes.default);

  // Lottery system routes (for standard_random reserves)
  const lotteryRoutes = await import("./routes/lottery");
  app.use("/api/lottery", lotteryRoutes.default);

  // Endpoint per validazione riserve attive durante registrazione
  app.get("/api/validate-reserve/:name", async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const isValid = await storage.validateActiveReserve(name);
      res.json({ valid: isValid });
    } catch (error) {
      console.error("Error validating reserve:", error);
      res.status(500).json({ error: "Errore nella validazione della riserva" });
    }
  });



  // Endpoint per registrazione cacciatori con validazione codice d'accesso
  app.post("/api/auth/register-hunter", async (req: Request, res: Response) => {
    try {
      const data = registerHunterBackendSchema.parse(req.body);
      
      // Verifica riserva, stato attivo e codice d'accesso
      const reserve = await storage.validateReserveAccess(data.reserveId, data.accessCode);
      if (!reserve) {
        return res.status(400).json({ 
          error: "Codice di accesso errato o riserva non attiva." 
        });
      }

      // Verifica se l'email è già registrata
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email già registrata" });
      }

      // Hash della password
      const hashedPassword = await bcrypt.hash(data.password, 12);
      
      const user = await storage.createUser({
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        reserveId: data.reserveId,
        role: 'HUNTER',
        isActive: true,
      }, data.reserveId);

      // Invia email di benvenuto
      try {
        const reserve = await storage.getReserve(data.reserveId);
        if (reserve) {
          await EmailService.sendHunterWelcome({
            hunterEmail: user.email,
            hunterName: `${user.firstName} ${user.lastName}`,
            reserveName: reserve.name
          });
        }
      } catch (emailError) {
        console.error("Errore invio email benvenuto:", emailError);
        // Non bloccare la registrazione per errori email
      }

      res.status(201).json({ 
        message: "Cacciatore registrato con successo",
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName,
          reserveId: user.reserveId 
        } 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Required",
          details: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        });
      }
      console.error("Registration error:", error);
      res.status(500).json({ error: "Errore durante la registrazione" });
    }
  });

  // Endpoint per creazione account admin (solo SUPERADMIN)
  app.post("/api/superadmin/create-admin", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
    try {
      const data = createAdminSchema.parse(req.body);
      
      // Verifica se l'email è già registrata
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email già registrata" });
      }

      // Hash della password
      const hashedPassword = await bcrypt.hash(data.password, 12);
      
      const admin = await storage.createAdminAccount({
        ...data,
        password: hashedPassword,
      });

      // Invia email di conferma account admin
      try {
        const reserve = await storage.getReserve(data.reserveId);
        if (reserve) {
          await EmailService.sendAdminCreated({
            adminEmail: admin.email,
            adminName: `${admin.firstName} ${admin.lastName}`,
            reserveName: reserve.name,
            temporaryPassword: data.password // Password originale prima dell'hash
          });
        }
      } catch (emailError) {
        console.error("Errore invio email admin creato:", emailError);
        // Non bloccare la creazione per errori email
      }

      res.status(201).json({ 
        message: "Account admin creato con successo",
        admin: { 
          id: admin.id, 
          email: admin.email, 
          firstName: admin.firstName, 
          lastName: admin.lastName,
          role: admin.role 
        } 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Admin creation error:", error);
      res.status(500).json({ error: "Errore durante la creazione dell'account admin" });
    }
  });

  // Endpoint per ottenere tutti gli admin (solo SUPERADMIN)
  app.get("/api/superadmin/admins", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
    try {
      const admins = await storage.getAllAdmins();
      res.json(admins.map(admin => ({
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        isActive: admin.isActive,
        reserveId: admin.reserveId,
        createdAt: admin.createdAt
      })));
    } catch (error) {
      console.error("Error fetching admins:", error);
      res.status(500).json({ error: "Errore nel recupero degli admin" });
    }
  });

  // Endpoint per modificare un admin (solo SUPERADMIN)
  app.patch("/api/superadmin/admins/:id", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
    try {
      const adminId = parseInt(req.params.id);
      const updateData = req.body;

      // Se viene fornita una password, la hashiamo
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 12);
      }

      const updatedAdmin = await storage.updateAdmin(adminId, updateData);
      
      if (!updatedAdmin) {
        return res.status(404).json({ error: "Admin non trovato" });
      }

      res.json({
        message: "Admin aggiornato con successo",
        admin: {
          id: updatedAdmin.id,
          email: updatedAdmin.email,
          firstName: updatedAdmin.firstName,
          lastName: updatedAdmin.lastName,
          isActive: updatedAdmin.isActive,
          reserveId: updatedAdmin.reserveId
        }
      });
    } catch (error) {
      console.error("Error updating admin:", error);
      res.status(500).json({ error: "Errore nell'aggiornamento dell'admin" });
    }
  });

  // Endpoint per modificare una riserva (solo SUPERADMIN, solo Pederobba)
  app.patch("/api/superadmin/reserves/:id", authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
    try {
      const reserveId = req.params.id;
      const updateData = req.body;

      // Verifica che la riserva esista
      const existingReserve = await storage.getReserve(reserveId);
      if (!existingReserve) {
        return res.status(404).json({ error: "Riserva non trovata" });
      }

      // Permetti modifica solo per Pederobba
      if (existingReserve.comune !== "Pederobba") {
        return res.status(403).json({ error: "Modifica consentita solo per la riserva di Pederobba" });
      }

      // Aggiorna la riserva
      const updatedReserve = await storage.updateReserve(reserveId, updateData);
      
      if (!updatedReserve) {
        return res.status(404).json({ error: "Errore nell'aggiornamento della riserva" });
      }

      res.json({
        message: "Riserva CA17 Pederobba aggiornata con successo",
        reserve: updatedReserve
      });
    } catch (error) {
      console.error("Error updating reserve:", error);
      res.status(500).json({ error: "Errore nell'aggiornamento della riserva" });
    }
  });

  // Contact form endpoint
  app.post("/api/contact", async (req: Request, res: Response) => {
    try {
      const { firstName, lastName, email, organization, phone, message } = req.body;

      // Validation
      if (!firstName || !lastName || !email || !message) {
        return res.status(400).json({ message: "Nome, cognome, email e messaggio sono obbligatori" });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Formato email non valido" });
      }

      // Import EmailService
      const { EmailService } = await import("./services/emailService");

      // Send email to SeleApp
      const emailSent = await EmailService.sendContactRequest({
        firstName,
        lastName,
        email,
        organization: organization || 'Non specificata',
        phone: phone || 'Non specificato',
        message
      });

      if (emailSent) {
        res.json({ message: "Richiesta inviata con successo" });
      } else {
        res.status(500).json({ message: "Errore nell'invio dell'email. Riprova più tardi." });
      }

    } catch (error) {
      console.error("Errore endpoint contatti:", error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // Download user manual
  app.get("/api/download/manual", async (req: Request, res: Response) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const manualPath = path.join(process.cwd(), 'MANUALE_UTENTE.md');
      
      if (!fs.existsSync(manualPath)) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head><title>File non trovato</title></head>
          <body><h1>Manuale utente non trovato</h1><p>Il file MANUALE_UTENTE.md non esiste.</p></body>
          </html>
        `);
      }

      const manualContent = fs.readFileSync(manualPath, 'utf8');
      
      // Set proper headers for file download
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment; filename="SeleApp_Manuale_Utente.md"');
      res.setHeader('Content-Length', Buffer.byteLength(manualContent, 'utf8'));
      
      res.send(manualContent);
    } catch (error) {
      console.error('Error downloading manual:', error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Errore</title></head>
        <body><h1>Errore nel download</h1><p>Si è verificato un errore durante il download del manuale.</p></body>
        </html>
      `);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

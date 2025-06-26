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
import { registerHunterSchema, createAdminSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  app.use("/api/auth", authRoutes);
  app.use("/api/zones", zonesRoutes);
  app.use("/api/reservations", reservationsRoutes);
  app.use("/api/reports", reportsRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/regional-quotas", regionalQuotasRoutes);
  app.use("/api/reserves", reservesRoutes);
  
  // Admin hunters routes
  const adminHuntersRoutes = await import("./routes/admin-hunters");
  app.use("/api/admin/hunters", adminHuntersRoutes.default);

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

  // Get active reserves for registration
  app.get("/api/reserves/active", async (req: Request, res: Response) => {
    try {
      const activeReserves = await storage.getActiveReserves();
      res.json(activeReserves);
    } catch (error) {
      console.error("Error fetching active reserves:", error);
      res.status(500).json({ error: "Errore nel recupero delle riserve attive" });
    }
  });

  // Endpoint per registrazione cacciatori con validazione codice d'accesso
  app.post("/api/auth/register-hunter", async (req: Request, res: Response) => {
    try {
      const data = registerHunterSchema.parse(req.body);
      
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
        return res.status(400).json({ error: error.errors[0].message });
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

  const httpServer = createServer(app);
  return httpServer;
}

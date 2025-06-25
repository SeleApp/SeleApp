import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import authRoutes from "./routes/auth";
import zonesRoutes from "./routes/zones";
import reservationsRoutes from "./routes/reservations";
import reportsRoutes from "./routes/reports";
import adminRoutes from "./routes/admin";
import regionalQuotasRoutes from "./routes/regional-quotas";
import reservesRoutes from "./routes/reserves";

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

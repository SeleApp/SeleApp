import type { Express } from "express";
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

  const httpServer = createServer(app);
  return httpServer;
}

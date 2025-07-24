// © 2025 Alessandro Favero - Tutti i diritti riservati
// Licenza: Uso riservato esclusivamente alle riserve attivate tramite contratto
// Vietata la riproduzione, distribuzione o modifica non autorizzata

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "../storage";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    reserveId?: string | null;
    isDemo?: boolean;
    demoType?: string;
  };
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Token di accesso richiesto" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { 
      userId: number; 
      isDemo?: boolean; 
      demoType?: string; 
      role?: string;
      email?: string;
    };
    
    // Gestione token demo
    if (decoded.isDemo) {
      req.user = {
        id: decoded.userId,
        email: decoded.email || 'demo@seleapp.demo',
        role: decoded.role || 'HUNTER',
        firstName: 'Demo',
        lastName: 'User',
        reserveId: null,
        isDemo: true,
        demoType: decoded.demoType
      };
      return next();
    }
    
    // Gestione token normali
    const user = await storage.getUser(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Utente non trovato o non attivo" });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      reserveId: user.reserveId,
    };
    
    next();
  } catch (error) {
    return res.status(403).json({ message: "Token non valido" });
  }
}

export function requireRole(roles: string | string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Autenticazione richiesta" });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Permessi insufficienti" });
    }

    next();
  };
}

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

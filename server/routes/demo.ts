// © 2025 Alessandro Favero - Tutti i diritti riservati
// Sistema Demo per SeleApp - Gestione accessi temporanei

import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "../storage";

const JWT_SECRET = process.env.JWT_SECRET || "seleapp_dev_secret_2025";
const DEMO_DURATION_MINUTES = 30;

// Account demo pre-configurati
const DEMO_ACCOUNTS = {
  hunter: {
    email: "demo.hunter@seleapp.demo",
    password: "demo123",
    firstName: "Mario",
    lastName: "Demo",
    role: "HUNTER" as const,
    reserveId: "valle-demo"
  },
  admin: {
    email: "demo.admin@seleapp.demo", 
    password: "demo123",
    firstName: "Admin", 
    lastName: "Demo",
    role: "ADMIN" as const,
    reserveId: "valle-demo"
  },
  "tecnico-faunistico": {
    email: "demo.tecnico-faunistico@seleapp.demo",
    password: "demo123",
    firstName: "Tecnico",
    lastName: "Faunistico",
    role: "BIOLOGO" as const,
    reserveId: null
  },
  superadmin: {
    email: "demo.superadmin@seleapp.demo",
    password: "demo123", 
    firstName: "SuperAdmin",
    lastName: "Demo",
    role: "SUPERADMIN" as const,
    reserveId: null
  }
};

export async function startDemoSession(req: Request, res: Response) {
  try {
    const { demoType } = req.params; // hunter, admin, superadmin
    
    // Verifica che il tipo demo sia valido
    if (!demoType || !Object.keys(DEMO_ACCOUNTS).includes(demoType)) {
      return res.status(400).json({ 
        message: "Tipo demo non valido. Usa: hunter, admin, tecnico-faunistico, superadmin" 
      });
    }

    const demoAccount = DEMO_ACCOUNTS[demoType as keyof typeof DEMO_ACCOUNTS];
    
    // Verifica se l'account demo esiste già, altrimenti crealo
    let user = await storage.getUserByEmail(demoAccount.email);
    
    if (!user) {
      // Crea l'account demo se non esiste
      const hashedPassword = await bcrypt.hash(demoAccount.password, 12);
      
      const newUser = await storage.createUser({
        email: demoAccount.email,
        password: hashedPassword,
        firstName: demoAccount.firstName,
        lastName: demoAccount.lastName,
        role: demoAccount.role,
        reserveId: demoAccount.reserveId,
        isActive: true
      });
      
      user = newUser;
    }

    // Crea token JWT con scadenza di 30 minuti
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        reserveId: user.reserveId,
        isDemo: true,
        demoType: demoType,
        demoExpires: Date.now() + (DEMO_DURATION_MINUTES * 60 * 1000)
      },
      JWT_SECRET,
      { expiresIn: `${DEMO_DURATION_MINUTES}m` }
    );

    // Restituisci le informazioni per il login automatico
    res.json({
      success: true,
      demoType,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        reserveId: user.reserveId
      },
      demoInfo: {
        durationMinutes: DEMO_DURATION_MINUTES,
        expiresAt: new Date(Date.now() + (DEMO_DURATION_MINUTES * 60 * 1000)),
        features: getDemoFeatures(demoType)
      }
    });

  } catch (error) {
    console.error("Errore avvio demo:", error);
    res.status(500).json({ 
      message: "Errore interno durante l'avvio della demo" 
    });
  }
}

export async function checkDemoStatus(req: Request, res: Response) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Token mancante" });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      if (!decoded.isDemo) {
        return res.status(400).json({ message: "Non è una sessione demo" });
      }

      const timeRemaining = decoded.demoExpires - Date.now();
      const minutesRemaining = Math.max(0, Math.floor(timeRemaining / (60 * 1000)));

      res.json({
        isDemo: true,
        demoType: decoded.demoType,
        minutesRemaining,
        isExpired: timeRemaining <= 0,
        user: {
          id: decoded.userId,
          email: decoded.email,
          name: decoded.name || "Demo User",
          role: decoded.role
        }
      });

    } catch (jwtError) {
      res.status(401).json({ message: "Token demo scaduto o non valido" });
    }

  } catch (error) {
    console.error("Errore verifica demo:", error);
    res.status(500).json({ message: "Errore interno" });
  }
}

export async function createDemoReserve(req: Request, res: Response) {
  try {
    // Verifica se la riserva demo esiste già
    const existingReserve = await storage.getReserve("valle-demo");
    
    if (existingReserve) {
      return res.json({ 
        message: "Riserva demo già esistente",
        reserve: existingReserve 
      });
    }

    // Crea la riserva demo "Valle Demo"
    const demoReserve = await storage.createReserve({
      id: "valle-demo",
      name: "Valle Demo - Riserva Dimostrativa",
      comune: "Demo Valley",
      species: "Capriolo,Cervo,Daino,Muflone,Camoscio",
      emailContatto: "demo@seleapp.demo",
      presidentName: "Presidente Demo",
      huntingType: "zone",
      managementType: "standard_zones",
      numberOfZones: 16,
      numberOfGroups: 1,
      activeGroups: ["A"],
      assignmentMode: "manual",
      accessCode: "DEMO2025",
      codeActive: true,
      isActive: true
    });

    // Crea quote demo realistiche
    const demoQuotas = [
      // Capriolo
      { species: "roe_deer", roeDeerCategory: "PM", totalQuota: 8, harvested: 2 },
      { species: "roe_deer", roeDeerCategory: "PF", totalQuota: 12, harvested: 5 },
      { species: "roe_deer", roeDeerCategory: "F1_FF", totalQuota: 6, harvested: 1 },
      { species: "roe_deer", roeDeerCategory: "M1", totalQuota: 4, harvested: 0 },
      { species: "roe_deer", roeDeerCategory: "M2", totalQuota: 3, harvested: 1 },
      
      // Cervo 
      { species: "red_deer", redDeerCategory: "CL0", totalQuota: 3, harvested: 0 },
      { species: "red_deer", redDeerCategory: "FF", totalQuota: 5, harvested: 2 },
      { species: "red_deer", redDeerCategory: "MM", totalQuota: 2, harvested: 0 },
      { species: "red_deer", redDeerCategory: "MCL1", totalQuota: 1, harvested: 0 },
      
      // Daino
      { species: "fallow_deer", fallowDeerCategory: "DA-M-0", totalQuota: 4, harvested: 1 },
      { species: "fallow_deer", fallowDeerCategory: "DA-F-0", totalQuota: 6, harvested: 2 },
      
      // Muflone
      { species: "mouflon", mouflonCategory: "MU-M-I", totalQuota: 2, harvested: 0 },
      { species: "mouflon", mouflonCategory: "MU-F-I", totalQuota: 3, harvested: 1 },
      
      // Camoscio
      { species: "chamois", chamoisCategory: "CA-M-I", totalQuota: 1, harvested: 0 },
      { species: "chamois", chamoisCategory: "CA-F-I", totalQuota: 2, harvested: 0 }
    ];

    // Crea le quote regionali demo con tipi corretti
    for (const quota of demoQuotas) {
      await storage.createRegionalQuota({
        reserveId: "valle-demo",
        species: quota.species as "roe_deer" | "red_deer" | "fallow_deer" | "mouflon" | "chamois",
        roeDeerCategory: quota.roeDeerCategory as "M1" | "M2" | "F1_FF" | "PF" | "PM" | null | undefined,
        redDeerCategory: quota.redDeerCategory as "CL0" | "FF" | "MM" | "MCL1" | null | undefined,
        fallowDeerCategory: quota.fallowDeerCategory as "DA-M-0" | "DA-F-0" | "DA-M-I" | "DA-M-II" | "DA-F-I" | "DA-F-II" | null | undefined,
        mouflonCategory: quota.mouflonCategory as "MU-M-I" | "MU-F-I" | "MU-M-0" | "MU-M-II" | "MU-F-0" | "MU-F-II" | null | undefined,
        chamoisCategory: quota.chamoisCategory as "CA-M-I" | "CA-F-I" | "CA-M-0" | "CA-M-II" | "CA-M-III" | "CA-F-0" | "CA-F-II" | "CA-F-III" | null | undefined,
        totalQuota: quota.totalQuota,
        harvested: quota.harvested,
        isActive: true,
        notes: "Quota demo per dimostrazione"
      });
    }

    res.json({
      success: true,
      message: "Riserva demo creata con successo",
      reserve: demoReserve,
      quotasCreated: demoQuotas.length
    });

  } catch (error) {
    console.error("Errore creazione riserva demo:", error);
    res.status(500).json({ message: "Errore nella creazione della riserva demo" });
  }
}

function getDemoFeatures(demoType: string): string[] {
  switch (demoType) {
    case 'hunter':
      return [
        "Prenotazioni zone di caccia",
        "Visualizzazione quote disponibili", 
        "Invio report post-caccia",
        "Storico prenotazioni personali",
        "Notifiche email automatiche"
      ];
    
    case 'admin':
      return [
        "Gestione cacciatori della riserva",
        "Modifica quote faunistiche",
        "Visualizzazione tutti i report",
        "Gestione prenotazioni attive", 
        "Statistiche complete riserva",
        "Correzione report errati"
      ];

    case 'tecnico-faunistico':
      return [
        "Registrazione osservazioni faunistiche",
        "Gestione dati biometrici",
        "Analisi statistiche popolazioni",
        "Grafici scientifici avanzati",
        "Export dati per ricerca",
        "Monitoraggio GPS territoriale"
      ];
    
    case 'superadmin':
      return [
        "Gestione multiple riserve",
        "Importazione quote regionali da PDF",
        "Creazione amministratori",
        "Configurazione sistemi di gestione",
        "Panoramica completa sistema",
        "Generazione codici accesso"
      ];
    
    default:
      return ["Demo di base"];
  }
}
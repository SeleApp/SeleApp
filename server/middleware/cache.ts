// © 2025 Alessandro Favero - Cache Middleware per ottimizzazione prestazioni
// Sistema di caching per accelerare le risposte API

import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from './auth';

// Cache middleware per dati statici (zone, informazioni riserva)
export const cacheStatic = (duration: number = 300) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Solo GET requests
    if (req.method !== 'GET') {
      return next();
    }

    res.set({
      'Cache-Control': `public, max-age=${duration}`,
      'ETag': `"${req.originalUrl}-${Date.now()}"`,
    });

    next();
  };
};

// Cache middleware per dati dinamici (prenotazioni, quote)
export const cacheDynamic = (duration: number = 60) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }

    res.set({
      'Cache-Control': `private, max-age=${duration}`,
      'ETag': `"${req.originalUrl}-${req.user?.id}-${Date.now()}"`,
    });

    next();
  };
};

// Cache middleware per dati privati (statistiche admin)
export const cachePrivate = (duration: number = 30) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }

    res.set({
      'Cache-Control': `private, max-age=${duration}, must-revalidate`,
      'ETag': `"${req.originalUrl}-${req.user?.id}-${Date.now()}"`,
    });

    next();
  };
};
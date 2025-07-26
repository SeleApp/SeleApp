// © 2025 Alessandro Favero - Performance Optimizations per SeleApp
// Sistema di ottimizzazione prestazioni per accelerare l'applicazione

import { queryClient } from './queryClient';

// Prefetch strategico delle query comuni
export const prefetchCommonQueries = async () => {
  try {
    // Prefetch delle zone (dati statici che cambiano raramente)
    queryClient.prefetchQuery({
      queryKey: ["/api/zones"],
      staleTime: 10 * 60 * 1000, // 10 minuti per dati statici
    });

    // Prefetch delle quote regionali
    queryClient.prefetchQuery({
      queryKey: ["/api/regional-quotas"],
      staleTime: 5 * 60 * 1000,
    });

    // Prefetch delle informazioni sulla riserva corrente
    queryClient.prefetchQuery({
      queryKey: ["/api/current-reserve"],
      staleTime: 15 * 60 * 1000,
    });
  } catch (error) {
    console.log('Prefetch non critico fallito:', error);
  }
};

// Ottimizzazione del rendering con debounce per input frequenti
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Throttle per eventi di scroll e resize
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

// Cache locale per dati frequentemente accessibili
class LocalCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttl: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear() {
    this.cache.clear();
  }

  // Pulizia automatica elementi scaduti
  cleanup() {
    const now = Date.now();
    this.cache.forEach((item, key) => {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    });
  }
}

export const localCache = new LocalCache();

// Avvia pulizia automatica ogni 5 minuti
setInterval(() => localCache.cleanup(), 5 * 60 * 1000);

// Gestione ottimizzata delle immagini
export const optimizeImage = (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      // Calcola dimensioni ottimizzate
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      const width = img.width * ratio;
      const height = img.height * ratio;
      
      canvas.width = width;
      canvas.height = height;
      
      // Disegna immagine ridimensionata
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        const optimizedFile = new File([blob!], file.name, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        resolve(optimizedFile);
      }, 'image/jpeg', quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Performance monitor per debugging
export const measurePerformance = (name: string, fn: () => void) => {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(`🚀 [Performance] ${name}: ${(end - start).toFixed(2)}ms`);
  } else {
    fn();
  }
};

// Batch delle operazioni per ridurre re-render
export const batchUpdates = (updates: (() => void)[]) => {
  // In React 18, updates are automatically batched
  updates.forEach(update => update());
};

// Performance monitoring per componenti
export const performanceMonitor = {
  startTime: 0,
  
  start() {
    this.startTime = performance.now();
  },
  
  end(operationName: string) {
    const endTime = performance.now();
    const duration = endTime - this.startTime;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ [Performance] ${operationName}: ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }
};
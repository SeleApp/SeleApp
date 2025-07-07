import { useState, useEffect } from 'react';

export interface CookieConsentData {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
  version: string;
}

export const useCookieConsent = () => {
  const [consentData, setConsentData] = useState<CookieConsentData | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  // Carica le preferenze cookie dal localStorage
  const loadConsent = () => {
    try {
      const saved = localStorage.getItem('cookieConsent');
      if (!saved) return null;

      const data = JSON.parse(saved) as CookieConsentData;
      
      // Verifica validità del consenso
      if (!data.timestamp || !data.version) {
        localStorage.removeItem('cookieConsent');
        return null;
      }

      // Verifica scadenza (1 anno)
      const consentDate = new Date(data.timestamp);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      if (consentDate < oneYearAgo) {
        localStorage.removeItem('cookieConsent');
        console.log('Cookie consent scaduto, richiesta nuova approvazione');
        return null;
      }

      return data;
    } catch (error) {
      console.error('Errore parsing cookie consent:', error);
      localStorage.removeItem('cookieConsent');
      return null;
    }
  };

  // Salva le preferenze cookie
  const saveConsent = (consent: Omit<CookieConsentData, 'timestamp' | 'version'>) => {
    const consentData: CookieConsentData = {
      ...consent,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };

    localStorage.setItem('cookieConsent', JSON.stringify(consentData));
    setConsentData(consentData);
    setShowBanner(false);
    
    console.log('Cookie consent salvato:', consentData);
  };

  // Accetta tutti i cookie
  const acceptAll = () => {
    saveConsent({
      necessary: true,
      analytics: true,
      marketing: true
    });
  };

  // Accetta solo cookie necessari
  const acceptNecessary = () => {
    saveConsent({
      necessary: true,
      analytics: false,
      marketing: false
    });
  };

  // Rifiuta tutti i cookie opzionali
  const rejectAll = () => {
    saveConsent({
      necessary: true, // Sempre necessari per il funzionamento base
      analytics: false,
      marketing: false
    });
  };

  // Resetta le preferenze e riapri il banner
  const resetConsent = () => {
    localStorage.removeItem('cookieConsent');
    setConsentData(null);
    setShowBanner(true);
  };

  // Esporta le preferenze correnti
  const exportPreferences = () => {
    if (!consentData) return null;
    
    return {
      preferences: consentData,
      exported: new Date().toISOString(),
      summary: {
        necessari: consentData.necessary ? 'Accettati' : 'Rifiutati',
        analitici: consentData.analytics ? 'Accettati' : 'Rifiutati',
        marketing: consentData.marketing ? 'Accettati' : 'Rifiutati',
        dataConsenso: new Date(consentData.timestamp).toLocaleDateString('it-IT')
      }
    };
  };

  // Verifica se un tipo di cookie è consentito
  const isConsentGiven = (type: 'necessary' | 'analytics' | 'marketing'): boolean => {
    return consentData?.[type] ?? false;
  };

  // Carica il consenso all'avvio
  useEffect(() => {
    const loaded = loadConsent();
    if (loaded) {
      setConsentData(loaded);
      setShowBanner(false);
    } else {
      setShowBanner(true);
    }
  }, []);

  return {
    consentData,
    showBanner,
    acceptAll,
    acceptNecessary,
    rejectAll,
    resetConsent,
    exportPreferences,
    isConsentGiven,
    setShowBanner
  };
};
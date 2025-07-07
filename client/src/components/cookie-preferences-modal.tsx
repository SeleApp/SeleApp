import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Cookie, Settings, Download } from "lucide-react";
import { useCookieConsent } from "@/hooks/use-cookie-consent";

export default function CookiePreferencesModal() {
  const { 
    consentData, 
    acceptAll, 
    acceptNecessary, 
    rejectAll,
    resetConsent,
    exportPreferences,
    isConsentGiven 
  } = useCookieConsent();

  const [isOpen, setIsOpen] = useState(false);

  const handleExportPreferences = () => {
    const exported = exportPreferences();
    if (!exported) return;

    const dataStr = JSON.stringify(exported, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `seleapp-cookie-preferences-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Gestisci Cookie
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cookie className="h-5 w-5 text-amber-600" />
            Gestione Preferenze Cookie
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Stato attuale */}
          {consentData && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Stato Attuale</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Data consenso:</span>
                  <span className="text-sm font-medium">{formatDate(consentData.timestamp)}</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <Badge variant={isConsentGiven('necessary') ? 'default' : 'secondary'} className="w-full">
                      Necessari
                    </Badge>
                  </div>
                  <div className="text-center">
                    <Badge variant={isConsentGiven('analytics') ? 'default' : 'secondary'} className="w-full">
                      Analitici
                    </Badge>
                  </div>
                  <div className="text-center">
                    <Badge variant={isConsentGiven('marketing') ? 'default' : 'secondary'} className="w-full">
                      Marketing
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dettagli categoria cookie */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Categorie Cookie</h3>
            
            <div className="space-y-3">
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-green-700 mb-1">Cookie Necessari</h4>
                      <p className="text-sm text-gray-600">
                        Essenziali per il funzionamento del sito (autenticazione, preferenze, sicurezza).
                        Questi cookie sono sempre attivi.
                      </p>
                    </div>
                    <Switch checked={true} disabled className="ml-3" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-700 mb-1">Cookie Analitici</h4>
                      <p className="text-sm text-gray-600">
                        Ci aiutano a capire come i visitatori interagiscono con il sito per migliorare 
                        l'esperienza utente e le funzionalità.
                      </p>
                    </div>
                    <Switch checked={isConsentGiven('analytics')} disabled className="ml-3" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-purple-700 mb-1">Cookie di Marketing</h4>
                      <p className="text-sm text-gray-600">
                        Utilizzati per tracciare i visitatori sui siti web e fornire pubblicità 
                        mirata e rilevante.
                      </p>
                    </div>
                    <Switch checked={isConsentGiven('marketing')} disabled className="ml-3" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Azioni rapide */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Modifica Preferenze</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button onClick={acceptAll} className="w-full">
                Accetta Tutti
              </Button>
              <Button onClick={acceptNecessary} variant="outline" className="w-full">
                Solo Necessari
              </Button>
              <Button onClick={rejectAll} variant="destructive" className="w-full">
                Rifiuta Opzionali
              </Button>
            </div>
          </div>

          {/* Azioni avanzate */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={handleExportPreferences} 
                variant="outline" 
                size="sm" 
                className="gap-2 flex-1"
                disabled={!consentData}
              >
                <Download className="h-4 w-4" />
                Esporta Preferenze
              </Button>
              
              <Button 
                onClick={resetConsent} 
                variant="outline" 
                size="sm" 
                className="gap-2 flex-1"
              >
                <Settings className="h-4 w-4" />
                Ripristina Consenso
              </Button>
            </div>
            
            <p className="text-xs text-gray-500 text-center">
              Le preferenze vengono salvate localmente e scadono dopo 1 anno.
              Modificando le preferenze si chiuderà questa finestra.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook separato per verifiche cookie senza UI
export function useCookieCheck() {
  const { isConsentGiven } = useCookieConsent();
  
  const canUseAnalytics = () => isConsentGiven('analytics');
  const canUseMarketing = () => isConsentGiven('marketing');
  const canUseNecessary = () => isConsentGiven('necessary');
  
  return {
    canUseAnalytics,
    canUseMarketing, 
    canUseNecessary
  };
}
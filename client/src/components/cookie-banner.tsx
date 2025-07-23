import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Cookie, Settings } from "lucide-react";
import { useCookieConsent } from "@/hooks/use-cookie-consent";

export default function CookieBanner() {
  const [showDetails, setShowDetails] = useState(false);
  const { 
    showBanner, 
    acceptAll, 
    acceptNecessary, 
    rejectAll, 
    setShowBanner 
  } = useCookieConsent();

  if (!showBanner) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-white shadow-lg border-0">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Cookie className="h-6 w-6 text-amber-600" />
              <h3 className="text-lg font-semibold text-gray-900">Cookie Policy</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBanner(false)}
              className="p-1 h-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              Utilizziamo i cookie per migliorare la tua esperienza di navigazione, 
              fornire funzionalità personalizzate e analizzare il nostro traffico.
            </p>

            {showDetails && (
              <div className="space-y-3 p-3 bg-gray-50 rounded-lg text-xs">
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Cookie Necessari</h4>
                  <p className="text-gray-600">
                    Essenziali per il funzionamento del sito (autenticazione, preferenze).
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Cookie Analitici</h4>
                  <p className="text-gray-600">
                    Ci aiutano a capire come i visitatori interagiscono con il sito.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Cookie di Marketing</h4>
                  <p className="text-gray-600">
                    Utilizzati per tracciare i visitatori sui siti web per visualizzare annunci pertinenti.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  onClick={acceptAll}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  Accetta Tutti
                </Button>
                <Button
                  onClick={acceptNecessary}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                >
                  Solo Necessari
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowDetails(!showDetails)}
                  variant="ghost"
                  className="flex-1 text-xs"
                  size="sm"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  {showDetails ? 'Nascondi' : 'Personalizza'}
                </Button>
                <Button
                  onClick={rejectAll}
                  variant="ghost"
                  className="flex-1 text-xs text-red-600 hover:text-red-700"
                  size="sm"
                >
                  Rifiuta Tutti
                </Button>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Puoi modificare le tue preferenze in qualsiasi momento.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
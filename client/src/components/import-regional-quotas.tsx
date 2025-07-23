import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Reserve } from "@shared/schema";

interface ImportRegionalQuotasProps {
  reserves: Reserve[];
  onImportComplete?: () => void;
}

export default function ImportRegionalQuotas({ reserves, onImportComplete }: ImportRegionalQuotasProps) {
  const [selectedReserve, setSelectedReserve] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const { toast } = useToast();

  const handleImportQuotas = async () => {
    if (!selectedReserve) {
      toast({
        title: "Errore",
        description: "Seleziona una riserva prima di importare le quote",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const response = await apiRequest("/api/superadmin/import-quotas", {
        method: "POST",
        body: JSON.stringify({ reserveId: selectedReserve })
      });

      setImportResult(response);
      toast({
        title: "Importazione completata",
        description: `${response.quotas.length} quote regionali importate con successo`,
      });

      if (onImportComplete) {
        onImportComplete();
      }
    } catch (error: any) {
      console.error("Errore importazione quote:", error);
      toast({
        title: "Errore nell'importazione",
        description: error.message || "Errore sconosciuto durante l'importazione",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Importazione Quote Regionali Ufficiali
        </CardTitle>
        <CardDescription>
          Importa le quote regionali ufficiali 2025-2026 estratte dai PDF della Regione Veneto
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selezione Riserva */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Riserva di destinazione</label>
          <Select value={selectedReserve} onValueChange={setSelectedReserve}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona la riserva" />
            </SelectTrigger>
            <SelectContent>
              {reserves.map((reserve) => (
                <SelectItem key={reserve.id} value={reserve.id}>
                  {reserve.name} ({reserve.comune})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Informazioni sui dati da importare */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">Dati disponibili per l'importazione:</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <div><strong>Capriolo Cison di Valmarino:</strong> M0(2), F0(12), FA(3), M1(4), MA(7) = 28 capi totali</div>
            <div><strong>Cervo Cison di Valmarino:</strong> CL0(2), MCL1(3), MM(3), FF(8) = 16 capi totali</div>
            <div><strong>Camoscio:</strong> 0 capi (nessuna quota assegnata)</div>
          </div>
          <div className="text-xs text-blue-600 mt-2">
            Fonte: PDF ufficiali Regione Veneto 2025-2026 (CA 28 - Cison di Valmarino)
          </div>
        </div>

        {/* Pulsante Importazione */}
        <Button
          onClick={handleImportQuotas}
          disabled={!selectedReserve || isImporting}
          className="w-full"
          size="lg"
        >
          {isImporting ? (
            <>
              <Upload className="w-4 h-4 mr-2 animate-spin" />
              Importazione in corso...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Importa Quote Regionali Ufficiali
            </>
          )}
        </Button>

        {/* Risultato Importazione */}
        {importResult && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h4 className="font-medium text-green-900">Importazione completata</h4>
            </div>
            <div className="text-sm text-green-800 space-y-2">
              <div><strong>Quote importate:</strong> {importResult.quotas.length}</div>
              <div><strong>Capriolo:</strong> {Object.entries(importResult.summary.capriolo).filter(([k]) => k !== 'totale').map(([cat, qty]) => `${cat}(${qty})`).join(', ')}</div>
              <div><strong>Cervo:</strong> {Object.entries(importResult.summary.cervo).filter(([k]) => k !== 'totale').map(([cat, qty]) => `${cat}(${qty})`).join(', ')}</div>
              <div className="text-xs text-green-600 mt-2">
                Le quote precedenti sono state sostituite con i dati ufficiali
              </div>
            </div>
          </div>
        )}

        {/* Avviso importante */}
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <strong>Attenzione:</strong> L'importazione sostituirà completamente le quote regionali esistenti per la riserva selezionata con i dati ufficiali estratti dai PDF della Regione Veneto 2025-2026.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
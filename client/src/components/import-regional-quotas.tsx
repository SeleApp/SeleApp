import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, CheckCircle, AlertCircle, Target } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Reserve } from "@shared/schema";

interface ImportRegionalQuotasProps {
  reserves: Reserve[];
  onImportComplete?: () => void;
}

const SPECIES_OPTIONS = [
  { value: 'roe_deer', label: 'Capriolo', description: 'Piano Abbattimento Capriolo 2025-2026' },
  { value: 'red_deer', label: 'Cervo', description: 'Piano Prelievo Cervo 2025-2026' },
  { value: 'chamois', label: 'Camoscio', description: 'Piano Prelievo Camoscio e Muflone 2025-2026' },
  { value: 'mouflon', label: 'Muflone', description: 'Piano Prelievo Camoscio e Muflone 2025-2026' }
];

export default function ImportRegionalQuotas({ reserves, onImportComplete }: ImportRegionalQuotasProps) {
  const [selectedSpecies, setSelectedSpecies] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const { toast } = useToast();

  const handleImportQuotas = async () => {
    if (!selectedSpecies) {
      toast({
        title: "Errore",
        description: "Seleziona una specie prima di importare le quote",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const response = await apiRequest("/api/superadmin/import-quotas-by-species", {
        method: "POST",
        body: JSON.stringify({ species: selectedSpecies })
      });

      setImportResult(response);
      toast({
        title: "Importazione completata",
        description: `${response.totalQuotas} quote regionali importate per ${response.totalReserves} riserve`,
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
          <Target className="h-5 w-5 text-blue-600" />
          Importazione Quote per Specie
        </CardTitle>
        <CardDescription>
          Importa le quote regionali per specie da applicare a tutte le riserve compatibili. 
          La Regione Veneto fornisce i piani di abbattimento organizzati per specie.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selezione Specie */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Specie da importare</label>
          <Select value={selectedSpecies} onValueChange={setSelectedSpecies}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona la specie da importare" />
            </SelectTrigger>
            <SelectContent>
              {SPECIES_OPTIONS.map((species) => (
                <SelectItem key={species.value} value={species.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{species.label}</span>
                    <span className="text-xs text-gray-600">{species.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Info sulla specie selezionata */}
        {selectedSpecies && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">
                  Importazione {SPECIES_OPTIONS.find(s => s.value === selectedSpecies)?.label}
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Le quote verranno applicate a tutte le riserve che hanno questa specie abilitata</li>
                  <li>Le quote esistenti per questa specie verranno sostituite con i dati ufficiali</li>
                  <li>I dati provengono dai PDF ufficiali della Regione Veneto 2025-2026</li>
                  <li>Solo le riserve con management_type compatibile riceveranno le quote</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Pulsante Importazione */}
        <Button
          onClick={handleImportQuotas}
          disabled={!selectedSpecies || isImporting}
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
              Importa Quote per Specie
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
              <div><strong>Riserve aggiornate:</strong> {importResult.totalReserves}</div>
              <div><strong>Quote totali importate:</strong> {importResult.totalQuotas}</div>
              <div><strong>Specie:</strong> {SPECIES_OPTIONS.find(s => s.value === selectedSpecies)?.label}</div>
              <div className="text-xs text-green-600 mt-2">
                Importazione completata per tutte le riserve compatibili
              </div>
            </div>
          </div>
        )}

        {/* Avviso importante */}
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <strong>Attenzione:</strong> L'importazione per specie sostituirà completamente le quote regionali esistenti per quella specie in tutte le riserve compatibili con i dati ufficiali dei PDF della Regione Veneto 2025-2026.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
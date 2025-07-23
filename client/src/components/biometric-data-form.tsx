import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Ruler, Scale, Activity } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import type { CreateHuntReportRequest } from "@/lib/types";

interface BiometricDataFormProps {
  form: UseFormReturn<CreateHuntReportRequest>;
  species?: string;
  sex?: string;
}

export default function BiometricDataForm({ form, species, sex }: BiometricDataFormProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isRoeDeer = species === 'roe_deer';
  const isRedDeer = species === 'red_deer';
  const isMale = sex === 'male';
  const isFemale = sex === 'female';

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full flex items-center justify-between p-4 h-auto"
        >
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <span className="font-medium">Dati Biometrici dell'Animale</span>
            <span className="text-sm text-gray-500">(Opzionale)</span>
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="space-y-6 mt-4 p-4 bg-gray-50 rounded-lg border">
        {/* Sezione Misure Corporee */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 mb-3">
            <Scale className="h-4 w-4 text-green-600" />
            <h4 className="font-medium text-gray-900">Misure Corporee</h4>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="weight" className="text-sm font-medium">
                Peso (kg)
              </Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                placeholder="es. 25.5"
                {...form.register("weight")}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="length" className="text-sm font-medium">
                Lunghezza totale (cm)
              </Label>
              <Input
                id="length"
                type="number"
                step="0.1"
                placeholder="es. 120.0"
                {...form.register("length")}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="chestGirth" className="text-sm font-medium">
                Circonferenza torace (cm)
              </Label>
              <Input
                id="chestGirth"
                type="number"
                step="0.1"
                placeholder="es. 85.0"
                {...form.register("chestGirth")}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="hindLegLength" className="text-sm font-medium">
                Lunghezza zampa post. (cm)
              </Label>
              <Input
                id="hindLegLength"
                type="number"
                step="0.1"
                placeholder="es. 45.0"
                {...form.register("hindLegLength")}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="earLength" className="text-sm font-medium">
                Lunghezza orecchio (cm)
              </Label>
              <Input
                id="earLength"
                type="number"
                step="0.1"
                placeholder="es. 8.5"
                {...form.register("earLength")}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="tailLength" className="text-sm font-medium">
                Lunghezza coda (cm)
              </Label>
              <Input
                id="tailLength"
                type="number"
                step="0.1"
                placeholder="es. 15.0"
                {...form.register("tailLength")}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Sezione Corna/Palchi (solo per maschi) */}
        {isMale && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-3">
              <Ruler className="h-4 w-4 text-amber-600" />
              <h4 className="font-medium text-gray-900">
                {isRoeDeer ? 'Palchi' : isRedDeer ? 'Corna' : 'Appendici craniali'}
              </h4>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="antlerPoints" className="text-sm font-medium">
                  Numero di punte
                </Label>
                <Input
                  id="antlerPoints"
                  type="number"
                  min="0"
                  max="20"
                  placeholder="es. 6"
                  {...form.register("antlerPoints")}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="antlerLength" className="text-sm font-medium">
                  Lunghezza massima (cm)
                </Label>
                <Input
                  id="antlerLength"
                  type="number"
                  step="0.1"
                  placeholder="es. 22.5"
                  {...form.register("antlerLength")}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Sezione Condizioni Fisiche */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Condizioni Fisiche</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="bodyCondition" className="text-sm font-medium">
                Condizione corporea
              </Label>
              <Select 
                value={form.watch("bodyCondition")} 
                onValueChange={(value) => form.setValue("bodyCondition", value as any)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleziona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ottima">Ottima</SelectItem>
                  <SelectItem value="buona">Buona</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="scarsa">Scarsa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="furCondition" className="text-sm font-medium">
                Condizione del pelo
              </Label>
              <Input
                id="furCondition"
                placeholder="es. estivo, invernale, muta"
                {...form.register("furCondition")}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="teethCondition" className="text-sm font-medium">
                Condizione denti
              </Label>
              <Input
                id="teethCondition"
                placeholder="es. perfetti, usurati, rotti"
                {...form.register("teethCondition")}
                className="mt-1"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="estimatedAge" className="text-sm font-medium">
                Età stimata (anni)
              </Label>
              <Input
                id="estimatedAge"
                type="number"
                min="0"
                max="20"
                placeholder="es. 3"
                {...form.register("estimatedAge")}
                className="mt-1"
              />
            </div>
            
            {isFemale && (
              <div>
                <Label htmlFor="reproductiveStatus" className="text-sm font-medium">
                  Stato riproduttivo
                </Label>
                <Input
                  id="reproductiveStatus"
                  placeholder="es. gravida, lattante, vuota"
                  {...form.register("reproductiveStatus")}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        </div>

        {/* Note biometriche */}
        <div>
          <Label htmlFor="biometricNotes" className="text-sm font-medium">
            Note sui dati biometrici
          </Label>
          <Textarea
            id="biometricNotes"
            placeholder="Eventuali osservazioni sui dati rilevati, particolarità anatomiche, metodologia di misurazione..."
            {...form.register("biometricNotes")}
            className="mt-1 min-h-[80px]"
          />
        </div>

        {/* Info aggiuntive */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Info:</strong> I dati biometrici sono completamente opzionali ma forniscono informazioni preziose per la gestione scientifica della fauna. 
            Le misure dovrebbero essere rilevate il prima possibile dopo l'abbattimento per garantire maggiore precisione.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
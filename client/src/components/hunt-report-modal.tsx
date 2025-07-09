import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertHuntReportSchema } from "@shared/schema";
import type { ReservationWithDetails, CreateHuntReportRequest } from "@/lib/types";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface HuntReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: ReservationWithDetails;
}

export default function HuntReportModal({ open, onOpenChange, reservation }: HuntReportModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showHarvestDetails, setShowHarvestDetails] = useState(false);
  const [killCardPhoto, setKillCardPhoto] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateHuntReportRequest>({
    resolver: zodResolver(insertHuntReportSchema.omit({ reportedAt: true })),
    defaultValues: {
      reservationId: reservation.id,
      outcome: "no_harvest",
      species: undefined,
      roeDeerCategory: undefined,
      redDeerCategory: undefined,
      sex: undefined,
      ageClass: undefined,
      notes: "",
      killCardPhoto: "",
    },
  });



  const createReport = useMutation({
    mutationFn: async (data: CreateHuntReportRequest) => {
      const response = await apiRequest("/api/reports", {
        method: "POST",
        body: JSON.stringify(data)
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/zones"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Report inviato",
        description: "Il report di caccia è stato inviato con successo.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Errore nell'invio del report",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const outcome = form.watch("outcome");
    setShowHarvestDetails(outcome === "harvest");
    if (outcome === "no_harvest") {
      form.setValue("species", undefined);
      form.setValue("sex", undefined);
      form.setValue("ageClass", undefined);
      form.setValue("roeDeerCategory", undefined);
      form.setValue("redDeerCategory", undefined);
    }
  }, [form]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calcola dimensioni ottimali (max 1200px larghezza/altezza)
        const maxSize = 1200;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Disegna l'immagine compressa
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Converti in base64 con qualità ridotta
        const quality = file.size > 2 * 1024 * 1024 ? 0.6 : 0.8;
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      
      img.onerror = () => reject(new Error('Errore nel caricamento dell\'immagine'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validazione tipo file
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Formato file non valido",
          description: "È possibile caricare solo immagini (JPG, PNG, GIF, etc.)",
          variant: "destructive",
        });
        event.target.value = "";
        return;
      }

      setIsLoading(true);
      
      try {
        let finalBase64: string;
        
        // Se il file è troppo grande, comprimi automaticamente
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "Compressione in corso",
            description: "File troppo grande, compressione automatica...",
          });
          finalBase64 = await compressImage(file);
        } else {
          // Carica normalmente
          finalBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = () => reject(new Error('Errore di lettura file'));
            reader.readAsDataURL(file);
          });
        }
        
        setKillCardPhoto(finalBase64);
        form.setValue("killCardPhoto", finalBase64);
        toast({
          title: "Foto caricata",
          description: "La foto è stata caricata con successo",
        });
        
      } catch (error) {
        console.error('Errore durante il caricamento della foto:', error);
        toast({
          title: "Errore caricamento",
          description: "Si è verificato un errore durante il caricamento della foto",
          variant: "destructive",
        });
        event.target.value = "";
      } finally {
        setIsLoading(false);
      }
    }
  };

  const onSubmit = async (data: CreateHuntReportRequest) => {
    // Validate that if harvest, we have species
    if (data.outcome === "harvest" && !data.species) {
      toast({
        title: "Errore",
        description: "Per un prelievo devi specificare la specie",
        variant: "destructive",
      });
      return;
    }

    // Validate photo upload solo per i prelievi
    if (data.outcome === "harvest" && !killCardPhoto) {
      toast({
        title: "Foto mancante",
        description: "È obbligatorio caricare la foto della scheda di abbattimento per i prelievi",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const submitData = { 
        ...data, 
        killCardPhoto: killCardPhoto || "",
        reservationId: Number(data.reservationId)
      };
      await createReport.mutateAsync(submitData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsLoading(false);
    setShowHarvestDetails(false);
    setKillCardPhoto("");
    form.reset({
      reservationId: reservation.id,
      outcome: "no_harvest",
      species: undefined,
      roeDeerCategory: undefined,
      redDeerCategory: undefined,
      sex: undefined,
      ageClass: undefined,
      notes: "",
      killCardPhoto: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900">
            Report di Caccia
          </DialogTitle>
        </DialogHeader>

        <div className="bg-gray-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
          <p className="text-base sm:text-lg font-medium text-gray-900">{reservation.zone.name}</p>
          <p className="text-sm sm:text-base text-gray-600">
            {format(new Date(reservation.huntDate), "dd MMMM yyyy", { locale: it })},{" "}
            {reservation.timeSlot === "morning" ? "Mattina" : 
             reservation.timeSlot === "afternoon" ? "Pomeriggio" : "Giornata intera"}
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
          <div>
            <Label className="block text-base sm:text-lg font-medium text-gray-700 mb-2">
              Esito Caccia
            </Label>
            <Select
              value={form.watch("outcome")}
              onValueChange={(value) => form.setValue("outcome", value as "no_harvest" | "harvest")}
            >
              <SelectTrigger className="h-12 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no_harvest">Nessun prelievo</SelectItem>
                <SelectItem value="harvest">Prelievo effettuato</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.outcome && (
              <p className="text-destructive text-sm mt-1">
                {form.formState.errors.outcome.message}
              </p>
            )}
          </div>

          {showHarvestDetails && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4">
                <h4 className="font-medium text-blue-900 mb-2 text-sm sm:text-base">Dettagli Capo Abbattuto</h4>
                <p className="text-xs sm:text-sm text-blue-700">
                  Seleziona attentamente il tipo di capo abbattuto. Questa informazione aggiornerà automaticamente le quote della zona.
                </p>
              </div>

              <div>
                <Label className="block text-base sm:text-lg font-medium text-gray-700 mb-2">
                  Specie *
                </Label>
                <Select
                  value={form.watch("species") || ""}
                  onValueChange={(value) => {
                    form.setValue("species", value as "roe_deer" | "red_deer");
                    // Reset category when species changes
                    form.setValue("roeDeerCategory", undefined);
                    form.setValue("redDeerCategory", undefined);
                  }}
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Seleziona la specie..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="roe_deer">🦌 Capriolo (Capreolus capreolus)</SelectItem>
                    <SelectItem value="red_deer">🦌 Cervo (Cervus elaphus)</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.species && (
                  <p className="text-destructive text-sm mt-1">
                    {form.formState.errors.species.message}
                  </p>
                )}
              </div>

              {form.watch("species") === "roe_deer" && (
                <div>
                  <Label className="block text-lg font-medium text-gray-700 mb-2">
                    Categoria Capriolo *
                  </Label>
                  <Select
                    value={form.watch("roeDeerCategory") || ""}
                    onValueChange={(value) => form.setValue("roeDeerCategory", value as "M0" | "F0" | "FA" | "M1" | "MA")}
                  >
                    <SelectTrigger className="input-large">
                      <SelectValue placeholder="Seleziona categoria..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M0">M0 - Maschio Giovane</SelectItem>
                      <SelectItem value="F0">F0 - Femmina Giovane</SelectItem>
                      <SelectItem value="FA">FA - Femmina Adulta</SelectItem>
                      <SelectItem value="M1">M1 - Maschio Fusone</SelectItem>
                      <SelectItem value="MA">MA - Maschio Adulto</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.roeDeerCategory && (
                    <p className="text-destructive text-sm mt-1">
                      {form.formState.errors.roeDeerCategory.message}
                    </p>
                  )}
                </div>
              )}

              {form.watch("species") === "red_deer" && (
                <div>
                  <Label className="block text-lg font-medium text-gray-700 mb-2">
                    Categoria Cervo *
                  </Label>
                  <Select
                    value={form.watch("redDeerCategory") || ""}
                    onValueChange={(value) => form.setValue("redDeerCategory", value as "CL0" | "FF" | "MM" | "MCL1")}
                  >
                    <SelectTrigger className="input-large">
                      <SelectValue placeholder="Seleziona categoria..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CL0">CL0 - Piccolo (M/F)</SelectItem>
                      <SelectItem value="FF">FF - Femmina Adulta</SelectItem>
                      <SelectItem value="MM">MM - Maschio Adulto</SelectItem>
                      <SelectItem value="MCL1">MCL1 - Maschio Fusone</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.redDeerCategory && (
                    <p className="text-destructive text-sm mt-1">
                      {form.formState.errors.redDeerCategory.message}
                    </p>
                  )}
                </div>
              )}

              {((form.watch("species") === "roe_deer" && form.watch("roeDeerCategory")) || 
                (form.watch("species") === "red_deer" && form.watch("redDeerCategory"))) && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-green-800 font-medium">
                    ✓ Capo selezionato: {form.watch("species") === "roe_deer" ? "Capriolo" : "Cervo"}{" "}
                    {form.watch("species") === "roe_deer" 
                      ? form.watch("roeDeerCategory") 
                      : form.watch("redDeerCategory")}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Sezione caricamento foto */}
          <div className={`border rounded-xl p-6 ${
            showHarvestDetails 
              ? "bg-amber-50 border-amber-200" 
              : "bg-gray-50 border-gray-200"
          }`}>
            <Label className={`block text-lg font-medium mb-3 ${
              showHarvestDetails ? "text-amber-800" : "text-gray-700"
            }`}>
              📸 Foto Scheda di Abbattimento {showHarvestDetails ? "*" : "(Opzionale)"}
            </Label>
            <p className={`text-sm mb-4 ${
              showHarvestDetails ? "text-amber-700" : "text-gray-600"
            }`}>
              {showHarvestDetails 
                ? "È obbligatorio caricare una foto della scheda di abbattimento compilata per i prelievi"
                : "Puoi caricare una foto della scheda di abbattimento compilata (facoltativo per nessun prelievo)"
              }
            </p>
            
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 mb-4"
              disabled={isLoading}
              capture="environment"
            />
            <p className="text-xs text-gray-500 mt-1">
              Formati supportati: JPG, PNG, GIF. File grandi vengono compressi automaticamente
            </p>
            
            {killCardPhoto && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-green-700 font-medium">✓ Foto caricata con successo</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setKillCardPhoto("");
                      form.setValue("killCardPhoto", "");
                      // Reset file input
                      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                      if (fileInput) fileInput.value = "";
                    }}
                  >
                    Rimuovi
                  </Button>
                </div>
                <div className="relative">
                  <img 
                    src={killCardPhoto} 
                    alt="Anteprima scheda di abbattimento" 
                    className="max-w-full h-48 object-cover rounded-lg border border-gray-300"
                  />
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
                    ✓ Valida
                  </div>
                </div>
              </div>
            )}
            
            {!killCardPhoto && (
              <div className="border-2 border-dashed border-amber-300 rounded-lg p-8 text-center text-amber-600">
                <p className="text-lg font-medium">Nessuna foto caricata</p>
                <p className="text-sm">Seleziona un file per continuare</p>
              </div>
            )}
          </div>

          <div>
            <Label className="block text-lg font-medium text-gray-700 mb-2">
              Note (opzionale)
            </Label>
            <Textarea
              {...form.register("notes")}
              rows={3}
              className="input-large"
              placeholder="Note aggiuntive..."
              disabled={isLoading}
            />
          </div>

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <Button
              type="button"
              onClick={handleClose}
              variant="outline"
              className="flex-1 h-12 text-base order-2 sm:order-1"
              disabled={isLoading}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={isLoading || (showHarvestDetails && !killCardPhoto)}
              className="flex-1 h-12 text-base bg-blue-600 hover:bg-blue-700 order-1 sm:order-2"
            >
              {isLoading ? "Invio..." : (showHarvestDetails && !killCardPhoto) ? "Carica la Foto" : "Invia Report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

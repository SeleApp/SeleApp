import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertHuntReportSchema } from "@shared/schema";
import type { CreateHuntReportRequest } from "@/lib/types";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface AdminReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AdminReportModal({ open, onOpenChange }: AdminReportModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showHarvestDetails, setShowHarvestDetails] = useState(false);
  const [killCardPhoto, setKillCardPhoto] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reservations = [] } = useQuery({
    queryKey: ["/api/reservations"],
    enabled: open,
  });

  // Filter completed reservations without reports
  const availableReservations = reservations.filter((r: any) => 
    r.status === 'completed' && !r.hasReport
  );

  const form = useForm<CreateHuntReportRequest>({
    resolver: zodResolver(insertHuntReportSchema.omit({ reportedAt: true })),
    defaultValues: {
      reservationId: 0,
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

  const outcome = form.watch("outcome");

  useEffect(() => {
    setShowHarvestDetails(outcome === "harvest");
    if (outcome === "no_harvest") {
      form.setValue("species", undefined);
      form.setValue("sex", undefined);
      form.setValue("ageClass", undefined);
    }
  }, [outcome, form]);

  // Sistema di compressione immagini identico al form hunter
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
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/regional-quotas"] });
      toast({
        title: "Report creato",
        description: "Il report di supporto è stato creato con successo dall'admin.",
      });
      onOpenChange(false);
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Errore nella creazione del report",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

    // Validate photo upload for harvests - optional for admin but recommended
    if (data.outcome === "harvest" && !killCardPhoto) {
      toast({
        title: "Avviso foto mancante",
        description: "Raccomandato: carica la foto della scheda di abbattimento per i prelievi",
      });
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
      reservationId: 0,
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
      <DialogContent className="w-full max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900">
            Report di Supporto Admin
          </DialogTitle>
        </DialogHeader>

        {/* Selezione prenotazione (solo per admin) */}
        <div className="bg-purple-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
          <Label className="block text-base sm:text-lg font-medium text-purple-900 mb-2">
            Prenotazione Completata
          </Label>
          <Select
            value={form.watch("reservationId")?.toString() || ""}
            onValueChange={(value) => form.setValue("reservationId", Number(value))}
          >
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder="Seleziona una prenotazione completata..." />
            </SelectTrigger>
            <SelectContent>
              {availableReservations.map((reservation: any) => (
                <SelectItem key={reservation.id} value={reservation.id.toString()}>
                  {reservation.hunter.firstName} {reservation.hunter.lastName} - {reservation.zone.name} - {format(new Date(reservation.huntDate), "dd MMM yyyy", { locale: it })} - {reservation.timeSlot === "morning" ? "Mattina" : reservation.timeSlot === "afternoon" ? "Pomeriggio" : "Giornata intera"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.reservationId && (
            <p className="text-destructive text-sm mt-1">
              Seleziona una prenotazione
            </p>
          )}
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
                    <SelectTrigger className="h-12 text-base">
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
                    <SelectTrigger className="h-12 text-base">
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
              📸 Foto Scheda di Abbattimento {showHarvestDetails ? "(Raccomandato)" : "(Opzionale)"}
            </Label>
            <p className={`text-sm mb-4 ${
              showHarvestDetails ? "text-amber-700" : "text-gray-600"
            }`}>
              {showHarvestDetails 
                ? "Raccomandato: carica una foto della scheda di abbattimento compilata per i prelievi"
                : "Puoi caricare una foto della scheda di abbattimento compilata (facoltativo per nessun prelievo)"
              }
            </p>
            
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-100 file:text-purple-800 hover:file:bg-purple-200 mb-4"
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
                    }}
                  >
                    Rimuovi
                  </Button>
                </div>
                <div className="w-full max-w-xs border rounded-lg overflow-hidden">
                  <img
                    src={killCardPhoto}
                    alt="Anteprima foto"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <Label className="block text-base sm:text-lg font-medium text-gray-700 mb-2">
              Note aggiuntive (opzionale)
            </Label>
            <Textarea
              placeholder="Inserisci eventuali note aggiuntive, osservazioni o informazioni rilevanti..."
              className="text-base min-h-[80px]"
              value={form.watch("notes") || ""}
              onChange={(e) => form.setValue("notes", e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              className="w-full sm:w-auto h-12 text-base"
              disabled={isLoading}
            >
              Annulla
            </Button>
            <Button 
              type="submit" 
              className="w-full sm:flex-1 h-12 text-base bg-purple-600 hover:bg-purple-700"
              disabled={isLoading || createReport.isPending}
            >
              {isLoading || createReport.isPending ? "Creando..." : "Crea Report di Supporto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
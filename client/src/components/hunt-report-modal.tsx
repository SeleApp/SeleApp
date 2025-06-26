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
      return response.json();
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

  const outcome = form.watch("outcome");

  useEffect(() => {
    setShowHarvestDetails(outcome === "harvest");
    if (outcome === "no_harvest") {
      form.setValue("species", undefined);
      form.setValue("sex", undefined);
      form.setValue("ageClass", undefined);
    }
  }, [outcome, form]);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File troppo grande",
          description: "La foto deve essere inferiore a 5MB",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setKillCardPhoto(base64);
        form.setValue("killCardPhoto", base64);
      };
      reader.readAsDataURL(file);
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

    // Validate photo upload
    if (!killCardPhoto) {
      toast({
        title: "Foto mancante",
        description: "È obbligatorio caricare la foto della scheda di abbattimento",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const submitData = { ...data, killCardPhoto };
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
      <DialogContent className="w-full max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            Report di Caccia
          </DialogTitle>
        </DialogHeader>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-lg font-medium text-gray-900">{reservation.zone.name}</p>
          <p className="text-gray-600">
            {format(new Date(reservation.huntDate), "dd MMMM yyyy", { locale: it })},{" "}
            {reservation.timeSlot === "morning" ? "Mattina" : "Pomeriggio"}
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label className="block text-lg font-medium text-gray-700 mb-2">
              Esito Caccia
            </Label>
            <Select
              value={form.watch("outcome")}
              onValueChange={(value) => form.setValue("outcome", value as "no_harvest" | "harvest")}
            >
              <SelectTrigger className="input-large">
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
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-medium text-blue-900 mb-2">Dettagli Capo Abbattuto</h4>
                <p className="text-sm text-blue-700">
                  Seleziona attentamente il tipo di capo abbattuto. Questa informazione aggiornerà automaticamente le quote della zona.
                </p>
              </div>

              <div>
                <Label className="block text-lg font-medium text-gray-700 mb-2">
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
                  <SelectTrigger className="input-large">
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

          {/* Sezione caricamento foto obbligatoria */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <Label className="block text-lg font-medium text-amber-800 mb-3">
              📸 Foto Scheda di Abbattimento *
            </Label>
            <p className="text-amber-700 text-sm mb-4">
              È obbligatorio caricare una foto della scheda di abbattimento compilata
            </p>
            
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 mb-4"
            />
            
            {killCardPhoto && (
              <div className="mt-4">
                <p className="text-green-700 font-medium mb-2">✓ Foto caricata con successo</p>
                <img 
                  src={killCardPhoto} 
                  alt="Anteprima scheda di abbattimento" 
                  className="max-w-full h-48 object-cover rounded-lg border border-gray-300"
                />
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

          <div className="flex space-x-4">
            <Button
              type="button"
              onClick={handleClose}
              variant="outline"
              className="flex-1 btn-large"
              disabled={isLoading}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !killCardPhoto}
              className="flex-1 btn-large bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isLoading ? "Invio..." : !killCardPhoto ? "Carica la Foto" : "Invia Report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

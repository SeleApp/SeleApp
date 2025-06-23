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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateHuntReportRequest>({
    resolver: zodResolver(insertHuntReportSchema.omit({ reportedAt: true })),
    defaultValues: {
      reservationId: reservation.id,
      outcome: "no_harvest",
      species: undefined,
      sex: undefined,
      ageClass: undefined,
      notes: "",
    },
  });

  const createReport = useMutation({
    mutationFn: async (data: CreateHuntReportRequest) => {
      const response = await apiRequest("POST", "/api/reports", data);
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

  const onSubmit = async (data: CreateHuntReportRequest) => {
    setIsLoading(true);
    try {
      await createReport.mutateAsync(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setShowHarvestDetails(false);
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
                  onValueChange={(value) => form.setValue("species", value as "roe_deer" | "red_deer")}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="block text-lg font-medium text-gray-700 mb-2">
                    Sesso *
                  </Label>
                  <Select
                    value={form.watch("sex") || ""}
                    onValueChange={(value) => form.setValue("sex", value as "male" | "female")}
                  >
                    <SelectTrigger className="input-large">
                      <SelectValue placeholder="Seleziona..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">♂ Maschio</SelectItem>
                      <SelectItem value="female">♀ Femmina</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.sex && (
                    <p className="text-destructive text-sm mt-1">
                      {form.formState.errors.sex.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="block text-lg font-medium text-gray-700 mb-2">
                    Classe d'Età *
                  </Label>
                  <Select
                    value={form.watch("ageClass") || ""}
                    onValueChange={(value) => form.setValue("ageClass", value as "adult" | "young")}
                  >
                    <SelectTrigger className="input-large">
                      <SelectValue placeholder="Seleziona..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adult">🦌 Adulto (&gt;1 anno)</SelectItem>
                      <SelectItem value="young">🦌 Giovane (&lt;1 anno)</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.ageClass && (
                    <p className="text-destructive text-sm mt-1">
                      {form.formState.errors.ageClass.message}
                    </p>
                  )}
                </div>
              </div>

              {form.watch("species") && form.watch("sex") && form.watch("ageClass") && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-green-800 font-medium">
                    ✓ Capo selezionato: {form.watch("species") === "roe_deer" ? "Capriolo" : "Cervo"}{" "}
                    {form.watch("sex") === "male" ? "Maschio" : "Femmina"}{" "}
                    {form.watch("ageClass") === "adult" ? "Adulto" : "Giovane"}
                  </p>
                </div>
              )}
            </div>
          )}

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
              disabled={isLoading}
              className="flex-1 btn-large bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isLoading ? "Invio..." : "Invia Report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

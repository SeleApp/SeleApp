import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const adminReportSchema = z.object({
  reservationId: z.string().min(1, "Seleziona una prenotazione"),
  outcome: z.enum(["harvest", "no_harvest"]),
  species: z.enum(["roe_deer", "red_deer"]).optional(),
  sex: z.enum(["male", "female"]).optional(),
  ageClass: z.enum(["adult", "young"]).optional(),
  notes: z.string().optional(),
});

type AdminReportFormData = z.infer<typeof adminReportSchema>;

interface AdminReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AdminReportModal({ open, onOpenChange }: AdminReportModalProps) {
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

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm<AdminReportFormData>({
    resolver: zodResolver(adminReportSchema),
    defaultValues: {
      outcome: "no_harvest",
    },
  });

  const selectedOutcome = watch("outcome");

  const createReportMutation = useMutation({
    mutationFn: async (data: AdminReportFormData) => {
      const reportData = {
        reservationId: parseInt(data.reservationId),
        outcome: data.outcome,
        species: data.outcome === "harvest" ? data.species : undefined,
        roeDeerCategory: data.outcome === "harvest" && data.species === "roe_deer" ? "M0" : undefined,
        redDeerCategory: data.outcome === "harvest" && data.species === "red_deer" ? "CL0" : undefined,
        sex: data.outcome === "harvest" ? data.sex : undefined,
        ageClass: data.outcome === "harvest" ? data.ageClass : undefined,
        notes: data.notes || "",
        killCardPhoto: "",
      };
      
      return await apiRequest("/api/reports", {
        method: "POST",
        body: JSON.stringify(reportData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Report creato",
        description: "Il report di supporto è stato creato con successo.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/regional-quotas"] });
      onOpenChange(false);
      reset();
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante la creazione del report.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AdminReportFormData) => {
    createReportMutation.mutate(data);
  };

  React.useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Nuovo Report di Supporto</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reservationId">Prenotazione Completata</Label>
            <Controller
              name="reservationId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona una prenotazione" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableReservations.map((reservation: any) => (
                      <SelectItem key={reservation.id} value={reservation.id.toString()}>
                        {reservation.hunter.firstName} {reservation.hunter.lastName} - {reservation.zone.name} - {new Date(reservation.huntDate).toLocaleDateString('it-IT')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.reservationId && (
              <p className="text-sm text-red-600">{errors.reservationId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="outcome">Esito della Caccia</Label>
            <Controller
              name="outcome"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_harvest">Nessun Prelievo</SelectItem>
                    <SelectItem value="harvest">Prelievo Effettuato</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {selectedOutcome === "harvest" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="species">Specie</Label>
                <Controller
                  name="species"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona la specie" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="roe_deer">Capriolo</SelectItem>
                        <SelectItem value="red_deer">Cervo</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sex">Sesso</Label>
                <Controller
                  name="sex"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona il sesso" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Maschio</SelectItem>
                        <SelectItem value="female">Femmina</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ageClass">Classe di Età</Label>
                <Controller
                  name="ageClass"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona l'età" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="young">Giovane</SelectItem>
                        <SelectItem value="adult">Adulto</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Note (opzionale)</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Inserisci eventuali note aggiuntive..."
              rows={3}
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Annulla
            </Button>
            <Button 
              type="submit" 
              disabled={createReportMutation.isPending}
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto order-1 sm:order-2"
            >
              {createReportMutation.isPending ? "Creando..." : "Crea Report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
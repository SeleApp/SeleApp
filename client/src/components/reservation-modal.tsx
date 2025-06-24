import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { createReservationSchema } from "@shared/schema";
import type { ZoneWithQuotas, CreateReservationRequest as ClientCreateReservationRequest } from "@/lib/types";

interface ReservationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zones: ZoneWithQuotas[];
}

export default function ReservationModal({ open, onOpenChange, zones }: ReservationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ClientCreateReservationRequest>({
    resolver: zodResolver(createReservationSchema.omit({ hunterId: true })),
    defaultValues: {
      zoneId: 0,
      huntDate: "",
      timeSlot: undefined,
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;

  const mutation = useMutation({
    mutationFn: async (data: ClientCreateReservationRequest) => {
      const response = await apiRequest("POST", "/api/reservations", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/zones"] });
      toast({
        title: "Prenotazione confermata",
        description: "La tua prenotazione è stata creata con successo.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Errore nella prenotazione",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: ClientCreateReservationRequest) => {
    mutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-bold text-gray-900">Nuova Prenotazione</DialogTitle>
          <DialogDescription className="text-lg text-gray-600">
            Seleziona data, orario e zona per la tua prossima caccia.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-8 py-6">
            {/* Data Selection */}
            <div className="space-y-3">
              <Label className="text-xl font-semibold text-gray-900">📅 Data di Caccia</Label>
              <Input
                id="huntDate"
                type="date"
                className="w-full text-xl p-6 border-3 border-gray-300 rounded-xl focus:border-primary text-center"
                {...register("huntDate", { required: "La data è obbligatoria" })}
              />
              {errors.huntDate && (
                <p className="text-red-600 text-lg font-medium">{errors.huntDate.message}</p>
              )}
            </div>

            {/* Time Slot Selection */}
            <div className="space-y-4">
              <Label className="text-xl font-semibold text-gray-900">⏰ Fascia Oraria</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  type="button"
                  onClick={() => setValue("timeSlot", "morning")}
                  className={`p-8 rounded-xl border-3 text-xl font-medium transition-all ${
                    watch("timeSlot") === "morning"
                      ? "border-primary bg-primary/20 text-primary shadow-lg"
                      : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                  }`}
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">🌅</div>
                    <div className="text-2xl font-bold">Alba - 12:00</div>
                    <div className="text-lg text-gray-600 mt-2">Mattina</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setValue("timeSlot", "afternoon")}
                  className={`p-8 rounded-xl border-3 text-xl font-medium transition-all ${
                    watch("timeSlot") === "afternoon"
                      ? "border-primary bg-primary/20 text-primary shadow-lg"
                      : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                  }`}
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">🌇</div>
                    <div className="text-2xl font-bold">12:00 - Tramonto</div>
                    <div className="text-lg text-gray-600 mt-2">Pomeriggio</div>
                  </div>
                </button>
              </div>
              {errors.timeSlot && (
                <p className="text-red-600 text-lg font-medium">{errors.timeSlot.message}</p>
              )}
            </div>

            {/* Zone Selection */}
            <div className="space-y-4">
              <Label className="text-xl font-semibold text-gray-900">🗺️ Zona di Caccia</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-80 overflow-y-auto border-2 rounded-xl p-6 bg-gray-50">
                {zones.slice(0, 16).map((zone) => (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => setValue("zoneId", zone.id)}
                    className={`p-6 rounded-xl border-3 text-center transition-all ${
                      watch("zoneId") === zone.id
                        ? "border-primary bg-primary/20 text-primary shadow-lg transform scale-105"
                        : zone.quotaStatus === '🔴' 
                        ? "border-red-300 bg-red-50 text-red-600 cursor-not-allowed opacity-60"
                        : "border-gray-300 hover:border-gray-400 hover:bg-white hover:shadow-md"
                    }`}
                    disabled={zone.quotaStatus === '🔴'}
                  >
                    <div className="text-2xl font-bold mb-2">{zone.name}</div>
                    <div className="text-sm font-medium">
                      {zone.quotaStatus === '🟢' ? '✅ Disponibile' : 
                       zone.quotaStatus === '🟡' ? '⚠️ Quote Basse' : 
                       '❌ Non Disponibile'}
                    </div>
                  </button>
                ))}
              </div>
              {errors.zoneId && (
                <p className="text-red-600 text-lg font-medium">{errors.zoneId.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="text-xl py-4 px-8 h-auto"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-accent hover:bg-accent/90 text-accent-foreground text-xl py-4 px-8 h-auto font-semibold"
            >
              {mutation.isPending ? "Prenotazione in corso..." : "Conferma Prenotazione"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
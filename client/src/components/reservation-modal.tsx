import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { createReservationSchema, type CreateReservationRequest } from "@shared/schema";
import type { ZoneWithQuotas, CreateReservationRequest as ClientCreateReservationRequest } from "@/lib/types";

interface ReservationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zones: ZoneWithQuotas[];
}

export default function ReservationModal({ open, onOpenChange, zones }: ReservationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
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

  const createReservation = useMutation({
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
    setIsLoading(true);
    try {
      await createReservation.mutateAsync(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  // Filter available zones (not quota exhausted)
  const availableZones = zones.filter(zone => zone.quotaStatus !== '🔴');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            Nuova Prenotazione
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label className="block text-lg font-medium text-gray-700 mb-2">
              Zona
            </Label>
            <Select
              value={form.watch("zoneId")?.toString() || ""}
              onValueChange={(value) => form.setValue("zoneId", parseInt(value))}
            >
              <SelectTrigger className="input-large">
                <SelectValue placeholder="Seleziona zona..." />
              </SelectTrigger>
              <SelectContent>
                {availableZones.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id.toString()}>
                    {zone.name} {zone.quotaStatus}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.zoneId && (
              <p className="text-destructive text-sm mt-1">
                {form.formState.errors.zoneId.message}
              </p>
            )}
          </div>

          <div>
            <Label className="block text-lg font-medium text-gray-700 mb-2">
              Data
            </Label>
            <input
              type="date"
              {...form.register("huntDate")}
              className="input-large w-full"
              min={new Date().toISOString().split('T')[0]}
              disabled={isLoading}
            />
            {form.formState.errors.huntDate && (
              <p className="text-destructive text-sm mt-1">
                {form.formState.errors.huntDate.message}
              </p>
            )}
          </div>

          <div>
            <Label className="block text-lg font-medium text-gray-700 mb-2">
              Fascia Oraria
            </Label>
            <Select
              value={form.watch("timeSlot")}
              onValueChange={(value) => form.setValue("timeSlot", value as "morning" | "afternoon")}
            >
              <SelectTrigger className="input-large">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Mattina (6:00 - 12:00)</SelectItem>
                <SelectItem value="afternoon">Pomeriggio (14:00 - 18:00)</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.timeSlot && (
              <p className="text-destructive text-sm mt-1">
                {form.formState.errors.timeSlot.message}
              </p>
            )}
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
              disabled={isLoading || availableZones.length === 0}
              className="flex-1 btn-large bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isLoading ? "Prenotazione..." : "Conferma"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

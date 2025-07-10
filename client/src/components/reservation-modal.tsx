import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { createReservationSchema } from "@shared/schema";
import type { ZoneWithQuotas, CreateReservationRequest as ClientCreateReservationRequest } from "@/lib/types";
import { useState } from "react";

interface ReservationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zones: ZoneWithQuotas[];
}

export default function ReservationModal({ open, onOpenChange, zones }: ReservationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showTargetSelection, setShowTargetSelection] = useState(false);

  // Fetch regional quotas to show available categories
  const { data: quotas = [] } = useQuery({
    queryKey: ['/api/regional-quotas'],
    enabled: showTargetSelection,
  });

  const form = useForm<ClientCreateReservationRequest>({
    resolver: zodResolver(createReservationSchema.omit({ hunterId: true })),
    defaultValues: {
      zoneId: 0,
      huntDate: "",
      timeSlot: undefined,
      targetSpecies: undefined,
      targetRoeDeerCategory: undefined,
      targetRedDeerCategory: undefined,
      targetSex: undefined,
      targetAgeClass: undefined,
      targetNotes: "",
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
    console.log("Frontend form data:", data);
    console.log("Current form values:", form.getValues());
    console.log("Target species state:", selectedSpecies);
    mutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    setShowTargetSelection(false);
    onOpenChange(false);
  };

  const selectedSpecies = watch("targetSpecies");
  const selectedZone = watch("zoneId");
  const selectedTimeSlot = watch("timeSlot");

  // Filter quotas based on availability 
  const availableRoeDeerCategories = quotas
    .filter(q => q.species === 'roe_deer' && q.available > 0)
    .map(q => q.roeDeerCategory)
    .filter(Boolean);

  const availableRedDeerCategories = quotas
    .filter(q => q.species === 'red_deer' && q.available > 0)
    .map(q => q.redDeerCategory)
    .filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-bold text-gray-900">Nuova Prenotazione</DialogTitle>
          <DialogDescription className="text-lg text-gray-600">
            Seleziona data, orario, zona e opzionalmente il capo target per la tua prossima caccia.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Hidden inputs for target species to ensure they are included in form submission */}
          <input type="hidden" {...register("targetSpecies")} />
          <input type="hidden" {...register("targetRoeDeerCategory")} />
          <input type="hidden" {...register("targetRedDeerCategory")} />
          <input type="hidden" {...register("targetSex")} />
          <input type="hidden" {...register("targetAgeClass")} />
          <input type="hidden" {...register("targetNotes")} />
          
          <div className="space-y-8 py-6">
            {/* Data Selection */}
            <div className="space-y-3">
              <Label className="text-xl font-semibold text-gray-900">Data di Caccia</Label>
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
              <Label className="text-xl font-semibold text-gray-900">Fascia Oraria</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <div className="text-2xl font-bold">12:00 - Tramonto</div>
                    <div className="text-lg text-gray-600 mt-2">Pomeriggio</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setValue("timeSlot", "full_day")}
                  className={`p-8 rounded-xl border-3 text-xl font-medium transition-all ${
                    watch("timeSlot") === "full_day"
                      ? "border-primary bg-primary/20 text-primary shadow-lg"
                      : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold">Alba - Tramonto</div>
                    <div className="text-lg text-gray-600 mt-2">Tutto il Giorno</div>
                  </div>
                </button>
              </div>
              {errors.timeSlot && (
                <p className="text-red-600 text-lg font-medium">{errors.timeSlot.message}</p>
              )}
            </div>

            {/* Zone Selection */}
            <div className="space-y-4">
              <Label className="text-xl font-semibold text-gray-900">Zona di Caccia</Label>
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
                      {zone.quotaStatus === '🟢' ? 'Disponibile' : 
                       zone.quotaStatus === '🟡' ? 'Quote Basse' : 
                       'Non Disponibile'}
                    </div>
                  </button>
                ))}
              </div>
              {errors.zoneId && (
                <p className="text-red-600 text-lg font-medium">{errors.zoneId.message}</p>
              )}
            </div>

            {/* Target Species Selection (Optional) */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <Label className="text-xl font-semibold text-gray-900">Selezione Capo Target (Opzionale)</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTargetSelection(!showTargetSelection)}
                  className="text-sm"
                >
                  {showTargetSelection ? "Nascondi" : "Specifica Capo"}
                </Button>
              </div>
              
              {showTargetSelection && (
                <div className="bg-blue-50 rounded-xl p-6 space-y-6">
                  <div className="text-sm text-blue-700 mb-4">
                    💡 <strong>Suggerimento:</strong> Specificare il capo target aiuta nella gestione delle quote e fornisce maggiori dettagli per la caccia.
                  </div>

                  {/* Species Selection */}
                  <div className="space-y-3">
                    <Label className="text-lg font-medium">Specie</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setValue("targetSpecies", "roe_deer");
                          setValue("targetRedDeerCategory", undefined);
                        }}
                        className={`p-4 rounded-lg border-2 text-lg font-medium transition-all ${
                          selectedSpecies === "roe_deer"
                            ? "border-blue-500 bg-blue-100 text-blue-700"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        🦌 Capriolo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setValue("targetSpecies", "red_deer");
                          setValue("targetRoeDeerCategory", undefined);
                        }}
                        className={`p-4 rounded-lg border-2 text-lg font-medium transition-all ${
                          selectedSpecies === "red_deer"
                            ? "border-blue-500 bg-blue-100 text-blue-700"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        🦌 Cervo
                      </button>
                    </div>
                  </div>

                  {/* Category Selection for Roe Deer */}
                  {selectedSpecies === "roe_deer" && (
                    <div className="space-y-3">
                      <Label className="text-lg font-medium">Categoria Capriolo</Label>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                        {['M0', 'F0', 'FA', 'M1', 'MA'].map((category) => {
                          const isAvailable = availableRoeDeerCategories.includes(category);
                          return (
                            <button
                              key={category}
                              type="button"
                              onClick={() => setValue("targetRoeDeerCategory", category as any)}
                              disabled={!isAvailable}
                              className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                                watch("targetRoeDeerCategory") === category
                                  ? "border-blue-500 bg-blue-100 text-blue-700"
                                  : isAvailable
                                  ? "border-gray-300 hover:border-gray-400"
                                  : "border-red-200 bg-red-50 text-red-400 cursor-not-allowed"
                              }`}
                            >
                              {category}
                              {!isAvailable && <div className="text-xs mt-1">Esaurito</div>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Category Selection for Red Deer */}
                  {selectedSpecies === "red_deer" && (
                    <div className="space-y-3">
                      <Label className="text-lg font-medium">Categoria Cervo</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {['CL0', 'FF', 'MM', 'MCL1'].map((category) => {
                          const isAvailable = availableRedDeerCategories.includes(category);
                          return (
                            <button
                              key={category}
                              type="button"
                              onClick={() => setValue("targetRedDeerCategory", category as any)}
                              disabled={!isAvailable}
                              className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                                watch("targetRedDeerCategory") === category
                                  ? "border-blue-500 bg-blue-100 text-blue-700"
                                  : isAvailable
                                  ? "border-gray-300 hover:border-gray-400"
                                  : "border-red-200 bg-red-50 text-red-400 cursor-not-allowed"
                              }`}
                            >
                              {category}
                              {!isAvailable && <div className="text-xs mt-1">Esaurito</div>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sex and Age Class */}
                  {selectedSpecies && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-lg font-medium">Sesso (Opzionale)</Label>
                        <Select onValueChange={(value) => setValue("targetSex", value as any)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleziona sesso" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Maschio</SelectItem>
                            <SelectItem value="female">Femmina</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-lg font-medium">Classe Età (Opzionale)</Label>
                        <Select onValueChange={(value) => setValue("targetAgeClass", value as any)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleziona età" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="adult">Adulto</SelectItem>
                            <SelectItem value="young">Giovane</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Target Notes */}
                  <div className="space-y-3">
                    <Label className="text-lg font-medium">Note Aggiuntive (Opzionale)</Label>
                    <Textarea
                      {...register("targetNotes")}
                      placeholder="Aggiungi note specifiche per il capo target..."
                      className="w-full h-20 resize-none"
                    />
                  </div>

                  {/* Summary of selection */}
                  {selectedSpecies && (
                    <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
                      <div className="text-sm font-medium text-blue-800 mb-2">Capo Target Selezionato:</div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          {selectedSpecies === 'roe_deer' ? 'Capriolo' : 'Cervo'}
                        </Badge>
                        {watch("targetRoeDeerCategory") && (
                          <Badge variant="secondary">{watch("targetRoeDeerCategory")}</Badge>
                        )}
                        {watch("targetRedDeerCategory") && (
                          <Badge variant="secondary">{watch("targetRedDeerCategory")}</Badge>
                        )}
                        {watch("targetSex") && (
                          <Badge variant="outline">
                            {watch("targetSex") === 'male' ? 'Maschio' : 'Femmina'}
                          </Badge>
                        )}
                        {watch("targetAgeClass") && (
                          <Badge variant="outline">
                            {watch("targetAgeClass") === 'adult' ? 'Adulto' : 'Giovane'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
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
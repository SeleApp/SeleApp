import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { createReservationSchema } from "@shared/schema";
import type { ZoneWithQuotas } from "@/lib/types";
import type { z } from "zod";

type CreateReservationInput = z.infer<typeof createReservationSchema>;

interface ReservationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zones: ZoneWithQuotas[];
}

export default function ReservationModalNew({ open, onOpenChange, zones }: ReservationModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateReservationInput>({
    resolver: zodResolver(createReservationSchema),
    defaultValues: {
      huntDate: "",
      zoneId: 0,
      timeSlot: "morning",
      targetSpecies: undefined,
      targetRoeDeerCategory: undefined,
      targetRedDeerCategory: undefined,
      targetSex: undefined,
      targetAgeClass: undefined,
      targetNotes: "",
    },
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = form;

  const selectedSpecies = watch("targetSpecies");

  const createReservationMutation = useMutation({
    mutationFn: (data: CreateReservationInput) => 
      apiRequest("/api/reservations", { method: "POST", body: data }),
    onSuccess: () => {
      toast({
        title: "Successo",
        description: "Prenotazione creata con successo!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la creazione della prenotazione",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateReservationInput) => {
    createReservationMutation.mutate(data);
  };

  const handleClose = () => {
    reset();
    setCurrentStep(1);
    onOpenChange(false);
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!watch("huntDate");
      case 2:
        return !!watch("zoneId");
      case 3:
        return !!watch("timeSlot");
      case 4:
        return true; // Step 4 is optional
      default:
        return true;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Nuova Prenotazione Multi-Step
          </DialogTitle>
          <DialogDescription className="text-lg text-gray-600">
            Passo {currentStep} di {totalSteps}: {
              currentStep === 1 ? 'Seleziona la data' :
              currentStep === 2 ? 'Seleziona la zona' :
              currentStep === 3 ? 'Scegli l\'orario' :
              currentStep === 4 ? 'Specifica specie e classe di età (opzionale)' :
              'Conferma la prenotazione'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex justify-between items-center mb-8">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                step === currentStep ? 'bg-blue-600' : 
                step < currentStep ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                {step}
              </div>
              <div className={`text-sm ml-2 hidden sm:block ${step === currentStep ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
                {step === 1 ? 'Data' :
                 step === 2 ? 'Zona' :
                 step === 3 ? 'Orario' :
                 step === 4 ? 'Capo Target' : 'Conferma'}
              </div>
              {step < 5 && <div className="w-4 sm:w-8 h-1 bg-gray-300 mx-2 sm:mx-4"></div>}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="min-h-[400px] py-6">
            {/* STEP 1: DATA SELECTION */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">Seleziona la Data</h3>
                  <p className="text-lg text-gray-600">Scegli il giorno per la tua caccia</p>
                </div>
                <div className="max-w-md mx-auto">
                  <Input
                    id="huntDate"
                    type="date"
                    className="w-full text-xl p-6 border-3 border-gray-300 rounded-xl focus:border-blue-600 text-center"
                    {...register("huntDate", { required: "La data è obbligatoria" })}
                  />
                  {errors.huntDate && (
                    <p className="text-red-600 text-lg font-medium mt-2 text-center">{errors.huntDate.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: ZONE SELECTION */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">Seleziona la Zona</h3>
                  <p className="text-lg text-gray-600">Scegli la zona di caccia</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-80 overflow-y-auto border-2 rounded-xl p-6 bg-gray-50">
                  {zones.slice(0, 16).map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => setValue("zoneId", zone.id)}
                      className={`p-6 rounded-xl border-3 text-center transition-all ${
                        watch("zoneId") === zone.id
                          ? "border-blue-600 bg-blue-100 text-blue-700 shadow-lg transform scale-105"
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
                  <p className="text-red-600 text-lg font-medium text-center">{errors.zoneId.message}</p>
                )}
              </div>
            )}

            {/* STEP 3: TIME SLOT SELECTION */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">Scegli l'Orario</h3>
                  <p className="text-lg text-gray-600">Seleziona la fascia oraria preferita</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  <button
                    type="button"
                    onClick={() => setValue("timeSlot", "morning")}
                    className={`p-8 rounded-xl border-3 text-xl font-medium transition-all ${
                      watch("timeSlot") === "morning"
                        ? "border-blue-600 bg-blue-100 text-blue-700 shadow-lg"
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
                        ? "border-blue-600 bg-blue-100 text-blue-700 shadow-lg"
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
                        ? "border-blue-600 bg-blue-100 text-blue-700 shadow-lg"
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
                  <p className="text-red-600 text-lg font-medium text-center">{errors.timeSlot.message}</p>
                )}
              </div>
            )}

            {/* STEP 4: TARGET SPECIES SELECTION */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">Capo Target</h3>
                  <p className="text-lg text-gray-600">Specifica il capo che intendi cacciare (opzionale)</p>
                </div>
                
                <div className="max-w-2xl mx-auto space-y-8">
                  {/* Skip Option */}
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setValue("targetSpecies", undefined);
                        setValue("targetRoeDeerCategory", undefined);
                        setValue("targetRedDeerCategory", undefined);
                        setValue("targetSex", undefined);
                        setValue("targetAgeClass", undefined);
                        setValue("targetNotes", "");
                      }}
                      className="text-lg px-8 py-3"
                    >
                      Salta - Nessun capo specifico
                    </Button>
                  </div>

                  <div className="text-center text-gray-500">oppure</div>

                  {/* Species Selection */}
                  <div className="space-y-4">
                    <h4 className="text-xl font-semibold text-gray-900 text-center">Seleziona Specie</h4>
                    <div className="grid grid-cols-2 gap-6">
                      <button
                        type="button"
                        onClick={() => {
                          setValue("targetSpecies", "roe_deer");
                          setValue("targetRedDeerCategory", undefined);
                        }}
                        className={`p-6 rounded-xl border-3 text-lg font-medium transition-all ${
                          selectedSpecies === "roe_deer"
                            ? "border-blue-500 bg-blue-100 text-blue-700"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-4xl mb-2">🦌</div>
                          <div className="text-xl font-bold">Capriolo</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setValue("targetSpecies", "red_deer");
                          setValue("targetRoeDeerCategory", undefined);
                        }}
                        className={`p-6 rounded-xl border-3 text-lg font-medium transition-all ${
                          selectedSpecies === "red_deer"
                            ? "border-blue-500 bg-blue-100 text-blue-700"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-4xl mb-2">🦌</div>
                          <div className="text-xl font-bold">Cervo</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Category Selection for Roe Deer */}
                  {selectedSpecies === "roe_deer" && (
                    <div className="space-y-4">
                      <h4 className="text-xl font-semibold text-gray-900 text-center">Categoria Capriolo</h4>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                        {['M0', 'F0', 'FA', 'M1', 'MA'].map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => setValue("targetRoeDeerCategory", category as any)}
                            className={`p-4 rounded-lg border-2 text-center transition-all ${
                              watch("targetRoeDeerCategory") === category
                                ? "border-blue-500 bg-blue-100 text-blue-700"
                                : "border-gray-300 hover:border-gray-400"
                            }`}
                          >
                            <div className="font-bold">{category}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category Selection for Red Deer */}
                  {selectedSpecies === "red_deer" && (
                    <div className="space-y-4">
                      <h4 className="text-xl font-semibold text-gray-900 text-center">Categoria Cervo</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {['CL0', 'FF', 'MM', 'MCL1'].map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => setValue("targetRedDeerCategory", category as any)}
                            className={`p-4 rounded-lg border-2 text-center transition-all ${
                              watch("targetRedDeerCategory") === category
                                ? "border-blue-500 bg-blue-100 text-blue-700"
                                : "border-gray-300 hover:border-gray-400"
                            }`}
                          >
                            <div className="font-bold">{category}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedSpecies && (
                    <div className="space-y-4">
                      <h4 className="text-xl font-semibold text-gray-900 text-center">Note Aggiuntive</h4>
                      <Textarea
                        placeholder="Inserisci eventuali note sul capo target..."
                        className="w-full"
                        {...register("targetNotes")}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 5: CONFIRMATION */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">Conferma la Prenotazione</h3>
                  <p className="text-lg text-gray-600">Verifica i dettagli e conferma</p>
                </div>
                
                <div className="max-w-2xl mx-auto bg-gray-50 rounded-xl p-6 space-y-4">
                  <div className="flex justify-between">
                    <span className="font-semibold">Data:</span>
                    <span>{watch("huntDate")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Zona:</span>
                    <span>{zones.find(z => z.id === watch("zoneId"))?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Orario:</span>
                    <span>
                      {watch("timeSlot") === "morning" ? "Alba - 12:00" :
                       watch("timeSlot") === "afternoon" ? "12:00 - Tramonto" :
                       "Alba - Tramonto"}
                    </span>
                  </div>
                  {selectedSpecies && (
                    <>
                      <div className="flex justify-between">
                        <span className="font-semibold">Specie:</span>
                        <span>{selectedSpecies === "roe_deer" ? "Capriolo" : "Cervo"}</span>
                      </div>
                      {watch("targetRoeDeerCategory") && (
                        <div className="flex justify-between">
                          <span className="font-semibold">Categoria:</span>
                          <span>{watch("targetRoeDeerCategory")}</span>
                        </div>
                      )}
                      {watch("targetRedDeerCategory") && (
                        <div className="flex justify-between">
                          <span className="font-semibold">Categoria:</span>
                          <span>{watch("targetRedDeerCategory")}</span>
                        </div>
                      )}
                      {watch("targetNotes") && (
                        <div className="flex justify-between">
                          <span className="font-semibold">Note:</span>
                          <span>{watch("targetNotes")}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-3"
            >
              Indietro
            </Button>
            
            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={!canProceedFromStep(currentStep)}
                className="px-6 py-3"
              >
                Avanti
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={createReservationMutation.isPending}
                className="px-6 py-3"
              >
                {createReservationMutation.isPending ? "Creazione..." : "Conferma Prenotazione"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
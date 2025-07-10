import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { createReservationSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface ZoneWithQuotas {
  id: number;
  name: string;
  description: string;
  quotaStatus: string;
}

interface ClientCreateReservationRequest {
  zoneId: number;
  huntDate: string;
  timeSlot: "morning" | "afternoon" | "full_day";
  targetSpecies?: "roe_deer" | "red_deer";
  targetRoeDeerCategory?: "M0" | "F0" | "FA" | "M1" | "MA";
  targetRedDeerCategory?: "CL0" | "FF" | "MM" | "MCL1";
  targetSex?: "male" | "female";
  targetAgeClass?: "adult" | "young";
  targetNotes?: string;
}

interface ReservationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zones: ZoneWithQuotas[];
}

export default function ReservationModal({ open, onOpenChange, zones }: ReservationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  // Fetch regional quotas to show available categories
  const { data: quotas = [] } = useQuery({
    queryKey: ['/api/regional-quotas'],
    enabled: currentStep === 4, // Load quotas when reaching target species step
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
      const response = await apiRequest("/api/reservations", {
        method: "POST",
        body: JSON.stringify(data),
      });
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
      setCurrentStep(1);
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
    mutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    setCurrentStep(1);
    onOpenChange(false);
  };

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1: return watch("huntDate");
      case 2: return watch("timeSlot");
      case 3: return watch("zoneId") && watch("zoneId") !== 0;
      case 4: return true; // Target species is optional
      default: return true;
    }
  };

  const selectedSpecies = watch("targetSpecies");

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
            Passo {currentStep} di {totalSteps}: {
              currentStep === 1 ? 'Seleziona la data' :
              currentStep === 2 ? 'Scegli l\'orario' :
              currentStep === 3 ? 'Seleziona la zona' :
              currentStep === 4 ? 'Specifica il capo target (opzionale)' :
              'Conferma la prenotazione'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Step Progress Indicator */}
        <div className="flex justify-between items-center mb-8">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                step === currentStep ? 'bg-primary' : 
                step < currentStep ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                {step}
              </div>
              <div className={`text-sm ml-2 hidden sm:block ${step === currentStep ? 'text-primary font-semibold' : 'text-gray-500'}`}>
                {step === 1 ? 'Data' :
                 step === 2 ? 'Orario' :
                 step === 3 ? 'Zona' :
                 step === 4 ? 'Capo Target' : 'Conferma'}
              </div>
              {step < 5 && <div className="w-4 sm:w-8 h-1 bg-gray-300 mx-2 sm:mx-4"></div>}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Hidden inputs for target species to ensure they are included in form submission */}
          <input type="hidden" {...register("targetSpecies")} />
          <input type="hidden" {...register("targetRoeDeerCategory")} />
          <input type="hidden" {...register("targetRedDeerCategory")} />
          <input type="hidden" {...register("targetSex")} />
          <input type="hidden" {...register("targetAgeClass")} />
          <input type="hidden" {...register("targetNotes")} />
          
          <div className="min-h-[400px] py-6">
            {/* Step 1: Data Selection */}
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
                    className="w-full text-xl p-6 border-3 border-gray-300 rounded-xl focus:border-primary text-center"
                    {...register("huntDate", { required: "La data è obbligatoria" })}
                  />
                  {errors.huntDate && (
                    <p className="text-red-600 text-lg font-medium mt-2 text-center">{errors.huntDate.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Time Slot Selection */}
            {currentStep === 2 && (
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
                  <p className="text-red-600 text-lg font-medium text-center">{errors.timeSlot.message}</p>
                )}
              </div>
            )}

            {/* Step 3: Zone Selection */}
            {currentStep === 3 && (
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
                  <p className="text-red-600 text-lg font-medium text-center">{errors.zoneId.message}</p>
                )}
              </div>
            )}

            {/* Step 4: Target Species Selection */}
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
                        {['M0', 'F0', 'FA', 'M1', 'MA'].map((category) => {
                          const isAvailable = availableRoeDeerCategories.includes(category);
                          return (
                            <button
                              key={category}
                              type="button"
                              onClick={() => setValue("targetRoeDeerCategory", category as any)}
                              disabled={!isAvailable}
                              className={`p-4 rounded-lg border-2 text-lg font-medium transition-all ${
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
                    <div className="space-y-4">
                      <h4 className="text-xl font-semibold text-gray-900 text-center">Categoria Cervo</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {['CL0', 'FF', 'MM', 'MCL1'].map((category) => {
                          const isAvailable = availableRedDeerCategories.includes(category);
                          return (
                            <button
                              key={category}
                              type="button"
                              onClick={() => setValue("targetRedDeerCategory", category as any)}
                              disabled={!isAvailable}
                              className={`p-4 rounded-lg border-2 text-lg font-medium transition-all ${
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

                  {/* Additional Details */}
                  {selectedSpecies && (
                    <div className="space-y-6">
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
                          <Label className="text-lg font-medium">Classe di Età (Opzionale)</Label>
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

                      <div className="space-y-3">
                        <Label className="text-lg font-medium">Note aggiuntive (Opzionale)</Label>
                        <textarea
                          className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                          rows={3}
                          placeholder="Aggiungi note specifiche per questo capo target..."
                          onChange={(e) => setValue("targetNotes", e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Current Selection Summary */}
                  {selectedSpecies && (
                    <div className="bg-blue-50 p-6 rounded-xl border-2 border-blue-200">
                      <h4 className="font-semibold text-gray-900 mb-3 text-center">Selezione Corrente:</h4>
                      <div className="flex flex-wrap justify-center gap-2">
                        <Badge variant="outline" className="text-sm">
                          {selectedSpecies === 'roe_deer' ? '🦌 Capriolo' : '🦌 Cervo'}
                        </Badge>
                        {selectedSpecies === 'roe_deer' && watch("targetRoeDeerCategory") && (
                          <Badge variant="outline" className="text-sm">
                            {watch("targetRoeDeerCategory")}
                          </Badge>
                        )}
                        {selectedSpecies === 'red_deer' && watch("targetRedDeerCategory") && (
                          <Badge variant="outline" className="text-sm">
                            {watch("targetRedDeerCategory")}
                          </Badge>
                        )}
                        {watch("targetSex") && (
                          <Badge variant="outline" className="text-sm">
                            {watch("targetSex") === 'male' ? 'Maschio' : 'Femmina'}
                          </Badge>
                        )}
                        {watch("targetAgeClass") && (
                          <Badge variant="outline" className="text-sm">
                            {watch("targetAgeClass") === 'adult' ? 'Adulto' : 'Giovane'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Confirmation */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">Conferma Prenotazione</h3>
                  <p className="text-lg text-gray-600">Verifica i dettagli della tua prenotazione</p>
                </div>
                
                <div className="max-w-2xl mx-auto bg-gray-50 rounded-xl p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="font-semibold text-gray-700">Data:</div>
                      <div className="text-xl">{watch("huntDate") ? new Date(watch("huntDate")).toLocaleDateString('it-IT') : 'Non selezionata'}</div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="font-semibold text-gray-700">Orario:</div>
                      <div className="text-xl">
                        {watch("timeSlot") === "morning" ? "Alba - 12:00" :
                         watch("timeSlot") === "afternoon" ? "12:00 - Tramonto" :
                         watch("timeSlot") === "full_day" ? "Alba - Tramonto" : "Non selezionato"}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="font-semibold text-gray-700">Zona:</div>
                      <div className="text-xl">
                        {zones.find(z => z.id === watch("zoneId"))?.name || "Non selezionata"}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="font-semibold text-gray-700">Capo Target:</div>
                      <div className="text-lg">
                        {selectedSpecies ? (
                          <div className="space-y-1">
                            <div>{selectedSpecies === 'roe_deer' ? '🦌 Capriolo' : '🦌 Cervo'}</div>
                            {selectedSpecies === 'roe_deer' && watch("targetRoeDeerCategory") && (
                              <Badge variant="outline">{watch("targetRoeDeerCategory")}</Badge>
                            )}
                            {selectedSpecies === 'red_deer' && watch("targetRedDeerCategory") && (
                              <Badge variant="outline">{watch("targetRedDeerCategory")}</Badge>
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
                        ) : "Nessun capo specifico"}
                      </div>
                    </div>
                  </div>
                  
                  {watch("targetNotes") && (
                    <div className="space-y-3">
                      <div className="font-semibold text-gray-700">Note:</div>
                      <div className="text-lg bg-white p-4 rounded-lg border">{watch("targetNotes")}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-3"
            >
              Indietro
            </Button>
            
            <div className="text-sm text-gray-500">
              Passo {currentStep} di {totalSteps}
            </div>

            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={!canProceedToNext()}
                className="px-6 py-3"
              >
                Avanti
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="px-6 py-3"
              >
                {mutation.isPending ? "Creando..." : "Conferma Prenotazione"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
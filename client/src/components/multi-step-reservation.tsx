import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { createReservationSchema } from "@shared/schema";
import type { ZoneWithQuotas } from "@/lib/types";
import type { z } from "zod";

type CreateReservationInput = z.infer<typeof createReservationSchema>;

interface MultiStepReservationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zones: ZoneWithQuotas[];
}

export default function MultiStepReservation({ open, onOpenChange, zones }: MultiStepReservationProps) {
  const [step, setStep] = useState(1);
  const [isCisonReserve, setIsCisonReserve] = useState(false);
  const totalSteps = isCisonReserve ? 3 : 5; // Cison: 3 step (Capo->Zona->Orario), Altri: 5 step normali
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calcola automaticamente la data per il giorno successivo (no martedì/venerdì)
  const getNextValidHuntingDate = (): string => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Se domani è martedì (2) o venerdì (5), salta al giorno dopo
    let dayOfWeek = tomorrow.getDay();
    if (dayOfWeek === 2) { // Martedì -> Mercoledì
      tomorrow.setDate(tomorrow.getDate() + 1);
    } else if (dayOfWeek === 5) { // Venerdì -> Sabato  
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    
    return tomorrow.toISOString().split('T')[0];
  };

  const form = useForm<CreateReservationInput>({
    resolver: zodResolver(createReservationSchema),
    defaultValues: {
      huntDate: getNextValidHuntingDate(), // Data automatica per Cison
      zoneId: 1,
      timeSlot: "morning",
      targetSpecies: undefined,
      targetRoeDeerCategory: undefined,
      targetRedDeerCategory: undefined,
      targetSex: undefined,
      targetAgeClass: undefined,
      targetNotes: "",
    },
  });

  // Rileva se è la riserva di Cison controllando l'utente corrente
  React.useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setIsCisonReserve(user.reserveId === 'cison-valmarino');
    }
  }, []);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = form;
  const selectedSpecies = watch("targetSpecies");

  const createReservationMutation = useMutation({
    mutationFn: async (data: CreateReservationInput) => {
      console.log("🚀 Sending reservation data:", data);
      const response = await apiRequest("/api/reservations", { method: "POST", body: data });
      return response.json();
    },
    onSuccess: (response) => {
      console.log("✅ Reservation created successfully:", response);
      toast({
        title: "Successo",
        description: "Prenotazione creata con successo!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      handleClose();
    },
    onError: (error: any) => {
      console.error("❌ Error creating reservation:", error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante la creazione della prenotazione",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateReservationInput) => {
    console.log("📝 Form submitted with data:", data);
    console.log("🔍 Form errors:", errors);
    
    // Validate required fields manually
    if (!data.huntDate) {
      toast({
        title: "Errore",
        description: "Seleziona una data di caccia",
        variant: "destructive",
      });
      return;
    }
    
    if (!data.zoneId || data.zoneId <= 0) {
      toast({
        title: "Errore", 
        description: "Seleziona una zona",
        variant: "destructive",
      });
      return;
    }
    
    if (!data.timeSlot) {
      toast({
        title: "Errore",
        description: "Seleziona un orario",
        variant: "destructive",
      });
      return;
    }
    
    if (!data.targetSpecies) {
      toast({
        title: "Errore",
        description: "Seleziona una specie",
        variant: "destructive",
      });
      return;
    }
    
    if (data.targetSpecies === "roe_deer" && !data.targetRoeDeerCategory) {
      toast({
        title: "Errore",
        description: "Seleziona una categoria per il capriolo",
        variant: "destructive",
      });
      return;
    }
    
    if (data.targetSpecies === "red_deer" && !data.targetRedDeerCategory) {
      toast({
        title: "Errore",
        description: "Seleziona una categoria per il cervo",
        variant: "destructive",
      });
      return;
    }
    
    createReservationMutation.mutate(data);
  };

  const handleClose = () => {
    reset();
    setStep(1);
    onOpenChange(false);
  };

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const canProceed = (): boolean => {
    if (isCisonReserve) {
      // Flusso Cison: Capo → Zona → Orario
      switch (step) {
        case 1: return !!watch("targetSpecies") && (
          (watch("targetSpecies") === "roe_deer" && !!watch("targetRoeDeerCategory")) ||
          (watch("targetSpecies") === "red_deer" && !!watch("targetRedDeerCategory"))
        );
        case 2: return watch("zoneId") > 0;
        case 3: return !!watch("timeSlot");
        default: return true;
      }
    } else {
      // Flusso normale: Zona → Data → Orario → Specie → Conferma
      switch (step) {
        case 1: return watch("zoneId") > 0;
        case 2: return !!watch("huntDate") && isValidHuntingDate(watch("huntDate"));
        case 3: return !!watch("timeSlot");
        case 4: return !!watch("targetSpecies") && (
          (watch("targetSpecies") === "roe_deer" && !!watch("targetRoeDeerCategory")) ||
          (watch("targetSpecies") === "red_deer" && !!watch("targetRedDeerCategory"))
        );
        default: return true;
      }
    }
  };

  const isValidHuntingDate = (dateString: string): boolean => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // Martedì = 2, Venerdì = 5 (silenzio venatorio)
    return dayOfWeek !== 2 && dayOfWeek !== 5;
  };

  const getStepTitle = () => {
    if (isCisonReserve) {
      // Titoli per Cison di Valmarino
      switch (step) {
        case 1: return 'Seleziona il Capo da Prelevare';
        case 2: return 'Seleziona la Zona';
        case 3: return 'Scegli l\'Orario';
        default: return '';
      }
    } else {
      // Titoli standard
      switch (step) {
        case 1: return 'Seleziona la Zona';
        case 2: return 'Seleziona la Data';
        case 3: return 'Scegli l\'Orario';
        case 4: return 'Specie Target (Opzionale)';
        case 5: return 'Conferma Prenotazione';
        default: return '';
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Sistema Multi-Step - Nuova Prenotazione
          </DialogTitle>
          <DialogDescription className="text-lg text-gray-600">
            Passo {step} di {totalSteps}: {getStepTitle()}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="flex justify-between items-center mb-8">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((stepNum) => (
            <div key={stepNum} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                stepNum === step ? 'bg-blue-600' : 
                stepNum < step ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                {stepNum}
              </div>
              <div className={`text-sm ml-2 hidden sm:block ${stepNum === step ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
                {isCisonReserve ? 
                  (stepNum === 1 ? 'Capo' : stepNum === 2 ? 'Zona' : 'Orario') :
                  (stepNum === 1 ? 'Zona' : stepNum === 2 ? 'Data' : stepNum === 3 ? 'Orario' : stepNum === 4 ? 'Specie' : 'Conferma')
                }
              </div>
              {stepNum < totalSteps && <div className="w-4 sm:w-8 h-1 bg-gray-300 mx-2 sm:mx-4"></div>}
            </div>
          ))}
        </div>

        <form 
          onSubmit={(e) => {
            console.log("🔥 Form onSubmit evento attivato");
            console.log("📊 Valori form correnti:", watch());
            console.log("❌ Errori form:", errors);
            handleSubmit(onSubmit)(e);
          }}
        >
          <div className="min-h-[400px] py-6">
            {/* STEP 1 CISON: SELEZIONE CAPO */}
            {step === 1 && isCisonReserve && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">Seleziona il Capo da Prelevare</h3>
                  <p className="text-lg text-gray-600">Scegli la specie e categoria che intendi cacciare</p>
                </div>
                
                <div className="max-w-2xl mx-auto space-y-8">
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
                          <div className="text-xl font-bold">Cervo</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Categorie Capriolo */}
                  {selectedSpecies === "roe_deer" && (
                    <div className="space-y-4">
                      <h4 className="text-xl font-semibold text-gray-900 text-center">Categoria Capriolo</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {["M0", "F0", "FA", "M1", "MA"].map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => setValue("targetRoeDeerCategory", category as any)}
                            className={`p-4 rounded-lg border-2 font-medium transition-all ${
                              watch("targetRoeDeerCategory") === category
                                ? "border-blue-500 bg-blue-100 text-blue-700"
                                : "border-gray-300 hover:border-gray-400"
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Categorie Cervo */}
                  {selectedSpecies === "red_deer" && (
                    <div className="space-y-4">
                      <h4 className="text-xl font-semibold text-gray-900 text-center">Categoria Cervo</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {["CL0", "FF", "MM", "MCL1"].map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => setValue("targetRedDeerCategory", category as any)}
                            className={`p-4 rounded-lg border-2 font-medium transition-all ${
                              watch("targetRedDeerCategory") === category
                                ? "border-blue-500 bg-blue-100 text-blue-700"
                                : "border-gray-300 hover:border-gray-400"
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 1 STANDARD: ZONE */}
            {step === 1 && !isCisonReserve && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">Seleziona la Zona</h3>
                  <p className="text-lg text-gray-600">Tutte le 16 zone di caccia disponibili</p>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-3 p-4 bg-gray-50 rounded-xl">
                  {zones.slice(0, 16).map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => setValue("zoneId", zone.id)}
                      className={`p-4 rounded-lg border-2 text-center transition-all ${
                        watch("zoneId") === zone.id
                          ? "border-blue-600 bg-blue-100 text-blue-700 shadow-lg transform scale-105"
                          : "border-gray-300 hover:border-gray-400 hover:bg-white hover:shadow-md"
                      }`}
                    >
                      <div className="text-xl font-bold">{zone.name}</div>
                    </button>
                  ))}
                </div>
                {errors.zoneId && (
                  <p className="text-red-600 text-lg font-medium text-center">{errors.zoneId.message}</p>
                )}
              </div>
            )}

            {/* STEP 2 CISON: ZONE */}
            {step === 2 && isCisonReserve && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">Seleziona la Zona</h3>
                  <p className="text-lg text-gray-600">Tutte le 16 zone di caccia disponibili</p>
                  <div className="bg-blue-100 border-l-4 border-blue-500 p-3 mt-4 mx-auto max-w-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Capo selezionato:</strong> {selectedSpecies === "roe_deer" ? "Capriolo" : "Cervo"} - {watch("targetRoeDeerCategory") || watch("targetRedDeerCategory")}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-3 p-4 bg-gray-50 rounded-xl">
                  {zones.slice(0, 16).map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => setValue("zoneId", zone.id)}
                      className={`p-4 rounded-lg border-2 text-center transition-all ${
                        watch("zoneId") === zone.id
                          ? "border-blue-600 bg-blue-100 text-blue-700 shadow-lg transform scale-105"
                          : "border-gray-300 hover:border-gray-400 hover:bg-white hover:shadow-md"
                      }`}
                    >
                      <div className="text-xl font-bold">{zone.name}</div>
                    </button>
                  ))}
                </div>
                {errors.zoneId && (
                  <p className="text-red-600 text-lg font-medium text-center">{errors.zoneId.message}</p>
                )}
              </div>
            )}

            {/* STEP 2 STANDARD: DATE */}
            {step === 2 && !isCisonReserve && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">Seleziona la Data</h3>
                  <p className="text-lg text-gray-600">Scegli tra i prossimi giorni disponibili (esclusi martedì e venerdì)</p>
                  <div className="bg-yellow-100 border-l-4 border-yellow-500 p-3 mt-4 mx-auto max-w-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Ricorda:</strong> Martedì e Venerdì sono giorni di silenzio venatorio
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                  {(() => {
                    const dates = [];
                    // Forza data corrente come 12 luglio 2025 per consistenza
                    const today = new Date(2025, 6, 12); // 12 luglio 2025
                    today.setHours(12, 0, 0, 0); // Mezzogiorno per evitare problemi di fuso orario
                    let dateCount = 0;
                    let dayOffset = 1; // Inizio da domani, non da oggi
                    
                    console.log('📅 BASE DATE:', today.toString());
                    console.log('📊 Cercando 15 date valide (esclusi mar/ven)...');
                    
                    while (dateCount < 15 && dayOffset < 30) {
                      // Crea data con calcolo più robusto
                      const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + dayOffset);
                      const dayOfWeek = currentDate.getDay();
                      
                      const dayNames = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];
                      
                      // Skip Tuesday (2) and Friday (5) - silenzio venatorio
                      const isValidDay = dayOfWeek !== 2 && dayOfWeek !== 5;
                      console.log(`${dayOffset}. ${currentDate.getDate()}/${currentDate.getMonth()+1} (${dayNames[dayOfWeek]}): ${isValidDay ? '✅ AGGIUNTO' : '❌ SALTATO'} | Count: ${isValidDay ? dateCount + 1 : dateCount}`);
                      
                      if (isValidDay) {
                        // Fix: calcola dateString con fuso orario italiano per evitare offset
                        const year = currentDate.getFullYear();
                        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                        const day = String(currentDate.getDate()).padStart(2, '0');
                        const dateString = `${year}-${month}-${day}`;
                        
                        const dayName = currentDate.toLocaleDateString('it-IT', { weekday: 'short' });
                        const dayNumber = currentDate.getDate();
                        const monthName = currentDate.toLocaleDateString('it-IT', { month: 'short' });
                        
                        dates.push(
                          <button
                            key={dateString}
                            type="button"
                            onClick={() => {
                              console.log('✅ CLICK CORRETTO:', dateString, dayName, dayNumber);
                              console.log('📅 Data completa:', currentDate.toString());
                              console.log('📊 Componenti date: Anno:', year, 'Mese:', month, 'Giorno:', day);
                              setValue("huntDate", dateString);
                            }}
                            className={`p-4 rounded-xl border-2 text-center transition-all hover:bg-blue-50 ${
                              watch("huntDate") === dateString
                                ? "border-blue-600 bg-blue-100 text-blue-700 shadow-lg transform scale-105"
                                : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                            }`}
                          >
                            <div className="text-sm font-medium text-gray-600 uppercase">{dayName}</div>
                            <div className="text-2xl font-bold mt-1">{dayNumber}</div>
                            <div className="text-sm text-gray-600 capitalize">{monthName}</div>
                          </button>
                        );
                        dateCount++;
                      }
                      dayOffset++;
                    }
                    return dates;
                  })()}
                </div>
                {errors.huntDate && (
                  <p className="text-red-600 text-lg font-medium text-center">{errors.huntDate.message}</p>
                )}
              </div>
            )}

            {/* STEP 3 CISON: TIME SLOT */}
            {step === 3 && isCisonReserve && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">Scegli l'Orario</h3>
                  <p className="text-lg text-gray-600">Data automatica: domani {new Date(getNextValidHuntingDate()).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  <div className="bg-green-100 border-l-4 border-green-500 p-3 mt-4 mx-auto max-w-lg">
                    <p className="text-sm text-green-800">
                      <strong>Zona selezionata:</strong> {zones.find(z => z.id === watch("zoneId"))?.name || 'N/A'}
                    </p>
                  </div>
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
              </div>
            )}

            {/* STEP 3 STANDARD: TIME SLOT */}
            {step === 3 && !isCisonReserve && (
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
              </div>
            )}

            {/* STEP 4 STANDARD: SPECIES */}
            {step === 4 && !isCisonReserve && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">Specie Target</h3>
                  <p className="text-lg text-gray-600">Seleziona la specie che intendi cacciare</p>
                </div>
                
                <div className="max-w-2xl mx-auto space-y-8">
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
                          <div className="text-xl font-bold">Cervo</div>
                        </div>
                      </button>
                    </div>
                  </div>

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


                </div>
              </div>
            )}

            {/* STEP 5: CONFIRMATION */}
            {step === 5 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">Conferma Prenotazione</h3>
                  <p className="text-lg text-gray-600">Verifica i dettagli</p>
                </div>
                
                <div className="max-w-2xl mx-auto bg-gray-50 rounded-xl p-6 space-y-4">
                  <div className="flex justify-between">
                    <span className="font-semibold">Zona:</span>
                    <span>{zones.find(z => z.id === watch("zoneId"))?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Data:</span>
                    <span>{watch("huntDate")}</span>
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
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={step === 1}
            >
              Indietro
            </Button>
            
            {step < totalSteps ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={!canProceed()}
              >
                Avanti
              </Button>
            ) : (
              <Button
                type="button"
                disabled={createReservationMutation.isPending}
                onClick={(e) => {
                  console.log("🎯 Pulsante Conferma cliccato");
                  const formData = watch();
                  console.log("📋 Dati correnti:", formData);
                  console.log("⚠️ Errori attuali:", errors);
                  
                  // Chiamata diretta senza validazione form
                  console.log("🚀 Chiamata diretta mutation");
                  onSubmit(formData);
                }}
              >
                {createReservationMutation.isPending ? "Creazione..." : "Conferma"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
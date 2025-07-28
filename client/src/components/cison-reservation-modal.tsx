import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { createReservationSchema } from "@shared/schema";
import type { ZoneWithQuotas } from "@/lib/types";
import type { z } from "zod";
import { Target, MapPin, Clock, ChevronRight, ChevronLeft } from "lucide-react";

type CreateReservationInput = z.infer<typeof createReservationSchema>;

interface CisonReservationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zones: ZoneWithQuotas[];
}

interface GroupQuota {
  id: number;
  species: 'roe_deer' | 'red_deer';
  roeDeerCategory?: string;
  redDeerCategory?: string;
  totalQuota: number;
  harvested: number;
  available: number;
}

export default function CisonReservationModal({ open, onOpenChange, zones }: CisonReservationModalProps) {
  const [step, setStep] = useState(1);
  const [selectedSpecies, setSelectedSpecies] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedZone, setSelectedZone] = useState<number>(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch group quotas only for hunter's group
  const { data: groupQuotas = [] } = useQuery<GroupQuota[]>({
    queryKey: ["/api/hunter-group-quotas"],
    enabled: open,
  });

  // Calcola automaticamente la data per domani (no martedì/venerdì)
  const getNextValidHuntingDate = (): string => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let dayOfWeek = tomorrow.getDay();
    if (dayOfWeek === 2 || dayOfWeek === 5) {
      return ""; // Nessuna data disponibile se domani è silenzio venatorio
    }
    
    return tomorrow.toISOString().split('T')[0];
  };

  // Verifica se siamo nell'orario consentito (19:00-21:00)
  const isBookingTimeAllowed = (): boolean => {
    const now = new Date();
    const currentHour = now.getHours();
    return currentHour >= 19 && currentHour < 21;
  };

  // Messaggio per orario non consentito
  const getBookingTimeMessage = (): string => {
    const now = new Date();
    const currentHour = now.getHours();
    
    if (currentHour < 19) {
      return `Prenotazioni aperte dalle 19:00. Ora attuale: ${String(currentHour).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    } else if (currentHour >= 21) {
      return `Prenotazioni chiuse alle 21:00. Ritorna domani dalle 19:00.`;
    }
    return "";
  };

  const form = useForm<CreateReservationInput>({
    resolver: zodResolver(createReservationSchema),
    defaultValues: {
      huntDate: getNextValidHuntingDate(),
      zoneId: 1,
      timeSlot: "morning",
      targetSpecies: undefined,
      targetRoeDeerCategory: undefined,
      targetRedDeerCategory: undefined,
      targetNotes: "",
    },
  });

  // Filtra solo quote disponibili per il gruppo del cacciatore
  const availableQuotas = groupQuotas.filter(quota => quota.available > 0);

  // Organizza per specie
  const roeDeerQuotas = availableQuotas.filter(q => q.species === 'roe_deer');
  const redDeerQuotas = availableQuotas.filter(q => q.species === 'red_deer');

  const createReservationMutation = useMutation({
    mutationFn: async (data: CreateReservationInput) => {
      const response = await apiRequest("/api/reservations", { method: "POST", body: data });
      return response.json();
    },
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

  const handleClose = () => {
    setStep(1);
    setSelectedSpecies("");
    setSelectedCategory("");
    setSelectedZone(0);
    form.reset();
    onOpenChange(false);
  };

  const onSubmit = () => {
    const huntDate = getNextValidHuntingDate();
    if (!huntDate) {
      toast({
        title: "Errore",
        description: "Domani è giorno di silenzio venatorio. Non puoi prenotare.",
        variant: "destructive",
      });
      return;
    }

    const data: CreateReservationInput = {
      huntDate,
      zoneId: selectedZone,
      timeSlot: form.watch("timeSlot"),
      targetSpecies: selectedSpecies as any,
      targetRoeDeerCategory: selectedSpecies === 'roe_deer' ? selectedCategory : undefined,
      targetRedDeerCategory: selectedSpecies === 'red_deer' ? selectedCategory : undefined,
      targetNotes: form.watch("targetNotes") || "",
    };

    createReservationMutation.mutate(data);
  };

  // Controllo orario per mostrare il modal
  if (!isBookingTimeAllowed()) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl text-red-600">
              Prenotazioni Chiuse
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <Clock className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <p className="text-lg mb-4">{getBookingTimeMessage()}</p>
            <p className="text-gray-600">
              Le prenotazioni sono consentite solo dalle 19:00 alle 21:00
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const huntDate = getNextValidHuntingDate();
  if (!huntDate) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl text-red-600">
              Giorno di Silenzio Venatorio
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <Target className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <p className="text-lg mb-4">
              Domani è {new Date().getDay() === 1 ? 'martedì' : 'venerdì'} (silenzio venatorio)
            </p>
            <p className="text-gray-600">
              Ritorna domani sera per prenotare il giorno successivo
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            Nuova Prenotazione - Passo {step}/3
          </DialogTitle>
          <div className="text-center text-lg text-blue-600 font-medium">
            Data: {new Date(huntDate).toLocaleDateString('it-IT', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </DialogHeader>

        {/* STEP 1: Selezione Specie e Categoria */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <Target className="h-12 w-12 text-blue-600 mx-auto mb-2" />
              <h3 className="text-xl font-semibold">Seleziona Specie e Capo</h3>
              <p className="text-gray-600">Scegli quale capo vuoi cacciare (solo del tuo gruppo)</p>
            </div>

            {/* Capriolo */}
            {roeDeerQuotas.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-lg font-semibold mb-3 text-green-700">🦌 Capriolo</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {roeDeerQuotas.map((quota) => (
                      <Button
                        key={quota.id}
                        variant={selectedSpecies === 'roe_deer' && selectedCategory === quota.roeDeerCategory ? "default" : "outline"}
                        className="h-auto p-4 flex flex-col items-center space-y-2"
                        onClick={() => {
                          setSelectedSpecies('roe_deer');
                          setSelectedCategory(quota.roeDeerCategory!);
                        }}
                      >
                        <div className="text-lg font-bold">{quota.roeDeerCategory}</div>
                        <Badge variant="secondary" className="text-xs">
                          {quota.available}/{quota.totalQuota} disponibili
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cervo */}
            {redDeerQuotas.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-lg font-semibold mb-3 text-amber-700">🦌 Cervo</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {redDeerQuotas.map((quota) => (
                      <Button
                        key={quota.id}
                        variant={selectedSpecies === 'red_deer' && selectedCategory === quota.redDeerCategory ? "default" : "outline"}
                        className="h-auto p-4 flex flex-col items-center space-y-2"
                        onClick={() => {
                          setSelectedSpecies('red_deer');
                          setSelectedCategory(quota.redDeerCategory!);
                        }}
                      >
                        <div className="text-lg font-bold">{quota.redDeerCategory}</div>
                        <Badge variant="secondary" className="text-xs">
                          {quota.available}/{quota.totalQuota} disponibili
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {availableQuotas.length === 0 && (
              <div className="text-center py-8">
                <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg text-gray-600">
                  Nessuna quota disponibile per il tuo gruppo
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button 
                onClick={() => setStep(2)} 
                disabled={!selectedSpecies || !selectedCategory}
                className="px-8"
              >
                Avanti <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Selezione Zona */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-blue-600 mx-auto mb-2" />
              <h3 className="text-xl font-semibold">Seleziona Zona</h3>
              <p className="text-gray-600">
                Capo selezionato: <Badge variant="secondary">{selectedSpecies === 'roe_deer' ? 'Capriolo' : 'Cervo'} {selectedCategory}</Badge>
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {zones.map((zone) => (
                <Button
                  key={zone.id}
                  variant={selectedZone === zone.id ? "default" : "outline"}
                  className="h-20 flex flex-col items-center justify-center"
                  onClick={() => setSelectedZone(zone.id)}
                >
                  <div className="font-bold">{zone.name}</div>
                  <div className="text-xs text-gray-600">{zone.description}</div>
                </Button>
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Indietro
              </Button>
              <Button 
                onClick={() => setStep(3)} 
                disabled={!selectedZone}
                className="px-8"
              >
                Avanti <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Selezione Orario */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <Clock className="h-12 w-12 text-blue-600 mx-auto mb-2" />
              <h3 className="text-xl font-semibold">Seleziona Orario</h3>
              <p className="text-gray-600">
                {selectedSpecies === 'roe_deer' ? 'Capriolo' : 'Cervo'} {selectedCategory} - Zona {selectedZone}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button
                variant={form.watch("timeSlot") === "morning" ? "default" : "outline"}
                className="h-20 flex flex-col items-center justify-center"
                onClick={() => form.setValue("timeSlot", "morning")}
              >
                <div className="font-bold text-lg">Alba - 12:00</div>
                <div className="text-sm">Mattino</div>
              </Button>
              
              <Button
                variant={form.watch("timeSlot") === "afternoon" ? "default" : "outline"}
                className="h-20 flex flex-col items-center justify-center"
                onClick={() => form.setValue("timeSlot", "afternoon")}
              >
                <div className="font-bold text-lg">12:00 - Tramonto</div>
                <div className="text-sm">Pomeriggio</div>
              </Button>
              
              <Button
                variant={form.watch("timeSlot") === "full_day" ? "default" : "outline"}
                className="h-20 flex flex-col items-center justify-center"
                onClick={() => form.setValue("timeSlot", "full_day")}
              >
                <div className="font-bold text-lg">Alba - Tramonto</div>
                <div className="text-sm">Tutto il Giorno</div>
              </Button>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Indietro
              </Button>
              <Button 
                onClick={onSubmit}
                disabled={!form.watch("timeSlot") || createReservationMutation.isPending}
                className="px-8"
              >
                {createReservationMutation.isPending ? "Creando..." : "Conferma Prenotazione"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
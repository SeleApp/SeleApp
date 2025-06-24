import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import type { ZoneWithQuotas } from "@/lib/types";

interface ReservationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zones: ZoneWithQuotas[];
}

interface ReservationData {
  zoneId: number;
  huntDate: string;
  timeSlot: "morning" | "afternoon";
}

const ZONE_GRID = [
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16]
];

const TIME_SLOTS = [
  { id: 'morning', label: 'Mattina', icon: '🌅', time: '06:00 - 11:00' },
  { id: 'afternoon', label: 'Pomeriggio', icon: '🌄', time: '14:00 - 19:00' }
];

export default function ReservationModalElderly({ open, onOpenChange, zones }: ReservationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<"morning" | "afternoon" | null>(null);

  const createReservationMutation = useMutation({
    mutationFn: async (data: ReservationData) => {
      console.log("Sending reservation data:", data);
      try {
        const response = await apiRequest("POST", "/api/reservations", data);
        console.log("Reservation response:", response);
        return response.json();
      } catch (error) {
        console.error("Reservation error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Prenotazione confermata!",
        description: "La tua prenotazione è stata creata con successo.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Mutation error:", error);
      toast({
        title: "Errore nella prenotazione",
        description: error.message || "Si è verificato un errore durante la prenotazione.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setStep(1);
    setSelectedZone(null);
    setSelectedDate("");
    setSelectedTimeSlot(null);
  };

  const handleSubmit = () => {
    if (!selectedZone || !selectedDate || !selectedTimeSlot) return;

    createReservationMutation.mutate({
      zoneId: selectedZone,
      huntDate: selectedDate,
      timeSlot: selectedTimeSlot,
    });
  };

  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= 30; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      
      // Salta martedì (2) e venerdì (5)
      if (date.getDay() === 2 || date.getDay() === 5) continue;
      
      // Formato corretto della data per evitare problemi di timezone
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateValue = `${year}-${month}-${day}`;
      
      dates.push({
        value: dateValue,
        label: date.toLocaleDateString('it-IT', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long' 
        })
      });
    }
    
    return dates.slice(0, 12); // Mostra solo 12 date
  };

  const selectedZoneData = zones.find(z => z.id === selectedZone);

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Nuova Prenotazione di Caccia
          </DialogTitle>
          <div className="flex justify-center space-x-4 mt-4">
            {[1, 2, 3, 4].map((stepNum) => (
              <div
                key={stepNum}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step >= stepNum
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {stepNum}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="space-y-6 p-4">
          {/* Step 1: Selezione Zona */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Passo 1: Scegli la Zona</h3>
                <p className="text-gray-600">Clicca sulla zona dove vuoi cacciare</p>
              </div>
              
              <div className="grid grid-cols-4 gap-3 max-w-2xl mx-auto">
                {ZONE_GRID.flat().map((zoneNum) => {
                  const zone = zones.find(z => z.id === zoneNum);
                  if (!zone) return null;
                  
                  return (
                    <Card
                      key={zone.id}
                      className={`cursor-pointer transition-all hover:scale-105 min-h-[120px] ${
                        selectedZone === zone.id
                          ? 'ring-6 ring-green-600 bg-green-100 shadow-xl border-green-500 border-4'
                          : 'hover:bg-blue-50 border-2 border-gray-300 hover:border-blue-400'
                      }`}
                      onClick={() => setSelectedZone(zone.id)}
                    >
                      <CardContent className="p-6 text-center flex flex-col justify-center h-full">
                        <div className={`text-4xl font-black mb-2 ${
                          selectedZone === zone.id ? 'text-green-800' : 'text-blue-700'
                        }`}>
                          {zone.id}
                        </div>
                        <div className={`text-base font-semibold ${
                          selectedZone === zone.id ? 'text-green-700' : 'text-gray-700'
                        }`}>
                          {zone.name}
                        </div>
                        {selectedZone === zone.id && (
                          <div className="mt-3">
                            <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
                            <div className="text-green-800 font-bold mt-1">SELEZIONATA</div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {selectedZone && (
                <div className="text-center mt-6">
                  <Button
                    onClick={() => setStep(2)}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
                  >
                    Continua <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Selezione Data */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Passo 2: Scegli la Data</h3>
                <p className="text-gray-600">Seleziona quando vuoi cacciare</p>
                <Badge className="mt-2">
                  Zona selezionata: {selectedZoneData?.name}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-4xl mx-auto">
                {generateDateOptions().map((date) => (
                  <Card
                    key={date.value}
                    className={`cursor-pointer transition-all hover:scale-105 min-h-[140px] ${
                      selectedDate === date.value
                        ? 'ring-6 ring-blue-600 bg-blue-100 shadow-xl border-blue-500 border-4'
                        : 'hover:bg-orange-50 border-2 border-gray-300 hover:border-orange-400'
                    }`}
                    onClick={() => setSelectedDate(date.value)}
                  >
                    <CardContent className="p-4 text-center flex flex-col justify-center h-full">
                      <Calendar className={`h-8 w-8 mx-auto mb-3 ${
                        selectedDate === date.value ? 'text-blue-700' : 'text-orange-600'
                      }`} />
                      <div className={`text-sm font-bold capitalize leading-tight ${
                        selectedDate === date.value ? 'text-blue-800' : 'text-gray-800'
                      }`}>
                        {date.label}
                      </div>
                      {selectedDate === date.value && (
                        <div className="mt-3">
                          <CheckCircle className="h-6 w-6 text-blue-600 mx-auto" />
                          <div className="text-blue-800 font-bold text-xs mt-1">SELEZIONATA</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-center space-x-4 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="px-6 py-3"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" /> Indietro
                </Button>
                {selectedDate && (
                  <Button
                    onClick={() => setStep(3)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
                  >
                    Continua <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Selezione Orario */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Passo 3: Scegli l'Orario</h3>
                <p className="text-gray-600">Mattina o pomeriggio?</p>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  <Badge>Zona: {selectedZoneData?.name}</Badge>
                  <Badge variant="outline">
                    {new Date(selectedDate).toLocaleDateString('it-IT', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long' 
                    })}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                {TIME_SLOTS.map((slot) => (
                  <Card
                    key={slot.id}
                    className={`cursor-pointer transition-all hover:scale-105 min-h-[200px] ${
                      selectedTimeSlot === slot.id
                        ? 'ring-6 ring-purple-600 bg-purple-100 shadow-xl border-purple-500 border-4'
                        : 'hover:bg-yellow-50 border-2 border-gray-300 hover:border-yellow-400'
                    }`}
                    onClick={() => setSelectedTimeSlot(slot.id as "morning" | "afternoon")}
                  >
                    <CardContent className="p-8 text-center flex flex-col justify-center h-full">
                      <div className="text-6xl mb-4">{slot.icon}</div>
                      <div className={`text-2xl font-black mb-3 ${
                        selectedTimeSlot === slot.id ? 'text-purple-800' : 'text-yellow-700'
                      }`}>
                        {slot.label}
                      </div>
                      <div className={`text-lg font-semibold mb-3 ${
                        selectedTimeSlot === slot.id ? 'text-purple-700' : 'text-gray-700'
                      }`}>
                        {slot.time}
                      </div>
                      <Clock className={`h-8 w-8 mx-auto ${
                        selectedTimeSlot === slot.id ? 'text-purple-600' : 'text-yellow-600'
                      }`} />
                      {selectedTimeSlot === slot.id && (
                        <div className="mt-4">
                          <CheckCircle className="h-8 w-8 text-purple-600 mx-auto" />
                          <div className="text-purple-800 font-bold mt-1">SELEZIONATO</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-center space-x-4 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="px-6 py-3"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" /> Indietro
                </Button>
                {selectedTimeSlot && (
                  <Button
                    onClick={() => setStep(4)}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 text-lg"
                  >
                    Continua <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Conferma */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Passo 4: Conferma Prenotazione</h3>
                <p className="text-gray-600">Controlla i dettagli prima di confermare</p>
              </div>

              <Card className="max-w-lg mx-auto border-4 border-green-500 shadow-2xl">
                <CardContent className="p-8 bg-green-50">
                  <div className="text-center mb-6">
                    <div className="text-3xl font-black text-green-800 mb-2">RIEPILOGO PRENOTAZIONE</div>
                    <div className="text-lg text-green-700">Controlla tutto prima di confermare</div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-white p-4 rounded-lg border-2 border-green-300">
                      <div className="flex items-center space-x-4">
                        <div className="bg-green-500 p-3 rounded-full">
                          <MapPin className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <div className="text-lg font-bold text-gray-800">Zona di Caccia</div>
                          <div className="text-xl font-black text-green-700">
                            ZONA {selectedZone} - {selectedZoneData?.name}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border-2 border-blue-300">
                      <div className="flex items-center space-x-4">
                        <div className="bg-blue-500 p-3 rounded-full">
                          <Calendar className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <div className="text-lg font-bold text-gray-800">Data di Caccia</div>
                          <div className="text-xl font-black text-blue-700 capitalize">
                            {new Date(selectedDate).toLocaleDateString('it-IT', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border-2 border-purple-300">
                      <div className="flex items-center space-x-4">
                        <div className="bg-purple-500 p-3 rounded-full">
                          <Clock className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <div className="text-lg font-bold text-gray-800">Orario di Caccia</div>
                          <div className="text-xl font-black text-purple-700">
                            {TIME_SLOTS.find(s => s.id === selectedTimeSlot)?.label.toUpperCase()}
                          </div>
                          <div className="text-lg text-purple-600">
                            {TIME_SLOTS.find(s => s.id === selectedTimeSlot)?.time}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-center space-x-4 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setStep(3)}
                  className="px-6 py-3"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" /> Indietro
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createReservationMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
                >
                  {createReservationMutation.isPending ? 'Prenotando...' : 'Conferma Prenotazione'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
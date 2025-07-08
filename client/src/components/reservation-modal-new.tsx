import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { format, addDays, isSameDay } from "date-fns";
import { it } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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

export default function ReservationModal({ open, onOpenChange, zones }: ReservationModalProps) {
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<"morning" | "afternoon" | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Genera i prossimi 14 giorni escludendo martedì e venerdì
  const getAvailableDates = () => {
    const dates = [];
    let currentDate = new Date();
    let count = 0;
    
    while (count < 14) {
      const dayOfWeek = currentDate.getDay();
      // Escludi martedì (2) e venerdì (5)
      if (dayOfWeek !== 2 && dayOfWeek !== 5) {
        dates.push(new Date(currentDate));
        count++;
      }
      currentDate = addDays(currentDate, 1);
    }
    return dates;
  };

  const availableDates = getAvailableDates();

  const createReservationMutation = useMutation({
    mutationFn: async (data: ReservationData) => {
      return await apiRequest("/api/reservations", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Prenotazione creata",
        description: "La tua prenotazione è stata confermata con successo.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Errore nella prenotazione",
        description: error.message || "Si è verificato un errore durante la creazione della prenotazione.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedZone(null);
    setSelectedDate(null);
    setSelectedTimeSlot(null);
  };

  const handleSubmit = () => {
    if (!selectedZone || !selectedDate || !selectedTimeSlot) {
      toast({
        title: "Seleziona tutti i campi",
        description: "Devi selezionare zona, data e orario.",
        variant: "destructive",
      });
      return;
    }

    createReservationMutation.mutate({
      zoneId: selectedZone,
      huntDate: selectedDate.toISOString(),
      timeSlot: selectedTimeSlot,
    });
  };

  const canProceed = selectedZone && selectedDate && selectedTimeSlot;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Nuova Prenotazione di Caccia
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8 p-4">
          {/* Step 1: Selezione Zona */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
              Seleziona la Zona di Caccia
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
              {zones.slice(0, 16).map((zone) => (
                <Button
                  key={zone.id}
                  variant={selectedZone === zone.id ? "default" : "outline"}
                  className="h-12 sm:h-16 text-sm sm:text-lg font-medium"
                  onClick={() => setSelectedZone(zone.id)}
                >
                  {zone.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Step 2: Selezione Data */}
          {selectedZone && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                Seleziona la Data
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {availableDates.map((date, index) => (
                  <Button
                    key={index}
                    variant={selectedDate && isSameDay(selectedDate, date) ? "default" : "outline"}
                    className="h-16 sm:h-20 flex flex-col items-center justify-center text-center"
                    onClick={() => setSelectedDate(date)}
                  >
                    <div className="text-xs sm:text-sm font-medium">
                      {format(date, "EEE", { locale: it })}
                    </div>
                    <div className="text-sm sm:text-lg font-bold">
                      {format(date, "dd", { locale: it })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(date, "MMM", { locale: it })}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Selezione Orario */}
          {selectedZone && selectedDate && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
                Seleziona l'Orario
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Card 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedTimeSlot === "morning" ? "ring-2 ring-green-600 bg-green-50" : ""
                  }`}
                  onClick={() => setSelectedTimeSlot("morning")}
                >
                  <CardContent className="p-4 sm:p-6 text-center">
                    <div className="text-lg sm:text-2xl font-bold text-gray-900 mb-2">
                      Mattina
                    </div>
                    <div className="text-sm sm:text-lg text-gray-600">
                      Alba - 12:00
                    </div>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedTimeSlot === "afternoon" ? "ring-2 ring-green-600 bg-green-50" : ""
                  }`}
                  onClick={() => setSelectedTimeSlot("afternoon")}
                >
                  <CardContent className="p-4 sm:p-6 text-center">
                    <div className="text-lg sm:text-2xl font-bold text-gray-900 mb-2">
                      Pomeriggio
                    </div>
                    <div className="text-sm sm:text-lg text-gray-600">
                      12:00 - Tramonto
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Riepilogo e Conferma */}
          {canProceed && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">4</span>
                Conferma la Prenotazione
              </h3>
              <Card className="bg-gray-50">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">Zona:</span>
                      <Badge variant="outline" className="text-lg px-4 py-1">
                        {zones.find(z => z.id === selectedZone)?.name}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">Data:</span>
                      <Badge variant="outline" className="text-lg px-4 py-1">
                        {selectedDate && format(selectedDate, "dd MMMM yyyy", { locale: it })}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">Orario:</span>
                      <Badge variant="outline" className="text-lg px-4 py-1">
                        {selectedTimeSlot === "morning" ? "Mattina (Alba-12:00)" : "Pomeriggio (12:00-Tramonto)"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center p-6 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="text-lg px-6 py-3"
          >
            Annulla
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canProceed || createReservationMutation.isPending}
            className="bg-green-600 hover:bg-green-700 text-white text-lg px-8 py-3"
          >
            {createReservationMutation.isPending ? "Creando..." : "Conferma Prenotazione"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
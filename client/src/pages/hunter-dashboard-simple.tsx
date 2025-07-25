import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Header from "@/components/layout/header";
import MultiStepReservation from "@/components/multi-step-reservation";
import HuntReportModal from "@/components/hunt-report-modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { authService } from "@/lib/auth";
import type { ZoneWithQuotas, ReservationWithDetails } from "@/lib/types";
import { CalendarCheck, Target, Plus, ClipboardList, X } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function HunterDashboard() {
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<number | null>(null);
  const [selectedSpecies, setSelectedSpecies] = useState<'all' | 'roe_deer' | 'red_deer' | 'fallow_deer' | 'mouflon' | 'chamois'>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: zones = [], isLoading: zonesLoading } = useQuery<ZoneWithQuotas[]>({
    queryKey: ["/api/zones"],
  });

  const { data: reservations = [], isLoading: reservationsLoading } = useQuery<ReservationWithDetails[]>({
    queryKey: ["/api/reservations"],
  });

  const { data: regionalQuotas = [] } = useQuery({
    queryKey: ["/api/regional-quotas"],
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["/api/reports"],
  });

  const { data: currentReserve } = useQuery({
    queryKey: ["/api/current-reserve"],
  });

  const cancelReservationMutation = useMutation({
    mutationFn: async (reservationId: number) => {
      return await apiRequest(`/api/reservations/${reservationId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      toast({
        title: "Prenotazione annullata",
        description: "La tua prenotazione è stata annullata con successo.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nell'annullamento della prenotazione.",
        variant: "destructive",
      });
    },
  });

  const activeReservations = reservations.filter(r => r.status === 'active');
  const completedReservations = reservations.filter(r => r.status === 'completed');
  
  // Filtra solo prenotazioni attive e completate, nasconde quelle annullate
  const visibleReservations = reservations.filter(r => r.status === 'active' || r.status === 'completed');

  const handleReportHunt = (reservationId: number) => {
    setSelectedReservation(reservationId);
    setShowReportModal(true);
  };

  // Mappatura da nome italiano a codice specie
  const getSpeciesCode = (italianName: string): string => {
    const mapping: Record<string, string> = {
      "Capriolo": "roe_deer",
      "Cervo": "red_deer", 
      "Daino": "fallow_deer",
      "Muflone": "mouflon",
      "Camoscio": "chamois"
    };
    return mapping[italianName] || italianName;
  };

  // Ottieni le specie attive per questa riserva
  const getActiveSpecies = (): string[] => {
    if (!currentReserve?.species) return [];
    return currentReserve.species.map((name: string) => getSpeciesCode(name));
  };

  // Genera i filtri dinamici basati sulle specie della riserva
  const getSpeciesFilters = () => {
    const activeSpecies = getActiveSpecies();
    const allFilters = [
      { code: 'all', label: 'Tutte' },
      { code: 'roe_deer', label: 'Capriolo' },
      { code: 'red_deer', label: 'Cervo' },
      { code: 'fallow_deer', label: 'Daino' },
      { code: 'mouflon', label: 'Muflone' },
      { code: 'chamois', label: 'Camoscio' }
    ];
    
    return allFilters.filter(filter => 
      filter.code === 'all' || activeSpecies.includes(filter.code)
    );
  };

  const handleCancelReservation = (reservationId: number) => {
    if (window.confirm("Sei sicuro di voler annullare questa prenotazione?")) {
      cancelReservationMutation.mutate(reservationId);
    }
  };

  const getFilteredQuotas = () => {
    if (selectedSpecies === 'all') return regionalQuotas;
    return regionalQuotas.filter((q: any) => q.species === selectedSpecies);
  };

  if (zonesLoading || reservationsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard Cacciatore</h1>
            <Button
              onClick={() => setShowReservationModal(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Nuova Prenotazione
            </Button>
          </div>
          <p className="text-gray-600">Benvenuto, {authService.getUser()?.firstName}</p>
        </div>

        <Tabs defaultValue="quotas" className="space-y-4 sm:space-y-6">
          <div className="w-full overflow-x-auto">
            <TabsList className="flex w-full min-w-max gap-1 sm:grid sm:grid-cols-3 sm:gap-0">
              <TabsTrigger value="quotas" className="flex items-center gap-1 px-2 py-2 text-xs sm:text-sm whitespace-nowrap">
                <Target className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Piani di Abbattimento</span>
                <span className="sm:hidden">Quote</span>
              </TabsTrigger>
              <TabsTrigger value="reservations" className="flex items-center gap-1 px-2 py-2 text-xs sm:text-sm whitespace-nowrap">
                <CalendarCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Le Mie Prenotazioni</span>
                <span className="sm:hidden">Prenotazioni</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-1 px-2 py-2 text-xs sm:text-sm whitespace-nowrap">
                <ClipboardList className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">I Miei Report</span>
                <span className="sm:hidden">Report</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="quotas" className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900">Piani di Abbattimento Regionali</h3>

            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm font-medium text-gray-700">Filtra per specie:</span>
              <div className="flex gap-2 flex-wrap">
                {getSpeciesFilters().map((filter) => (
                  <Button
                    key={filter.code}
                    size="sm"
                    variant={selectedSpecies === filter.code ? 'default' : 'outline'}
                    onClick={() => setSelectedSpecies(filter.code as any)}
                    className="h-8"
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="overflow-x-auto">
                  <Table className="min-w-full text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Specie</TableHead>
                        <TableHead className="text-xs">Categoria</TableHead>
                        <TableHead className="text-xs">Quota</TableHead>
                        <TableHead className="text-xs">Prelevati</TableHead>
                        <TableHead className="text-xs">Disponibili</TableHead>
                        <TableHead className="text-xs">Periodo</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {getFilteredQuotas().map((quota: any) => {
                      const available = quota.totalQuota - quota.harvested;
                      const getCategoryLabel = (q: any) => {
                        if (q.species === 'roe_deer') {
                          return q.roeDeerCategory || 'N/A';
                        } else if (q.species === 'red_deer') {
                          return q.redDeerCategory || 'N/A';
                        } else if (q.species === 'fallow_deer') {
                          return q.fallowDeerCategory || 'N/A';
                        } else if (q.species === 'mouflon') {
                          return q.mouflonCategory || 'N/A';
                        } else if (q.species === 'chamois') {
                          return q.chamoisCategory || 'N/A';
                        }
                        return 'N/A';
                      };

                      const formatPeriod = (startDate: string | null, endDate: string | null, notes: string | null) => {
                        if (notes) return notes;
                        if (startDate && endDate) {
                          const start = new Date(startDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
                          const end = new Date(endDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
                          return `${start} - ${end}`;
                        }
                        return "Non definito";
                      };

                      return (
                        <TableRow key={quota.id}>
                          <TableCell className="font-medium">
                            {quota.species === 'roe_deer' ? 'Capriolo' : 
                             quota.species === 'red_deer' ? 'Cervo' :
                             quota.species === 'fallow_deer' ? 'Daino' :
                             quota.species === 'mouflon' ? 'Muflone' :
                             quota.species === 'chamois' ? 'Camoscio' : 
                             'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{getCategoryLabel(quota)}</Badge>
                          </TableCell>
                          <TableCell className="text-center font-semibold">{quota.totalQuota}</TableCell>
                          <TableCell className="text-center text-red-600 font-semibold">{quota.harvested}</TableCell>
                          <TableCell className="text-center">
                            <span className={`font-bold ${available <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {available}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatPeriod(quota.huntingStartDate, quota.huntingEndDate, quota.notes)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reservations" className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900">Le Mie Prenotazioni</h3>
            <div className="space-y-4">
              {visibleReservations.length > 0 ? (
                visibleReservations.map((reservation) => (
                  <Card key={reservation.id} className="border-l-4 border-l-available">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                            {reservation.zone.name}
                          </h3>
                          <p className="text-sm sm:text-base text-gray-600">
                            {format(new Date(reservation.huntDate), "dd MMMM yyyy", { locale: it })}
                          </p>
                          <p className="text-sm text-gray-500">
                            {reservation.timeSlot === "morning" 
                              ? "Alba-12:00" 
                              : reservation.timeSlot === "afternoon" 
                              ? "12:00-Tramonto" 
                              : "Alba-Tramonto"}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                          <Badge
                            variant={
                              reservation.status === "active"
                                ? "default"
                                : reservation.status === "completed"
                                ? "secondary"
                                : "destructive"
                            }
                            className={
                              reservation.status === "active"
                                ? "status-available text-white"
                                : ""
                            }
                          >
                            {reservation.status === "active"
                              ? "Attiva"
                              : reservation.status === "completed"
                              ? "Completata"
                              : "Annullata"}
                          </Badge>
                          <div className="flex gap-2">
                            {reservation.status === "active" && (
                              <>
                                <Button
                                  onClick={() => handleReportHunt(reservation.id)}
                                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                                  size="sm"
                                >
                                  <ClipboardList className="mr-1" size={14} />
                                  Report
                                </Button>
                                <Button
                                  onClick={() => handleCancelReservation(reservation.id)}
                                  variant="destructive"
                                  size="sm"
                                  disabled={cancelReservationMutation.isPending}
                                >
                                  <X className="mr-1" size={14} />
                                  Annulla
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CalendarCheck className="mx-auto mb-4" size={48} />
                  <p className="text-lg">Nessuna prenotazione trovata</p>
                  <p className="text-base">Inizia prenotando una zona di caccia</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900">I Miei Report di Caccia</h3>
            <div className="space-y-4">
              {reports.length > 0 ? (
                reports.map((report: any) => (
                  <Card key={report.id}>
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">
                              {report.reservation?.zone?.name || `Zona ${report.reservation?.zoneId || 'N/A'}`}
                            </h4>
                            <p className="text-gray-600">
                              {report.reservation?.huntDate && format(new Date(report.reservation.huntDate), "dd MMMM yyyy", { locale: it })},{" "}
                              {report.reservation?.timeSlot === "morning" ? "Mattina" : "Pomeriggio"}
                            </p>
                          </div>
                          <Badge 
                            variant={report.outcome === 'harvest' ? 'default' : 'secondary'}
                          >
                            {report.outcome === 'harvest' ? 'Prelievo' : 'Nessun Prelievo'}
                          </Badge>
                        </div>
                        
                        {report.outcome === 'harvest' && report.species && (
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm font-medium text-gray-700">Dettagli Prelievo:</p>
                            <div className="mt-1 space-y-1">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Specie:</span> {
                                  report.species === 'roe_deer' ? 'Capriolo' : 
                                  report.species === 'red_deer' ? 'Cervo' :
                                  report.species === 'fallow_deer' ? 'Daino' :
                                  report.species === 'mouflon' ? 'Muflone' :
                                  report.species === 'chamois' ? 'Camoscio' : 
                                  'N/A'
                                }
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Sesso:</span> {report.sex === 'male' ? 'Maschio' : 'Femmina'}
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Età:</span> {report.ageClass === 'adult' ? 'Adulto' : 'Giovane'}
                              </p>
                              {report.notes && (
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Note:</span> {report.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ClipboardList className="mx-auto mb-4" size={48} />
                  <p className="text-lg">Nessun report completato</p>
                  <p className="text-base">I report appariranno qui dopo le cacce</p>
                </div>
              )}
              
              {activeReservations.filter(r => new Date(r.huntDate) < new Date()).length > 0 && (
                <>
                  <h4 className="text-lg font-semibold text-orange-600 mt-8">Report da Completare</h4>
                  {activeReservations
                    .filter(r => new Date(r.huntDate) < new Date())
                    .map((reservation) => (
                      <Card key={reservation.id} className="border-l-4 border-l-orange-500">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900">{reservation.zone.name}</h4>
                              <p className="text-gray-600">
                                {format(new Date(reservation.huntDate), "dd MMMM yyyy", { locale: it })},{" "}
                                {reservation.timeSlot === "morning" ? "Mattina" : "Pomeriggio"}
                              </p>
                            </div>
                            <Button
                              onClick={() => handleReportHunt(reservation.id)}
                              className="bg-orange-600 hover:bg-orange-700 text-white"
                            >
                              <ClipboardList className="mr-1" size={16} />
                              Completa Report
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <MultiStepReservation
        open={showReservationModal}
        onOpenChange={setShowReservationModal}
        zones={zones}
      />

      {selectedReservation && (
        <HuntReportModal
          open={showReportModal}
          onOpenChange={setShowReportModal}
          reservation={reservations.find(r => r.id === selectedReservation)!}
        />
      )}
    </div>
  );
}
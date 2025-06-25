import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Header from "@/components/layout/header";
import ReservationModal from "@/components/reservation-modal-elderly";
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
  const [selectedSpecies, setSelectedSpecies] = useState<'all' | 'roe_deer' | 'red_deer'>('all');
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

  const cancelReservationMutation = useMutation({
    mutationFn: async (reservationId: number) => {
      return await apiRequest("DELETE", `/api/reservations/${reservationId}`, {});
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

  const handleReportHunt = (reservationId: number) => {
    setSelectedReservation(reservationId);
    setShowReportModal(true);
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
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Cacciatore</h1>
            <Button
              onClick={() => setShowReservationModal(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-4 w-4" />
              Nuova Prenotazione
            </Button>
          </div>
          <p className="text-gray-600">Benvenuto, {authService.getUser()?.firstName}</p>
        </div>

        <Tabs defaultValue="quotas" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="quotas" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Piani di Abbattimento
            </TabsTrigger>
            <TabsTrigger value="reservations" className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" />
              Le Mie Prenotazioni
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              I Miei Report
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quotas" className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900">Piani di Abbattimento Regionali</h3>

            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm font-medium text-gray-700">Filtra per specie:</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={selectedSpecies === 'all' ? 'default' : 'outline'}
                  onClick={() => setSelectedSpecies('all')}
                  className="h-8"
                >
                  Tutte
                </Button>
                <Button
                  size="sm"
                  variant={selectedSpecies === 'roe_deer' ? 'default' : 'outline'}
                  onClick={() => setSelectedSpecies('roe_deer')}
                  className="h-8"
                >
                  Capriolo
                </Button>
                <Button
                  size="sm"
                  variant={selectedSpecies === 'red_deer' ? 'default' : 'outline'}
                  onClick={() => setSelectedSpecies('red_deer')}
                  className="h-8"
                >
                  Cervo
                </Button>
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
                        } else {
                          return q.redDeerCategory || 'N/A';
                        }
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
                            {quota.species === 'roe_deer' ? 'Capriolo' : 'Cervo'}
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
              {reservations.length > 0 ? (
                reservations.map((reservation) => (
                  <Card key={reservation.id} className="border-l-4 border-l-available">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{reservation.zone.name}</h3>
                          <p className="text-gray-600">
                            {format(new Date(reservation.huntDate), "dd MMMM yyyy", { locale: it })},{" "}
                            {reservation.timeSlot === "morning" 
                              ? "Mattina" 
                              : reservation.timeSlot === "afternoon" 
                              ? "Pomeriggio" 
                              : "Tutto il Giorno"}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
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
                                <span className="font-medium">Specie:</span> {report.species === 'roe_deer' ? 'Capriolo' : 'Cervo'}
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

      <ReservationModal
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
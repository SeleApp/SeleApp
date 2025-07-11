import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Header from "@/components/layout/header";
import MultiStepReservation from "@/components/multi-step-reservation";
import HuntReportModal from "@/components/hunt-report-modal";
import { authService } from "@/lib/auth";
import type { ZoneWithQuotas, ReservationWithDetails } from "@/lib/types";
import { CalendarCheck, Target, Plus, ClipboardList, Calendar } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function HunterDashboard() {
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<number | null>(null);

  const { data: zones = [], isLoading: zonesLoading } = useQuery<ZoneWithQuotas[]>({
    queryKey: ["/api/zones"],
  });

  const { data: reservations = [], isLoading: reservationsLoading } = useQuery<ReservationWithDetails[]>({
    queryKey: ["/api/reservations"],
  });

  const { data: regionalQuotas = [] } = useQuery({
    queryKey: ["/api/regional-quotas"],
  });

  const user = authService.getUser();
  const activeReservations = reservations.filter(r => r.status === 'active');
  const completedReservations = reservations.filter(r => r.status === 'completed');

  const filteredZones = zones.filter(zone => {
    // Add any filtering logic here based on dateFilter and timeSlotFilter
    return true;
  });

  const handleReportHunt = (reservationId: number) => {
    setSelectedReservation(reservationId);
    setShowReportModal(true);
  };

  if (zonesLoading || reservationsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

      <main className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="mb-4 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2">Dashboard Cacciatore</h1>
          <p className="text-sm sm:text-base text-gray-600">Benvenuto, {authService.getUser()?.firstName}</p>
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

          <TabsContent value="quotas" className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <h3 className="text-lg sm:text-2xl font-bold text-gray-900">Piani di Abbattimento Regionali</h3>
              <Button
                onClick={() => setShowReservationModal(true)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Nuova Prenotazione
              </Button>
            </div>

            <Card>
              <CardContent className="p-2 sm:p-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">Specie</TableHead>
                        <TableHead className="text-xs sm:text-sm">Categoria</TableHead>
                        <TableHead className="text-xs sm:text-sm">Quota</TableHead>
                        <TableHead className="text-xs sm:text-sm">Prelevati</TableHead>
                        <TableHead className="text-xs sm:text-sm">Disponibili</TableHead>
                        <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Periodo</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {regionalQuotas.map((quota: any) => {
                      const available = quota.totalQuota - quota.harvested;
                      const getCategoryLabel = (q: any) => {
                        if (q.species === 'roe_deer') {
                          return q.roeDeerCategory; // M0, F0, FA, M1, MA
                        } else if (q.species === 'red_deer') {
                          return q.redDeerCategory; // CL0, FF, MM, MCL1
                        } else if (q.species === 'fallow_deer') {
                          return q.fallowDeerCategory; // DA-M-0, DA-M-I, DA-M-II, DA-F-0, DA-F-I, DA-F-II
                        } else if (q.species === 'mouflon') {
                          return q.mouflonCategory; // MU-M-0, MU-M-I, MU-M-II, MU-F-0, MU-F-I, MU-F-II
                        } else if (q.species === 'chamois') {
                          return q.chamoisCategory; // CA-M-0, CA-M-I, CA-M-II, CA-M-III, CA-F-0, CA-F-I, CA-F-II, CA-F-III
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
                          <TableCell className="font-medium text-xs sm:text-sm">
                            {quota.species === 'roe_deer' ? 'Capriolo' : 
                             quota.species === 'red_deer' ? 'Cervo' :
                             quota.species === 'fallow_deer' ? 'Daino' :
                             quota.species === 'mouflon' ? 'Muflone' :
                             quota.species === 'chamois' ? 'Camoscio' : quota.species}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <Badge variant="outline" className="text-xs px-1 py-0">{getCategoryLabel(quota)}</Badge>
                          </TableCell>
                          <TableCell className="text-center font-semibold text-xs sm:text-sm">{quota.totalQuota}</TableCell>
                          <TableCell className="text-center text-red-600 font-semibold text-xs sm:text-sm">{quota.harvested}</TableCell>
                          <TableCell className="text-center text-xs sm:text-sm">
                            <span className={`font-bold ${available <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {available}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
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

          <TabsContent value="reservations" className="space-y-4 sm:space-y-6">
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900">Le Mie Prenotazioni</h3>
            <div className="space-y-3 sm:space-y-4">
              {reservations.length > 0 ? (
                reservations.map((reservation) => (
                  <Card key={reservation.id} className="border-l-4 border-l-available">
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex flex-col gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">{reservation.zone.name}</h3>
                          <p className="text-xs sm:text-sm text-gray-600 mt-1">
                            {format(new Date(reservation.huntDate), "dd MMMM yyyy", { locale: it })},{" "}
                            {reservation.timeSlot === "morning" ? "Mattina" : 
                             reservation.timeSlot === "afternoon" ? "Pomeriggio" : "Tutto il Giorno"}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                          <Badge
                            variant={
                              reservation.status === "active"
                                ? "default"
                                : reservation.status === "completed"
                                ? "secondary"
                                : "destructive"
                            }
                            className={`text-xs sm:text-sm w-fit ${
                              reservation.status === "active"
                                ? "status-available text-white"
                                : ""
                            }`}
                          >
                            {reservation.status === "active"
                              ? "Attiva"
                              : reservation.status === "completed"
                              ? "Completata"
                              : "Annullata"}
                          </Badge>
                          {reservation.status === "active" && (
                            <Button
                              onClick={() => handleReportHunt(reservation.id)}
                              className="bg-accent hover:bg-accent/90 text-accent-foreground"
                            >
                              <ClipboardList className="mr-1" size={16} />
                              Report
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="mx-auto mb-4" size={48} />
                  <p className="text-lg">Nessuna prenotazione trovata</p>
                  <p className="text-base">Inizia prenotando una zona di caccia</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4 sm:space-y-6">
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900">I Miei Report di Caccia</h3>
            <div className="space-y-4">
              {completedReservations.length > 0 ? (
                completedReservations.map((reservation) => (
                  <Card key={reservation.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{reservation.zone.name}</h4>
                          <p className="text-gray-600">
                            {format(new Date(reservation.huntDate), "dd MMMM yyyy", { locale: it })},{" "}
                            {reservation.timeSlot === "morning" ? "Mattina" : "Pomeriggio"}
                          </p>
                          <Badge 
                            variant="secondary" 
                            className="mt-2"
                          >
                            Report Completato
                          </Badge>
                        </div>
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
              
              {/* Reports to complete */}
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

      {/* Modals */}
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

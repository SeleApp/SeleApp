import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Header from "@/components/layout/header";
import ReservationModal from "@/components/reservation-modal";
import HuntReportModal from "@/components/hunt-report-modal";
import { authService } from "@/lib/auth";
import type { ZoneWithQuotas, ReservationWithDetails } from "@/lib/types";
import { CalendarCheck, Target, Plus, ClipboardList } from "lucide-react";
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

  const activeReservations = reservations.filter(r => r.status === 'active');
  const completedReservations = reservations.filter(r => r.status === 'completed');

  const handleReportHunt = (reservationId: number) => {
    setSelectedReservation(reservationId);
    setShowReportModal(true);
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Cacciatore</h1>
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
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-900">Piani di Abbattimento Regionali</h3>
              <Button
                onClick={() => setShowReservationModal(true)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="h-4 w-4" />
                Nuova Prenotazione
              </Button>
            </div>

            <Card>
              <CardContent className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Specie</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Quota</TableHead>
                      <TableHead>Prelevati</TableHead>
                      <TableHead>Disponibili</TableHead>
                      <TableHead>Periodo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regionalQuotas.map((quota: any) => {
                      const available = quota.totalQuota - quota.harvested;
                      const getCategoryLabel = (q: any) => {
                        if (q.species === 'roe_deer') {
                          const labels: Record<string, string> = {
                            'M0': 'Maschio 0 anni',
                            'F0': 'Femmina 0 anni', 
                            'FA': 'Femmina Adulta',
                            'M1': 'Maschio 1 anno',
                            'MA': 'Maschio Adulto'
                          };
                          return labels[q.roeDeerCategory] || q.roeDeerCategory;
                        } else {
                          const labels: Record<string, string> = {
                            'CL0': 'Cerbiatto 0 anni',
                            'FF': 'Femmina Fertile',
                            'MM': 'Maschio Maturo',
                            'MCL1': 'Maschio 1 anno'
                          };
                          return labels[q.redDeerCategory] || q.redDeerCategory;
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
                            {reservation.timeSlot === "morning" ? "Mattina" : "Pomeriggio"}
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
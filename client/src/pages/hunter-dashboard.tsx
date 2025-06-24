import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Header from "@/components/layout/header";
import ZoneCard from "@/components/zone-card";
import ReservationModal from "@/components/reservation-modal";
import HuntReportModal from "@/components/hunt-report-modal";
import { authService } from "@/lib/auth";
import type { ZoneWithQuotas, ReservationWithDetails } from "@/lib/types";
import { CalendarCheck, Target, MapPin, Plus, Calendar, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function HunterDashboard() {
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<number | null>(null);
  const [dateFilter, setDateFilter] = useState("");
  const [timeSlotFilter, setTimeSlotFilter] = useState("");

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Status */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Riepilogo Caccia</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-l-4 border-l-available">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <CalendarCheck className="text-available text-2xl mr-4" size={32} />
                  <div>
                    <p className="text-base text-gray-600">Prenotazioni Attive</p>
                    <p className="text-3xl font-bold text-gray-900">{activeReservations.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-secondary">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Target className="text-secondary text-2xl mr-4" size={32} />
                  <div>
                    <p className="text-base text-gray-600">Cacce Completate</p>
                    <p className="text-3xl font-bold text-gray-900">{completedReservations.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Target className="text-amber-600 text-2xl mr-4" size={32} />
                  <div>
                    <p className="text-base text-gray-600">Capi Prelevati Capriolo</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {regionalQuotas
                        .filter((q: any) => q.species === 'roe_deer')
                        .reduce((sum: number, q: any) => sum + q.harvested, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Target className="text-red-600 text-2xl mr-4" size={32} />
                  <div>
                    <p className="text-base text-gray-600">Capi Prelevati Cervo</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {regionalQuotas
                        .filter((q: any) => q.species === 'red_deer')
                        .reduce((sum: number, q: any) => sum + q.harvested, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Zone Booking Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Prenota Zone di Caccia</h2>
            <Button
              onClick={() => setShowReservationModal(true)}
              className="btn-large bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="mr-2" size={20} />
              Nuova Prenotazione
            </Button>
          </div>

          {/* Date Filter */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-lg font-medium text-gray-700 mb-2">Data</label>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="input-large w-full"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-lg font-medium text-gray-700 mb-2">Fascia Oraria</label>
                  <select
                    value={timeSlotFilter}
                    onChange={(e) => setTimeSlotFilter(e.target.value)}
                    className="input-large w-full"
                  >
                    <option value="">Tutte le fasce</option>
                    <option value="morning">Mattina (6:00 - 12:00)</option>
                    <option value="afternoon">Pomeriggio (14:00 - 18:00)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Zone Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredZones.slice(0, 16).map((zone) => (
              <ZoneCard
                key={zone.id}
                zone={zone}
                onReserve={() => setShowReservationModal(true)}
              />
            ))}
          </div>
        </div>

        <Tabs defaultValue="zones" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="zones" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Zone di Caccia
            </TabsTrigger>
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
              Report Caccia
            </TabsTrigger>
          </TabsList>

          <TabsContent value="zones" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-900">Zone di Caccia Disponibili</h3>
              <Button
                onClick={() => setShowReservationModal(true)}
                className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <Plus className="h-4 w-4" />
                Nuova Prenotazione
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredZones.slice(0, 16).map((zone) => (
              <ZoneCard
                key={zone.id}
                zone={zone}
                onReserve={() => setShowReservationModal(true)}
              />
            ))}
            </div>
          </TabsContent>

          <TabsContent value="quotas" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-900">Piani di Abbattimento Regionali</h3>
              <p className="text-sm text-gray-600">Informazioni aggiornate in tempo reale</p>
            </div>

            <Card>
              <CardContent className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Specie</TableHead>
                      <TableHead>Classe e Sesso</TableHead>
                      <TableHead>Quota Totale</TableHead>
                      <TableHead>Capi Prelevati</TableHead>
                      <TableHead>Rimanenti</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Periodo di Caccia</TableHead>
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
                      
                      const getStatusIndicator = (q: any) => {
                        const remaining = q.totalQuota - q.harvested;
                        if (remaining <= 0) {
                          return <div className="w-3 h-3 bg-red-500 rounded-full"></div>;
                        }
                        return <div className="w-3 h-3 bg-green-500 rounded-full"></div>;
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
                          <TableCell>
                            <span className="font-medium">
                              {quota.species === 'roe_deer' ? '🦌 Capriolo' : '🦌 Cervo'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{getCategoryLabel(quota)}</Badge>
                          </TableCell>
                          <TableCell className="text-center font-semibold">{quota.totalQuota}</TableCell>
                          <TableCell className="text-center">
                            <span className="font-semibold text-red-600">{quota.harvested}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-bold ${available <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {available}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusIndicator(quota)}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium">
                              {formatPeriod(quota.huntingStartDate, quota.huntingEndDate, quota.notes)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2 text-amber-600">Totale Capriolo</h4>
                      <div className="text-sm">
                        <div className="flex justify-between">
                          <span>Quota totale:</span>
                          <span className="font-bold text-green-600">
                            {regionalQuotas
                              .filter((q: any) => q.species === 'roe_deer')
                              .reduce((sum: number, q: any) => sum + q.totalQuota, 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Già prelevati:</span>
                          <span className="font-bold text-red-600">
                            {regionalQuotas
                              .filter((q: any) => q.species === 'roe_deer')
                              .reduce((sum: number, q: any) => sum + q.harvested, 0)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-1 mt-1">
                          <span>Rimanenti:</span>
                          <span className="font-bold text-blue-600">
                            {regionalQuotas
                              .filter((q: any) => q.species === 'roe_deer')
                              .reduce((sum: number, q: any) => sum + (q.totalQuota - q.harvested), 0)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2 text-red-600">Totale Cervo</h4>
                      <div className="text-sm">
                        <div className="flex justify-between">
                          <span>Quota totale:</span>
                          <span className="font-bold text-green-600">
                            {regionalQuotas
                              .filter((q: any) => q.species === 'red_deer')
                              .reduce((sum: number, q: any) => sum + q.totalQuota, 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Già prelevati:</span>
                          <span className="font-bold text-red-600">
                            {regionalQuotas
                              .filter((q: any) => q.species === 'red_deer')
                              .reduce((sum: number, q: any) => sum + q.harvested, 0)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-1 mt-1">
                          <span>Rimanenti:</span>
                          <span className="font-bold text-blue-600">
                            {regionalQuotas
                              .filter((q: any) => q.species === 'red_deer')
                              .reduce((sum: number, q: any) => sum + (q.totalQuota - q.harvested), 0)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
                  <Calendar className="mx-auto mb-4" size={48} />
                  <p className="text-lg">Nessuna prenotazione trovata</p>
                  <p className="text-base">Inizia prenotando una zona di caccia</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900">Report Caccia</h3>
            <div className="space-y-4">
              {activeReservations.filter(r => new Date(r.huntDate) < new Date()).length > 0 ? (
                activeReservations
                  .filter(r => new Date(r.huntDate) < new Date())
                  .map((reservation) => (
                    <Card key={reservation.id} className="border-l-4 border-l-orange-500">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">{reservation.zone.name}</h3>
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
                  ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ClipboardList className="mx-auto mb-4" size={48} />
                  <p className="text-lg">Nessun report da completare</p>
                  <p className="text-base">I report vanno fatti dopo la caccia</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modals */}
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

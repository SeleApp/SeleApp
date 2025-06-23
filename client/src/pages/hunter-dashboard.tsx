import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Le Tue Prenotazioni</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

            <Card className="border-l-4 border-l-accent">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Target className="text-accent text-2xl mr-4" size={32} />
                  <div>
                    <p className="text-base text-gray-600">Capi Prelevati</p>
                    <p className="text-3xl font-bold text-gray-900">{completedReservations.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <MapPin className="text-primary text-2xl mr-4" size={32} />
                  <div>
                    <p className="text-base text-gray-600">Zone Disponibili</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {zones.filter(z => z.quotaStatus !== '🔴').length}
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
            {filteredZones.map((zone) => (
              <ZoneCard
                key={zone.id}
                zone={zone}
                onReserve={() => setShowReservationModal(true)}
              />
            ))}
          </div>
        </div>

        {/* Recent Reservations */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Prenotazioni Recenti</h3>
            <div className="space-y-4">
              {reservations.slice(0, 5).map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 rounded-xl"
                >
                  <div className="flex-1 mb-4 sm:mb-0">
                    <h4 className="text-lg font-semibold text-gray-900">{reservation.zone.name}</h4>
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
              ))}
              {reservations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="mx-auto mb-4" size={48} />
                  <p className="text-lg">Nessuna prenotazione trovata</p>
                  <p className="text-base">Inizia prenotando una zona di caccia</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
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

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/layout/header";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { AdminStats, ReservationWithDetails } from "@/lib/types";
import { Users, CalendarCheck, Target, AlertTriangle, MapPin, Calendar, BarChart, FileText, X, Edit, Save } from "lucide-react";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("zones");
  const [editingQuota, setEditingQuota] = useState<number | null>(null);
  const [quotaValues, setQuotaValues] = useState<Record<number, number>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: reservations = [], isLoading: reservationsLoading } = useQuery<ReservationWithDetails[]>({
    queryKey: ["/api/reservations"],
  });

  const { data: quotasData = [], isLoading: quotasLoading } = useQuery({
    queryKey: ["/api/admin/quotas"],
  });

  const updateQuotaMutation = useMutation({
    mutationFn: async ({ quotaId, harvested }: { quotaId: number; harvested: number }) => {
      const response = await apiRequest("PATCH", `/api/admin/quotas/${quotaId}`, { harvested });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/quotas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/zones"] });
      toast({
        title: "Quota aggiornata",
        description: "La quota è stata aggiornata con successo.",
      });
      setEditingQuota(null);
      setQuotaValues({});
    },
    onError: (error: Error) => {
      toast({
        title: "Errore nell'aggiornamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleQuotaEdit = (quotaId: number, currentValue: number) => {
    setEditingQuota(quotaId);
    setQuotaValues({ ...quotaValues, [quotaId]: currentValue });
  };

  const handleQuotaSave = (quotaId: number) => {
    const newValue = quotaValues[quotaId];
    if (newValue !== undefined && newValue >= 0) {
      updateQuotaMutation.mutate({ quotaId, harvested: newValue });
    }
  };

  const handleQuotaCancel = () => {
    setEditingQuota(null);
    setQuotaValues({});
  };

  if (statsLoading || reservationsLoading || quotasLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map(i => (
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
        {/* Admin Stats */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Statistiche Generali</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="text-primary text-2xl mr-4" size={32} />
                  <div>
                    <p className="text-base text-gray-600">Cacciatori Attivi</p>
                    <p className="text-3xl font-bold text-gray-900">{stats?.activeHunters || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-available">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <CalendarCheck className="text-available text-2xl mr-4" size={32} />
                  <div>
                    <p className="text-base text-gray-600">Prenotazioni Oggi</p>
                    <p className="text-3xl font-bold text-gray-900">{stats?.todayReservations || 0}</p>
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
                    <p className="text-3xl font-bold text-gray-900">{stats?.totalHarvested || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-low">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <AlertTriangle className="text-low text-2xl mr-4" size={32} />
                  <div>
                    <p className="text-base text-gray-600">Quote in Esaurimento</p>
                    <p className="text-3xl font-bold text-gray-900">{stats?.lowQuotas || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="zones" className="flex items-center gap-2 text-lg py-4">
              <MapPin size={20} />
              Zone e Quote
            </TabsTrigger>
            <TabsTrigger value="reservations" className="flex items-center gap-2 text-lg py-4">
              <Calendar size={20} />
              Prenotazioni
            </TabsTrigger>
            <TabsTrigger value="hunters" className="flex items-center gap-2 text-lg py-4">
              <Users size={20} />
              Cacciatori
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2 text-lg py-4">
              <BarChart size={20} />
              Report
            </TabsTrigger>
          </TabsList>

          {/* Zones Tab */}
          <TabsContent value="zones">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 sm:mb-0">Gestione Zone e Quote</h3>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <FileText className="mr-2" size={20} />
                    Aggiorna Quote
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {quotasData.map((zone: any) => (
                    <div key={zone.id} className="border border-gray-200 rounded-xl p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="text-lg font-bold text-gray-900">{zone.name}</h4>
                        <div className="flex items-center">
                          <span className="text-xl mr-1">
                            {zone.quotas?.some((q: any) => q.harvested >= q.totalQuota * 0.8) ? 
                              zone.quotas?.some((q: any) => q.harvested >= q.totalQuota) ? "🔴" : "🟡" 
                              : "🟢"}
                          </span>
                          <span className="text-sm text-gray-600">
                            {zone.quotas?.some((q: any) => q.harvested >= q.totalQuota) ? 
                              "Esaurita" : 
                              zone.quotas?.some((q: any) => q.harvested >= q.totalQuota * 0.8) ? 
                                "Bassa" : "Buone"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {zone.quotas?.map((quota: any) => (
                          <div key={quota.id} className="flex justify-between items-center">
                            <span className="text-gray-600">
                              {quota.species === 'roe_deer' ? 'Capriolo' : 'Cervo'} {quota.sex === 'male' ? 'M' : 'F'}/{quota.ageClass === 'adult' ? 'A' : 'G'}:
                            </span>
                            <div className="flex items-center space-x-2">
                              {editingQuota === quota.id ? (
                                <div className="flex items-center space-x-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    max={quota.totalQuota}
                                    value={quotaValues[quota.id] || 0}
                                    onChange={(e) => setQuotaValues({
                                      ...quotaValues,
                                      [quota.id]: parseInt(e.target.value) || 0
                                    })}
                                    className="w-16 h-8 text-sm"
                                  />
                                  <span className="text-sm">/{quota.totalQuota}</span>
                                  <Button
                                    size="sm"
                                    onClick={() => handleQuotaSave(quota.id)}
                                    disabled={updateQuotaMutation.isPending}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Save size={12} />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleQuotaCancel}
                                    className="h-6 w-6 p-0"
                                  >
                                    <X size={12} />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1">
                                  <span className="font-semibold">
                                    {quota.harvested}/{quota.totalQuota}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleQuotaEdit(quota.id, quota.harvested)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Edit size={12} />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reservations Tab */}
          <TabsContent value="reservations">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Prenotazioni in Corso</h3>

                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-lg font-medium text-gray-900">Cacciatore</th>
                        <th className="px-6 py-4 text-left text-lg font-medium text-gray-900">Zona</th>
                        <th className="px-6 py-4 text-left text-lg font-medium text-gray-900">Data/Ora</th>
                        <th className="px-6 py-4 text-left text-lg font-medium text-gray-900">Stato</th>
                        <th className="px-6 py-4 text-left text-lg font-medium text-gray-900">Azioni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reservations.map((reservation) => (
                        <tr key={reservation.id}>
                          <td className="px-6 py-4 text-lg text-gray-900">
                            {reservation.hunter.firstName} {reservation.hunter.lastName}
                          </td>
                          <td className="px-6 py-4 text-lg text-gray-900">{reservation.zone.name}</td>
                          <td className="px-6 py-4 text-lg text-gray-600">
                            {new Date(reservation.huntDate).toLocaleDateString('it-IT')}, {reservation.timeSlot === 'morning' ? 'Mattina' : 'Pomeriggio'}
                          </td>
                          <td className="px-6 py-4">
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
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive/80"
                              >
                                <X size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-primary hover:text-primary/80"
                              >
                                <FileText size={16} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {reservations.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="mx-auto mb-4" size={48} />
                      <p className="text-lg">Nessuna prenotazione trovata</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hunters Tab */}
          <TabsContent value="hunters">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Gestione Cacciatori</h3>
                <div className="text-center py-8 text-gray-500">
                  <Users className="mx-auto mb-4" size={48} />
                  <p className="text-lg">Sezione in sviluppo</p>
                  <p className="text-base">Gestione utenti e permessi</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Report e Statistiche</h3>
                <div className="text-center py-8 text-gray-500">
                  <BarChart className="mx-auto mb-4" size={48} />
                  <p className="text-lg">Sezione in sviluppo</p>
                  <p className="text-base">Grafici e analisi dettagliate</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

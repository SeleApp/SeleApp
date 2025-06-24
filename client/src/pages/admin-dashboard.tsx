import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Header from "@/components/layout/header";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { AdminStats, ReservationWithDetails } from "@/lib/types";
import { Users, CalendarCheck, Target, AlertTriangle, MapPin, Calendar, BarChart, FileText, X, Edit, Save, Check } from "lucide-react";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("zones");
  const [editingQuota, setEditingQuota] = useState<number | null>(null);
  const [editingType, setEditingType] = useState<'harvested' | 'total'>('harvested');
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
    mutationFn: async ({ quotaId, harvested, totalQuota }: { quotaId: number; harvested?: number; totalQuota?: number }) => {
      const updateData: any = {};
      if (harvested !== undefined) updateData.harvested = harvested;
      if (totalQuota !== undefined) updateData.totalQuota = totalQuota;
      
      const response = await apiRequest("PATCH", `/api/admin/quotas/${quotaId}`, updateData);
      return response.json();
    },
    onSuccess: () => {
      // Refresh all quota-related data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/quotas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/zones"] });
      
      // Force immediate refetch
      queryClient.refetchQueries({ queryKey: ["/api/admin/quotas"] });
      
      toast({
        title: "Quota aggiornata",
        description: editingType === 'total' 
          ? "Quota totale aggiornata con successo." 
          : "Numero capi prelevati aggiornato con successo.",
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

  const handleQuotaEdit = (quotaId: number, currentValue: number, type: 'harvested' | 'total') => {
    setEditingQuota(quotaId);
    setEditingType(type);
    setQuotaValues({ ...quotaValues, [quotaId]: currentValue });
  };

  const handleQuotaSave = (quotaId: number) => {
    const newValue = quotaValues[quotaId];
    if (newValue !== undefined && newValue >= 0) {
      if (editingType === 'harvested') {
        updateQuotaMutation.mutate({ quotaId, harvested: newValue });
      } else {
        updateQuotaMutation.mutate({ quotaId, totalQuota: newValue });
      }
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
                  <h3 className="text-xl font-bold text-gray-900 mb-4 sm:mb-0">Gestione Quote Caccia</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-700">
                      <strong>Clicca sui numeri per modificare le quote</strong>
                    </p>
                  </div>
                </div>

                {quotasLoading ? (
                  <div className="text-center py-8">Caricamento...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-bold">Zona</TableHead>
                          <TableHead className="font-bold">Specie</TableHead>
                          <TableHead className="font-bold">Sesso</TableHead>
                          <TableHead className="font-bold">Età</TableHead>
                          <TableHead className="font-bold text-center">Prelevati</TableHead>
                          <TableHead className="font-bold text-center">Quota Totale</TableHead>
                          <TableHead className="font-bold text-center">Disponibili</TableHead>
                          <TableHead className="font-bold text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quotasData.flatMap((zone: any) =>
                          zone.quotas?.map((quota: any) => {
                            const available = quota.totalQuota - quota.harvested;
                            const percentage = quota.totalQuota > 0 ? (quota.harvested / quota.totalQuota) * 100 : 0;
                            
                            return (
                              <TableRow key={quota.id} className="hover:bg-gray-50">
                                <TableCell className="font-medium">{zone.name}</TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <span className="mr-2">🦌</span>
                                    {quota.species === 'roe_deer' ? 'Capriolo' : 'Cervo'}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100">
                                    {quota.sex === 'male' ? '♂ Maschio' : '♀ Femmina'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100">
                                    {quota.ageClass === 'adult' ? 'Adulto' : 'Giovane'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  {editingQuota === quota.id && editingType === 'harvested' ? (
                                    <div className="flex items-center justify-center space-x-1">
                                      <Input
                                        type="number"
                                        min="0"
                                        max={quota.totalQuota}
                                        value={quotaValues[quota.id] ?? quota.harvested}
                                        onChange={(e) => setQuotaValues({
                                          ...quotaValues,
                                          [quota.id]: parseInt(e.target.value) || 0
                                        })}
                                        className="w-16 h-8 text-sm text-center"
                                      />
                                      <Button
                                        size="sm"
                                        onClick={() => handleQuotaSave(quota.id)}
                                        disabled={updateQuotaMutation.isPending}
                                        className="h-6 w-6 p-0"
                                      >
                                        <Check size={12} />
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
                                    <Button
                                      variant="ghost"
                                      onClick={() => handleQuotaEdit(quota.id, quota.harvested, 'harvested')}
                                      className="font-semibold text-lg hover:bg-blue-100"
                                    >
                                      {quota.harvested}
                                    </Button>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {editingQuota === quota.id && editingType === 'total' ? (
                                    <div className="flex items-center justify-center space-x-1">
                                      <Input
                                        type="number"
                                        min="0"
                                        max="999"
                                        value={quotaValues[quota.id] ?? quota.totalQuota}
                                        onChange={(e) => setQuotaValues({
                                          ...quotaValues,
                                          [quota.id]: parseInt(e.target.value) || 0
                                        })}
                                        className="w-16 h-8 text-sm text-center"
                                      />
                                      <Button
                                        size="sm"
                                        onClick={() => handleQuotaSave(quota.id)}
                                        disabled={updateQuotaMutation.isPending}
                                        className="h-6 w-6 p-0"
                                      >
                                        <Check size={12} />
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
                                    <Button
                                      variant="ghost"
                                      onClick={() => handleQuotaEdit(quota.id, quota.totalQuota, 'total')}
                                      className="font-semibold text-lg hover:bg-green-100"
                                    >
                                      {quota.totalQuota}
                                    </Button>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className={`font-semibold ${available <= 0 ? 'text-red-600' : available <= 2 ? 'text-orange-600' : 'text-green-600'}`}>
                                    {available}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center">
                                    {percentage >= 100 ? (
                                      <Badge variant="destructive">Esaurita</Badge>
                                    ) : percentage >= 80 ? (
                                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">Attenzione</Badge>
                                    ) : (
                                      <Badge variant="secondary" className="bg-green-100 text-green-800">Disponibile</Badge>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          }) || []
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
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

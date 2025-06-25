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
import { Users, CalendarCheck, Target, AlertTriangle, MapPin, Calendar, BarChart, FileText, X, Edit, Save, Check, Settings, LogOut } from "lucide-react";
import RegionalQuotaManager from "@/components/regional-quota-manager";

// This is the old admin dashboard, replace with the new one
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("quotas");
  const [editingQuota, setEditingQuota] = useState<number | null>(null);
  const [quotaValues, setQuotaValues] = useState<Record<number, number>>({});
  const [showRegionalQuotaManager, setShowRegionalQuotaManager] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/app";
  };

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

  // Helper function per mappare vecchio formato a nuove categorie
  const getCategoryLabel = (quota: any) => {
    return quota.roeDeerCategory || quota.redDeerCategory || 'N/A';
  };

  const getSpeciesLabel = (species: string) => {
    return species === 'roe_deer' ? 'Capriolo' : 'Cervo';
  };

  const getStatusBadge = (quota: any) => {
    const available = quota.totalQuota - quota.harvested;
    if (available <= 0) return <Badge variant="destructive">Esaurito</Badge>;
    if (available <= 2) return <Badge variant="destructive">Critico</Badge>;
    if (available <= 5) return <Badge variant="secondary">Pochi rimasti</Badge>;
    return <Badge variant="default">Disponibile</Badge>;
  };

  // Helper per ottenere la descrizione della categoria
  const getCategoryDescription = (category: string) => {
    const descriptions: Record<string, string> = {
      'M0': 'Maschio Giovane',
      'F0': 'Femmina Giovane', 
      'FA': 'Femmina Adulta',
      'M1': 'Maschio Fusone',
      'MA': 'Maschio Adulto',
      'CL0': 'Piccolo M/F',
      'FF': 'Femmina Adulta',
      'MM': 'Maschio Adulto',
      'MCL1': 'Maschio Fusone'
    };
    return descriptions[category] || category;
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
                ) : quotasData.length === 0 ? (
                  <div className="text-center py-8">Nessuna quota trovata</div>
                ) : (
                  <div className="space-y-6">
                    {/* Tabella Caprioli */}
                    <div>
                      <h4 className="text-lg font-semibold mb-3 text-green-700 flex items-center">
                        🦌 Gestione Quote Capriolo
                      </h4>
                      <div className="overflow-x-auto border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-green-50">
                              <TableHead className="font-bold text-center">Zona</TableHead>
                              <TableHead className="font-bold text-center">M0<br/><small>(Maschio Giovane)</small></TableHead>
                              <TableHead className="font-bold text-center">F0<br/><small>(Femmina Giovane)</small></TableHead>
                              <TableHead className="font-bold text-center">FA<br/><small>(Femmina Adulta)</small></TableHead>
                              <TableHead className="font-bold text-center">M1<br/><small>(Maschio Fusone)</small></TableHead>
                              <TableHead className="font-bold text-center">MA<br/><small>(Maschio Adulto)</small></TableHead>
                              <TableHead className="font-bold text-center bg-blue-100">Totale<br/><small>(Prelevati/Quota)</small></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {quotasData.map((zone: any) => {
                              const roeDeerQuotas = zone.quotas?.filter((q: any) => q.species === 'roe_deer') || [];
                              const categories = ['M0', 'F0', 'FA', 'M1', 'MA'];
                              const totalHarvested = roeDeerQuotas.reduce((sum: number, q: any) => sum + q.harvested, 0);
                              const totalQuota = roeDeerQuotas.reduce((sum: number, q: any) => sum + q.totalQuota, 0);
                              
                              return (
                                <TableRow key={`roe-${zone.id}`} className="hover:bg-green-25">
                                  <TableCell className="font-medium text-center bg-gray-50">{zone.name}</TableCell>
                                  {categories.map(category => {
                                    const quota = roeDeerQuotas.find((q: any) => 
                                      q.roeDeerCategory === category
                                    );
                                    
                                    if (!quota) {
                                      return <TableCell key={category} className="text-center">-</TableCell>;
                                    }
                                    
                                    const available = quota.totalQuota - quota.harvested;
                                    const percentage = quota.totalQuota > 0 ? (quota.harvested / quota.totalQuota) * 100 : 0;
                                    
                                    return (
                                      <TableCell key={category} className="text-center">
                                        <div className="space-y-1">
                                          {/* Prelevati */}
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
                                                className="w-12 h-6 text-xs text-center"
                                              />
                                              <Button size="sm" onClick={() => handleQuotaSave(quota.id)} className="h-5 w-5 p-0">
                                                <Check size={10} />
                                              </Button>
                                            </div>
                                          ) : (
                                            <Button
                                              variant="ghost"
                                              onClick={() => handleQuotaEdit(quota.id, quota.harvested, 'harvested')}
                                              className="h-6 px-2 text-sm font-bold hover:bg-blue-100"
                                            >
                                              {quota.harvested}
                                            </Button>
                                          )}
                                          
                                          <div className="text-xs text-gray-500">/</div>
                                          
                                          {/* Quota Totale */}
                                          {editingQuota === quota.id && editingType === 'total' ? (
                                            <div className="flex items-center justify-center space-x-1">
                                              <Input
                                                type="number"
                                                min="0"
                                                max="99"
                                                value={quotaValues[quota.id] ?? quota.totalQuota}
                                                onChange={(e) => setQuotaValues({
                                                  ...quotaValues,
                                                  [quota.id]: parseInt(e.target.value) || 0
                                                })}
                                                className="w-12 h-6 text-xs text-center"
                                              />
                                              <Button size="sm" onClick={() => handleQuotaSave(quota.id)} className="h-5 w-5 p-0">
                                                <Check size={10} />
                                              </Button>
                                            </div>
                                          ) : (
                                            <Button
                                              variant="ghost"
                                              onClick={() => handleQuotaEdit(quota.id, quota.totalQuota, 'total')}
                                              className="h-6 px-2 text-sm font-bold hover:bg-green-100"
                                            >
                                              {quota.totalQuota}
                                            </Button>
                                          )}
                                          
                                          {/* Indicatore Status */}
                                          <div className={`w-2 h-2 rounded-full mx-auto ${
                                            percentage >= 100 ? 'bg-red-500' : 
                                            percentage >= 80 ? 'bg-orange-400' : 'bg-green-500'
                                          }`}></div>
                                        </div>
                                      </TableCell>
                                    );
                                  })}
                                  <TableCell className="text-center bg-blue-50">
                                    <div className="font-bold text-lg">
                                      <span className="text-blue-600">{totalHarvested}</span>
                                      <span className="text-gray-500">/</span>
                                      <span className="text-green-600">{totalQuota}</span>
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      Disp: {totalQuota - totalHarvested}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* Tabella Cervi */}
                    <div>
                      <h4 className="text-lg font-semibold mb-3 text-amber-700 flex items-center">
                        🦌 Gestione Quote Cervo
                      </h4>
                      <div className="overflow-x-auto border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-amber-50">
                              <TableHead className="font-bold text-center">Zona</TableHead>
                              <TableHead className="font-bold text-center">CL0<br/><small>(Piccolo M/F)</small></TableHead>
                              <TableHead className="font-bold text-center">FF<br/><small>(Femmina Adulta)</small></TableHead>
                              <TableHead className="font-bold text-center">MM<br/><small>(Maschio Adulto)</small></TableHead>
                              <TableHead className="font-bold text-center">MCL1<br/><small>(Maschio Fusone)</small></TableHead>
                              <TableHead className="font-bold text-center bg-blue-100">Totale<br/><small>(Prelevati/Quota)</small></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {quotasData.map((zone: any) => {
                              const redDeerQuotas = zone.quotas?.filter((q: any) => q.species === 'red_deer') || [];
                              const categories = ['CL0', 'FF', 'MM', 'MCL1'];
                              const totalHarvested = redDeerQuotas.reduce((sum: number, q: any) => sum + q.harvested, 0);
                              const totalQuota = redDeerQuotas.reduce((sum: number, q: any) => sum + q.totalQuota, 0);
                              
                              return (
                                <TableRow key={`red-${zone.id}`} className="hover:bg-amber-25">
                                  <TableCell className="font-medium text-center bg-gray-50">{zone.name}</TableCell>
                                  {categories.map(category => {
                                    const quota = redDeerQuotas.find((q: any) => 
                                      q.redDeerCategory === category
                                    );
                                    
                                    if (!quota) {
                                      return <TableCell key={category} className="text-center">-</TableCell>;
                                    }
                                    
                                    const available = quota.totalQuota - quota.harvested;
                                    const percentage = quota.totalQuota > 0 ? (quota.harvested / quota.totalQuota) * 100 : 0;
                                    
                                    return (
                                      <TableCell key={category} className="text-center">
                                        <div className="space-y-1">
                                          {/* Prelevati */}
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
                                                className="w-12 h-6 text-xs text-center"
                                              />
                                              <Button size="sm" onClick={() => handleQuotaSave(quota.id)} className="h-5 w-5 p-0">
                                                <Check size={10} />
                                              </Button>
                                            </div>
                                          ) : (
                                            <Button
                                              variant="ghost"
                                              onClick={() => handleQuotaEdit(quota.id, quota.harvested, 'harvested')}
                                              className="h-6 px-2 text-sm font-bold hover:bg-blue-100"
                                            >
                                              {quota.harvested}
                                            </Button>
                                          )}
                                          
                                          <div className="text-xs text-gray-500">/</div>
                                          
                                          {/* Quota Totale */}
                                          {editingQuota === quota.id && editingType === 'total' ? (
                                            <div className="flex items-center justify-center space-x-1">
                                              <Input
                                                type="number"
                                                min="0"
                                                max="99"
                                                value={quotaValues[quota.id] ?? quota.totalQuota}
                                                onChange={(e) => setQuotaValues({
                                                  ...quotaValues,
                                                  [quota.id]: parseInt(e.target.value) || 0
                                                })}
                                                className="w-12 h-6 text-xs text-center"
                                              />
                                              <Button size="sm" onClick={() => handleQuotaSave(quota.id)} className="h-5 w-5 p-0">
                                                <Check size={10} />
                                              </Button>
                                            </div>
                                          ) : (
                                            <Button
                                              variant="ghost"
                                              onClick={() => handleQuotaEdit(quota.id, quota.totalQuota, 'total')}
                                              className="h-6 px-2 text-sm font-bold hover:bg-green-100"
                                            >
                                              {quota.totalQuota}
                                            </Button>
                                          )}
                                          
                                          {/* Indicatore Status */}
                                          <div className={`w-2 h-2 rounded-full mx-auto ${
                                            percentage >= 100 ? 'bg-red-500' : 
                                            percentage >= 80 ? 'bg-orange-400' : 'bg-green-500'
                                          }`}></div>
                                        </div>
                                      </TableCell>
                                    );
                                  })}
                                  <TableCell className="text-center bg-blue-50">
                                    <div className="font-bold text-lg">
                                      <span className="text-blue-600">{totalHarvested}</span>
                                      <span className="text-gray-500">/</span>
                                      <span className="text-green-600">{totalQuota}</span>
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      Disp: {totalQuota - totalHarvested}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
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

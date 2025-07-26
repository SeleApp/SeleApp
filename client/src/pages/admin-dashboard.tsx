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
import { Users, CalendarCheck, Target, AlertTriangle, MapPin, Calendar, BarChart, FileText, X, Edit, Save, Check, Settings, LogOut, Trash2 } from "lucide-react";
import RegionalQuotaManager from "@/components/regional-quota-manager";

// This is the old admin dashboard, replace with the new one
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("quotas");
  const [editingQuota, setEditingQuota] = useState<number | null>(null);
  const [editingType, setEditingType] = useState<'harvested' | 'total' | null>(null);
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
    staleTime: 1 * 60 * 1000, // 1 minuto cache per statistiche
    gcTime: 3 * 60 * 1000,
  });

  const { data: reservations = [], isLoading: reservationsLoading } = useQuery<ReservationWithDetails[]>({
    queryKey: ["/api/reservations"],
    staleTime: 30 * 1000, // 30 secondi cache per prenotazioni admin
    gcTime: 2 * 60 * 1000,
  });

  const { data: quotasData = [], isLoading: quotasLoading } = useQuery<any[]>({
    queryKey: ["/api/regional-quotas"],
    staleTime: 2 * 60 * 1000, // 2 minuti cache per quote
    gcTime: 5 * 60 * 1000,
  });

  const { data: reports = [], isLoading: reportsLoading } = useQuery<any[]>({
    queryKey: ["/api/reports"],
    staleTime: 3 * 60 * 1000, // 3 minuti cache per report
    gcTime: 8 * 60 * 1000,
  });

  const updateQuotaMutation = useMutation({
    mutationFn: async ({ quotaId, harvested, totalQuota }: { quotaId: number; harvested?: number; totalQuota?: number }) => {
      const updateData: any = {};
      if (harvested !== undefined) updateData.harvested = harvested;
      if (totalQuota !== undefined) updateData.totalQuota = totalQuota;
      
      const response = await apiRequest("PATCH", `/api/regional-quotas/${quotaId}`, updateData);
      return response.json();
    },
    onSuccess: () => {
      // Refresh all quota-related data
      queryClient.invalidateQueries({ queryKey: ["/api/regional-quotas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/zones"] });
      
      // Force immediate refetch
      queryClient.refetchQueries({ queryKey: ["/api/regional-quotas"] });
      
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
    setEditingType(null);
    setQuotaValues({});
  };

  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: number) => {
      const response = await apiRequest("DELETE", `/api/reports/${reportId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/regional-quotas"] });
      toast({
        title: "Report eliminato",
        description: "Report eliminato con successo. Le quote sono state ripristinate.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore nell'eliminazione",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteReport = (reportId: number, hunterName: string) => {
    if (window.confirm(`Sei sicuro di voler eliminare il report di ${hunterName}? Questa azione ripristinerà automaticamente le quote di caccia.`)) {
      deleteReportMutation.mutate(reportId);
    }
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

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Admin Stats - Mobile Responsive */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Statistiche Generali</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center">
                  <Users className="text-primary mr-2 sm:mr-4 flex-shrink-0" size={24} />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-base text-gray-600 truncate">Cacciatori Attivi</p>
                    <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats?.activeHunters || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-available">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center">
                  <CalendarCheck className="text-available mr-2 sm:mr-4 flex-shrink-0" size={24} />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-base text-gray-600 truncate">Prenotazioni Oggi</p>
                    <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats?.todayReservations || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-accent">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center">
                  <Target className="text-accent mr-2 sm:mr-4 flex-shrink-0" size={24} />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-base text-gray-600 truncate">Capi Prelevati</p>
                    <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats?.totalHarvested || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-low">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center">
                  <AlertTriangle className="text-low mr-2 sm:mr-4 flex-shrink-0" size={24} />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-base text-gray-600 truncate">Quote in Esaurimento</p>
                    <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats?.lowQuotas || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs - Mobile Responsive */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="flex w-full min-w-max gap-1 sm:grid sm:grid-cols-4 sm:gap-0 bg-gray-100 p-1">
              <TabsTrigger value="zones" className="flex items-center gap-1 sm:gap-2 px-3 py-2 sm:py-4 text-xs sm:text-lg whitespace-nowrap min-w-0 flex-1 sm:flex-auto">
                <MapPin size={16} className="sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="hidden md:inline">Zone e Quote</span>
                <span className="md:hidden">Quote</span>
              </TabsTrigger>
              <TabsTrigger value="reservations" className="flex items-center gap-1 sm:gap-2 px-3 py-2 sm:py-4 text-xs sm:text-lg whitespace-nowrap min-w-0 flex-1 sm:flex-auto">
                <Calendar size={16} className="sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="hidden md:inline">Prenotazioni</span>
                <span className="md:hidden">Prenotazioni</span>
              </TabsTrigger>
              <TabsTrigger value="hunters" className="flex items-center gap-1 sm:gap-2 px-3 py-2 sm:py-4 text-xs sm:text-lg whitespace-nowrap min-w-0 flex-1 sm:flex-auto">
                <Users size={16} className="sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="hidden md:inline">Cacciatori</span>
                <span className="md:hidden">Cacciatori</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-1 sm:gap-2 px-3 py-2 sm:py-4 text-xs sm:text-lg whitespace-nowrap min-w-0 flex-1 sm:flex-auto">
                <BarChart size={16} className="sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="hidden md:inline">Report</span>
                <span className="md:hidden">Report</span>
              </TabsTrigger>
            </TabsList>
          </div>

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
                              <TableHead className="font-bold text-center">Categoria</TableHead>
                              <TableHead className="font-bold text-center">Prelevati</TableHead>
                              <TableHead className="font-bold text-center">Quota Totale</TableHead>
                              <TableHead className="font-bold text-center">Disponibili</TableHead>
                              <TableHead className="font-bold text-center">Stato</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {quotasData.filter((quota: any) => quota.species === 'roe_deer').map((quota: any) => {
                              const available = quota.totalQuota - quota.harvested;
                              const percentage = quota.totalQuota > 0 ? (quota.harvested / quota.totalQuota) * 100 : 0;
                              
                              return (
                                <TableRow key={quota.id} className="hover:bg-green-25">
                                  <TableCell className="font-medium text-center bg-gray-50">
                                    {quota.roeDeerCategory}
                                  </TableCell>
                                  
                                  {/* Prelevati */}
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
                                          className="w-16 h-8 text-center"
                                        />
                                        <Button size="sm" onClick={() => handleQuotaSave(quota.id)} className="h-6 w-6 p-0">
                                          <Check size={12} />
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        onClick={() => handleQuotaEdit(quota.id, quota.harvested, 'harvested')}
                                        className="h-8 px-3 text-base font-bold hover:bg-blue-100"
                                      >
                                        {quota.harvested}
                                      </Button>
                                    )}
                                  </TableCell>
                                  
                                  {/* Quota Totale */}
                                  <TableCell className="text-center">
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
                                          className="w-16 h-8 text-center"
                                        />
                                        <Button size="sm" onClick={() => handleQuotaSave(quota.id)} className="h-6 w-6 p-0">
                                          <Check size={12} />
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        onClick={() => handleQuotaEdit(quota.id, quota.totalQuota, 'total')}
                                        className="h-8 px-3 text-base font-bold hover:bg-green-100"
                                      >
                                        {quota.totalQuota}
                                      </Button>
                                    )}
                                  </TableCell>
                                  
                                  <TableCell className="text-center font-bold text-lg">
                                    {available}
                                  </TableCell>
                                  
                                  <TableCell className="text-center">
                                    <Badge 
                                      variant={
                                        percentage >= 100 ? 'destructive' : 
                                        percentage >= 80 ? 'secondary' : 'default'
                                      }
                                    >
                                      {percentage >= 100 ? 'Esaurito' : 
                                       percentage >= 80 ? 'Critico' : 'Disponibile'}
                                    </Badge>
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
                              <TableHead className="font-bold text-center">Categoria</TableHead>
                              <TableHead className="font-bold text-center">Prelevati</TableHead>
                              <TableHead className="font-bold text-center">Quota Totale</TableHead>
                              <TableHead className="font-bold text-center">Disponibili</TableHead>
                              <TableHead className="font-bold text-center">Stato</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {quotasData.filter((quota: any) => quota.species === 'red_deer').map((quota: any) => {
                              const available = quota.totalQuota - quota.harvested;
                              const percentage = quota.totalQuota > 0 ? (quota.harvested / quota.totalQuota) * 100 : 0;
                              
                              return (
                                <TableRow key={quota.id} className="hover:bg-amber-25">
                                  <TableCell className="font-medium text-center bg-gray-50">
                                    {quota.redDeerCategory}
                                  </TableCell>
                                  
                                  {/* Prelevati */}
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
                                          className="w-16 h-8 text-center"
                                        />
                                        <Button size="sm" onClick={() => handleQuotaSave(quota.id)} className="h-6 w-6 p-0">
                                          <Check size={12} />
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        onClick={() => handleQuotaEdit(quota.id, quota.harvested, 'harvested')}
                                        className="h-8 px-3 text-base font-bold hover:bg-blue-100"
                                      >
                                        {quota.harvested}
                                      </Button>
                                    )}
                                  </TableCell>
                                  
                                  {/* Quota Totale */}
                                  <TableCell className="text-center">
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
                                          className="w-16 h-8 text-center"
                                        />
                                        <Button size="sm" onClick={() => handleQuotaSave(quota.id)} className="h-6 w-6 p-0">
                                          <Check size={12} />
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        onClick={() => handleQuotaEdit(quota.id, quota.totalQuota, 'total')}
                                        className="h-8 px-3 text-base font-bold hover:bg-green-100"
                                      >
                                        {quota.totalQuota}
                                      </Button>
                                    )}
                                  </TableCell>
                                  
                                  <TableCell className="text-center font-bold text-lg">
                                    {available}
                                  </TableCell>
                                  
                                  <TableCell className="text-center">
                                    <Badge 
                                      variant={
                                        percentage >= 100 ? 'destructive' : 
                                        percentage >= 80 ? 'secondary' : 'default'
                                      }
                                    >
                                      {percentage >= 100 ? 'Esaurito' : 
                                       percentage >= 80 ? 'Critico' : 'Disponibile'}
                                    </Badge>
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
                <h3 className="text-xl font-bold text-gray-900 mb-6">Report di Caccia</h3>
                
                {reportsLoading ? (
                  <div className="text-center py-8">Caricamento report...</div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart className="mx-auto mb-4" size={48} />
                    <p className="text-lg">Nessun report trovato</p>
                    <p className="text-base">I report appariranno qui quando i cacciatori li invieranno</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full bg-white border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cacciatore
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Zona
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Data Caccia
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Esito
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Dettagli
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Note
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Azioni
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {reports.map((report) => (
                          <tr key={report.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {report.reservation?.hunter?.firstName} {report.reservation?.hunter?.lastName}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {report.reservation?.zone?.name}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {new Date(report.reservation?.huntDate).toLocaleDateString('it-IT')}
                            </td>
                            <td className="px-6 py-4">
                              <Badge 
                                variant={report.outcome === 'harvest' ? 'default' : 'secondary'}
                                className={report.outcome === 'harvest' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                              >
                                {report.outcome === 'harvest' ? 'Prelievo' : 'Senza prelievo'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {report.outcome === 'harvest' ? (
                                <div>
                                  <div className="font-medium">
                                    {report.species === 'roe_deer' ? 'Capriolo' : 'Cervo'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {report.roeDeerCategory || report.redDeerCategory}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                              <div className="truncate">
                                {report.notes || '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteReport(report.id, `${report.reservation?.hunter?.firstName} ${report.reservation?.hunter?.lastName}`)}
                                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                disabled={deleteReportMutation.isPending}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

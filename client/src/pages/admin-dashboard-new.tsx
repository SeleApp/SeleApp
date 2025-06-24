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
import { Users, CalendarCheck, Target, AlertTriangle, Calendar, Edit, Check, X, Settings } from "lucide-react";
import RegionalQuotaManager from "@/components/regional-quota-manager";
import { authService } from "@/lib/auth";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("quotas");
  const [editingQuota, setEditingQuota] = useState<number | null>(null);
  const [quotaValues, setQuotaValues] = useState<Record<number, number>>({});
  const [showRegionalQuotaManager, setShowRegionalQuotaManager] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  const { data: regionalQuotas = [], isLoading: isLoadingQuotas } = useQuery({
    queryKey: ["/api/regional-quotas"],
  });

  const { data: reservations = [], isLoading: isLoadingReservations } = useQuery({
    queryKey: ["/api/reservations"],
  });

  const updateRegionalQuotaMutation = useMutation({
    mutationFn: async ({ id, value }: { id: number; value: number }) => {
      const response = await fetch(`/api/regional-quotas/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authService.getAuthHeaders(),
        },
        body: JSON.stringify({ totalQuota: value }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regional-quotas"] });
      toast({ title: "Quota regionale aggiornata con successo" });
      setEditingQuota(null);
      setQuotaValues({});
    },
    onError: (error: Error) => {
      console.error("Error updating regional quota:", error);
      toast({ 
        title: "Errore nell'aggiornamento", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const startEditing = (quotaId: number, currentValue: number) => {
    setEditingQuota(quotaId);
    setQuotaValues({ ...quotaValues, [quotaId]: currentValue });
  };

  const saveQuota = (quotaId: number) => {
    const value = quotaValues[quotaId];
    if (value !== undefined && value >= 0) {
      updateRegionalQuotaMutation.mutate({ id: quotaId, value });
    }
  };

  const cancelEditing = () => {
    setEditingQuota(null);
    setQuotaValues({});
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Amministratore</h1>
            <p className="text-gray-600 mt-2">Gestione del sistema di caccia di Cison di Val Marino</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowRegionalQuotaManager(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Gestione Avanzata
            </Button>
          </div>
        </div>

        {/* Admin Stats */}
        {isLoadingStats ? (
          <div className="text-center py-8">Caricamento statistiche...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Cacciatori Attivi</p>
                    <p className="text-2xl font-bold">{stats?.activeHunters || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <CalendarCheck className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Prenotazioni Oggi</p>
                    <p className="text-2xl font-bold">{stats?.todayReservations || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Target className="h-8 w-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Capi Prelevati</p>
                    <p className="text-2xl font-bold">{stats?.totalHarvested || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Quote Basse</p>
                    <p className="text-2xl font-bold">{stats?.lowQuotas || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="quotas" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Quote Regionali
            </TabsTrigger>
            <TabsTrigger value="reservations" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Prenotazioni
            </TabsTrigger>
          </TabsList>

          {/* Regional Quotas Tab */}
          <TabsContent value="quotas">
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Quote Regionali di Caccia</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Disponibile</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Pochi rimasti</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Esaurito</span>
                    </div>
                  </div>
                </div>

                {isLoadingQuotas ? (
                  <div className="text-center py-8">Caricamento quote regionali...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Specie</TableHead>
                          <TableHead>Classe e Sesso</TableHead>
                          <TableHead>Quota Assegnata</TableHead>
                          <TableHead>Capi Abbattuti</TableHead>
                          <TableHead>Capi Rimanenti</TableHead>
                          <TableHead>Stato</TableHead>
                          <TableHead>Azioni</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {regionalQuotas.map((quota: any) => {
                          const available = quota.totalQuota - quota.harvested;
                          const isEditing = editingQuota === quota.id;
                          const speciesLabel = getSpeciesLabel(quota.species);
                          const categoryLabel = getCategoryLabel(quota);

                          return (
                            <TableRow key={quota.id}>
                              <TableCell className="font-medium">{speciesLabel}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-mono">
                                  {categoryLabel}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      min="0"
                                      value={quotaValues[quota.id] || 0}
                                      onChange={(e) => setQuotaValues({
                                        ...quotaValues,
                                        [quota.id]: parseInt(e.target.value) || 0
                                      })}
                                      className="w-20"
                                      autoFocus
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => saveQuota(quota.id)}
                                      disabled={updateRegionalQuotaMutation.isPending}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={cancelEditing}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold">{quota.totalQuota}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => startEditing(quota.id, quota.totalQuota)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-semibold text-red-600">{quota.harvested}</span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={`font-bold ${available <= 0 ? 'text-red-600' : available <= 2 ? 'text-orange-600' : 'text-green-600'}`}>
                                  {available}
                                </span>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(quota)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startEditing(quota.id, quota.totalQuota)}
                                  disabled={isEditing}
                                >
                                  ✏️ Modifica
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="font-semibold mb-2">Riassunto Capriolo</h4>
                          <div className="space-y-1 text-sm">
                            {regionalQuotas
                              .filter((q: any) => q.species === 'roe_deer')
                              .map((q: any) => (
                                <div key={q.id} className="flex justify-between">
                                  <span>{getCategoryLabel(q)}</span>
                                  <span>
                                    <span className="text-red-600 font-medium">{q.harvested}</span>
                                    <span className="text-gray-500"> / </span>
                                    <span className="text-green-600 font-medium">{q.totalQuota}</span>
                                    <span className="text-gray-400 ml-2">({q.totalQuota - q.harvested} rim.)</span>
                                  </span>
                                </div>
                              ))}
                            <div className="border-t pt-2 mt-2 font-semibold flex justify-between">
                              <span>Totale Capriolo</span>
                              <span>
                                <span className="text-red-600 font-bold">
                                  {regionalQuotas
                                    .filter((q: any) => q.species === 'roe_deer')
                                    .reduce((sum: number, q: any) => sum + q.harvested, 0)}
                                </span>
                                <span className="text-gray-500"> / </span>
                                <span className="text-green-600 font-bold">
                                  {regionalQuotas
                                    .filter((q: any) => q.species === 'roe_deer')
                                    .reduce((sum: number, q: any) => sum + q.totalQuota, 0)}
                                </span>
                                <span className="text-gray-400 ml-2">
                                  ({regionalQuotas
                                    .filter((q: any) => q.species === 'roe_deer')
                                    .reduce((sum: number, q: any) => sum + (q.totalQuota - q.harvested), 0)} rim.)
                                </span>
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <h4 className="font-semibold mb-2">Riassunto Cervo</h4>
                          <div className="space-y-1 text-sm">
                            {regionalQuotas
                              .filter((q: any) => q.species === 'red_deer')
                              .map((q: any) => (
                                <div key={q.id} className="flex justify-between">
                                  <span>{getCategoryLabel(q)}</span>
                                  <span>
                                    <span className="text-red-600 font-medium">{q.harvested}</span>
                                    <span className="text-gray-500"> / </span>
                                    <span className="text-green-600 font-medium">{q.totalQuota}</span>
                                    <span className="text-gray-400 ml-2">({q.totalQuota - q.harvested} rim.)</span>
                                  </span>
                                </div>
                              ))}
                            <div className="border-t pt-2 mt-2 font-semibold flex justify-between">
                              <span>Totale Cervo</span>
                              <span>
                                <span className="text-red-600 font-bold">
                                  {regionalQuotas
                                    .filter((q: any) => q.species === 'red_deer')
                                    .reduce((sum: number, q: any) => sum + q.harvested, 0)}
                                </span>
                                <span className="text-gray-500"> / </span>
                                <span className="text-green-600 font-bold">
                                  {regionalQuotas
                                    .filter((q: any) => q.species === 'red_deer')
                                    .reduce((sum: number, q: any) => sum + q.totalQuota, 0)}
                                </span>
                                <span className="text-gray-400 ml-2">
                                  ({regionalQuotas
                                    .filter((q: any) => q.species === 'red_deer')
                                    .reduce((sum: number, q: any) => sum + (q.totalQuota - q.harvested), 0)} rim.)
                                </span>
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
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

                {isLoadingReservations ? (
                  <div className="text-center py-8">Caricamento prenotazioni...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cacciatore</TableHead>
                          <TableHead>Zona</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Turno</TableHead>
                          <TableHead>Stato</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reservations.map((reservation: ReservationWithDetails) => (
                          <TableRow key={reservation.id}>
                            <TableCell>
                              {reservation.hunter.firstName} {reservation.hunter.lastName}
                            </TableCell>
                            <TableCell>{reservation.zone.name}</TableCell>
                            <TableCell>
                              {new Date(reservation.huntDate).toLocaleDateString('it-IT')}
                            </TableCell>
                            <TableCell>
                              <Badge variant={reservation.timeSlot === 'morning' ? 'default' : 'secondary'}>
                                {reservation.timeSlot === 'morning' ? 'Mattina' : 'Pomeriggio'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                reservation.status === 'active' ? 'default' :
                                reservation.status === 'completed' ? 'secondary' : 'destructive'
                              }>
                                {reservation.status === 'active' ? 'Attiva' :
                                 reservation.status === 'completed' ? 'Completata' : 'Cancellata'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <RegionalQuotaManager 
        open={showRegionalQuotaManager}
        onOpenChange={setShowRegionalQuotaManager}
      />
    </div>
  );
}
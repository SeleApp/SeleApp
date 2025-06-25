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
import { Users, CalendarCheck, Target, AlertTriangle, Calendar, Edit, Check, X, Settings, Trash2, UserCheck, UserX, ClipboardList, Plus, MapPin, BarChart3, XCircle } from "lucide-react";
import RegionalQuotaManager from "@/components/regional-quota-manager";
import HunterManagementModal from "@/components/hunter-management-modal";
import AdminReportModal from "@/components/admin-report-modal";
import { authService } from "@/lib/auth";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("quotas");
  const [selectedSpecies, setSelectedSpecies] = useState<'all' | 'roe_deer' | 'red_deer'>('all');
  const [editingQuota, setEditingQuota] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<'quota' | 'harvested' | 'period' | null>(null);
  const [quotaValues, setQuotaValues] = useState<Record<number, number>>({});
  const [harvestedValues, setHarvestedValues] = useState<Record<number, number>>({});
  const [periodValues, setPeriodValues] = useState<Record<number, string>>({});
  const [showRegionalQuotaManager, setShowRegionalQuotaManager] = useState(false);
  const [showHunterManagement, setShowHunterManagement] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<any>(null);

  const handleCancelReservation = (reservationId: number) => {
    if (window.confirm("Sei sicuro di voler annullare questa prenotazione?")) {
      cancelReservationMutation.mutate(reservationId);
    }
  };
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  const { data: regionalQuotas = [], isLoading: isLoadingQuotas, refetch: refetchQuotas } = useQuery({
    queryKey: ["/api/regional-quotas"],
    refetchOnWindowFocus: true,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: reservations = [], isLoading: isLoadingReservations } = useQuery({
    queryKey: ["/api/reservations"],
  });

  const { data: hunters = [] } = useQuery({
    queryKey: ["/api/admin/hunters"],
  });

  const cancelReservationMutation = useMutation({
    mutationFn: async (reservationId: number) => {
      return await apiRequest("DELETE", `/api/reservations/${reservationId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Prenotazione annullata",
        description: "La prenotazione è stata annullata con successo.",
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

  const { data: reports = [] } = useQuery({
    queryKey: ["/api/reports"],
  });

  const updateRegionalQuotaMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/regional-quotas/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authService.getAuthHeaders(),
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regional-quotas"] });
      refetchQuotas(); // Force immediate refresh
      toast({ title: "Quota regionale aggiornata con successo" });
      setEditingQuota(null);
      setEditingField(null);
      setQuotaValues({});
      setHarvestedValues({});
      setPeriodValues({});
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

  const startEditingQuota = (quotaId: number, currentValue: number) => {
    setEditingQuota(quotaId);
    setEditingField('quota');
    setQuotaValues({ ...quotaValues, [quotaId]: currentValue });
  };

  const startEditingHarvested = (quotaId: number, currentValue: number) => {
    setEditingQuota(quotaId);
    setEditingField('harvested');
    setHarvestedValues({ ...harvestedValues, [quotaId]: currentValue });
  };

  const startEditingPeriod = (quotaId: number, currentPeriod: string) => {
    setEditingQuota(quotaId);
    setEditingField('period');
    
    // Try to parse existing period to pre-fill date inputs
    let startDate = "";
    let endDate = "";
    
    if (currentPeriod && currentPeriod !== "Non definito") {
      // Try to extract dates from format like "15/09 - 31/12" 
      const matches = currentPeriod.match(/(\d{1,2}\/\d{1,2})\s*-\s*(\d{1,2}\/\d{1,2})/);
      if (matches) {
        const [, start, end] = matches;
        const currentYear = new Date().getFullYear();
        // Convert to ISO date format for input fields
        const [startDay, startMonth] = start.split('/');
        const [endDay, endMonth] = end.split('/');
        startDate = `${currentYear}-${startMonth.padStart(2, '0')}-${startDay.padStart(2, '0')}`;
        endDate = `${currentYear}-${endMonth.padStart(2, '0')}-${endDay.padStart(2, '0')}`;
      }
    }
    
    setPeriodValues({ 
      ...periodValues, 
      [quotaId]: currentPeriod,
      [`${quotaId}_start`]: startDate,
      [`${quotaId}_end`]: endDate
    });
  };

  const saveQuota = (quotaId: number) => {
    const value = quotaValues[quotaId];
    if (value !== undefined && value >= 0) {
      updateRegionalQuotaMutation.mutate({ id: quotaId, data: { totalQuota: value } });
    }
  };

  const saveHarvested = (quotaId: number) => {
    const value = harvestedValues[quotaId];
    if (value !== undefined && value >= 0) {
      updateRegionalQuotaMutation.mutate({ id: quotaId, data: { harvested: value } });
    }
  };

  const savePeriod = (quotaId: number) => {
    const period = periodValues[quotaId];
    if (period !== undefined) {
      updateRegionalQuotaMutation.mutate({ id: quotaId, data: { notes: period } });
    }
  };

  const cancelEditing = () => {
    setEditingQuota(null);
    setEditingField(null);
    setQuotaValues({});
    setHarvestedValues({});
    
    // Clear all period-related values including temporary date fields
    const clearedPeriods: Record<string, string> = {};
    Object.keys(periodValues).forEach(key => {
      if (!key.includes('_start') && !key.includes('_end')) {
        clearedPeriods[key] = periodValues[key];
      }
    });
    setPeriodValues(clearedPeriods);
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

  const getFilteredQuotas = () => {
    if (selectedSpecies === 'all') return regionalQuotas;
    return regionalQuotas.filter((q: any) => q.species === selectedSpecies);
  };

  // Hunter management component
  const HunterManagementTable = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const toggleHunterStatusMutation = useMutation({
      mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
        return await apiRequest(`/api/admin/hunters/${id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ isActive }),
        });
      },
      onSuccess: () => {
        toast({
          title: "Stato aggiornato",
          description: "Lo stato del cacciatore è stato modificato con successo.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/hunters"] });
      },
      onError: (error: any) => {
        toast({
          title: "Errore",
          description: error.message || "Errore nell'aggiornamento dello stato.",
          variant: "destructive",
        });
      },
    });

    const deleteHunterMutation = useMutation({
      mutationFn: async (id: number) => {
        return await apiRequest(`/api/admin/hunters/${id}`, {
          method: "DELETE",
        });
      },
      onSuccess: () => {
        toast({
          title: "Cacciatore eliminato",
          description: "L'account del cacciatore è stato eliminato con successo.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/hunters"] });
      },
      onError: (error: any) => {
        toast({
          title: "Errore",
          description: error.message || "Errore nell'eliminazione del cacciatore.",
          variant: "destructive",
        });
      },
    });

    return (
      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Data Registrazione</TableHead>
              <TableHead>Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hunters.map((hunter: any) => (
              <TableRow key={hunter.id}>
                <TableCell className="font-medium">
                  {hunter.firstName} {hunter.lastName}
                </TableCell>
                <TableCell>{hunter.email}</TableCell>
                <TableCell>
                  <Badge 
                    variant={hunter.isActive ? "default" : "secondary"}
                    className={hunter.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                  >
                    {hunter.isActive ? "Attivo" : "Disattivo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {hunter.createdAt && format(new Date(hunter.createdAt), "dd/MM/yyyy", { locale: it })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedHunter(hunter);
                        setShowHunterModal(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleHunterStatusMutation.mutate({
                        id: hunter.id,
                        isActive: !hunter.isActive
                      })}
                    >
                      {hunter.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm("Sei sicuro di voler eliminare questo cacciatore?")) {
                          deleteHunterMutation.mutate(hunter.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {hunters.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="mx-auto mb-4" size={48} />
            <p className="text-lg">Nessun cacciatore registrato</p>
          </div>
        )}
      </div>
    );
  };

  const getSpeciesButtonVariant = (species: 'all' | 'roe_deer' | 'red_deer') => {
    return selectedSpecies === species ? 'default' : 'outline';
  };

  const getCategoryLabel = (quota: any) => {
    if (quota.species === 'roe_deer') {
      return quota.roeDeerCategory || 'N/A';
    } else {
      return quota.redDeerCategory || 'N/A';
    }
  };

  const getSpeciesLabel = (species: string) => {
    return species === 'roe_deer' ? 'Capriolo' : 'Cervo';
  };

  const getStatusIndicator = (quota: any) => {
    const available = quota.totalQuota - quota.harvested;
    if (available <= 0) {
      return <div className="w-3 h-3 bg-red-500 rounded-full" title="Esaurito"></div>;
    }
    return <div className="w-3 h-3 bg-green-500 rounded-full" title="Disponibile"></div>;
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
              onClick={() => setShowHunterManagement(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Gestione Cacciatori
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
                  <Target className="h-8 w-8 text-amber-600" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Capi Prelevati Capriolo</p>
                    <p className="text-2xl font-bold">
                      {isLoadingQuotas ? "..." : regionalQuotas
                        .filter((q: any) => q.species === 'roe_deer')
                        .reduce((sum: number, q: any) => sum + q.harvested, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Target className="h-8 w-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Capi Prelevati Cervo</p>
                    <p className="text-2xl font-bold">
                      {isLoadingQuotas ? "..." : regionalQuotas
                        .filter((q: any) => q.species === 'red_deer')
                        .reduce((sum: number, q: any) => sum + q.harvested, 0)}
                    </p>
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
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Report
            </TabsTrigger>

          </TabsList>

          {/* Regional Quotas Tab */}
          <TabsContent value="quotas">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">Quote Regionali di Caccia</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">Disponibile</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">Esaurito</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Filtra per specie:</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={getSpeciesButtonVariant('all')}
                        onClick={() => setSelectedSpecies('all')}
                        className="h-8"
                      >
                        Tutte
                      </Button>
                      <Button
                        size="sm"
                        variant={getSpeciesButtonVariant('roe_deer')}
                        onClick={() => setSelectedSpecies('roe_deer')}
                        className="h-8"
                      >
                        🦌 Capriolo
                      </Button>
                      <Button
                        size="sm"
                        variant={getSpeciesButtonVariant('red_deer')}
                        onClick={() => setSelectedSpecies('red_deer')}
                        className="h-8"
                      >
                        🦌 Cervo
                      </Button>
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
                          <TableHead>Periodo di Caccia</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getFilteredQuotas().map((quota: any) => {
                          const available = quota.totalQuota - quota.harvested;
                          const isEditingQuota = editingQuota === quota.id && editingField === 'quota';
                          const isEditingHarvested = editingQuota === quota.id && editingField === 'harvested';
                          const isEditingPeriod = editingQuota === quota.id && editingField === 'period';
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
                                {isEditingQuota ? (
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
                                      onClick={() => startEditingQuota(quota.id, quota.totalQuota)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {isEditingHarvested ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <Input
                                      type="number"
                                      min="0"
                                      value={harvestedValues[quota.id] || ""}
                                      onChange={(e) => setHarvestedValues({
                                        ...harvestedValues,
                                        [quota.id]: parseInt(e.target.value) || 0
                                      })}
                                      className="w-20 text-center"
                                      autoFocus
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => saveHarvested(quota.id)}
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
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="font-semibold text-red-600">{quota.harvested}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => startEditingHarvested(quota.id, quota.harvested)}
                                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                      title="Modifica capi abbattuti (per correggere errori)"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
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
                                {isEditingPeriod ? (
                                  <div className="flex flex-col gap-3 p-3 bg-gray-50 rounded-lg min-w-[280px]">
                                    <div className="text-sm font-medium text-gray-700">Imposta periodo di caccia:</div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-xs font-medium text-gray-600 block mb-1">Data Inizio</label>
                                        <Input
                                          type="date"
                                          className="text-base h-10"
                                          onChange={(e) => {
                                            const startDate = e.target.value;
                                            const currentEnd = periodValues[`${quota.id}_end`] || "";
                                            const formattedPeriod = startDate && currentEnd 
                                              ? `${new Date(startDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} - ${new Date(currentEnd).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}`
                                              : "";
                                            setPeriodValues({
                                              ...periodValues,
                                              [`${quota.id}_start`]: startDate,
                                              [quota.id]: formattedPeriod
                                            });
                                          }}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs font-medium text-gray-600 block mb-1">Data Fine</label>
                                        <Input
                                          type="date"
                                          className="text-base h-10"
                                          onChange={(e) => {
                                            const endDate = e.target.value;
                                            const currentStart = periodValues[`${quota.id}_start`] || "";
                                            const formattedPeriod = currentStart && endDate 
                                              ? `${new Date(currentStart).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} - ${new Date(endDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}`
                                              : "";
                                            setPeriodValues({
                                              ...periodValues,
                                              [`${quota.id}_end`]: endDate,
                                              [quota.id]: formattedPeriod
                                            });
                                          }}
                                        />
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-500 bg-white p-2 rounded border">
                                      <strong>Anteprima:</strong> {periodValues[quota.id] || "Seleziona entrambe le date"}
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => savePeriod(quota.id)}
                                        disabled={updateRegionalQuotaMutation.isPending || !periodValues[quota.id]}
                                        className="flex-1 h-10 text-base"
                                      >
                                        <Check className="h-4 w-4 mr-2" />
                                        Salva Periodo
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={cancelEditing}
                                        className="h-10"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">
                                      {formatPeriod(quota.huntingStartDate, quota.huntingEndDate, quota.notes)}
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => startEditingPeriod(quota.id, quota.notes || formatPeriod(quota.huntingStartDate, quota.huntingEndDate, null))}
                                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    {selectedSpecies === 'all' && (
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
                    )}

                    {selectedSpecies !== 'all' && (
                      <div className="mt-6">
                        <Card>
                          <CardContent className="p-4">
                            <h4 className="font-semibold mb-2">
                              Riassunto {selectedSpecies === 'roe_deer' ? 'Capriolo' : 'Cervo'}
                            </h4>
                            <div className="space-y-1 text-sm">
                              {getFilteredQuotas().map((q: any) => (
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
                                <span>Totale {selectedSpecies === 'roe_deer' ? 'Capriolo' : 'Cervo'}</span>
                                <span>
                                  <span className="text-red-600 font-bold">
                                    {getFilteredQuotas().reduce((sum: number, q: any) => sum + q.harvested, 0)}
                                  </span>
                                  <span className="text-gray-500"> / </span>
                                  <span className="text-green-600 font-bold">
                                    {getFilteredQuotas().reduce((sum: number, q: any) => sum + q.totalQuota, 0)}
                                  </span>
                                  <span className="text-gray-400 ml-2">
                                    ({getFilteredQuotas().reduce((sum: number, q: any) => sum + (q.totalQuota - q.harvested), 0)} rim.)
                                  </span>
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
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

          {/* Reports Tab */}
          <TabsContent value="reports">
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Report di Caccia</h3>
                    <Button
                      onClick={() => setShowReportModal(true)}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Plus className="h-4 w-4" />
                      Nuovo Report
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cacciatore</TableHead>
                          <TableHead>Zona</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Orario</TableHead>
                          <TableHead>Esito</TableHead>
                          <TableHead>Dettagli Prelievo</TableHead>
                          <TableHead>Note</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reports.map((report: any) => (
                          <TableRow key={report.id}>
                            <TableCell className="font-medium">
                              {report.reservation?.hunter?.firstName} {report.reservation?.hunter?.lastName}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-gray-500" />
                                {report.reservation?.zone?.name || `Zona ${report.reservation?.zoneId}`}
                              </div>
                            </TableCell>
                            <TableCell>
                              {report.reservation?.huntDate && new Date(report.reservation.huntDate).toLocaleDateString('it-IT')}
                            </TableCell>
                            <TableCell>
                              <Badge variant={report.reservation?.timeSlot === 'morning' ? 'default' : 'secondary'}>
                                {report.reservation?.timeSlot === 'morning' ? 'Mattina' : 'Pomeriggio'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={report.outcome === 'harvest' ? 'default' : 'secondary'}>
                                {report.outcome === 'harvest' ? 'Prelievo' : 'Nessun Prelievo'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {report.outcome === 'harvest' && report.species ? (
                                <div className="text-sm">
                                  <div className="font-medium">
                                    {report.species === 'roe_deer' ? 'Capriolo' : 'Cervo'}
                                  </div>
                                  <div className="text-gray-600">
                                    {report.sex === 'male' ? 'Maschio' : 'Femmina'}, {report.ageClass === 'adult' ? 'Adulto' : 'Giovane'}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="max-w-[200px] truncate text-sm text-gray-600">
                                {report.notes || '-'}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Statistics Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Prelievi Totali</p>
                        <p className="text-2xl font-bold">
                          {reports.filter((r: any) => r.outcome === 'harvest').length}
                        </p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Prelievi Capriolo</p>
                        <p className="text-2xl font-bold">
                          {reports.filter((r: any) => r.outcome === 'harvest' && r.species === 'roe_deer').length}
                        </p>
                      </div>
                      <Target className="h-8 w-8 text-amber-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Prelievi Cervo</p>
                        <p className="text-2xl font-bold">
                          {reports.filter((r: any) => r.outcome === 'harvest' && r.species === 'red_deer').length}
                        </p>
                      </div>
                      <Target className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Zone Statistics */}
              <Card>
                <CardContent className="p-6">
                  <h4 className="text-lg font-semibold mb-4">Prelievi per Zona</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                    {Array.from({ length: 16 }, (_, i) => {
                      const zoneId = i + 1;
                      const zoneReports = reports.filter((r: any) => 
                        r.outcome === 'harvest' && r.reservation?.zoneId === zoneId
                      );
                      return (
                        <div key={zoneId} className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm font-medium text-gray-700">Zona {zoneId}</div>
                          <div className="text-xl font-bold text-green-600">{zoneReports.length}</div>
                          <div className="text-xs text-gray-500">prelievi</div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <RegionalQuotaManager 
        open={showRegionalQuotaManager}
        onOpenChange={setShowRegionalQuotaManager}
      />
      
      <HunterManagementModal
        open={showHunterManagement}
        onOpenChange={setShowHunterManagement}
      />
      
      <AdminReportModal
        open={showReportModal}
        onOpenChange={setShowReportModal}
      />
    </div>
  );
}
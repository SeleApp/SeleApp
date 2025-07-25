import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, PlusIcon, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RegionalQuotaManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RegionalQuotaManager({ open, onOpenChange }: RegionalQuotaManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("view");
  const [bulkData, setBulkData] = useState("");

  const { data: quotas = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/regional-quotas"],
    enabled: open,
    refetchOnWindowFocus: true,
    refetchInterval: open ? 3000 : false, // Refresh every 3 seconds when open
    staleTime: 0, // Always consider data stale
  });

  const updateQuotaMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest(`/api/regional-quotas/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regional-quotas"] });
      refetch(); // Force immediate refresh
      toast({ title: "Quota aggiornata con successo" });
    },
    onError: () => {
      toast({ title: "Errore nell'aggiornamento", variant: "destructive" });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (quotasData: any[]) => {
      return await apiRequest("/api/regional-quotas/bulk", {
        method: "POST",
        body: JSON.stringify({ quotas: quotasData }),
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/regional-quotas"] });
      refetch(); // Force immediate refresh
      toast({ title: `Aggiornate ${data.quotas.length} quote regionali` });
      setBulkData("");
    },
    onError: () => {
      toast({ title: "Errore nell'aggiornamento massivo", variant: "destructive" });
    },
  });

  const handleBulkUpdate = () => {
    try {
      const quotasData = JSON.parse(bulkData);
      bulkUpdateMutation.mutate(quotasData);
    } catch (error) {
      toast({ title: "Formato JSON non valido", variant: "destructive" });
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Non impostato";
    return new Date(date).toLocaleDateString("it-IT");
  };

  const getStatusBadge = (quota: any) => {
    if (!quota.isActive) return <Badge variant="destructive">Inattivo</Badge>;
    if (quota.isExhausted) return <Badge variant="destructive">Esaurito</Badge>;
    if (!quota.isInSeason) return <Badge variant="secondary">Fuori stagione</Badge>;
    if (quota.available <= 5) return <Badge variant="destructive">Pochi disponibili</Badge>;
    return <Badge variant="default">Disponibile</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestione Quote Regionali</DialogTitle>
          <DialogDescription>
            Gestisci le quote regionali comunicate dalla regione e i periodi di caccia
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="view">Quote Attuali</TabsTrigger>
            <TabsTrigger value="periods">Periodi di Caccia</TabsTrigger>
            <TabsTrigger value="bulk">Aggiornamento Massivo</TabsTrigger>
          </TabsList>

          <TabsContent value="view" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Quote Regionali Attuali</h3>
              <Badge variant="outline">
                Totale categorie: {quotas.length}
              </Badge>
            </div>

            {isLoading ? (
              <div className="text-center py-8">Caricamento...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Specie</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Quota Totale</TableHead>
                    <TableHead>Prelevati</TableHead>
                    <TableHead>Disponibili</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotas.map((quota: any) => (
                    <TableRow key={quota.id}>
                      <TableCell className="font-medium">
                        {quota.species === 'roe_deer' ? 'Capriolo' : 'Cervo'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {quota.roeDeerCategory || quota.redDeerCategory}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          defaultValue={quota.totalQuota}
                          className="w-20"
                          onBlur={(e) => {
                            const newValue = parseInt(e.target.value);
                            if (newValue !== quota.totalQuota) {
                              updateQuotaMutation.mutate({
                                id: quota.id,
                                data: { totalQuota: newValue }
                              });
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>{quota.harvested}</TableCell>
                      <TableCell className="font-bold">{quota.totalQuota - quota.harvested}</TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {quota.notes || `${formatDate(quota.huntingStartDate)} - ${formatDate(quota.huntingEndDate)}`}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(quota)}</TableCell>
                      <TableCell className="text-xs">
                        <div>Inizio: {formatDate(quota.huntingStartDate)}</div>
                        <div>Fine: {formatDate(quota.huntingEndDate)}</div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            updateQuotaMutation.mutate({
                              id: quota.id,
                              data: { isActive: !quota.isActive }
                            });
                          }}
                        >
                          {quota.isActive ? 'Disattiva' : 'Attiva'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="periods" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Gestione Periodi di Caccia
                </CardTitle>
                <CardDescription>
                  Imposta i periodi di caccia per ogni categoria di animale (utilizza formato testo personalizzato)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  {quotas.filter((q: any) => q.species === 'roe_deer').length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3 text-amber-600">🦌 Capriolo - Periodi di Caccia</h4>
                      <div className="grid gap-3">
                        {quotas.filter((q: any) => q.species === 'roe_deer').map((quota: any) => (
                          <div key={`roe-${quota.id}`} className="flex items-center justify-between p-4 border rounded-lg bg-amber-50">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="font-medium">{quota.roeDeerCategory}</Badge>
                              <span className="text-sm font-medium">
                                {quota.notes || `${formatDate(quota.huntingStartDate)} - ${formatDate(quota.huntingEndDate)}`}
                              </span>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                const currentPeriod = quota.notes || `${formatDate(quota.huntingStartDate)} - ${formatDate(quota.huntingEndDate)}`;
                                const newPeriod = prompt("Inserisci periodo personalizzato (es. 15/09 - 31/12):", currentPeriod);
                                if (newPeriod && newPeriod !== currentPeriod) {
                                  updateQuotaMutation.mutate({
                                    id: quota.id,
                                    data: { notes: newPeriod }
                                  });
                                }
                              }}
                              disabled={updateQuotaMutation.isPending}
                            >
                              ✏️ Modifica
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {quotas.filter((q: any) => q.species === 'red_deer').length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3 text-red-600">🦌 Cervo - Periodi di Caccia</h4>
                      <div className="grid gap-3">
                        {quotas.filter((q: any) => q.species === 'red_deer').map((quota: any) => (
                          <div key={`red-${quota.id}`} className="flex items-center justify-between p-4 border rounded-lg bg-red-50">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="font-medium">{quota.redDeerCategory}</Badge>
                              <span className="text-sm font-medium">
                                {quota.notes || `${formatDate(quota.huntingStartDate)} - ${formatDate(quota.huntingEndDate)}`}
                              </span>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                const currentPeriod = quota.notes || `${formatDate(quota.huntingStartDate)} - ${formatDate(quota.huntingEndDate)}`;
                                const newPeriod = prompt("Inserisci periodo personalizzato (es. 15/09 - 31/12):", currentPeriod);
                                if (newPeriod && newPeriod !== currentPeriod) {
                                  updateQuotaMutation.mutate({
                                    id: quota.id,
                                    data: { notes: newPeriod }
                                  });
                                }
                              }}
                              disabled={updateQuotaMutation.isPending}
                            >
                              ✏️ Modifica
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h5 className="font-medium text-blue-800 mb-2">💡 Suggerimento</h5>
                  <p className="text-sm text-blue-700">
                    I periodi personalizzati sovrascrivono le date del database. 
                    Formato consigliato: "15/09 - 31/12" o "1 ottobre - 15 gennaio"
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Aggiornamento Massivo Quote
                </CardTitle>
                <CardDescription>
                  Quando la regione comunica nuovi numeri, inserisci i dati in formato JSON
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="bulk-data">Dati Quote (JSON)</Label>
                  <textarea
                    id="bulk-data"
                    className="w-full h-40 p-3 border rounded font-mono text-sm"
                    placeholder={`Esempio:
[
  {
    "species": "roe_deer",
    "roeDeerCategory": "M0",
    "totalQuota": 50,
    "season": "2024-2025"
  },
  {
    "species": "red_deer", 
    "redDeerCategory": "CL0",
    "totalQuota": 20,
    "season": "2024-2025"
  }
]`}
                    value={bulkData}
                    onChange={(e) => setBulkData(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleBulkUpdate}
                  disabled={!bulkData.trim() || bulkUpdateMutation.isPending}
                  className="w-full"
                >
                  {bulkUpdateMutation.isPending ? "Aggiornamento..." : "Aggiorna Quote Regionali"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Plus, Edit, Save, Upload, FileText, AlertCircle, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ImportRegionalQuotas from "@/components/import-regional-quotas";

interface SuperAdminRegionalQuotasProps {
  reserves: Array<{
    id: string;
    name: string;
    comune: string;
    species?: string;
    emailContatto?: string;
    presidentName?: string | null;
    huntingType?: string | null;
    systemType?: string;
    managementType?: "custom" | "standard_zones" | "zones_groups" | "standard_random" | "quota_only";
    numberOfZones?: number | null;
    numberOfGroups?: number | null;
    activeGroups?: string[] | null;
    assignmentMode?: string | null;
    accessCode?: string;
    codeActive?: boolean;
    isActive?: boolean;
    createdAt?: Date;
    stats?: any;
  }>;
}

const SPECIES_CONFIG = {
  roe_deer: {
    name: 'Capriolo',
    categories: ['M0', 'F0', 'FA', 'M1', 'MA'],
    color: 'bg-amber-50 border-amber-200 text-amber-800'
  },
  red_deer: {
    name: 'Cervo', 
    categories: ['CL0', 'FF', 'MM', 'MCL1'],
    color: 'bg-red-50 border-red-200 text-red-800'
  },
  fallow_deer: {
    name: 'Daino',
    categories: ['DA-M-0', 'DA-M-I', 'DA-M-II', 'DA-F-0', 'DA-F-I', 'DA-F-II'],
    color: 'bg-green-50 border-green-200 text-green-800'
  },
  mouflon: {
    name: 'Muflone',
    categories: ['MU-M-0', 'MU-M-I', 'MU-M-II', 'MU-F-0', 'MU-F-I', 'MU-F-II'],
    color: 'bg-blue-50 border-blue-200 text-blue-800'
  },
  chamois: {
    name: 'Camoscio',
    categories: ['CA-M-0', 'CA-M-I', 'CA-M-II', 'CA-M-III', 'CA-F-0', 'CA-F-I', 'CA-F-II', 'CA-F-III'],
    color: 'bg-purple-50 border-purple-200 text-purple-800'
  }
};

// Componente per la tabella riassuntiva di tutte le quote regionali
function ReserveQuotasSummaryTable({ reserves }: { reserves: any[] }) {
  const { data: allQuotas = [], isLoading } = useQuery({
    queryKey: ['/api/superadmin/all-regional-quotas'],
    queryFn: async () => {
      const response = await apiRequest('/api/regional-quotas', {
        method: 'GET'
      });
      return Array.isArray(response) ? response : [];
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">Caricamento quote regionali...</div>
        </CardContent>
      </Card>
    );
  }

  // Raggruppa quote per riserva
  const quotasByReserve = allQuotas.reduce((acc: any, quota: any) => {
    if (!acc[quota.reserveId]) {
      acc[quota.reserveId] = [];
    }
    acc[quota.reserveId].push(quota);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          Tabella Riassuntiva Quote Regionali - Piano Venatorio 2025-2026
        </CardTitle>
        <p className="text-sm text-gray-600">
          Panoramica completa delle quote regionali assegnate dalla Regione Veneto per tutte le riserve
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">Riserva</TableHead>
                <TableHead className="text-center font-bold">Comune</TableHead>
                <TableHead className="text-center font-bold">Specie Attive</TableHead>
                <TableHead className="text-center font-bold">Quote Totali</TableHead>
                <TableHead className="text-center font-bold">Capriolo</TableHead>
                <TableHead className="text-center font-bold">Cervo</TableHead>
                <TableHead className="text-center font-bold">Daino</TableHead>
                <TableHead className="text-center font-bold">Muflone</TableHead>
                <TableHead className="text-center font-bold">Camoscio</TableHead>
                <TableHead className="text-center font-bold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reserves.map(reserve => {
                const reserveQuotas = quotasByReserve[reserve.id] || [];
                const speciesCount = new Set(reserveQuotas.map((q: any) => q.species)).size;
                const totalQuotas = reserveQuotas.reduce((sum: number, q: any) => sum + (q.totalQuota || 0), 0);
                
                // Calcola totali per specie
                const roeDeerTotal = reserveQuotas
                  .filter((q: any) => q.species === 'roe_deer')
                  .reduce((sum: number, q: any) => sum + (q.totalQuota || 0), 0);
                
                const redDeerTotal = reserveQuotas
                  .filter((q: any) => q.species === 'red_deer')
                  .reduce((sum: number, q: any) => sum + (q.totalQuota || 0), 0);
                
                const fallowDeerTotal = reserveQuotas
                  .filter((q: any) => q.species === 'fallow_deer')
                  .reduce((sum: number, q: any) => sum + (q.totalQuota || 0), 0);
                
                const mouflonTotal = reserveQuotas
                  .filter((q: any) => q.species === 'mouflon')
                  .reduce((sum: number, q: any) => sum + (q.totalQuota || 0), 0);
                
                const chamoisTotal = reserveQuotas
                  .filter((q: any) => q.species === 'chamois')
                  .reduce((sum: number, q: any) => sum + (q.totalQuota || 0), 0);

                return (
                  <TableRow key={reserve.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{reserve.name}</span>
                        <Badge 
                          variant="outline" 
                          className={
                            reserve.managementType === 'standard_zones' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            reserve.managementType === 'zones_groups' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            'bg-gray-50 text-gray-700 border-gray-200'
                          }
                        >
                          {reserve.managementType === 'zones_groups' ? 'Zone+Gruppi' : 
                           reserve.managementType === 'standard_zones' ? 'Zone' : 'Altro'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm">{reserve.comune}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{speciesCount} specie</Badge>
                    </TableCell>
                    <TableCell className="text-center font-bold text-green-700">
                      {totalQuotas}
                    </TableCell>
                    <TableCell className="text-center">
                      {roeDeerTotal > 0 ? (
                        <Badge className="bg-amber-100 text-amber-800">{roeDeerTotal}</Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {redDeerTotal > 0 ? (
                        <Badge className="bg-red-100 text-red-800">{redDeerTotal}</Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {fallowDeerTotal > 0 ? (
                        <Badge className="bg-green-100 text-green-800">{fallowDeerTotal}</Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {mouflonTotal > 0 ? (
                        <Badge className="bg-blue-100 text-blue-800">{mouflonTotal}</Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {chamoisTotal > 0 ? (
                        <Badge className="bg-purple-100 text-purple-800">{chamoisTotal}</Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {reserve.isActive ? (
                        <Badge className="bg-green-100 text-green-800">Attiva</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">Inattiva</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        {reserves.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Nessuna riserva configurata nel sistema</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SuperAdminRegionalQuotas({ reserves }: SuperAdminRegionalQuotasProps) {
  const [selectedReserve, setSelectedReserve] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuota, setEditingQuota] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    species: '',
    category: '',
    totalQuota: '',
    notes: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Carica le quote regionali per la riserva selezionata
  const { data: regionalQuotas = [], isLoading } = useQuery({
    queryKey: ['/api/superadmin/regional-quotas', selectedReserve],
    enabled: !!selectedReserve,
    queryFn: async () => {
      const response = await apiRequest(`/api/superadmin/regional-quotas/${selectedReserve}`, {
        method: 'GET'
      });
      // Assicurati che la risposta sia sempre un array
      return Array.isArray(response) ? response : [];
    }
  });

  // Mutation per creare/aggiornare quota regionale
  const upsertQuotaMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingQuota 
        ? `/api/superadmin/regional-quotas/${editingQuota}`
        : `/api/superadmin/regional-quotas`;
      
      return await apiRequest(url, {
        method: editingQuota ? 'PATCH' : 'POST',
        body: JSON.stringify({
          ...data,
          reserveId: selectedReserve
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/regional-quotas', selectedReserve] });
      setShowCreateModal(false);
      setEditingQuota(null);
      setFormData({ species: '', category: '', totalQuota: '', notes: '' });
      toast({
        title: "Successo",
        description: editingQuota ? "Quota aggiornata" : "Quota creata"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nell'operazione",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.species || !formData.category || !formData.totalQuota) {
      toast({
        title: "Errore",
        description: "Tutti i campi sono obbligatori",
        variant: "destructive"
      });
      return;
    }

    const quotaData: any = {
      species: formData.species,
      totalQuota: parseInt(formData.totalQuota),
      notes: formData.notes,
      isActive: true
    };

    // Imposta la categoria corretta per ogni specie
    if (formData.species === 'roe_deer') {
      quotaData.roeDeerCategory = formData.category;
    } else if (formData.species === 'red_deer') {
      quotaData.redDeerCategory = formData.category;
    } else if (formData.species === 'fallow_deer') {
      quotaData.fallowDeerCategory = formData.category;
    } else if (formData.species === 'mouflon') {
      quotaData.mouflonCategory = formData.category;
    } else if (formData.species === 'chamois') {
      quotaData.chamoisCategory = formData.category;
    }

    upsertQuotaMutation.mutate(quotaData);
  };

  const startEdit = (quota: any) => {
    setEditingQuota(quota.id);
    
    // Determina la categoria in base alla specie
    let category = '';
    if (quota.species === 'roe_deer') category = quota.roeDeerCategory;
    else if (quota.species === 'red_deer') category = quota.redDeerCategory;
    else if (quota.species === 'fallow_deer') category = quota.fallowDeerCategory;
    else if (quota.species === 'mouflon') category = quota.mouflonCategory;
    else if (quota.species === 'chamois') category = quota.chamoisCategory;
    
    setFormData({
      species: quota.species,
      category: category || '',
      totalQuota: quota.totalQuota.toString(),
      notes: quota.notes || ''
    });
    setShowCreateModal(true);
  };

  const selectedReserveName = reserves.find(r => r.id === selectedReserve)?.name;

  return (
    <div className="space-y-6">
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            Gestione Piani di Prelievo Regionali
          </CardTitle>
          <p className="text-sm text-green-700">
            SUPERADMIN: Gestione dei piani di prelievo regionali assegnati dalla Regione Veneto per ogni riserva.
            Questi piani rappresentano i limiti massimi che non possono essere superati dagli amministratori locali.
          </p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary">Tabella Riassuntiva</TabsTrigger>
          <TabsTrigger value="manage">Gestione Manuale</TabsTrigger>
          <TabsTrigger value="import">Importa da PDF</TabsTrigger>
        </TabsList>

        {/* Tab Tabella Riassuntiva */}
        <TabsContent value="summary" className="space-y-4">
          <ReserveQuotasSummaryTable reserves={reserves} />
        </TabsContent>

        {/* Tab Gestione Manuale */}
        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Selezione Riserva */}
                <div>
                  <Label htmlFor="reserve-select">Seleziona Riserva</Label>
                  <Select value={selectedReserve || ''} onValueChange={setSelectedReserve}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleziona una riserva per gestire le quote regionali" />
                    </SelectTrigger>
                    <SelectContent>
                      {reserves.map(reserve => (
                        <SelectItem key={reserve.id} value={reserve.id}>
                          {reserve.name} - {reserve.comune}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Alert informativo */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Come funzionano i piani di prelievo regionali:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li><strong>Piano Venatorio:</strong> I piani di prelievo sono assegnati dalla Regione Veneto</li>
                        <li><strong>Limiti Massimi:</strong> Gli admin locali NON possono superare questi valori</li>
                        <li><strong>Distribuzione:</strong> Ogni riserva può distribuire internamente (es: per gruppi)</li>
                        <li><strong>Controllo:</strong> Solo il SuperAdmin può modificare questi valori ufficiali</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Importazione da PDF */}
        <TabsContent value="import" className="space-y-4">
          <ImportRegionalQuotas 
            reserves={reserves} 
            onImportComplete={() => {
              if (selectedReserve) {
                queryClient.invalidateQueries({ queryKey: ['/api/superadmin/regional-quotas', selectedReserve] });
              }
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Gestione Quote per Riserva Selezionata */}
      {selectedReserve && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Quote Regionali - {selectedReserveName}
              </CardTitle>
              <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi Quota
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingQuota ? 'Modifica Quota Regionale' : 'Nuova Quota Regionale'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="species">Specie</Label>
                      <Select 
                        value={formData.species} 
                        onValueChange={(value) => setFormData({...formData, species: value, category: ''})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona specie" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="roe_deer">Capriolo</SelectItem>
                          <SelectItem value="red_deer">Cervo</SelectItem>
                          <SelectItem value="fallow_deer">Daino</SelectItem>
                          <SelectItem value="mouflon">Muflone</SelectItem>
                          <SelectItem value="chamois">Camoscio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.species && (
                      <div>
                        <Label htmlFor="category">Categoria</Label>
                        <Select 
                          value={formData.category} 
                          onValueChange={(value) => setFormData({...formData, category: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {SPECIES_CONFIG[formData.species as keyof typeof SPECIES_CONFIG]?.categories.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="totalQuota">Quota Assegnata (Regione Veneto)</Label>
                      <Input
                        id="totalQuota"
                        type="number"
                        min="0"
                        value={formData.totalQuota}
                        onChange={(e) => setFormData({...formData, totalQuota: e.target.value})}
                        placeholder="Es: 15"
                      />
                    </div>

                    <div>
                      <Label htmlFor="notes">Note/Periodo (Opzionale)</Label>
                      <Input
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        placeholder="Es: 15/09 - 31/12"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" disabled={upsertQuotaMutation.isPending}>
                        <Save className="h-4 w-4 mr-2" />
                        {upsertQuotaMutation.isPending ? 'Salvando...' : 'Salva'}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setShowCreateModal(false);
                          setEditingQuota(null);
                          setFormData({ species: '', category: '', totalQuota: '', notes: '' });
                        }}
                      >
                        Annulla
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Caricamento piani di prelievo regionali...</div>
            ) : !Array.isArray(regionalQuotas) || regionalQuotas.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Nessun piano di prelievo regionale configurato per questa riserva</p>
                <p className="text-sm mt-2">Clicca "Aggiungi Piano" per iniziare</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Tabella formato PDF per CAPRIOLO */}
                {(() => {
                  const roeDeerQuotas = Array.isArray(regionalQuotas) ? regionalQuotas.filter((q: any) => q.species === 'roe_deer') : [];
                  if (roeDeerQuotas.length === 0) return null;
                  
                  // Ordina le categorie per seguire l'ordine del PDF: M0, F0, FA, M1, MA
                  const categoryOrder = ['M0', 'F0', 'FA', 'M1', 'MA'];
                  const sortedRoeDeer = roeDeerQuotas.sort((a, b) => 
                    categoryOrder.indexOf(a.roeDeerCategory) - categoryOrder.indexOf(b.roeDeerCategory)
                  );
                  
                  const total = sortedRoeDeer.reduce((sum, q) => sum + q.totalQuota, 0);
                  const harvested = sortedRoeDeer.reduce((sum, q) => sum + (q.harvested || 0), 0);

                  return (
                    <Card key="roe_deer" className="border-amber-200 bg-amber-50">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-amber-800">PIANO ABBATTIMENTO CAPRIOLO 2025-2026</h3>
                          <Badge className="bg-amber-600 text-white">
                            {harvested}/{total} abbattuti
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-gray-400">
                            <thead>
                              <tr className="bg-amber-100">
                                <th className="border border-gray-400 px-3 py-2 text-left font-bold">Riserva</th>
                                <th className="border border-gray-400 px-3 py-2 text-center font-bold">M0</th>
                                <th className="border border-gray-400 px-3 py-2 text-center font-bold">F0</th>
                                <th className="border border-gray-400 px-3 py-2 text-center font-bold">FA</th>
                                <th className="border border-gray-400 px-3 py-2 text-center font-bold">M1</th>
                                <th className="border border-gray-400 px-3 py-2 text-center font-bold">MA</th>
                                <th className="border border-gray-400 px-3 py-2 text-center font-bold bg-amber-200">TOT</th>
                                <th className="border border-gray-400 px-3 py-2 text-center font-bold">Azioni</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="hover:bg-amber-25">
                                <td className="border border-gray-400 px-3 py-2 font-medium">
                                  {selectedReserveName}
                                </td>
                                {categoryOrder.map(category => {
                                  const quota = sortedRoeDeer.find(q => q.roeDeerCategory === category);
                                  return (
                                    <td key={category} className="border border-gray-400 px-3 py-2 text-center">
                                      <div className="flex flex-col items-center">
                                        <span className="font-bold text-green-700">
                                          {quota?.totalQuota || 0}
                                        </span>
                                        {quota && quota.harvested > 0 && (
                                          <span className="text-xs text-red-600">
                                            (-{quota.harvested})
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}
                                <td className="border border-gray-400 px-3 py-2 text-center bg-amber-100">
                                  <span className="font-bold text-lg">{total}</span>
                                  {harvested > 0 && (
                                    <div className="text-xs text-red-600">(-{harvested})</div>
                                  )}
                                </td>
                                <td className="border border-gray-400 px-3 py-2 text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      // Modifica prima quota trovata per aprire il modal
                                      if (sortedRoeDeer.length > 0) {
                                        startEdit(sortedRoeDeer[0]);
                                      }
                                    }}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Tabella formato PDF per CERVO */}
                {(() => {
                  const redDeerQuotas = Array.isArray(regionalQuotas) ? regionalQuotas.filter((q: any) => q.species === 'red_deer') : [];
                  if (redDeerQuotas.length === 0) return null;
                  
                  // Ordina le categorie per seguire l'ordine del PDF: CL0, MCL1, MM, FF
                  const categoryOrder = ['CL0', 'MCL1', 'MM', 'FF'];
                  const sortedRedDeer = redDeerQuotas.sort((a, b) => 
                    categoryOrder.indexOf(a.redDeerCategory) - categoryOrder.indexOf(b.redDeerCategory)
                  );
                  
                  const total = sortedRedDeer.reduce((sum, q) => sum + q.totalQuota, 0);
                  const harvested = sortedRedDeer.reduce((sum, q) => sum + (q.harvested || 0), 0);

                  return (
                    <Card key="red_deer" className="border-red-200 bg-red-50">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-red-800">CERVO piano prelievo 2025/2026</h3>
                          <Badge className="bg-red-600 text-white">
                            {harvested}/{total} abbattuti
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-gray-400">
                            <thead>
                              <tr className="bg-red-100">
                                <th className="border border-gray-400 px-3 py-2 text-left font-bold">Comp A</th>
                                <th className="border border-gray-400 px-3 py-2 text-center font-bold">CL0</th>
                                <th className="border border-gray-400 px-3 py-2 text-center font-bold">MCL1</th>
                                <th className="border border-gray-400 px-3 py-2 text-center font-bold">MM</th>
                                <th className="border border-gray-400 px-3 py-2 text-center font-bold">FF</th>
                                <th className="border border-gray-400 px-3 py-2 text-center font-bold bg-red-200">tot</th>
                                <th className="border border-gray-400 px-3 py-2 text-center font-bold">Azioni</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="hover:bg-red-25">
                                <td className="border border-gray-400 px-3 py-2 font-medium">
                                  {selectedReserveName?.replace('CA TV', 'CA TV')}
                                </td>
                                {categoryOrder.map(category => {
                                  const quota = sortedRedDeer.find(q => q.redDeerCategory === category);
                                  return (
                                    <td key={category} className="border border-gray-400 px-3 py-2 text-center">
                                      <div className="flex flex-col items-center">
                                        <span className="font-bold text-green-700">
                                          {quota?.totalQuota || 0}
                                        </span>
                                        {quota && quota.harvested > 0 && (
                                          <span className="text-xs text-red-600">
                                            (-{quota.harvested})
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}
                                <td className="border border-gray-400 px-3 py-2 text-center bg-red-100">
                                  <span className="font-bold text-lg">{total}</span>
                                  {harvested > 0 && (
                                    <div className="text-xs text-red-600">(-{harvested})</div>
                                  )}
                                </td>
                                <td className="border border-gray-400 px-3 py-2 text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      // Modifica prima quota trovata per aprire il modal
                                      if (sortedRedDeer.length > 0) {
                                        startEdit(sortedRedDeer[0]);
                                      }
                                    }}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
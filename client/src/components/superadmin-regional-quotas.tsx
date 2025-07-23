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
import { Target, Plus, Edit, Save, Upload, FileText, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ImportRegionalQuotas from "@/components/import-regional-quotas";

interface SuperAdminRegionalQuotasProps {
  reserves: Array<{
    id: string;
    name: string;
    comune: string;
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
  }
};

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
      return response;
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

    // Imposta la categoria corretta
    if (formData.species === 'roe_deer') {
      quotaData.roeDeerCategory = formData.category;
    } else if (formData.species === 'red_deer') {
      quotaData.redDeerCategory = formData.category;
    }

    upsertQuotaMutation.mutate(quotaData);
  };

  const startEdit = (quota: any) => {
    setEditingQuota(quota.id);
    setFormData({
      species: quota.species,
      category: quota.species === 'roe_deer' ? quota.roeDeerCategory : quota.redDeerCategory,
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
            Gestione Quote Regionali Piano Venatorio
          </CardTitle>
          <p className="text-sm text-green-700">
            SUPERADMIN: Gestione delle quote regionali assegnate dalla Regione Veneto per ogni riserva.
            Queste quote rappresentano i limiti massimi che non possono essere superati dagli amministratori locali.
          </p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="manage" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manage">Gestione Manuale</TabsTrigger>
          <TabsTrigger value="import">Importa da PDF</TabsTrigger>
        </TabsList>

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
                      <p className="font-medium mb-1">Come funzionano le quote regionali:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li><strong>Piano Venatorio:</strong> Le quote sono assegnate dalla Regione Veneto</li>
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
                quotasQuery.refetch();
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
              <div className="text-center py-8">Caricamento quote regionali...</div>
            ) : regionalQuotas.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Nessuna quota regionale configurata per questa riserva</p>
                <p className="text-sm mt-2">Clicca "Aggiungi Quota" per iniziare</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(SPECIES_CONFIG).map(([species, config]) => {
                  const speciesQuotas = regionalQuotas.filter((q: any) => q.species === species);
                  if (speciesQuotas.length === 0) return null;

                  const totalQuota = speciesQuotas.reduce((sum: number, q: any) => sum + q.totalQuota, 0);
                  const totalHarvested = speciesQuotas.reduce((sum: number, q: any) => sum + (q.harvested || 0), 0);

                  return (
                    <Card key={species} className={config.color}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{config.name}</h4>
                          <Badge variant="outline">
                            {totalHarvested}/{totalQuota} - {totalQuota - totalHarvested} disponibili
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Categoria</TableHead>
                              <TableHead>Quota Regionale</TableHead>
                              <TableHead>Abbattuti</TableHead>
                              <TableHead>Disponibili</TableHead>
                              <TableHead>Note/Periodo</TableHead>
                              <TableHead>Azioni</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {speciesQuotas.map((quota: any) => (
                              <TableRow key={quota.id}>
                                <TableCell className="font-mono font-medium">
                                  {quota.species === 'roe_deer' ? quota.roeDeerCategory : quota.redDeerCategory}
                                </TableCell>
                                <TableCell className="font-bold text-green-700">
                                  {quota.totalQuota}
                                </TableCell>
                                <TableCell className="text-red-600">
                                  {quota.harvested || 0}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={quota.totalQuota - (quota.harvested || 0) > 0 ? "default" : "destructive"}>
                                    {quota.totalQuota - (quota.harvested || 0)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-gray-600">
                                  {quota.notes || '-'}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => startEdit(quota)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
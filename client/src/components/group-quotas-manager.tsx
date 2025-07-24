// © 2025 Alessandro Favero - Tutti i diritti riservati
// Licenza: Uso riservato esclusivamente alle riserve attivate tramite contratto
// Vietata la riproduzione, distribuzione o modifica non autorizzata

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Target, Save, Plus, Minus } from "lucide-react";

interface GroupQuota {
  id: number;
  reserveId: string;
  hunterGroup: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  species: 'roe_deer' | 'red_deer';
  roeDeerCategory?: string;
  redDeerCategory?: string;
  totalQuota: number;
  harvested: number;
  season: string;
  isActive: boolean;
  notes?: string;
}

interface GroupQuotasManagerProps {
  reserveId?: string;
  readonly?: boolean;
}

const SPECIES_CONFIG = {
  roe_deer: {
    name: 'Capriolo',
    categories: ['M1', 'M2', 'F1_FF', 'PF', 'PM'],
    color: 'bg-amber-100 text-amber-800'
  },
  red_deer: {
    name: 'Cervo',
    categories: ['CL0', 'FF', 'MM', 'MCL1'],
    color: 'bg-red-100 text-red-800'
  }
};

export default function GroupQuotasManager({ reserveId, readonly = false }: GroupQuotasManagerProps) {
  const [activeGroup, setActiveGroup] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'F'>('A');
  const [quotaChanges, setQuotaChanges] = useState<Record<string, number>>({});
  const [savingGroup, setSavingGroup] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current reserve info for dynamic group configuration
  const { data: currentReserve } = useQuery({
    queryKey: ['/api/reserves/current'],
    enabled: !!reserveId
  });

  // Carica le quote per gruppo
  const { data: groupQuotas = [], isLoading } = useQuery({
    queryKey: ['/api/group-quotas'],
    enabled: !!reserveId,
    staleTime: 30000
  });

  // Carica le quote regionali del piano venatorio
  const { data: regionalQuotas = [], isLoading: isLoadingRegional } = useQuery({
    queryKey: ['/api/regional-quotas'],
    enabled: !!reserveId,
    staleTime: 30000
  });

  // Mutation per aggiornare le quote di un singolo gruppo
  const updateQuotasMutation = useMutation({
    mutationFn: async (quotas: Array<{ hunterGroup: string; species: string; category: string; totalQuota: number }>) => {
      return await apiRequest('/api/group-quotas', {
        method: 'POST',
        body: JSON.stringify({ quotas, reserveId })
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/group-quotas'] });
      // Rimuovi solo le modifiche per il gruppo salvato
      const groupToSave = variables[0]?.hunterGroup;
      if (groupToSave) {
        setQuotaChanges(prev => {
          const newChanges = { ...prev };
          Object.keys(newChanges).forEach(key => {
            if (key.startsWith(`${groupToSave}-`)) {
              delete newChanges[key];
            }
          });
          return newChanges;
        });
      }
      setSavingGroup(null);
      toast({
        title: "Quote salvate",
        description: `Quote per il Gruppo ${groupToSave} salvate con successo.`
      });
    },
    onError: (error: any) => {
      setSavingGroup(null);
      toast({
        title: "Errore",
        description: error.message || "Errore nel salvataggio delle quote",
        variant: "destructive"
      });
    }
  });

  // Get active groups from reserve config or default to first 4
  const activeGroups = (currentReserve as any)?.activeGroups || ['A', 'B', 'C', 'D'];
  const numberOfGroups = (currentReserve as any)?.numberOfGroups || 4;

  // Calcola i totali regionali per confronto
  const getRegionalTotals = () => {
    const totals: Record<string, { total: number; harvested: number }> = {};
    if (Array.isArray(regionalQuotas)) {
      regionalQuotas.forEach((quota: any) => {
        const key = quota.species === 'roe_deer' ? quota.roeDeerCategory : quota.redDeerCategory;
        if (key) {
          totals[`${quota.species}-${key}`] = {
            total: quota.totalQuota,
            harvested: quota.harvested
          };
        }
      });
    }
    return totals;
  };

  const regionalTotals = getRegionalTotals();

  const handleQuotaChange = (species: string, category: string, value: string) => {
    const numValue = parseInt(value) || 0;
    const key = `${activeGroup}-${species}-${category}`;
    
    // Validazione: verifica che la somma di tutti i gruppi non superi la quota regionale
    const regionalKey = `${species}-${category}`;
    const regionalLimit = regionalTotals[regionalKey]?.total || 0;
    
    if (regionalLimit > 0) {
      // Calcola la somma delle quote di tutti i gruppi per questa categoria
      const currentGroupQuotas = (groupQuotas as GroupQuota[]).filter(q => 
        q.species === species && 
        (q.roeDeerCategory === category || q.redDeerCategory === category)
      );
      
      const otherGroupsTotal = currentGroupQuotas
        .filter(q => q.hunterGroup !== activeGroup)
        .reduce((sum, q) => sum + q.totalQuota, 0);
      
      const newTotal = otherGroupsTotal + numValue;
      
      if (newTotal > regionalLimit) {
        toast({
          title: "Quota Regionale Superata",
          description: `La somma delle quote per ${category} (${newTotal}) supererebbe la quota regionale assegnata (${regionalLimit}). Totale altri gruppi: ${otherGroupsTotal}`,
          variant: "destructive"
        });
        return;
      }
    }
    
    console.log('Setting quota change:', key, numValue);
    setQuotaChanges(prev => {
      const newChanges = {
        ...prev,
        [key]: numValue
      };
      console.log('New quotaChanges state:', newChanges);
      return newChanges;
    });
  };

  const saveGroupChanges = (group: string) => {
    setSavingGroup(group);
    console.log('saveGroupChanges called for group:', group, 'quotaChanges:', quotaChanges);
    
    // Filtra solo le modifiche per questo gruppo
    const groupChanges = Object.entries(quotaChanges)
      .filter(([key]) => key.startsWith(`${group}-`))
      .map(([key, totalQuota]) => {
        const [hunterGroup, species, category] = key.split('-');
        return { hunterGroup, species, category, totalQuota };
      });

    console.log('quotasToUpdate for group', group, ':', groupChanges);

    if (groupChanges.length > 0) {
      updateQuotasMutation.mutate(groupChanges);
    } else {
      setSavingGroup(null);
      toast({
        title: "Nessuna modifica",
        description: `Nessuna modifica da salvare per il Gruppo ${group}.`
      });
    }
  };

  const hasGroupChanges = (group: string) => {
    return Object.keys(quotaChanges).some(key => key.startsWith(`${group}-`));
  };

  if (isLoading || isLoadingRegional) {
    return <div className="p-4 text-center">Caricamento quote...</div>;
  }

  if (!groupQuotas || !Array.isArray(groupQuotas) || groupQuotas.length === 0) {
    return <div className="p-4 text-center">Nessuna quota trovata per questa riserva</div>;
  }

  return (
    <div className="space-y-6">
      {/* Sezione Quote Regionali Piano Venatorio - FISSE */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            Piani di Prelievo Regionali (FISSI - Regione Veneto)
          </CardTitle>
          <p className="text-sm text-green-700">
            Piani di prelievo assegnati dalla Regione Veneto - NON modificabili. Rappresentano il limite massimo per la somma di tutti i gruppi.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(SPECIES_CONFIG).map(([species, config]) => {
              const speciesQuotas = Array.isArray(regionalQuotas) ? regionalQuotas.filter((q: any) => q.species === species) : [];
              const speciesTotal = speciesQuotas.reduce((sum: number, q: any) => sum + q.totalQuota, 0);
              const speciesHarvested = speciesQuotas.reduce((sum: number, q: any) => sum + q.harvested, 0);
              
              return (
                <div key={species} className="p-4 bg-white border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-green-800">{config.name}</h4>
                    <Badge className="bg-green-600 text-white">
                      REGIONALE: {speciesTotal - speciesHarvested} / {speciesTotal}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {config.categories.map(category => {
                      const categoryQuota = speciesQuotas.find((q: any) => 
                        q.species === species && 
                        (q.roeDeerCategory === category || q.redDeerCategory === category)
                      );
                      if (!categoryQuota) return null;
                      
                      // Calcola la somma delle quote di gruppo per questa categoria
                      const groupSum = (groupQuotas as GroupQuota[])
                        .filter(q => q.species === species && 
                          (q.roeDeerCategory === category || q.redDeerCategory === category))
                        .reduce((sum, q) => sum + q.totalQuota, 0);
                      
                      return (
                        <div key={category} className="flex justify-between items-center text-sm border-b border-green-100 pb-1">
                          <span className="font-mono font-semibold">{category}</span>
                          <div className="text-right">
                            <div className="font-semibold text-green-700">
                              Regionale: {categoryQuota.totalQuota}
                            </div>
                            <div className="text-xs text-gray-600">
                              Gruppi: {groupSum}/{categoryQuota.totalQuota}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sezione Quote per Gruppo - MODIFICABILI */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-xl">Distribuzione Quote per Gruppo (SEMPRE MODIFICABILI DURANTE LA STAGIONE)</CardTitle>
            </div>
          </div>
          <div className="text-base text-blue-800 mt-3 p-4 bg-blue-100 rounded-lg">
            <div className="space-y-2">
              <p><strong>🔄 MODIFICHE SEMPRE POSSIBILI:</strong> Puoi cambiare la distribuzione delle quote tra gruppi in qualsiasi momento durante la stagione.</p>
              <p><strong>🎯 LIMITE MASSIMO:</strong> La somma di tutti i gruppi NON può superare le quote regionali assegnate.</p>
              <p><strong>🗺️ ZONE LIBERE:</strong> Tutti i cacciatori possono prenotare in tutte le 16 zone di Cison.</p>
              <p><strong>🦌 CAPI LIMITATI:</strong> Ogni cacciatore può prelevare solo i capi assegnati al suo gruppo.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>

      <Tabs value={activeGroup} onValueChange={(value) => setActiveGroup(value as 'A' | 'B' | 'C' | 'D' | 'E' | 'F')}>
        <TabsList className={`grid w-full ${numberOfGroups === 2 ? 'grid-cols-2' : numberOfGroups === 3 ? 'grid-cols-3' : numberOfGroups === 5 ? 'grid-cols-5' : numberOfGroups === 6 ? 'grid-cols-6' : 'grid-cols-4'}`}>
          {activeGroups.map((group: string) => (
            <TabsTrigger key={group} value={group} className="gap-2">
              <Users className="h-4 w-4" />
              Gruppo {group}
            </TabsTrigger>
          ))}
        </TabsList>

        {activeGroups.map((group: string) => {
          // Filtra le quote per questo gruppo specifico
          const groupSpecificQuotas = (groupQuotas as GroupQuota[]).filter((quota: GroupQuota) => quota.hunterGroup === group);
          
          // Organizza per specie e categoria per questo gruppo
          const groupOrganizedQuotas = Object.entries(SPECIES_CONFIG).reduce((acc, [species, config]) => {
            acc[species] = config.categories.map(category => {
              const quota = groupSpecificQuotas.find((q: GroupQuota) => 
                q.species === species && 
                (q.roeDeerCategory === category || q.redDeerCategory === category)
              );
              return {
                category,
                quota: quota?.totalQuota || 0,
                harvested: quota?.harvested || 0,
                available: (quota?.totalQuota || 0) - (quota?.harvested || 0),
                id: quota?.id
              };
            });
            return acc;
          }, {} as Record<string, any[]>);

          return (
            <TabsContent key={group} value={group} className="space-y-6">
              
              {/* Header con titolo e pulsante salva per il gruppo */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg border border-blue-200">
                <div>
                  <h2 className="text-xl font-bold text-blue-900">Gruppo {group}</h2>
                  <p className="text-base text-blue-700 mt-1">Distribuzione quote per il gruppo di caccia</p>
                </div>
                {!readonly && hasGroupChanges(group) && (
                  <Button 
                    onClick={() => saveGroupChanges(group)}
                    disabled={savingGroup === group}
                    size="default"
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-base gap-2 h-12"
                  >
                    <Save className="h-5 w-5" />
                    {savingGroup === group ? 'Salvando...' : `Salva Gruppo ${group}`}
                  </Button>
                )}
                {!readonly && !hasGroupChanges(group) && (
                  <div className="text-base text-gray-500 px-6 py-3">
                    Nessuna modifica da salvare
                  </div>
                )}
              </div>
              
              {/* Tabelle delle quote per specie */}
              <div className="space-y-6">
                {Object.entries(SPECIES_CONFIG).map(([species, config]) => (
                  <Card key={species} className="border-2 border-gray-200">
                    <CardHeader className="bg-gray-50 border-b-2 border-gray-200">
                      <CardTitle className="flex items-center justify-between text-xl">
                        <div className="flex items-center gap-2">
                          <Target className="h-6 w-6" />
                          <span className="text-xl font-bold">{config.name}</span>
                        </div>
                        <Badge className={`${config.color} text-base px-3 py-1`}>
                          {groupOrganizedQuotas[species]?.reduce((sum, cat) => sum + cat.available, 0) || 0} disponibili
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      
                      {/* Tabella ottimizzata per senior */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-base border-collapse">
                          <thead>
                            <tr className="bg-gray-100 border-b-2 border-gray-300">
                              <th className="text-left p-3 font-bold text-base">Categoria</th>
                              <th className="text-center p-3 font-bold text-base">Quote Assegnate</th>
                              <th className="text-center p-3 font-bold text-base">Controlli</th>
                              <th className="text-center p-3 font-bold text-base">Prelevati</th>
                              <th className="text-center p-3 font-bold text-base">Disponibili</th>
                              <th className="text-center p-3 font-bold text-base">Limite Regionale</th>
                            </tr>
                          </thead>
                          <tbody>
                            {config.categories.map(category => {
                              const categoryData = groupOrganizedQuotas[species]?.find(c => c.category === category);
                              const currentQuota = categoryData?.quota || 0;
                              const harvested = categoryData?.harvested || 0;
                              const available = categoryData?.available || 0;
                              const changeKey = `${group}-${species}-${category}`;
                              const pendingChange = quotaChanges[changeKey];
                              const displayQuota = pendingChange !== undefined ? pendingChange : currentQuota;
                              
                              // Ottieni il limite regionale per questa categoria
                              const regionalKey = `${species}-${category}`;
                              const regionalLimit = regionalTotals[regionalKey]?.total || 0;

                              return (
                                <tr key={category} className="border-b border-gray-200 hover:bg-gray-50">
                                  
                                  {/* Categoria */}
                                  <td className="p-4">
                                    <span className="font-mono font-bold text-lg bg-gray-200 px-3 py-1 rounded">
                                      {category}
                                    </span>
                                  </td>
                                  
                                  {/* Quote Assegnate */}
                                  <td className="p-4 text-center">
                                    <div className="text-xl font-bold text-blue-600">
                                      {displayQuota}
                                    </div>
                                    {pendingChange !== undefined && (
                                      <div className="text-xs text-orange-600 mt-1">
                                        (era {currentQuota})
                                      </div>
                                    )}
                                  </td>
                                  
                                  {/* Controlli +/- */}
                                  <td className="p-4">
                                    {!readonly && (
                                      <div className="flex items-center justify-center gap-1">
                                        <Button
                                          onClick={() => handleQuotaChange(species, category, (displayQuota - 1).toString())}
                                          disabled={displayQuota <= 0}
                                          size="sm"
                                          variant="outline"
                                          className="h-10 w-10 text-lg font-bold hover:bg-red-50"
                                        >
                                          <Minus className="h-5 w-5" />
                                        </Button>
                                        <Button
                                          onClick={() => handleQuotaChange(species, category, (displayQuota + 1).toString())}
                                          size="sm"
                                          variant="outline"
                                          className="h-10 w-10 text-lg font-bold hover:bg-green-50"
                                        >
                                          <Plus className="h-5 w-5" />
                                        </Button>
                                      </div>
                                    )}
                                  </td>
                                  
                                  {/* Prelevati */}
                                  <td className="p-4 text-center">
                                    <div className="text-lg font-semibold text-red-600">
                                      {harvested}
                                    </div>
                                  </td>
                                  
                                  {/* Disponibili */}
                                  <td className="p-4 text-center">
                                    <div className="text-lg font-bold text-green-600">
                                      {Math.max(0, displayQuota - harvested)}
                                    </div>
                                  </td>
                                  
                                  {/* Limite Regionale */}
                                  <td className="p-4 text-center">
                                    <div className="text-base text-green-700 font-semibold">
                                      {regionalLimit > 0 ? regionalLimit : '-'}
                                    </div>
                                  </td>
                                  
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      
                    </CardContent>
                  </Card>
                ))}
              </div>
              
            </TabsContent>
          );
        })}
      </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
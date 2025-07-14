// © 2025 Alessandro Favero - Tutti i diritti riservati
// Licenza: Uso riservato esclusivamente alle riserve attivate tramite contratto
// Vietata la riproduzione, distribuzione o modifica non autorizzata

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Target, Settings, Save } from "lucide-react";

interface GroupQuota {
  id: number;
  reserveId: string;
  hunterGroup: 'A' | 'B' | 'C' | 'D';
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

const GROUPS = ['A', 'B', 'C', 'D'] as const;
const SPECIES_CONFIG = {
  roe_deer: {
    name: 'Capriolo',
    categories: ['M0', 'F0', 'FA', 'M1', 'MA'],
    color: 'bg-amber-100 text-amber-800'
  },
  red_deer: {
    name: 'Cervo',
    categories: ['CL0', 'FF', 'MM', 'MCL1'],
    color: 'bg-red-100 text-red-800'
  }
};

export default function GroupQuotasManager({ reserveId, readonly = false }: GroupQuotasManagerProps) {
  const [activeGroup, setActiveGroup] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [quotaChanges, setQuotaChanges] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Carica le quote per gruppo
  const { data: groupQuotas = [], isLoading } = useQuery({
    queryKey: ['/api/group-quotas'],
    enabled: !!reserveId,
    staleTime: 30000
  });

  // Mutation per aggiornare le quote
  const updateQuotasMutation = useMutation({
    mutationFn: async (quotas: Array<{ hunterGroup: string; species: string; category: string; totalQuota: number }>) => {
      return await apiRequest('/api/group-quotas', {
        method: 'POST',
        body: JSON.stringify({ quotas, reserveId })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/group-quotas'] });
      setQuotaChanges({});
      toast({
        title: "Quote aggiornate",
        description: "Le quote per gruppo sono state aggiornate con successo."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nell'aggiornamento delle quote",
        variant: "destructive"
      });
    }
  });

  // Filtra le quote per il gruppo attivo
  const activeGroupQuotas = groupQuotas.filter((quota: GroupQuota) => quota.hunterGroup === activeGroup);

  // Organizza le quote per specie e categoria
  const organizedQuotas = Object.entries(SPECIES_CONFIG).reduce((acc, [species, config]) => {
    acc[species] = config.categories.map(category => {
      const quota = activeGroupQuotas.find((q: GroupQuota) => 
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

  const handleQuotaChange = (species: string, category: string, value: string) => {
    const numValue = parseInt(value) || 0;
    const key = `${activeGroup}-${species}-${category}`;
    setQuotaChanges(prev => ({
      ...prev,
      [key]: numValue
    }));
  };

  const saveChanges = () => {
    const quotasToUpdate = Object.entries(quotaChanges).map(([key, totalQuota]) => {
      const [hunterGroup, species, category] = key.split('-');
      return { hunterGroup, species, category, totalQuota };
    });

    if (quotasToUpdate.length > 0) {
      updateQuotasMutation.mutate(quotasToUpdate);
    }
  };

  const hasChanges = Object.keys(quotaChanges).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Gestione Quote per Gruppo</h2>
        </div>
        {!readonly && hasChanges && (
          <Button 
            onClick={saveChanges}
            disabled={updateQuotasMutation.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Salva Modifiche
          </Button>
        )}
      </div>

      <Tabs value={activeGroup} onValueChange={(value) => setActiveGroup(value as 'A' | 'B' | 'C' | 'D')}>
        <TabsList className="grid w-full grid-cols-4">
          {GROUPS.map(group => (
            <TabsTrigger key={group} value={group} className="gap-2">
              <Users className="h-4 w-4" />
              Gruppo {group}
            </TabsTrigger>
          ))}
        </TabsList>

        {GROUPS.map(group => (
          <TabsContent key={group} value={group} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(SPECIES_CONFIG).map(([species, config]) => (
                <Card key={species}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        {config.name}
                      </div>
                      <Badge className={config.color}>
                        {organizedQuotas[species]?.reduce((sum, cat) => sum + cat.available, 0) || 0} disponibili
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {config.categories.map(category => {
                      const categoryData = organizedQuotas[species]?.find(c => c.category === category);
                      const currentQuota = categoryData?.quota || 0;
                      const harvested = categoryData?.harvested || 0;
                      const available = categoryData?.available || 0;
                      const changeKey = `${group}-${species}-${category}`;
                      const pendingChange = quotaChanges[changeKey];
                      const displayQuota = pendingChange !== undefined ? pendingChange : currentQuota;

                      return (
                        <div key={category} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-3">
                            <Badge variant="outline">{category}</Badge>
                          </div>
                          
                          {readonly ? (
                            <div className="col-span-3 text-center font-medium">
                              {currentQuota}
                            </div>
                          ) : (
                            <div className="col-span-3">
                              <Input
                                type="number"
                                min="0"
                                max="99"
                                value={displayQuota}
                                onChange={(e) => handleQuotaChange(species, category, e.target.value)}
                                className={`text-center ${pendingChange !== undefined ? 'border-blue-500 bg-blue-50' : ''}`}
                                disabled={updateQuotasMutation.isPending}
                              />
                            </div>
                          )}
                          
                          <div className="col-span-2 text-center text-sm text-gray-600">
                            -{harvested}
                          </div>
                          
                          <div className="col-span-1 text-center">=</div>
                          
                          <div className="col-span-3">
                            <Badge 
                              variant={available > 0 ? "default" : "destructive"}
                              className="w-full justify-center"
                            >
                              {(pendingChange !== undefined ? pendingChange : currentQuota) - harvested}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                    
                    <Separator />
                    
                    <div className="text-xs text-gray-500 space-y-1">
                      <div className="grid grid-cols-12 gap-2 font-medium">
                        <div className="col-span-3">Categoria</div>
                        <div className="col-span-3 text-center">Quota</div>
                        <div className="col-span-2 text-center">Prelevati</div>
                        <div className="col-span-1"></div>
                        <div className="col-span-3 text-center">Disponibili</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {!readonly && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-blue-800">
                    <Settings className="h-4 w-4" />
                    <span>
                      Le quote assegnate al <strong>Gruppo {group}</strong> sono indipendenti dagli altri gruppi. 
                      Le zone rimangono globali e accessibili a tutti i cacciatori.
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Clock, Target, Calendar, Settings, Save, RefreshCw } from "lucide-react";

interface LimitationConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'zone' | 'harvest' | 'temporal';
  enabled: boolean;
  settings: Record<string, any>;
}

const defaultLimitations: LimitationConfig[] = [
  {
    id: 'zone_cooldown',
    name: 'Cooldown Zone',
    description: 'Tempo di attesa prima di riprenotare la stessa zona',
    icon: Clock,
    category: 'zone',
    enabled: false,
    settings: {
      hours: 24,
      timeLimit: '20:00'
    }
  },
  {
    id: 'harvest_limit_season',
    name: 'Limite Stagionale',
    description: 'Massimo capi prelevabili per stagione',
    icon: Target,
    category: 'harvest',
    enabled: false,
    settings: {
      species: 'roe_deer',
      maxPerSeason: 3
    }
  },
  {
    id: 'harvest_limit_month',
    name: 'Limite Mensile',
    description: 'Massimo capi prelevabili per mese',
    icon: Target,
    category: 'harvest',
    enabled: false,
    settings: {
      species: 'roe_deer',
      maxPerMonth: 2
    }
  },
  {
    id: 'harvest_limit_week',
    name: 'Limite Settimanale',
    description: 'Massimo capi prelevabili per settimana',
    icon: Target,
    category: 'harvest',
    enabled: false,
    settings: {
      species: 'roe_deer',
      maxPerWeek: 1
    }
  },
  {
    id: 'seasonal_restriction',
    name: 'Restrizione Stagionale',
    description: 'Limitazioni in periodi specifici',
    icon: Calendar,
    category: 'temporal',
    enabled: false,
    settings: {
      startDate: '15/09',
      endDate: '31/12',
      bonusAllowed: 1
    }
  }
];

export function AdminLimitationsConfig() {
  const [limitations, setLimitations] = useState<LimitationConfig[]>(defaultLimitations);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query per ottenere regole esistenti
  const { data: existingRules = [] } = useQuery({
    queryKey: ['/api/admin/rules'],
  });

  // Mutation per salvare configurazione
  const saveLimitationsMutation = useMutation({
    mutationFn: async (config: LimitationConfig[]) => {
      const enabledLimitations = config.filter(l => l.enabled);
      
      const promises = enabledLimitations.map(limitation => {
        const ruleData: any = {
          ruleName: limitation.name,
          ruleType: limitation.category === 'zone' ? 'zone_cooldown' : 'harvest_limit',
          isActive: true,
          description: limitation.description
        };

        // Aggiungi impostazioni specifiche
        if (limitation.id === 'zone_cooldown') {
          ruleData.zoneCooldownHours = limitation.settings.hours;
          ruleData.zoneCooldownTime = limitation.settings.timeLimit;
        } else if (limitation.category === 'harvest') {
          ruleData.targetSpecies = limitation.settings.species;
          if (limitation.id.includes('season')) {
            ruleData.maxHarvestPerSeason = limitation.settings.maxPerSeason;
          } else if (limitation.id.includes('month')) {
            ruleData.maxHarvestPerMonth = limitation.settings.maxPerMonth;
          } else if (limitation.id.includes('week')) {
            ruleData.maxHarvestPerWeek = limitation.settings.maxPerWeek;
          }
        } else if (limitation.category === 'temporal') {
          ruleData.seasonalStartDate = limitation.settings.startDate;
          ruleData.seasonalEndDate = limitation.settings.endDate;
          ruleData.bonusHarvestAllowed = limitation.settings.bonusAllowed;
        }

        return apiRequest('/api/admin/rules', { method: 'POST', body: ruleData });
      });

      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/rules'] });
      toast({ title: "Configurazione salvata", description: "Le limitazioni sono state applicate con successo" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Errore nel salvataggio", 
        description: error.message || "Errore durante il salvataggio della configurazione",
        variant: "destructive" 
      });
    },
  });

  const updateLimitation = (id: string, updates: Partial<LimitationConfig>) => {
    setLimitations(prev => prev.map(l => 
      l.id === id ? { ...l, ...updates } : l
    ));
  };

  const updateLimitationSettings = (id: string, settingKey: string, value: any) => {
    setLimitations(prev => prev.map(l => 
      l.id === id ? { 
        ...l, 
        settings: { ...l.settings, [settingKey]: value }
      } : l
    ));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'zone': return '🏞️';
      case 'harvest': return '🎯';
      case 'temporal': return '📅';
      default: return '⚙️';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'zone': return 'bg-blue-100 text-blue-800';
      case 'harvest': return 'bg-green-100 text-green-800';
      case 'temporal': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSpeciesOptions = () => [
    { value: 'roe_deer', label: 'Capriolo' },
    { value: 'red_deer', label: 'Cervo' },
    { value: 'fallow_deer', label: 'Daino' },
    { value: 'mouflon', label: 'Muflone' },
    { value: 'chamois', label: 'Camoscio' }
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Configurazione Limitazioni</h2>
          <p className="text-sm sm:text-base text-gray-600">
            Attiva e configura le limitazioni per i cacciatori della riserva
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => saveLimitationsMutation.mutate(limitations)}
            disabled={saveLimitationsMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {saveLimitationsMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salva Configurazione
          </Button>
        </div>
      </div>

      {/* Regole Esistenti */}
      {existingRules.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Regole Attive</CardTitle>
            <CardDescription>
              Limitazioni attualmente configurate per la riserva
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {existingRules.map((rule: any) => (
                <div key={rule.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Settings className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">{rule.ruleName}</p>
                      <p className="text-sm text-gray-600">{rule.description}</p>
                    </div>
                  </div>
                  <Badge variant={rule.isActive ? "default" : "secondary"}>
                    {rule.isActive ? "Attiva" : "Inattiva"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configurazione Nuove Limitazioni */}
      <div className="grid gap-6">
        {limitations.map((limitation) => {
          const IconComponent = limitation.icon;
          
          return (
            <Card key={limitation.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-100">
                      <IconComponent className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{limitation.name}</CardTitle>
                      <CardDescription>{limitation.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getCategoryColor(limitation.category)}>
                      {getCategoryIcon(limitation.category)} {limitation.category.toUpperCase()}
                    </Badge>
                    <Switch
                      checked={limitation.enabled}
                      onCheckedChange={(checked) => 
                        updateLimitation(limitation.id, { enabled: checked })
                      }
                    />
                  </div>
                </div>
              </CardHeader>

              {limitation.enabled && (
                <CardContent className="pt-0">
                  <Separator className="mb-4" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    
                    {/* Configurazioni Zone Cooldown */}
                    {limitation.id === 'zone_cooldown' && (
                      <>
                        <div>
                          <Label htmlFor={`${limitation.id}_hours`}>Ore di Attesa</Label>
                          <Input
                            id={`${limitation.id}_hours`}
                            type="number"
                            min="1"
                            max="168"
                            value={limitation.settings.hours}
                            onChange={(e) => updateLimitationSettings(
                              limitation.id, 'hours', parseInt(e.target.value) || 1
                            )}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`${limitation.id}_time`}>Orario Limite</Label>
                          <Input
                            id={`${limitation.id}_time`}
                            type="time"
                            value={limitation.settings.timeLimit}
                            onChange={(e) => updateLimitationSettings(
                              limitation.id, 'timeLimit', e.target.value
                            )}
                            className="mt-1"
                          />
                        </div>
                      </>
                    )}

                    {/* Configurazioni Harvest Limits */}
                    {limitation.category === 'harvest' && (
                      <>
                        <div>
                          <Label htmlFor={`${limitation.id}_species`}>Specie</Label>
                          <Select
                            value={limitation.settings.species}
                            onValueChange={(value) => updateLimitationSettings(
                              limitation.id, 'species', value
                            )}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Seleziona specie" />
                            </SelectTrigger>
                            <SelectContent>
                              {getSpeciesOptions().map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor={`${limitation.id}_max`}>
                            {limitation.id.includes('season') && 'Massimo per Stagione'}
                            {limitation.id.includes('month') && 'Massimo per Mese'}
                            {limitation.id.includes('week') && 'Massimo per Settimana'}
                          </Label>
                          <Input
                            id={`${limitation.id}_max`}
                            type="number"
                            min="1"
                            max="50"
                            value={
                              limitation.id.includes('season') ? limitation.settings.maxPerSeason :
                              limitation.id.includes('month') ? limitation.settings.maxPerMonth :
                              limitation.settings.maxPerWeek
                            }
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 1;
                              const key = limitation.id.includes('season') ? 'maxPerSeason' :
                                         limitation.id.includes('month') ? 'maxPerMonth' : 'maxPerWeek';
                              updateLimitationSettings(limitation.id, key, value);
                            }}
                            className="mt-1"
                          />
                        </div>
                      </>
                    )}

                    {/* Configurazioni Temporal */}
                    {limitation.category === 'temporal' && (
                      <>
                        <div>
                          <Label htmlFor={`${limitation.id}_start`}>Data Inizio (GG/MM)</Label>
                          <Input
                            id={`${limitation.id}_start`}
                            placeholder="15/09"
                            value={limitation.settings.startDate}
                            onChange={(e) => updateLimitationSettings(
                              limitation.id, 'startDate', e.target.value
                            )}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`${limitation.id}_end`}>Data Fine (GG/MM)</Label>
                          <Input
                            id={`${limitation.id}_end`}
                            placeholder="31/12"
                            value={limitation.settings.endDate}
                            onChange={(e) => updateLimitationSettings(
                              limitation.id, 'endDate', e.target.value
                            )}
                            className="mt-1"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label htmlFor={`${limitation.id}_bonus`}>Capi Bonus Consentiti</Label>
                          <Input
                            id={`${limitation.id}_bonus`}
                            type="number"
                            min="0"
                            max="10"
                            value={limitation.settings.bonusAllowed}
                            onChange={(e) => updateLimitationSettings(
                              limitation.id, 'bonusAllowed', parseInt(e.target.value) || 0
                            )}
                            className="mt-1"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
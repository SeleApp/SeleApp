import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Clock, Calendar, Target, Users, CheckCircle, XCircle, Settings } from "lucide-react";

interface SimpleLimitation {
  id: string;
  title: string;
  description: string;
  icon: any;
  enabled: boolean;
  value: number;
  unit: string;
  category: 'prenotazioni' | 'zone' | 'cacciatori' | 'capi';
  metadata?: {
    timeLimit?: number;
    speciesConfig?: {
      [species: string]: {
        enabled: boolean;
        limits: { 
          seasonal_max?: number;
          description?: string;
          categories?: string[];
          [key: string]: any;
        };
      };
    };
  };
}

const defaultLimitations: SimpleLimitation[] = [
  {
    id: 'max_reservations_per_week',
    title: 'Prenotazioni per Settimana',
    description: 'Massimo numero di prenotazioni che un cacciatore può fare in una settimana',
    icon: Calendar,
    enabled: false,
    value: 2,
    unit: 'prenotazioni',
    category: 'prenotazioni'
  },
  {
    id: 'zone_cooldown_hours',
    title: 'Attesa Riprenotazione Zona',
    description: 'Ore di attesa prima di poter prenotare di nuovo la stessa zona',
    icon: Clock,
    enabled: false,
    value: 24,
    unit: 'ore',
    category: 'zone'
  },
  {
    id: 'max_hunters_per_zone',
    title: 'Cacciatori per Zona',
    description: 'Massimo numero di cacciatori che possono prenotare la stessa zona nello stesso giorno',
    icon: Users,
    enabled: true,
    value: 1,
    unit: 'cacciatori',
    category: 'cacciatori'
  },
  {
    id: 'booking_time_limit',
    title: 'Limitazione Oraria',
    description: 'Orario limite entro cui i cacciatori possono effettuare prenotazioni (formato 24h, es: 18 = ore 18:00)',
    icon: Clock,
    enabled: false,
    value: 18,
    unit: 'ore',
    category: 'prenotazioni'
  },
  {
    id: 'seasonal_species_limits',
    title: 'Limiti Stagionali per Specie',
    description: 'Massimo numero di capi per specie che un cacciatore può abbattere in una stagione completa',
    icon: Target,
    enabled: false,
    value: 3,
    unit: 'capi totali',
    category: 'capi'
  },
  {
    id: 'daily_reservations_limit',
    title: 'Prenotazioni Giornaliere',
    description: 'Massimo numero di prenotazioni che un cacciatore può fare nello stesso giorno',
    icon: Calendar,
    enabled: false,
    value: 1,
    unit: 'prenotazioni',
    category: 'prenotazioni'
  },
  {
    id: 'season_harvest_limit',
    title: 'Capi per Stagione',
    description: 'Massimo numero di capi che un cacciatore può abbattere in una stagione',
    icon: Target,
    enabled: false,
    value: 10,
    unit: 'capi',
    category: 'capi'
  }
];

export function SimpleLimitationsManager() {
  const [limitations, setLimitations] = useState<SimpleLimitation[]>(defaultLimitations);
  const [selectedCategory, setSelectedCategory] = useState<string>('tutte');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Carica le limitazioni esistenti
  const { data: existingLimitations, isLoading } = useQuery({
    queryKey: ["/api/admin/limitations"],
    onSuccess: (data: any) => {
      if (data?.data?.limitations) {
        setLimitations(data.data.limitations);
      }
    }
  });

  const saveLimitationsMutation = useMutation({
    mutationFn: async (limitationsData: SimpleLimitation[]) => {
      const response = await apiRequest("/api/admin/limitations", {
        method: "POST",
        body: JSON.stringify({ limitations: limitationsData }),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Limitazioni salvate",
        description: "Le impostazioni sono state applicate con successo",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message || "Errore nel salvataggio delle limitazioni",
      });
    },
  });

  const toggleLimitation = (id: string) => {
    setLimitations(prev => 
      prev.map(limit => 
        limit.id === id ? { ...limit, enabled: !limit.enabled } : limit
      )
    );
  };

  // Funzione per aggiornare i limiti per specie
  const updateSpeciesLimit = (species: 'roe_deer' | 'red_deer', newLimit: number) => {
    setLimitations(prev => 
      prev.map(limit => {
        if (limit.id === 'seasonal_species_limits') {
          const updatedMetadata = {
            ...limit.metadata,
            speciesConfig: {
              ...limit.metadata?.speciesConfig,
              [species]: {
                ...limit.metadata?.speciesConfig?.[species],
                limits: {
                  ...limit.metadata?.speciesConfig?.[species]?.limits,
                  seasonal_max: newLimit
                }
              }
            }
          };
          return { ...limit, metadata: updatedMetadata, value: newLimit };
        }
        return limit;
      })
    );
    
    // Auto-salva le modifiche
    setTimeout(() => {
      saveLimitationsMutation.mutate(limitations);
    }, 500);
  };

  const updateLimitationValue = (id: string, value: number) => {
    setLimitations(prev => 
      prev.map(limit => 
        limit.id === id ? { ...limit, value } : limit
      )
    );
  };

  const saveLimitations = () => {
    saveLimitationsMutation.mutate(limitations);
  };

  const filteredLimitations = selectedCategory === 'tutte' 
    ? limitations 
    : limitations.filter(limit => limit.category === selectedCategory);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'prenotazioni': return 'text-blue-600 bg-blue-50';
      case 'zone': return 'text-green-600 bg-green-50';
      case 'cacciatori': return 'text-purple-600 bg-purple-50';
      case 'capi': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento limitazioni...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">🎯 Gestione Limitazioni Semplice</h2>
        <p className="text-gray-600 text-xl sm:text-2xl">
          Configura facilmente le regole per la tua riserva
        </p>
      </div>
      {/* Category Filter */}
      <Card>
        <CardHeader className="pb-6">
          <CardTitle className="text-xl sm:text-2xl flex items-center gap-3">
            <Settings className="h-6 w-6 sm:h-7 sm:w-7" />
            Filtra per Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Button
              variant={selectedCategory === 'tutte' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('tutte')}
              className="h-16 sm:h-20 text-lg sm:text-xl font-semibold"
            >
              Tutte
            </Button>
            <Button
              variant={selectedCategory === 'prenotazioni' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('prenotazioni')}
              className="h-16 sm:h-20 text-lg sm:text-xl font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700"
            >
              Prenotazioni
            </Button>
            <Button
              variant={selectedCategory === 'zone' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('zone')}
              className="h-16 sm:h-20 text-lg sm:text-xl font-semibold bg-green-50 hover:bg-green-100 text-green-700"
            >
              Zone
            </Button>
            <Button
              variant={selectedCategory === 'cacciatori' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('cacciatori')}
              className="h-16 sm:h-20 text-lg sm:text-xl font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700"
            >
              Cacciatori
            </Button>
            <Button
              variant={selectedCategory === 'capi' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('capi')}
              className="h-16 sm:h-20 text-lg sm:text-xl font-semibold bg-orange-50 hover:bg-orange-100 text-orange-700"
            >
              Capi
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Limitations List */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredLimitations.map((limitation) => {
          const Icon = limitation.icon;
          return (
            <Card key={limitation.id} className="relative border-2">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${getCategoryColor(limitation.category)}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg sm:text-xl">{limitation.title}</CardTitle>
                      <Badge variant="outline" className="mt-2 text-sm">
                        {limitation.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Switch
                      checked={limitation.enabled}
                      onCheckedChange={() => toggleLimitation(limitation.id)}
                      className="scale-125"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-base sm:text-lg mb-6">
                  {limitation.description}
                </CardDescription>
                
                {limitation.enabled && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    {limitation.id === 'booking_time_limit' ? (
                      <div className="space-y-3">
                        <Label className="text-base sm:text-lg font-medium text-amber-700">Orario Limite Prenotazioni</Label>
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            min="0"
                            max="23"
                            value={limitation.value}
                            onChange={(e) => updateLimitationValue(limitation.id, parseInt(e.target.value) || 18)}
                            className="w-24 h-12 text-center font-semibold text-lg"
                            placeholder="18"
                          />
                          <span className="text-base sm:text-lg text-amber-700 font-medium">:00</span>
                        </div>
                        <div className="p-3 bg-amber-100 rounded-lg border border-amber-300">
                          <p className="text-sm text-amber-800">
                            <strong>Effetto:</strong> I cacciatori potranno prenotare solo entro le ore {limitation.value}:00. 
                            Dopo questo orario le prenotazioni saranno bloccate.
                          </p>
                        </div>
                      </div>
                    ) : limitation.id === 'seasonal_species_limits' ? (
                      <div className="space-y-4">
                        <Label className="text-base sm:text-lg font-medium text-red-700">Limiti Stagionali Personalizzabili</Label>
                        
                        <div className="grid grid-cols-1 gap-4">
                          <div className="p-4 border-2 border-green-300 rounded-lg bg-green-50">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="font-bold text-green-800 text-lg">🦌 Capriolo</h4>
                                <p className="text-sm text-green-600">Capreolus capreolus</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-green-700">MAX</span>
                                <Input
                                  type="number"
                                  min="0"
                                  max="10"
                                  value={limitation.metadata?.speciesConfig?.roe_deer?.limits?.seasonal_max || 2}
                                  onChange={(e) => {
                                    const newValue = parseInt(e.target.value) || 0;
                                    updateSpeciesLimit('roe_deer', newValue);
                                  }}
                                  className="w-16 h-10 text-center text-lg font-bold text-green-700 border-green-300"
                                />
                                <span className="text-sm text-green-700">per stagione</span>
                              </div>
                            </div>
                            <div className="text-sm text-green-700">
                              <strong>Categorie incluse:</strong> M0, F0, FA, M1, MA
                            </div>
                          </div>
                          
                          <div className="p-4 border-2 border-red-300 rounded-lg bg-red-50">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="font-bold text-red-800 text-lg">🦌 Cervo</h4>
                                <p className="text-sm text-red-600">Cervus elaphus</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-red-700">MAX</span>
                                <Input
                                  type="number"
                                  min="0"
                                  max="5"
                                  value={limitation.metadata?.speciesConfig?.red_deer?.limits?.seasonal_max || 1}
                                  onChange={(e) => {
                                    const newValue = parseInt(e.target.value) || 0;
                                    updateSpeciesLimit('red_deer', newValue);
                                  }}
                                  className="w-16 h-10 text-center text-lg font-bold text-red-700 border-red-300"
                                />
                                <span className="text-sm text-red-700">per stagione</span>
                              </div>
                            </div>
                            <div className="text-sm text-red-700">
                              <strong>Categorie incluse:</strong> CL0, FF, MM, MCL1
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-4 bg-orange-100 rounded-lg border border-orange-300">
                          <h5 className="font-bold text-orange-800 mb-2">⚠️ Controllo Automatico</h5>
                          <ul className="text-sm text-orange-800 space-y-1">
                            <li>• Il sistema blocca automaticamente le prenotazioni quando il limite è raggiunto</li>
                            <li>• Il conteggio viene resettato all'inizio di ogni nuova stagione</li>
                            <li>• Controllo in tempo reale sui report di abbattimento</li>
                            <li>• <strong>Modifica i valori sopra</strong> per personalizzare i limiti per specie</li>
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Label className="text-base sm:text-lg font-medium">Valore Limite</Label>
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            min="1"
                            value={limitation.value}
                            onChange={(e) => updateLimitationValue(limitation.id, parseInt(e.target.value) || 1)}
                            className="w-24 h-12 text-center font-semibold text-lg"
                          />
                          <span className="text-base sm:text-lg text-gray-600 font-medium">
                            {limitation.unit}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 flex items-center gap-3">
                  {limitation.enabled ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-base sm:text-lg text-green-600 font-medium">Attiva</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-gray-400" />
                      <span className="text-base sm:text-lg text-gray-400 font-medium">Disattivata</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {/* Summary and Save */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="text-lg font-semibold text-blue-900">
              Riepilogo Limitazioni Attive
            </div>
            <div className="flex justify-center gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {limitations.filter(l => l.enabled).length}
                </div>
                <div className="text-blue-800">Attive</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {limitations.filter(l => !l.enabled).length}
                </div>
                <div className="text-gray-800">Disattive</div>
              </div>
            </div>
            <Button
              onClick={saveLimitations}
              disabled={saveLimitationsMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 text-xl sm:text-2xl font-bold h-16 sm:h-20"
            >
              {saveLimitationsMutation.isPending ? "Salvando..." : "💾 Salva Impostazioni"}
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Help Section */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-green-800">
              💡 Come Funziona
            </h3>
            <div className="text-sm text-green-700 space-y-1">
              <p>• <strong>Accendi/Spegni</strong>: Usa l'interruttore per attivare una limitazione</p>
              <p>• <strong>Imposta il Numero</strong>: Scrivi il valore limite nel campo numero</p>
              <p>• <strong>Salva</strong>: Clicca "Salva Impostazioni" per applicare le modifiche</p>
              <p>• <strong>Categorie</strong>: Filtra per tipo di limitazione usando i pulsanti colorati</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
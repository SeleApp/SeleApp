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
    id: 'monthly_harvest_limit',
    title: 'Capi per Mese',
    description: 'Massimo numero di capi che un cacciatore può abbattere in un mese',
    icon: Target,
    enabled: false,
    value: 3,
    unit: 'capi',
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2"> Gestione Limitazioni Semplice</h2>
        <p className="text-gray-600 text-lg">
          Configura facilmente le regole per la tua riserva
        </p>
      </div>
      {/* Category Filter */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Filtra per Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Button
              variant={selectedCategory === 'tutte' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('tutte')}
              className="h-12 text-sm"
            >
              Tutte
            </Button>
            <Button
              variant={selectedCategory === 'prenotazioni' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('prenotazioni')}
              className="h-12 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700"
            >
              Prenotazioni
            </Button>
            <Button
              variant={selectedCategory === 'zone' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('zone')}
              className="h-12 text-sm bg-green-50 hover:bg-green-100 text-green-700"
            >
              Zone
            </Button>
            <Button
              variant={selectedCategory === 'cacciatori' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('cacciatori')}
              className="h-12 text-sm bg-purple-50 hover:bg-purple-100 text-purple-700"
            >
              Cacciatori
            </Button>
            <Button
              variant={selectedCategory === 'capi' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('capi')}
              className="h-12 text-sm bg-orange-50 hover:bg-orange-100 text-orange-700"
            >
              Capi
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Limitations List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredLimitations.map((limitation) => {
          const Icon = limitation.icon;
          return (
            <Card key={limitation.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getCategoryColor(limitation.category)}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{limitation.title}</CardTitle>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {limitation.category}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={limitation.enabled}
                    onCheckedChange={() => toggleLimitation(limitation.id)}
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm mb-4">
                  {limitation.description}
                </CardDescription>
                
                {limitation.enabled && (
                  <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                    <Label className="text-sm font-medium">Valore Limite</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={limitation.value}
                        onChange={(e) => updateLimitationValue(limitation.id, parseInt(e.target.value) || 1)}
                        className="w-20 text-center font-semibold"
                      />
                      <span className="text-sm text-gray-600 font-medium">
                        {limitation.unit}
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2">
                  {limitation.enabled ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600 font-medium">Attiva</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-400 font-medium">Disattivata</span>
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
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 text-lg"
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
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Activity, MapPin, Calendar, Download, Target } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface WildlifeManagementReportsProps {
  reserves: Array<{
    id: string;
    name: string;
    comune: string;
    species?: string;
    managementType?: string;
    isActive?: boolean;
  }>;
}

// Dati biologici per il calcolo della densità
const BIOLOGICAL_CONSTANTS = {
  roe_deer: {
    optimalDensity: { min: 3, max: 8 }, // capi per 100 ettari
    reproductiveRate: 1.3, // tasso riproduttivo annuale
    sexRatioTarget: { males: 45, females: 55 }, // percentuale target
    ageClassTarget: { young: 30, adult: 70 } // percentuale target
  },
  red_deer: {
    optimalDensity: { min: 1, max: 4 }, // capi per 100 ettari
    reproductiveRate: 0.8,
    sexRatioTarget: { males: 40, females: 60 },
    ageClassTarget: { young: 25, adult: 75 }
  },
  chamois: {
    optimalDensity: { min: 2, max: 6 },
    reproductiveRate: 0.7,
    sexRatioTarget: { males: 45, females: 55 },
    ageClassTarget: { young: 20, adult: 80 }
  },
  mouflon: {
    optimalDensity: { min: 1, max: 3 },
    reproductiveRate: 1.1,
    sexRatioTarget: { males: 50, females: 50 },
    ageClassTarget: { young: 35, adult: 65 }
  }
};

export default function WildlifeManagementReports({ reserves }: WildlifeManagementReportsProps) {
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedSpecies, setSelectedSpecies] = useState("all");
  const [selectedProvince, setSelectedProvince] = useState("TV"); // Provincia di Treviso

  // Query per ottenere i dati di abbattimento
  const { data: harvestData = [], isLoading: harvestLoading } = useQuery({
    queryKey: ['/api/superadmin/harvest-reports', selectedYear, selectedSpecies],
    queryFn: async () => {
      const response = await apiRequest('/api/superadmin/harvest-reports', {
        method: 'GET'
      });
      return Array.isArray(response) ? response : [];
    }
  });

  // Query per ottenere le quote regionali
  const { data: quotaData = [], isLoading: quotaLoading } = useQuery({
    queryKey: ['/api/superadmin/regional-quotas'],
    queryFn: async () => {
      const response = await apiRequest('/api/superadmin/regional-quotas', {
        method: 'GET'
      });
      return Array.isArray(response) ? response : [];
    }
  });

  const isLoading = harvestLoading || quotaLoading;

  // Calcola statistiche biologiche per specie
  const calculateSpeciesStats = (species: string) => {
    const speciesQuotas = quotaData.filter((q: any) => q.species === species);
    const speciesHarvests = harvestData.filter((h: any) => h.species === species);
    
    const totalQuota = speciesQuotas.reduce((sum: number, q: any) => sum + (q.totalQuota || 0), 0);
    const totalHarvested = speciesQuotas.reduce((sum: number, q: any) => sum + (q.harvested || 0), 0);
    const harvestRate = totalQuota > 0 ? (totalHarvested / totalQuota * 100) : 0;

    // Calcola sex ratio dai dati di abbattimento
    const maleHarvests = speciesHarvests.filter((h: any) => h.sex === 'male').length;
    const femaleHarvests = speciesHarvests.filter((h: any) => h.sex === 'female').length;
    const totalSexed = maleHarvests + femaleHarvests;
    
    const sexRatio = totalSexed > 0 ? {
      males: Math.round(maleHarvests / totalSexed * 100),
      females: Math.round(femaleHarvests / totalSexed * 100)
    } : { males: 0, females: 0 };

    // Calcola age class distribution
    const youngHarvests = speciesHarvests.filter((h: any) => h.ageClass === 'young' || h.ageClass === '0').length;
    const adultHarvests = speciesHarvests.filter((h: any) => h.ageClass === 'adult' || h.ageClass !== 'young').length;
    const totalAged = youngHarvests + adultHarvests;
    
    const ageDistribution = totalAged > 0 ? {
      young: Math.round(youngHarvests / totalAged * 100),
      adult: Math.round(adultHarvests / totalAged * 100)
    } : { young: 0, adult: 0 };

    return {
      totalQuota,
      totalHarvested,
      harvestRate,
      sexRatio,
      ageDistribution,
      reserveCount: new Set(speciesQuotas.map((q: any) => q.reserveId)).size
    };
  };

  // Filtra riserve attive della provincia di Treviso
  const trevisoReserves = reserves.filter(r => 
    r.id.includes('ca-tv') && r.isActive !== false
  );

  const speciesOptions = [
    { value: 'all', label: 'Tutte le Specie' },
    { value: 'roe_deer', label: 'Capriolo (Capreolus capreolus)' },
    { value: 'red_deer', label: 'Cervo (Cervus elaphus)' },
    { value: 'chamois', label: 'Camoscio (Rupicapra rupicapra)' },
    { value: 'mouflon', label: 'Muflone (Ovis musimon)' }
  ];

  return (
    <div className="space-y-6">
      {/* Header con filtri */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-green-600" />
            Report Gestione Faunistica - Provincia di Treviso
          </CardTitle>
          <p className="text-sm text-gray-600">
            Analisi biologiche e densità popolazioni per la gestione faunistica scientifica
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Anno di Riferimento</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025-2026</SelectItem>
                  <SelectItem value="2024">2024-2025</SelectItem>
                  <SelectItem value="2023">2023-2024</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Specie Target</label>
              <Select value={selectedSpecies} onValueChange={setSelectedSpecies}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {speciesOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Azioni</label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  Esporta PDF
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="density">Densità</TabsTrigger>
          <TabsTrigger value="sexratio">Sex Ratio</TabsTrigger>
          <TabsTrigger value="harvest">Prelievi</TabsTrigger>
          <TabsTrigger value="reserves">Per Riserva</TabsTrigger>
        </TabsList>

        {/* Tab Panoramica */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {['roe_deer', 'red_deer', 'chamois', 'mouflon'].map(species => {
              const stats = calculateSpeciesStats(species);
              const speciesName = {
                roe_deer: 'Capriolo',
                red_deer: 'Cervo',
                chamois: 'Camoscio', 
                mouflon: 'Muflone'
              }[species];

              return (
                <Card key={species}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{speciesName}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Quote Totali:</span>
                        <span className="font-medium">{stats.totalQuota}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Abbattuti:</span>
                        <span className="font-medium">{stats.totalHarvested}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tasso Prelievo:</span>
                        <Badge variant={stats.harvestRate > 80 ? "destructive" : stats.harvestRate > 60 ? "default" : "secondary"}>
                          {stats.harvestRate.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Riserve Attive:</span>
                        <span className="font-medium">{stats.reserveCount}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Sex Ratio: {stats.sexRatio.males}M / {stats.sexRatio.females}F
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab Densità */}
        <TabsContent value="density">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Analisi Densità Popolazioni per CA TV (capi/100 ettari)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Specie</TableHead>
                      <TableHead>Densità Stimata</TableHead>
                      <TableHead>Range Ottimale</TableHead>
                      <TableHead>Status Biologico</TableHead>
                      <TableHead>Raccomandazioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(BIOLOGICAL_CONSTANTS).map(([species, constants]) => {
                      const stats = calculateSpeciesStats(species);
                      const estimatedDensity = Math.round(stats.totalHarvested * 3.5); // Stima basata su modelli biologici
                      const isInRange = estimatedDensity >= constants.optimalDensity.min && estimatedDensity <= constants.optimalDensity.max;
                      
                      const speciesName = {
                        roe_deer: 'Capriolo',
                        red_deer: 'Cervo',
                        chamois: 'Camoscio',
                        mouflon: 'Muflone'
                      }[species as keyof typeof BIOLOGICAL_CONSTANTS];

                      return (
                        <TableRow key={species}>
                          <TableCell className="font-medium">{speciesName}</TableCell>
                          <TableCell>{estimatedDensity}/100ha</TableCell>
                          <TableCell>{constants.optimalDensity.min}-{constants.optimalDensity.max}/100ha</TableCell>
                          <TableCell>
                            <Badge variant={isInRange ? "default" : estimatedDensity > constants.optimalDensity.max ? "destructive" : "secondary"}>
                              {isInRange ? "Ottimale" : estimatedDensity > constants.optimalDensity.max ? "Sovrappopolazione" : "Sottopopolazione"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {isInRange ? "Mantenere prelievo attuale" : 
                             estimatedDensity > constants.optimalDensity.max ? "Incrementare prelievo" : "Ridurre prelievo"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Sex Ratio */}
        <TabsContent value="sexratio">
          <Card>
            <CardHeader>
              <CardTitle>Analisi Sex Ratio e Struttura Popolazioni</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {['roe_deer', 'red_deer', 'chamois', 'mouflon'].map(species => {
                  const stats = calculateSpeciesStats(species);
                  const constants = BIOLOGICAL_CONSTANTS[species as keyof typeof BIOLOGICAL_CONSTANTS];
                  const speciesName = {
                    roe_deer: 'Capriolo',
                    red_deer: 'Cervo', 
                    chamois: 'Camoscio',
                    mouflon: 'Muflone'
                  }[species];

                  const sexRatioOptimal = Math.abs(stats.sexRatio.males - constants.sexRatioTarget.males) <= 10;
                  
                  return (
                    <Card key={species} className="p-4">
                      <h3 className="font-semibold mb-3">{speciesName}</h3>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Sex Ratio Attuale:</span>
                            <Badge variant={sexRatioOptimal ? "default" : "secondary"}>
                              {stats.sexRatio.males}M / {stats.sexRatio.females}F
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500">
                            Target: {constants.sexRatioTarget.males}M / {constants.sexRatioTarget.females}F
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Struttura Età:</span>
                            <span>{stats.ageDistribution.young}% giovani</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Target giovani: {constants.ageClassTarget.young}%
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Prelievi */}
        <TabsContent value="harvest">
          <Card>
            <CardHeader>
              <CardTitle>Distribuzione Prelievi per Comprensorio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Sistema di monitoraggio prelievi in sviluppo</p>
                <p className="text-sm">Dati disponibili dopo integrazione con report di abbattimento</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Per Riserva */}
        <TabsContent value="reserves">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Dettaglio per Comprensorio Alpino
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Comprensorio</TableHead>
                      <TableHead>Comune</TableHead>
                      <TableHead>Specie Gestite</TableHead>
                      <TableHead>Quote Totali</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trevisoReserves.slice(0, 10).map(reserve => {
                      const reserveQuotas = quotaData.filter((q: any) => q.reserveId === reserve.id);
                      const totalQuota = reserveQuotas.reduce((sum: number, q: any) => sum + (q.totalQuota || 0), 0);
                      const speciesCount = new Set(reserveQuotas.map((q: any) => q.species)).size;
                      
                      return (
                        <TableRow key={reserve.id}>
                          <TableCell className="font-medium">{reserve.name}</TableCell>
                          <TableCell>{reserve.comune}</TableCell>
                          <TableCell>{speciesCount} specie</TableCell>
                          <TableCell>{totalQuota}</TableCell>
                          <TableCell>
                            <Badge variant={reserve.isActive ? "default" : "secondary"}>
                              {reserve.isActive ? "Attivo" : "Inattivo"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, BarChart3, MapPin, Download, Filter, Search, Eye, Microscope, Camera } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from "recharts";

// Schema per form di nuova osservazione
const newObservationSchema = z.object({
  specie: z.enum(['capriolo', 'cervo', 'daino', 'muflone', 'camoscio']),
  sesso: z.enum(['M', 'F']),
  classeEta: z.enum(['J', 'Y', 'A']), // J=giovane, Y=yearling, A=adulto
  data: z.date(),
  zonaId: z.number().min(1),
  sezione: z.string().min(1),
  tipo: z.enum(['prelievo', 'avvistamento', 'fototrappola']),
  peso: z.number().optional(),
  statoRiproduttivo: z.enum(['gravida', 'no', 'n.d.']).default('n.d.'),
  statoCorpo: z.enum(['buono', 'medio', 'scarso']).default('medio'),
  lunghezzaMandibola: z.number().optional(),
  lunghezzaPalchi: z.number().optional(),
  gpsLat: z.number().optional(),
  gpsLon: z.number().optional(),
  note: z.string().optional()
});

type NewObservationData = z.infer<typeof newObservationSchema>;

const SPECIES_CONFIG = {
  capriolo: { name: 'Capriolo', color: '#8B4513', icon: '🦌' },
  cervo: { name: 'Cervo', color: '#A0522D', icon: '🦌' },
  daino: { name: 'Daino', color: '#D2691E', icon: '🦌' },
  muflone: { name: 'Muflone', color: '#654321', icon: '🐏' },
  camoscio: { name: 'Camoscio', color: '#2F4F4F', icon: '🐐' }
};

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

export default function DashboardFauna() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    specie: 'all',
    sesso: 'all',
    tipo: 'all',
    sezione: '',
    dataInizio: '',
    dataFine: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<NewObservationData>({
    resolver: zodResolver(newObservationSchema),
    defaultValues: {
      statoRiproduttivo: 'n.d.',
      statoCorpo: 'medio'
    }
  });

  // Query per ottenere le osservazioni faunistiche
  const { data: observations = [], isLoading: loadingObservations } = useQuery({
    queryKey: ['/api/fauna', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') params.append(key, value);
      });
      const response = await apiRequest(`/api/fauna?${params.toString()}`, { method: 'GET' });
      return await response.json();
    }
  });

  // Query per statistiche faunistiche
  const { data: statistics = {}, isLoading: loadingStats } = useQuery({
    queryKey: ['/api/fauna/statistiche'],
    queryFn: async () => {
      const response = await apiRequest('/api/fauna/statistiche', { method: 'GET' });
      return await response.json();
    }
  });

  // Query per quote piano di gestione
  const { data: quotePiano = [] } = useQuery({
    queryKey: ['/api/fauna/quote'],
    queryFn: async () => {
      const response = await apiRequest('/api/fauna/quote', { method: 'GET' });
      return await response.json();
    }
  });

  // Query per documenti di gestione
  const { data: documents = [] } = useQuery({
    queryKey: ['/api/fauna/documenti'],
    queryFn: async () => {
      const response = await apiRequest('/api/fauna/documenti', { method: 'GET' });
      return await response.json();
    }
  });

  // Mutation per creare nuova osservazione
  const createObservationMutation = useMutation({
    mutationFn: async (data: NewObservationData) => {
      const response = await apiRequest('/api/fauna', {
        method: 'POST',
        body: data
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fauna'] });
      queryClient.invalidateQueries({ queryKey: ['/api/fauna/statistiche'] });
      setShowCreateModal(false);
      form.reset();
      toast({
        title: "Successo",
        description: "Osservazione faunistica creata con successo"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nella creazione dell'osservazione",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (data: NewObservationData) => {
    console.log('Submitting new fauna observation:', data);
    createObservationMutation.mutate(data);
  };

  // Prepara dati per i grafici
  const sexRatioData = Object.entries((statistics as any)?.sexRatioPerSpecie || {}).map(([specie, ratio]: [string, any]) => ({
    specie: SPECIES_CONFIG[specie as keyof typeof SPECIES_CONFIG]?.name || specie,
    maschi: ratio?.M || 0,
    femmine: ratio?.F || 0
  }));

  const ageDistributionData = Object.entries((statistics as any)?.distribuzioneClassiEta || {}).map(([specie, distribution]: [string, any]) => ({
    specie: SPECIES_CONFIG[specie as keyof typeof SPECIES_CONFIG]?.name || specie,
    giovani: distribution?.J || 0,
    yearling: distribution?.Y || 0,
    adulti: distribution?.A || 0
  }));

  const densityData = Object.entries((statistics as any)?.densitaPerZona || {}).map(([zona, densita]: [string, any]) => ({
    zona,
    densita: Number(densita?.toFixed?.(2) || 0)
  }));

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-green-800">Gestione Faunistica</h1>
          <p className="text-green-600 mt-1">Sistema di monitoraggio biologico per biologi e provincia</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateModal(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Nuova Osservazione
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Esporta Excel
          </Button>
        </div>
      </div>

      {/* Filtri */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <Label>Specie</Label>
              <Select value={filters.specie} onValueChange={(value) => setFilters({...filters, specie: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Tutte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le specie</SelectItem>
                  {Object.entries(SPECIES_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sesso</Label>
              <Select value={filters.sesso} onValueChange={(value) => setFilters({...filters, sesso: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Tutti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="M">Maschio</SelectItem>
                  <SelectItem value="F">Femmina</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={filters.tipo} onValueChange={(value) => setFilters({...filters, tipo: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Tutti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  <SelectItem value="prelievo">Prelievo</SelectItem>
                  <SelectItem value="avvistamento">Avvistamento</SelectItem>
                  <SelectItem value="fototrappola">Fototrappola</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sezione</Label>
              <Input 
                placeholder="es: pederobba" 
                value={filters.sezione}
                onChange={(e) => setFilters({...filters, sezione: e.target.value})}
              />
            </div>
            <div>
              <Label>Data Inizio</Label>
              <Input 
                type="date" 
                value={filters.dataInizio}
                onChange={(e) => setFilters({...filters, dataInizio: e.target.value})}
              />
            </div>
            <div>
              <Label>Data Fine</Label>
              <Input 
                type="date" 
                value={filters.dataFine}
                onChange={(e) => setFilters({...filters, dataFine: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gestione Faunistica Professionale - 4 Sezioni */}
      <Tabs defaultValue="statistics" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistiche
          </TabsTrigger>
          <TabsTrigger value="observations" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Osservazioni
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Documenti
          </TabsTrigger>
          <TabsTrigger value="import-export" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Import/Export
          </TabsTrigger>
        </TabsList>

        {/* Tab Osservazioni */}
        <TabsContent value="observations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Elenco Osservazioni ({Array.isArray(observations) ? observations.length : 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Specie</TableHead>
                      <TableHead>Sesso</TableHead>
                      <TableHead>Età</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Zona</TableHead>
                      <TableHead>Sezione</TableHead>
                      <TableHead>Peso</TableHead>
                      <TableHead>Biologo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(observations) && observations.map((obs: any) => (
                      <TableRow key={obs.id}>
                        <TableCell>{format(new Date(obs.data), 'dd/MM/yyyy', { locale: it })}</TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: SPECIES_CONFIG[obs.specie as keyof typeof SPECIES_CONFIG]?.color }}>
                            {SPECIES_CONFIG[obs.specie as keyof typeof SPECIES_CONFIG]?.name || obs.specie}
                          </Badge>
                        </TableCell>
                        <TableCell>{obs.sesso}</TableCell>
                        <TableCell>{obs.classeEta}</TableCell>
                        <TableCell>
                          {obs.tipo === 'prelievo' && <Badge variant="destructive">Prelievo</Badge>}
                          {obs.tipo === 'avvistamento' && <Badge variant="secondary">Avvistamento</Badge>}
                          {obs.tipo === 'fototrappola' && <Badge variant="outline">Fototrappola</Badge>}
                        </TableCell>
                        <TableCell>Zona {obs.zonaId}</TableCell>
                        <TableCell>{obs.sezione}</TableCell>
                        <TableCell>{obs.peso ? `${obs.peso} kg` : '-'}</TableCell>
                        <TableCell>{obs.biologo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Statistiche Professionali */}
        <TabsContent value="statistics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Densità per Zona</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zona</TableHead>
                      <TableHead>Densità (ind/ha)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {densityData.map((item) => (
                      <TableRow key={item.zona}>
                        <TableCell>{item.zona}</TableCell>
                        <TableCell>{item.densita}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Percentuale Abbattimento</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Specie</TableHead>
                      <TableHead>Percentuale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries((statistics as any)?.percentualeAbbattimento || {}).map(([specie, perc]: [string, any]) => (
                      <TableRow key={specie}>
                        <TableCell>{SPECIES_CONFIG[specie as keyof typeof SPECIES_CONFIG]?.name || specie}</TableCell>
                        <TableCell>{Number(perc || 0).toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Documenti */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Documenti di Gestione ({documents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Carica Documento
                  </Button>
                </div>
                
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nessun documento caricato</p>
                    <p className="text-sm">Inizia caricando il primo documento di gestione</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.map((doc: any) => (
                      <Card key={doc.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Camera className="h-8 w-8 text-green-600 mt-1" />
                            <div className="flex-1">
                              <h4 className="font-medium truncate">{doc.titolo}</h4>
                              <p className="text-sm text-gray-600">{doc.tipo}</p>
                              <p className="text-sm text-gray-500">Anno: {doc.anno}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Import/Export */}
        <TabsContent value="import-export" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Import Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 rotate-180" />
                  Import Dati
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="excel-import">Import da Excel</Label>
                  <Input 
                    id="excel-import"
                    type="file" 
                    accept=".xlsx,.xls"
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Formato supportato: Excel (.xlsx, .xls)
                  </p>
                </div>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  <Download className="h-4 w-4 mr-2 rotate-180" />
                  Importa Osservazioni
                </Button>
                <Button variant="outline" className="w-full">
                  Scarica Template Excel
                </Button>
              </CardContent>
            </Card>

            {/* Export Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export Dati
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label>Formato Export</Label>
                    <Select defaultValue="excel">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="pdf">PDF Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Periodo</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Input type="date" placeholder="Da..." />
                      <Input type="date" placeholder="A..." />
                    </div>
                  </div>
                </div>
                
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <Download className="h-4 w-4 mr-2" />
                  Esporta Dati
                </Button>
                
                <div className="text-sm text-gray-600 space-y-1">
                  <p>• Export completo di tutte le osservazioni</p>
                  <p>• Dati biometrici inclusi</p>
                  <p>• Coordinate GPS quando disponibili</p>
                  <p>• Formato per analisi scientifiche</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Nuova Osservazione */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Microscope className="h-5 w-5" />
              Nuova Osservazione Faunistica
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="specie"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specie *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona specie" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(SPECIES_CONFIG).map(([key, config]) => (
                            <SelectItem key={key} value={key}>{config.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sesso"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sesso *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona sesso" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="M">Maschio</SelectItem>
                          <SelectItem value="F">Femmina</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="classeEta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Classe Età *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona età" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="J">Giovane (J)</SelectItem>
                          <SelectItem value="Y">Yearling (Y)</SelectItem>
                          <SelectItem value="A">Adulto (A)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo Osservazione *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="prelievo">Prelievo</SelectItem>
                          <SelectItem value="avvistamento">Avvistamento</SelectItem>
                          <SelectItem value="fototrappola">Fototrappola</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zonaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zona *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Numero zona" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sezione"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sezione *</FormLabel>
                      <FormControl>
                        <Input placeholder="es: pederobba" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="peso"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Peso (kg)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          placeholder="25.5" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="data"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data Osservazione *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                            >
                              {field.value ? format(field.value, "dd/MM/yyyy", { locale: it }) : "Seleziona data"}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Note aggiuntive sull'osservazione..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={createObservationMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {createObservationMutation.isPending ? 'Salvando...' : 'Salva Osservazione'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
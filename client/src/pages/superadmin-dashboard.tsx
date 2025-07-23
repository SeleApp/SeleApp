import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertReserveSchema } from "@shared/schema";
import { z } from "zod";
import { Plus, Users, Building2, LogOut, Shield, Edit, Edit2, Trash2, Eye, UserPlus, Settings, MessageSquare, CreditCard, BookOpen, Upload, Filter, BarChart3, EyeOff, Copy, RefreshCw, Download } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { authService } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import AccessCodeManager from "@/components/access-code-manager";
import SuperAdminRegionalQuotas from "@/components/superadmin-regional-quotas";

// Componente per la selezione specie
function SpeciesCheckboxes({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const speciesList = ["Capriolo", "Cervo", "Daino", "Muflone", "Camoscio"];
  
  const selectedSpecies = JSON.parse(value || "[]");
  
  const handleSpeciesChange = (species: string, checked: boolean) => {
    let newSpecies = [...selectedSpecies];
    if (checked) {
      if (!newSpecies.includes(species)) {
        newSpecies.push(species);
      }
    } else {
      newSpecies = newSpecies.filter(s => s !== species);
    }
    onChange(JSON.stringify(newSpecies));
  };

  return (
    <div>
      <Label className="text-sm font-medium">Specie Cacciabili</Label>
      <div className="grid grid-cols-2 gap-3 mt-2">
        {speciesList.map((species) => (
          <div key={species} className="flex items-center space-x-2">
            <Checkbox
              id={`species-${species}`}
              checked={selectedSpecies.includes(species)}
              onCheckedChange={(checked) => handleSpeciesChange(species, !!checked)}
            />
            <Label 
              htmlFor={`species-${species}`}
              className="text-sm font-normal cursor-pointer"
            >
              {species}
            </Label>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Seleziona le specie cacciabili in questa riserva
      </p>
    </div>
  );
}

type CreateReserveData = z.infer<typeof insertReserveSchema>;

interface Reserve {
  id: string;
  name: string;
  comune: string;
  emailContatto: string;
  presidentName?: string;
  huntingType?: 'capo_assegnato' | 'zone' | 'misto';
  species: string; // JSON array 
  accessCode: string;
  codeActive: boolean;
  isActive: boolean;
  managementType: 'standard_zones' | 'standard_random' | 'quota_only' | 'custom';
  numberOfZones?: number;
  createdAt: string;
  stats: {
    totalUsers: number;
  };
}

interface Admin {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
  reserveId: string | null;
}

export default function SuperAdminDashboard() {
  const [createReserveOpen, setCreateReserveOpen] = useState(false);
  const [createAdminOpen, setCreateAdminOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [editingReserve, setEditingReserve] = useState<Reserve | null>(null);
  const [selectedReserveForQuotas, setSelectedReserveForQuotas] = useState<string | null>(null);
  const [showRegionalQuotasModal, setShowRegionalQuotasModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleLogout = () => {
    authService.logout();
  };

  // Query per le riserve
  const { data: reserves = [], isLoading: reservesLoading } = useQuery<Reserve[]>({
    queryKey: ["/api/reserves"],
  });

  // Query per gli admin
  const { data: admins = [], isLoading: adminsLoading } = useQuery<Admin[]>({
    queryKey: ["/api/superadmin/admins"],
  });

  // Form per creare riserve con nuovi campi
  const reserveForm = useForm<CreateReserveData>({
    resolver: zodResolver(insertReserveSchema.omit({ id: true })),
    defaultValues: {
      name: "",
      comune: "",
      emailContatto: "",
      presidentName: "",
      huntingType: "zone",
      species: "[]",
      accessCode: "",
      managementType: "standard_zones",
      assignmentMode: "manual",
      numberOfZones: 16,
      isActive: true,
    },
  });

  // Form per creare/modificare admin
  const adminForm = useForm({
    resolver: zodResolver(z.object({
      email: z.string().email("Email non valida"),
      firstName: z.string().min(2, "Nome minimo 2 caratteri"),
      lastName: z.string().min(2, "Cognome minimo 2 caratteri"),
      password: z.string().min(6, "Password minimo 6 caratteri").optional(),
      reserveId: z.string().optional(),
    })),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      reserveId: "",
    },
  });

  // Mutation per creare riserve
  const createReserveMutation = useMutation({
    mutationFn: async (data: CreateReserveData) => {
      const response = await apiRequest("/api/reserves", {
        method: "POST",
        body: JSON.stringify(data),
      });
      
      return response.json();
    },
    onSuccess: () => {
      // Force refresh di tutte le query correlate
      queryClient.invalidateQueries({ queryKey: ["/api/reserves"] });
      queryClient.refetchQueries({ queryKey: ["/api/reserves"] });
      
      setCreateReserveOpen(false);
      reserveForm.reset();
      toast({
        title: "Riserva creata",
        description: "La nuova riserva è stata creata con successo. Riassunti aggiornati.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message || "Errore nella creazione della riserva",
      });
    },
  });

  // Mutation per creare admin
  const createAdminMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("/api/superadmin/create-admin", {
        method: "POST",
        body: JSON.stringify(data),
      });
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/admins"] });
      setCreateAdminOpen(false);
      adminForm.reset();
      toast({
        title: "Successo",
        description: "Admin creato con successo",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message || "Errore nella creazione dell'admin",
      });
    },
  });

  // Mutation per modificare admin
  const updateAdminMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const response = await apiRequest(`/api/superadmin/admins/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/admins"] });
      setEditingAdmin(null);
      adminForm.reset();
      toast({
        title: "Successo",
        description: "Admin aggiornato con successo",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message || "Errore nell'aggiornamento dell'admin",
      });
    },
  });

  // Mutation per modificare riserva
  const updateReserveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest(`/api/superadmin/reserves/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      
      return response.json();
    },
    onSuccess: () => {
      // Force refresh di tutte le query correlate
      queryClient.invalidateQueries({ queryKey: ["/api/reserves"] });
      queryClient.refetchQueries({ queryKey: ["/api/reserves"] });
      
      setCreateReserveOpen(false);
      setEditingReserve(null);
      reserveForm.reset();
      toast({
        title: "Riserva aggiornata",
        description: "La riserva è stata aggiornata con successo. Riassunti aggiornati.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message || "Errore nell'aggiornamento della riserva",
      });
    },
  });

  const onCreateReserve = (data: CreateReserveData) => {
    if (editingReserve) {
      updateReserveMutation.mutate({ id: editingReserve.id, data });
    } else {
      createReserveMutation.mutate(data);
    }
  };

  const onCreateAdmin = (data: any) => {
    if (editingAdmin) {
      updateAdminMutation.mutate({ id: editingAdmin.id, data });
    } else {
      // Aggiungi il campo role richiesto dal backend
      createAdminMutation.mutate({
        ...data,
        role: "ADMIN"
      });
    }
  };

  const startEditingAdmin = (admin: Admin) => {
    setEditingAdmin(admin);
    adminForm.reset({
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      reserveId: admin.reserveId || "",
    });
    setCreateAdminOpen(true);
  };

  const startEditingReserve = (reserve: Reserve) => {
    setEditingReserve(reserve);
    reserveForm.reset({
      name: reserve.name,
      comune: reserve.comune,
      emailContatto: reserve.emailContatto,
      presidentName: reserve.presidentName || "",
      huntingType: reserve.huntingType || "zone",
      species: reserve.species || "[]",
      accessCode: reserve.accessCode,
      managementType: reserve.managementType || "standard_zones",
      assignmentMode: (reserve as any).assignmentMode || "manual",
      isActive: reserve.isActive,
    });
    setCreateReserveOpen(true);
  };

  const generateAccessCode = () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    reserveForm.setValue("accessCode", code);
  };

  // Mutation per sospendere/attivare riserva
  const toggleReserveStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiRequest(`/api/superadmin/reserves/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reserves"] });
      toast({
        title: "Successo",
        description: "Stato della riserva aggiornato con successo",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message || "Errore nell'aggiornamento dello stato",
      });
    },
  });

  // Mutation per eliminare riserva
  const deleteReserveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/superadmin/reserves/${id}`, {
        method: "DELETE",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reserves"] });
      toast({
        title: "Successo",
        description: "Riserva eliminata con successo",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message || "Errore nell'eliminazione della riserva",
      });
    },
  });

  const toggleReserveStatus = (id: string, isActive: boolean) => {
    const action = isActive ? "attivare" : "sospendere";
    if (confirm(`Sei sicuro di voler ${action} questa riserva?`)) {
      toggleReserveStatusMutation.mutate({ id, isActive });
    }
  };

  const deleteReserve = (id: string) => {
    if (confirm("Sei sicuro di voler eliminare questa riserva? Questa azione non può essere annullata e rimuoverà tutti i dati associati.")) {
      deleteReserveMutation.mutate(id);
    }
  };

  if (reservesLoading || adminsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Dashboard SuperAdmin</h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Gestione completa del sistema SeleApp</p>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <Button
                onClick={() => window.open('/api/download/manual', '_blank')}
                variant="outline"
                size="sm"
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs sm:text-sm px-2 sm:px-3"
              >
                <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Manuale Utente</span>
                <span className="sm:hidden">Manuale</span>
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs sm:text-sm px-2 sm:px-3"
              >
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Esci</span>
                <span className="sm:hidden">Exit</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        <Tabs defaultValue="reserves" className="space-y-4 sm:space-y-6">
          <div className="w-full overflow-x-auto px-1 sm:px-0">
            <TabsList className="flex w-full min-w-max flex-row gap-1 sm:grid sm:grid-cols-7 sm:gap-0">
              <TabsTrigger value="reserves" className="whitespace-nowrap px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm">Riserve</TabsTrigger>
              <TabsTrigger value="quotas" className="whitespace-nowrap px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm">Piani di Prelievo</TabsTrigger>
              <TabsTrigger value="admins" className="whitespace-nowrap px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm">Amministratori</TabsTrigger>
              <TabsTrigger value="settings" className="whitespace-nowrap px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm">Impostazioni</TabsTrigger>
              <TabsTrigger value="support" className="whitespace-nowrap px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm">Supporto</TabsTrigger>
              <TabsTrigger value="billing" className="whitespace-nowrap px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm">Fatturazione</TabsTrigger>
              <TabsTrigger value="materials" className="whitespace-nowrap px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm">Formazione</TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Riserve */}
          <TabsContent value="reserves" className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Riserve di Caccia</h2>
                <p className="text-sm sm:text-base text-gray-600">Gestisci tutte le riserve del sistema</p>
              </div>
              <Dialog open={createReserveOpen} onOpenChange={(open) => {
                setCreateReserveOpen(open);
                if (!open) {
                  setEditingReserve(null);
                  reserveForm.reset();
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm px-3 sm:px-4">
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Nuova Riserva</span>
                    <span className="sm:hidden">Nuova</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-full max-w-[95vw] sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingReserve 
                        ? "Modifica Riserva" 
                        : "Crea Nuova Riserva"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingReserve
                        ? "Modifica i dettagli della riserva selezionata"
                        : "Inserisci i dati della nuova riserva di caccia"}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={reserveForm.handleSubmit(onCreateReserve)} className="space-y-6">
                    {/* Griglia responsive per i campi base */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Nome Riserva</Label>
                        <Input
                          id="name"
                          {...reserveForm.register("name")}
                          placeholder="Nome della riserva"
                          className="w-full"
                        />
                        {reserveForm.formState.errors.name && (
                          <p className="text-sm text-red-600 mt-1">
                            {reserveForm.formState.errors.name.message}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="comune">Comune</Label>
                        <Input
                          id="comune"
                          {...reserveForm.register("comune")}
                          placeholder="Comune di appartenenza"
                          className="w-full"
                        />
                        {reserveForm.formState.errors.comune && (
                          <p className="text-sm text-red-600 mt-1">
                            {reserveForm.formState.errors.comune.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="emailContatto">Email Contatto</Label>
                        <Input
                          id="emailContatto"
                          type="email"
                          {...reserveForm.register("emailContatto")}
                          placeholder="admin@riserva.it"
                          className="w-full"
                        />
                        {reserveForm.formState.errors.emailContatto && (
                          <p className="text-sm text-red-600 mt-1">
                            {reserveForm.formState.errors.emailContatto.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="presidentName">Nome Presidente</Label>
                        <Input
                          id="presidentName"
                          {...reserveForm.register("presidentName")}
                          placeholder="Nome del presidente della riserva"
                          className="w-full"
                        />
                        {reserveForm.formState.errors.presidentName && (
                          <p className="text-sm text-red-600 mt-1">
                            {reserveForm.formState.errors.presidentName.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="managementType">Tipologia di Gestione</Label>
                      <Select 
                        onValueChange={(value) => {
                          reserveForm.setValue("managementType", value as any);
                          // Sincronizza huntingType con managementType
                          if (value === "standard_zones") {
                            reserveForm.setValue("huntingType", "zone");
                          } else if (value === "standard_random") {
                            reserveForm.setValue("huntingType", "capo_assegnato");
                          } else if (value === "zones_groups") {
                            reserveForm.setValue("huntingType", "zone");
                          } else if (value === "custom") {
                            reserveForm.setValue("huntingType", "misto");
                          }
                        }}
                        defaultValue={reserveForm.watch("managementType")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona tipologia di gestione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard_zones">Caccia per Zone</SelectItem>
                          <SelectItem value="standard_random">Caccia per Capo Assegnato</SelectItem>
                          <SelectItem value="zones_groups">Zone e Gruppi</SelectItem>
                          <SelectItem value="custom">Misto</SelectItem>
                        </SelectContent>
                      </Select>
                      {reserveForm.formState.errors.managementType && (
                        <p className="text-sm text-red-600 mt-1">
                          {reserveForm.formState.errors.managementType.message}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Determina il sistema di prenotazione e gestione della riserva
                      </p>
                    </div>

                    {/* Griglia per campi condizionali */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Campo Numero Zone per gestioni con zone */}
                      {(reserveForm.watch("managementType") === "standard_zones" || reserveForm.watch("managementType") === "zones_groups" || reserveForm.watch("managementType") === "custom") && (
                        <div>
                          <Label htmlFor="numberOfZones">Numero di Zone</Label>
                          <Input
                            id="numberOfZones"
                            type="number"
                            min="1"
                            max="50"
                            {...reserveForm.register("numberOfZones", { 
                              valueAsNumber: true,
                              min: { value: 1, message: "Minimo 1 zona" },
                              max: { value: 50, message: "Massimo 50 zone" }
                            })}
                            placeholder="16"
                            defaultValue="16"
                            className="w-full"
                          />
                          {reserveForm.formState.errors.numberOfZones && (
                            <p className="text-sm text-red-600 mt-1">
                              {reserveForm.formState.errors.numberOfZones.message}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Numero di zone di caccia da creare per questa riserva
                          </p>
                        </div>
                      )}

                      {/* Configurazione gruppi per Zone & gruppi */}
                      {reserveForm.watch("managementType") === "zones_groups" && (
                        <div>
                          <Label htmlFor="numberOfGroups">Numero di Gruppi</Label>
                          <Select 
                            onValueChange={(value) => {
                              const numGroups = parseInt(value);
                              reserveForm.setValue("numberOfGroups", numGroups);
                              // Aggiorna automaticamente i gruppi attivi
                              const groups = ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, numGroups);
                              reserveForm.setValue("activeGroups", groups);
                            }}
                            defaultValue={reserveForm.watch("numberOfGroups")?.toString() || "4"}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleziona numero gruppi" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2">2 Gruppi (A, B)</SelectItem>
                              <SelectItem value="3">3 Gruppi (A, B, C)</SelectItem>
                              <SelectItem value="4">4 Gruppi (A, B, C, D)</SelectItem>
                              <SelectItem value="5">5 Gruppi (A, B, C, D, E)</SelectItem>
                              <SelectItem value="6">6 Gruppi (A, B, C, D, E, F)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500 mt-1">
                            Gruppi attivi: {reserveForm.watch("activeGroups")?.join(", ") || "A, B, C, D"}
                          </p>
                        </div>
                      )}

                      {/* Sottotipo per Capo Assegnato */}
                      {reserveForm.watch("managementType") === "standard_random" && (
                        <div>
                          <Label htmlFor="assignmentMode">Modalità Assegnazione Capi</Label>
                          <Select 
                            onValueChange={(value) => reserveForm.setValue("assignmentMode", value as "manual" | "random")}
                            defaultValue={reserveForm.watch("assignmentMode") || "manual"}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleziona modalità assegnazione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manual">Assegnazione Manuale</SelectItem>
                              <SelectItem value="random">Assegnazione Random/Sorteggio</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500 mt-1">
                            Come vengono assegnati i capi ai cacciatori
                          </p>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor="accessCode">Codice d'Accesso</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={generateAccessCode}
                            className="text-xs px-2 py-1"
                          >
                            Genera
                          </Button>
                        </div>
                        <Input
                          id="accessCode"
                          {...reserveForm.register("accessCode")}
                          placeholder="Codice per registrazione cacciatori"
                          className="w-full"
                        />
                        {reserveForm.formState.errors.accessCode && (
                          <p className="text-sm text-red-600 mt-1">
                            {reserveForm.formState.errors.accessCode.message}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          I cacciatori useranno questo codice per registrarsi
                        </p>
                      </div>
                    </div>

                    <SpeciesCheckboxes 
                      value={reserveForm.watch("species") || "[]"}
                      onChange={(value) => reserveForm.setValue("species", value)}
                    />



                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCreateReserveOpen(false)}
                      >
                        Annulla
                      </Button>
                      <Button
                        type="submit"
                        disabled={createReserveMutation.isPending || updateReserveMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {(createReserveMutation.isPending || updateReserveMutation.isPending) 
                          ? "Salvando..." 
                          : editingReserve
                          ? "Aggiorna Riserva"
                          : "Crea Riserva"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Filtri Riserve */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Elenco Riserve</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  {reserves.length} riserve totali nel sistema
                </CardDescription>
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-600" />
                    <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filtra per stato" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutte le riserve</SelectItem>
                        <SelectItem value="active">Solo attive</SelectItem>
                        <SelectItem value="inactive">Solo disattivate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-sm text-gray-500 flex items-center">
                    {statusFilter === 'all' && `${reserves.length} riserve totali`}
                    {statusFilter === 'active' && `${reserves.filter(r => r.isActive).length} riserve attive`}
                    {statusFilter === 'inactive' && `${reserves.filter(r => !r.isActive).length} riserve disattivate`}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-2 sm:p-6">
                <div className="w-full overflow-x-auto">
                  <Table className="min-w-full text-xs sm:text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-2 py-3">Nome</TableHead>
                      <TableHead className="px-2 py-3 hidden sm:table-cell">Comune</TableHead>
                      <TableHead className="px-2 py-3 hidden md:table-cell">Codice</TableHead>
                      <TableHead className="px-2 py-3">Utenti</TableHead>
                      <TableHead className="px-2 py-3">Stato</TableHead>
                      <TableHead className="px-2 py-3 hidden lg:table-cell">Tipologia</TableHead>
                      <TableHead className="px-2 py-3 hidden xl:table-cell">Creata</TableHead>
                      <TableHead className="px-2 py-3 text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reserves
                      .filter(reserve => {
                        if (statusFilter === 'active') return reserve.isActive;
                        if (statusFilter === 'inactive') return !reserve.isActive;
                        return true;
                      })
                      .sort((a, b) => {
                        // Ordina per numero CA TV: prima Cison (speciale), poi CA TV01-38 in ordine numerico, poi AFV
                        if (a.id === 'cison-valmarino') return -1;
                        if (b.id === 'cison-valmarino') return 1;
                        
                        const aMatch = a.id.match(/ca-tv(\d+)/);
                        const bMatch = b.id.match(/ca-tv(\d+)/);
                        
                        if (aMatch && bMatch) {
                          return parseInt(aMatch[1]) - parseInt(bMatch[1]);
                        }
                        
                        // AFV alla fine
                        if (a.id.includes('afv') && !b.id.includes('afv')) return 1;
                        if (!a.id.includes('afv') && b.id.includes('afv')) return -1;
                        
                        return a.name.localeCompare(b.name);
                      })
                      .map((reserve) => (
                      <TableRow key={reserve.id}>
                        <TableCell className="px-2 py-3 font-medium">
                          <div className="flex flex-col">
                            <span>{reserve.name}</span>
                            <span className="text-xs text-gray-500 sm:hidden">{reserve.comune}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-3 hidden sm:table-cell">{reserve.comune}</TableCell>
                        <TableCell className="px-2 py-3 hidden md:table-cell">
                          <AccessCodeManager reserve={reserve} />
                        </TableCell>
                        <TableCell className="px-2 py-3">
                          <div className="flex items-center">
                            <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 text-blue-600" />
                            <span className="text-xs sm:text-sm">{reserve.stats.totalUsers}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-3">
                          <Badge 
                            variant={reserve.isActive ? "default" : "secondary"}
                            className="text-xs px-1 py-0"
                          >
                            {reserve.isActive ? "Attiva" : "Inattiva"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-2 py-3 hidden lg:table-cell">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              reserve.managementType === 'standard_zones' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              reserve.managementType === 'standard_random' ? 'bg-green-50 text-green-700 border-green-200' :
                              reserve.managementType === 'zones_groups' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              reserve.managementType === 'quota_only' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                              'bg-gray-50 text-gray-700 border-gray-200'
                            }`}
                          >
                            {reserve.managementType === 'standard_zones' ? 'Zone' :
                             reserve.managementType === 'standard_random' ? 'Capi' :
                             reserve.managementType === 'zones_groups' ? 'Zone e Gruppi' :
                             reserve.managementType === 'quota_only' ? 'Quote' :
                             'Misto'}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-2 py-3 hidden xl:table-cell text-xs">
                          {new Date(reserve.createdAt).toLocaleDateString("it-IT")}
                        </TableCell>
                        <TableCell className="px-2 py-3 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditingReserve(reserve)}
                              className="text-blue-600 hover:text-blue-700 p-1 h-8 w-8"
                            >
                              <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleReserveStatus(reserve.id, !reserve.isActive)}
                              className={`p-1 h-8 w-8 ${reserve.isActive ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"}`}
                            >
                              {reserve.isActive ? "⏸" : "▶"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteReserve(reserve.id)}
                              className="text-red-600 hover:text-red-700 p-1 h-8 w-8"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  </Table>
                </div>
                
                {reserves.filter(reserve => {
                  if (statusFilter === 'active') return reserve.isActive;
                  if (statusFilter === 'inactive') return !reserve.isActive;
                  return true;
                }).length === 0 && (
                  <div className="text-center py-12">
                    <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      {statusFilter === 'all' ? 'Nessuna riserva' : 
                       statusFilter === 'active' ? 'Nessuna riserva attiva' : 
                       'Nessuna riserva disattivata'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {statusFilter === 'all' ? 'Inizia creando la prima riserva di caccia.' :
                       statusFilter === 'active' ? 'Non ci sono riserve attive al momento.' :
                       'Non ci sono riserve disattivate.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Piani di Prelievo Regionali */}
          <TabsContent value="quotas" className="space-y-4 sm:space-y-6">
            <SuperAdminRegionalQuotas reserves={reserves} />
          </TabsContent>

          {/* Tab Amministratori */}
          <TabsContent value="admins" className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Amministratori</h2>
                <p className="text-sm sm:text-base text-gray-600">Gestisci gli account amministratore</p>
              </div>
              <Dialog open={createAdminOpen} onOpenChange={setCreateAdminOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm px-3 sm:px-4">
                    <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Nuovo Admin</span>
                    <span className="sm:hidden">Nuovo</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-full max-w-[95vw] sm:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingAdmin ? "Modifica Amministratore" : "Crea Nuovo Amministratore"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingAdmin 
                        ? "Modifica i dati dell'amministratore"
                        : "Inserisci i dati del nuovo amministratore"
                      }
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={adminForm.handleSubmit(onCreateAdmin)} className="space-y-6">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        {...adminForm.register("email")}
                        placeholder="admin@example.com"
                        className="w-full"
                      />
                      {adminForm.formState.errors.email && (
                        <p className="text-sm text-red-600 mt-1">
                          {adminForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">Nome</Label>
                        <Input
                          id="firstName"
                          {...adminForm.register("firstName")}
                          placeholder="Mario"
                          className="w-full"
                        />
                        {adminForm.formState.errors.firstName && (
                          <p className="text-sm text-red-600 mt-1">
                            {adminForm.formState.errors.firstName.message}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="lastName">Cognome</Label>
                        <Input
                          id="lastName"
                          {...adminForm.register("lastName")}
                          placeholder="Rossi"
                          className="w-full"
                        />
                        {adminForm.formState.errors.lastName && (
                          <p className="text-sm text-red-600 mt-1">
                            {adminForm.formState.errors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="password">
                          Password {editingAdmin && "(lascia vuoto per non modificare)"}
                        </Label>
                        <Input
                          id="password"
                          type="password"
                          {...adminForm.register("password")}
                          placeholder="Minimo 6 caratteri"
                          className="w-full"
                        />
                        {adminForm.formState.errors.password && (
                          <p className="text-sm text-red-600 mt-1">
                            {adminForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="reserveId">Riserva Assegnata</Label>
                        <select
                          id="reserveId"
                          {...adminForm.register("reserveId")}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Seleziona una riserva (opzionale)</option>
                          {reserves?.map((reserve) => (
                            <option key={reserve.id} value={reserve.id}>
                              {reserve.name} - {reserve.comune}
                            </option>
                          ))}
                        </select>
                        {adminForm.formState.errors.reserveId && (
                          <p className="text-sm text-red-600 mt-1">
                            {adminForm.formState.errors.reserveId.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setCreateAdminOpen(false);
                          setEditingAdmin(null);
                          adminForm.reset();
                        }}
                      >
                        Annulla
                      </Button>
                      <Button
                        type="submit"
                        disabled={createAdminMutation.isPending || updateAdminMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {(createAdminMutation.isPending || updateAdminMutation.isPending)
                          ? "Salvando..."
                          : editingAdmin
                          ? "Aggiorna"
                          : "Crea Admin"
                        }
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Tabella Amministratori */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Elenco Amministratori</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  {admins.length} amministratori nel sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2 sm:p-6">
                <div className="w-full overflow-x-auto">
                  <Table className="min-w-full text-xs sm:text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-2 py-3">Nome</TableHead>
                      <TableHead className="px-2 py-3 hidden sm:table-cell">Email</TableHead>
                      <TableHead className="px-2 py-3 hidden md:table-cell">Riserva</TableHead>
                      <TableHead className="px-2 py-3">Stato</TableHead>
                      <TableHead className="px-2 py-3 hidden lg:table-cell">Creato</TableHead>
                      <TableHead className="px-2 py-3 text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell className="px-2 py-3 font-medium">
                          <div className="flex flex-col">
                            <span>{admin.firstName} {admin.lastName}</span>
                            <span className="text-xs text-gray-500 sm:hidden">{admin.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-3 hidden sm:table-cell text-xs sm:text-sm">{admin.email}</TableCell>
                        <TableCell className="px-2 py-3 hidden md:table-cell text-xs">
                          {admin.reserveId ? (
                            (() => {
                              const reserve = reserves?.find(r => r.id === admin.reserveId);
                              return reserve ? `${reserve.name}` : admin.reserveId;
                            })()
                          ) : (
                            <span className="text-gray-500 italic">Non assegnata</span>
                          )}
                        </TableCell>
                        <TableCell className="px-2 py-3">
                          <Badge 
                            variant={admin.isActive ? "default" : "secondary"}
                            className="text-xs px-1 py-0"
                          >
                            {admin.isActive ? "Attivo" : "Inattivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-2 py-3 hidden lg:table-cell text-xs">
                          {new Date(admin.createdAt).toLocaleDateString("it-IT")}
                        </TableCell>
                        <TableCell className="px-2 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditingAdmin(admin)}
                            className="text-blue-600 hover:text-blue-700 p-1 h-8 w-8"
                          >
                            <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  </Table>
                </div>
                
                {admins.length === 0 && (
                  <div className="text-center py-12">
                    <Shield className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Nessun amministratore</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Crea il primo account amministratore.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Impostazioni Riserve */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Impostazioni Riserve
                </CardTitle>
                <CardDescription>
                  Personalizza logo, giorni di silenzio venatorio e template email per ogni riserva
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Seleziona una riserva dal tab "Riserve" per gestire le sue impostazioni</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Supporto */}
          <TabsContent value="support" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Ticket di Supporto
                </CardTitle>
                <CardDescription>
                  Gestisci richieste di assistenza da admin e cacciatori
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Sistema di supporto implementato - Ticket saranno visualizzati qui</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Fatturazione */}
          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Gestione Fatturazione
                </CardTitle>
                <CardDescription>
                  Monitora abbonamenti, pagamenti e rinnovi delle riserve
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium text-green-800">Abbonamenti Attivi</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900">1</p>
                    <p className="text-sm text-green-700">Cison di Valmarino</p>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="font-medium text-yellow-800">In Scadenza</span>
                    </div>
                    <p className="text-2xl font-bold text-yellow-900">0</p>
                    <p className="text-sm text-yellow-700">Prossimi 30 giorni</p>
                  </div>
                  
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="font-medium text-red-800">Scaduti</span>
                    </div>
                    <p className="text-2xl font-bold text-red-900">0</p>
                    <p className="text-sm text-red-700">Richiedono attenzione</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Materiali Formativi */}
          <TabsContent value="materials" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Materiali Formativi
                </CardTitle>
                <CardDescription>
                  Gestisci video, PDF e documenti per formazione admin e cacciatori
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap">
                        <Plus className="h-4 w-4 mr-2" />
                        Nuovo Materiale
                      </Button>
                      <Button variant="outline" size="sm" className="whitespace-nowrap">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="whitespace-nowrap">
                        <Filter className="h-4 w-4 mr-2" />
                        Filtra
                      </Button>
                      <Button variant="outline" size="sm" className="whitespace-nowrap">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analytics
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-base sm:text-lg">Nessun materiale formativo ancora caricato</p>
                    <p className="text-sm text-gray-400 mt-2">Inizia caricando video o documenti PDF</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
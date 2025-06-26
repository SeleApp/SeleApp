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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertReserveSchema } from "@shared/schema";
import { z } from "zod";
import { Plus, Users, Building2, LogOut, Shield, Edit, Trash2, Eye, UserPlus, Settings, MessageSquare, CreditCard, BookOpen, Upload, Filter, BarChart3, EyeOff, Copy, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { authService } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import AccessCodeManager from "@/components/access-code-manager";

type CreateReserveData = z.infer<typeof insertReserveSchema>;

interface Reserve {
  id: string;
  name: string;
  comune: string;
  emailContatto: string;
  accessCode: string;
  codeActive: boolean;
  isActive: boolean;
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

  // Form per creare riserve
  const reserveForm = useForm<CreateReserveData>({
    resolver: zodResolver(insertReserveSchema.omit({ id: true })),
    defaultValues: {
      name: "",
      comune: "",
      emailContatto: "",
      accessCode: "",
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
      const response = await fetch("/api/reserves", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Errore nella creazione della riserva");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reserves"] });
      setCreateReserveOpen(false);
      reserveForm.reset();
      toast({
        title: "Successo",
        description: "Riserva creata con successo",
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
      const response = await fetch("/api/superadmin/create-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Errore nella creazione dell'admin");
      }
      
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

  const onCreateReserve = (data: CreateReserveData) => {
    createReserveMutation.mutate(data);
  };

  const onCreateAdmin = (data: any) => {
    if (editingAdmin) {
      updateAdminMutation.mutate({ id: editingAdmin.id, data });
    } else {
      createAdminMutation.mutate(data);
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

  const generateAccessCode = () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    reserveForm.setValue("accessCode", code);
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
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard SuperAdmin</h1>
                <p className="text-sm text-gray-600">Gestione completa del sistema SeleApp</p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Esci
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="reserves" className="space-y-6">
          <div className="w-full overflow-x-auto px-4 sm:px-0">
            <TabsList className="flex w-full min-w-max flex-row gap-2 sm:grid sm:grid-cols-6 sm:gap-0">
              <TabsTrigger value="reserves" className="whitespace-nowrap px-4 py-2">Riserve</TabsTrigger>
              <TabsTrigger value="admins" className="whitespace-nowrap px-4 py-2">Amministratori</TabsTrigger>
              <TabsTrigger value="settings" className="whitespace-nowrap px-4 py-2">Impostazioni</TabsTrigger>
              <TabsTrigger value="support" className="whitespace-nowrap px-4 py-2">Supporto</TabsTrigger>
              <TabsTrigger value="billing" className="whitespace-nowrap px-4 py-2">Fatturazione</TabsTrigger>
              <TabsTrigger value="materials" className="whitespace-nowrap px-4 py-2">Formazione</TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Riserve */}
          <TabsContent value="reserves" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Riserve di Caccia</h2>
                <p className="text-gray-600">Gestisci tutte le riserve del sistema</p>
              </div>
              <Dialog open={createReserveOpen} onOpenChange={setCreateReserveOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Nuova Riserva
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Crea Nuova Riserva</DialogTitle>
                    <DialogDescription>
                      Inserisci i dati della nuova riserva di caccia
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={reserveForm.handleSubmit(onCreateReserve)} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nome Riserva</Label>
                      <Input
                        id="name"
                        {...reserveForm.register("name")}
                        placeholder="Es. Riserva Monte Verde"
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
                        placeholder="Es. Treviso"
                      />
                      {reserveForm.formState.errors.comune && (
                        <p className="text-sm text-red-600 mt-1">
                          {reserveForm.formState.errors.comune.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="emailContatto">Email Contatto</Label>
                      <Input
                        id="emailContatto"
                        type="email"
                        {...reserveForm.register("emailContatto")}
                        placeholder="admin@riserva.it"
                      />
                      {reserveForm.formState.errors.emailContatto && (
                        <p className="text-sm text-red-600 mt-1">
                          {reserveForm.formState.errors.emailContatto.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="accessCode">Codice d'Accesso</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={generateAccessCode}
                        >
                          Genera
                        </Button>
                      </div>
                      <Input
                        id="accessCode"
                        {...reserveForm.register("accessCode")}
                        placeholder="Codice per registrazione cacciatori"
                      />
                      {reserveForm.formState.errors.accessCode && (
                        <p className="text-sm text-red-600 mt-1">
                          {reserveForm.formState.errors.accessCode.message}
                        </p>
                      )}
                    </div>

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
                        disabled={createReserveMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {createReserveMutation.isPending ? "Creazione..." : "Crea Riserva"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Tabella Riserve */}
            <Card>
              <CardHeader>
                <CardTitle>Elenco Riserve</CardTitle>
                <CardDescription>
                  {reserves.length} riserve totali nel sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Comune</TableHead>
                      <TableHead>Codice</TableHead>
                      <TableHead>Utenti</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Creata</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reserves.map((reserve) => (
                      <TableRow key={reserve.id}>
                        <TableCell className="font-medium">{reserve.name}</TableCell>
                        <TableCell>{reserve.comune}</TableCell>
                        <TableCell>
                          <AccessCodeManager reserve={reserve} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-1 text-blue-600" />
                            {reserve.stats.totalUsers}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={reserve.isActive ? "default" : "secondary"}>
                            {reserve.isActive ? "Attiva" : "Inattiva"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(reserve.createdAt).toLocaleDateString("it-IT")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {reserves.length === 0 && (
                  <div className="text-center py-12">
                    <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Nessuna riserva</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Inizia creando la prima riserva di caccia.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Amministratori */}
          <TabsContent value="admins" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Amministratori</h2>
                <p className="text-gray-600">Gestisci gli account amministratore</p>
              </div>
              <Dialog open={createAdminOpen} onOpenChange={setCreateAdminOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Nuovo Admin
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
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
                  <form onSubmit={adminForm.handleSubmit(onCreateAdmin)} className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        {...adminForm.register("email")}
                        placeholder="admin@example.com"
                      />
                      {adminForm.formState.errors.email && (
                        <p className="text-sm text-red-600 mt-1">
                          {adminForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">Nome</Label>
                        <Input
                          id="firstName"
                          {...adminForm.register("firstName")}
                          placeholder="Mario"
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
                        />
                        {adminForm.formState.errors.lastName && (
                          <p className="text-sm text-red-600 mt-1">
                            {adminForm.formState.errors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="password">
                        Password {editingAdmin && "(lascia vuoto per non modificare)"}
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        {...adminForm.register("password")}
                        placeholder="Minimo 6 caratteri"
                      />
                      {adminForm.formState.errors.password && (
                        <p className="text-sm text-red-600 mt-1">
                          {adminForm.formState.errors.password.message}
                        </p>
                      )}
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
                <CardTitle>Elenco Amministratori</CardTitle>
                <CardDescription>
                  {admins.length} amministratori nel sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Riserva</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Creato</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium">
                          {admin.firstName} {admin.lastName}
                        </TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell>
                          {admin.reserveId || (
                            <span className="text-gray-500 italic">Non assegnata</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={admin.isActive ? "default" : "secondary"}>
                            {admin.isActive ? "Attivo" : "Inattivo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(admin.createdAt).toLocaleDateString("it-IT")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditingAdmin(admin)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
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
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Nuovo Materiale
                      </Button>
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </Button>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-2" />
                        Filtra
                      </Button>
                      <Button variant="outline" size="sm">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analytics
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nessun materiale formativo ancora caricato</p>
                    <p className="text-sm">Inizia caricando video o documenti PDF</p>
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
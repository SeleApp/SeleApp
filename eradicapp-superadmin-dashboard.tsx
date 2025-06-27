// EradicApp 1.0 - SuperAdmin Dashboard
// Adattamento dell'architettura SeleApp per controllo fauna selvatica

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  MapPin, 
  Users, 
  Building, 
  FileText, 
  Phone, 
  Mail, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Edit,
  Plus,
  Download,
  LogOut,
  Target,
  Zap,
  TrendingUp,
  Shield
} from "lucide-react";

interface OperationalZone {
  id: string;
  name: string;
  territoryType: string;
  province: string;
  contactEmail: string;
  accessCode: string;
  codeActive: boolean;
  isActive: boolean;
  decreeReference: string;
  totalEradicators: number;
  totalAdmins: number;
  activeOperations: number;
  monthlyEradications: number;
  createdAt: string;
}

interface ZoneAdmin {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  zoneId: string;
  zoneName: string;
  isActive: boolean;
  createdAt: string;
}

interface ZoneContract {
  id: number;
  zoneId: string;
  zoneName: string;
  contractType: string;
  status: string;
  authorityReference: string;
  startDate: string;
  endDate: string;
  fileUrl?: string;
}

interface SupportTicket {
  id: number;
  zoneId: string;
  zoneName: string;
  category: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  adminName?: string;
}

interface ZoneBilling {
  id: number;
  zoneId: string;
  zoneName: string;
  subscriptionPlan: string;
  paymentStatus: string;
  monthlyFee: number;
  renewalDate: string;
}

interface TrainingMaterial {
  id: number;
  title: string;
  description: string;
  materialType: string;
  targetAudience: string;
  isActive: boolean;
  isMandatory: boolean;
  version: string;
}

interface SuperAdminStats {
  totalZones: number;
  activeZones: number;
  totalEradicators: number;
  totalAdmins: number;
  monthlyEradications: number;
  pendingTickets: number;
}

export default function EradicAppSuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState("zones");
  const [showCreateZoneDialog, setShowCreateZoneDialog] = useState(false);
  const [showCreateAdminDialog, setShowCreateAdminDialog] = useState(false);
  const [selectedZone, setSelectedZone] = useState<OperationalZone | null>(null);
  const [visibleCodes, setVisibleCodes] = useState<Set<string>>(new Set());
  
  const queryClient = useQueryClient();

  // Fetch SuperAdmin statistics
  const { data: stats } = useQuery<SuperAdminStats>({
    queryKey: ["/api/superadmin/stats"],
  });

  // Fetch operational zones
  const { data: zones, isLoading: zonesLoading } = useQuery<OperationalZone[]>({
    queryKey: ["/api/superadmin/zones"],
  });

  // Fetch zone administrators
  const { data: admins, isLoading: adminsLoading } = useQuery<ZoneAdmin[]>({
    queryKey: ["/api/superadmin/admins"],
  });

  // Fetch contracts
  const { data: contracts } = useQuery<ZoneContract[]>({
    queryKey: ["/api/superadmin/contracts"],
  });

  // Fetch support tickets
  const { data: tickets } = useQuery<SupportTicket[]>({
    queryKey: ["/api/superadmin/support"],
  });

  // Fetch billing information
  const { data: billing } = useQuery<ZoneBilling[]>({
    queryKey: ["/api/superladmin/billing"],
  });

  // Fetch training materials
  const { data: materials } = useQuery<TrainingMaterial[]>({
    queryKey: ["/api/superladmin/materials"],
  });

  // Mutations
  const createZoneMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/superadmin/zones", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superladmin/zones"] });
      setShowCreateZoneDialog(false);
      toast({ title: "Zona operativa creata con successo!" });
    },
    onError: () => {
      toast({ title: "Errore nella creazione della zona", variant: "destructive" });
    }
  });

  const createAdminMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/superadmin/create-admin", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superladmin/admins"] });
      setShowCreateAdminDialog(false);
      toast({ title: "Amministratore creato con successo!" });
    },
    onError: () => {
      toast({ title: "Errore nella creazione dell'amministratore", variant: "destructive" });
    }
  });

  const updateAccessCodeMutation = useMutation({
    mutationFn: ({ zoneId, accessCode, codeActive }: { zoneId: string, accessCode?: string, codeActive?: boolean }) => 
      apiRequest(`/api/superladmin/zones/${zoneId}/access-code`, { 
        method: "PATCH", 
        body: { accessCode, codeActive } 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superladmin/zones"] });
      toast({ title: "Codice d'accesso aggiornato!" });
    }
  });

  // Helper functions
  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    window.location.href = "/app";
  };

  const toggleCodeVisibility = (zoneId: string) => {
    const newVisible = new Set(visibleCodes);
    if (newVisible.has(zoneId)) {
      newVisible.delete(zoneId);
    } else {
      newVisible.add(zoneId);
    }
    setVisibleCodes(newVisible);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiato negli appunti!" });
  };

  const generateNewAccessCode = (zoneId: string) => {
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    updateAccessCodeMutation.mutate({ zoneId, accessCode: newCode });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: "Attivo", variant: "default" as const },
      attivo: { label: "Attivo", variant: "default" as const },
      inactive: { label: "Inattivo", variant: "secondary" as const },
      pending: { label: "In Attesa", variant: "outline" as const },
      expired: { label: "Scaduto", variant: "destructive" as const },
      open: { label: "Aperto", variant: "destructive" as const },
      resolved: { label: "Risolto", variant: "default" as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { label: "Bassa", variant: "outline" as const },
      medium: { label: "Media", variant: "secondary" as const },
      high: { label: "Alta", variant: "destructive" as const }
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig] || { label: priority, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Target className="w-8 h-8 text-green-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">EradicApp SuperAdmin</h1>
                  <p className="text-sm text-gray-600">Controllo Fauna Selvatica - Regione Veneto</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => window.open('/api/download/manual', '_blank')}
                variant="outline"
                size="sm"
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Manuale Sistema
              </Button>
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
      </div>

      {/* Statistics Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Zone Operative</p>
                  <p className="text-2xl font-bold text-green-600">{stats?.totalZones || 0}</p>
                </div>
                <MapPin className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Zone Attive</p>
                  <p className="text-2xl font-bold text-blue-600">{stats?.activeZones || 0}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Eradicatori</p>
                  <p className="text-2xl font-bold text-purple-600">{stats?.totalEradicators || 0}</p>
                </div>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Amministratori</p>
                  <p className="text-2xl font-bold text-indigo-600">{stats?.totalAdmins || 0}</p>
                </div>
                <Shield className="w-8 h-8 text-indigo-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Abbattimenti/Mese</p>
                  <p className="text-2xl font-bold text-orange-600">{stats?.monthlyEradications || 0}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ticket Aperti</p>
                  <p className="text-2xl font-bold text-red-600">{stats?.pendingTickets || 0}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Card>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                <TabsList className="grid w-full sm:w-auto grid-cols-2 lg:grid-cols-6">
                  <TabsTrigger value="zones">Zone</TabsTrigger>
                  <TabsTrigger value="admins">Amministratori</TabsTrigger>
                  <TabsTrigger value="contracts">Contratti</TabsTrigger>
                  <TabsTrigger value="support">Supporto</TabsTrigger>
                  <TabsTrigger value="billing">Fatturazione</TabsTrigger>
                  <TabsTrigger value="materials">Materiali</TabsTrigger>
                </TabsList>
              </div>

              {/* Zone Operative Tab */}
              <TabsContent value="zones">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Gestione Zone Operative</h3>
                  <Dialog open={showCreateZoneDialog} onOpenChange={setShowCreateZoneDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Nuova Zona
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Crea Nuova Zona Operativa</DialogTitle>
                      </DialogHeader>
                      <CreateZoneForm onSubmit={createZoneMutation.mutate} />
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Nome Zona</th>
                        <th className="text-left p-3 font-medium">Tipo/Provincia</th>
                        <th className="text-left p-3 font-medium">Contatto</th>
                        <th className="text-left p-3 font-medium">Eradicatori</th>
                        <th className="text-left p-3 font-medium">Codice Accesso</th>
                        <th className="text-left p-3 font-medium">Stato</th>
                        <th className="text-left p-3 font-medium">Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {zones?.map((zone) => (
                        <tr key={zone.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div>
                              <div className="font-medium">{zone.name}</div>
                              <div className="text-sm text-gray-600">{zone.decreeReference}</div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div>
                              <div className="text-sm font-medium capitalize">{zone.territoryType}</div>
                              <div className="text-sm text-gray-600">{zone.province}</div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="text-sm text-gray-600">{zone.contactEmail}</div>
                          </td>
                          <td className="p-3">
                            <div className="text-center">
                              <div className="text-lg font-semibold text-green-600">{zone.totalEradicators}</div>
                              <div className="text-xs text-gray-500">attivi</div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <code className="px-2 py-1 bg-gray-100 rounded text-sm">
                                {visibleCodes.has(zone.id) ? zone.accessCode : '••••••'}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleCodeVisibility(zone.id)}
                              >
                                {visibleCodes.has(zone.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(zone.accessCode)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => generateNewAccessCode(zone.id)}
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                          <td className="p-3">
                            {getStatusBadge(zone.isActive ? 'active' : 'inactive')}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* Administrators Tab */}
              <TabsContent value="admins">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Gestione Amministratori Zone</h3>
                  <Dialog open={showCreateAdminDialog} onOpenChange={setShowCreateAdminDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Nuovo Amministratore
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Crea Nuovo Amministratore</DialogTitle>
                      </DialogHeader>
                      <CreateAdminForm zones={zones || []} onSubmit={createAdminMutation.mutate} />
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Amministratore</th>
                        <th className="text-left p-3 font-medium">Email</th>
                        <th className="text-left p-3 font-medium">Zona Assegnata</th>
                        <th className="text-left p-3 font-medium">Stato</th>
                        <th className="text-left p-3 font-medium">Creato</th>
                        <th className="text-left p-3 font-medium">Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admins?.map((admin) => (
                        <tr key={admin.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div className="font-medium">{admin.firstName} {admin.lastName}</div>
                          </td>
                          <td className="p-3">
                            <div className="text-sm text-gray-600">{admin.email}</div>
                          </td>
                          <td className="p-3">
                            <div className="text-sm">{admin.zoneName}</div>
                          </td>
                          <td className="p-3">
                            {getStatusBadge(admin.isActive ? 'active' : 'inactive')}
                          </td>
                          <td className="p-3">
                            <div className="text-sm text-gray-600">
                              {new Date(admin.createdAt).toLocaleDateString('it-IT')}
                            </div>
                          </td>
                          <td className="p-3">
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* Other tabs would continue here with similar structure... */}
              <TabsContent value="contracts">
                <div className="text-center py-8">
                  <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Gestione Contratti</h3>
                  <p className="text-gray-600">Funzionalità in sviluppo - contratti e convenzioni</p>
                </div>
              </TabsContent>

              <TabsContent value="support">
                <div className="text-center py-8">
                  <Phone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Sistema Supporto</h3>
                  <p className="text-gray-600">Funzionalità in sviluppo - ticket di supporto</p>
                </div>
              </TabsContent>

              <TabsContent value="billing">
                <div className="text-center py-8">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Gestione Fatturazione</h3>
                  <p className="text-gray-600">Funzionalità in sviluppo - abbonamenti e fatturazione</p>
                </div>
              </TabsContent>

              <TabsContent value="materials">
                <div className="text-center py-8">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Materiali Formativi</h3>
                  <p className="text-gray-600">Funzionalità in sviluppo - materiali e documenti</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Create Zone Form Component
function CreateZoneForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: '',
    territoryType: 'ulss',
    province: '',
    contactEmail: '',
    decreeReference: 'Decreto Regione Veneto 277/2023'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome Zona Operativa</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="es. ULSS 3 Serenissima"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="territoryType">Tipo Territorio</Label>
        <Select value={formData.territoryType} onValueChange={(value) => setFormData({ ...formData, territoryType: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ulss">ULSS</SelectItem>
            <SelectItem value="regione">Regione</SelectItem>
            <SelectItem value="comune">Comune</SelectItem>
            <SelectItem value="atc">ATC</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="province">Provincia</Label>
        <Input
          id="province"
          value={formData.province}
          onChange={(e) => setFormData({ ...formData, province: e.target.value })}
          placeholder="es. Venezia"
          required
        />
      </div>

      <div>
        <Label htmlFor="contactEmail">Email Contatto</Label>
        <Input
          id="contactEmail"
          type="email"
          value={formData.contactEmail}
          onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
          placeholder="es. controllo.fauna@aulss3.veneto.it"
          required
        />
      </div>

      <div>
        <Label htmlFor="decreeReference">Riferimento Decreto</Label>
        <Input
          id="decreeReference"
          value={formData.decreeReference}
          onChange={(e) => setFormData({ ...formData, decreeReference: e.target.value })}
          required
        />
      </div>

      <Button type="submit" className="w-full">
        Crea Zona Operativa
      </Button>
    </form>
  );
}

// Create Admin Form Component
function CreateAdminForm({ zones, onSubmit }: { zones: OperationalZone[], onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    zoneId: '',
    password: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="firstName">Nome</Label>
        <Input
          id="firstName"
          value={formData.firstName}
          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="lastName">Cognome</Label>
        <Input
          id="lastName"
          value={formData.lastName}
          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="zoneId">Zona Assegnata</Label>
        <Select value={formData.zoneId} onValueChange={(value) => setFormData({ ...formData, zoneId: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Seleziona zona" />
          </SelectTrigger>
          <SelectContent>
            {zones.map((zone) => (
              <SelectItem key={zone.id} value={zone.id}>
                {zone.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="password">Password Temporanea</Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
        />
      </div>

      <Button type="submit" className="w-full">
        Crea Amministratore
      </Button>
    </form>
  );
}
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertReserveSchema } from "@shared/schema";
import { z } from "zod";
import { Plus, Users, MapPin, Target, Calendar, Building2, LogOut } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { authService } from "@/lib/auth";

type CreateReserveData = z.infer<typeof insertReserveSchema>;

interface Reserve {
  id: string;
  name: string;
  comune: string;
  emailContatto: string;
  createdAt: string;
  stats: {
    totalUsers: number;
    totalZones: number;
    totalQuotas: number;
    activeReservations: number;
  };
}

export default function SuperAdminDashboard() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleLogout = () => {
    authService.logout();
  };

  const { data: reserves, isLoading } = useQuery<Reserve[]>({
    queryKey: ["/api/reserves"],
  });

  const createReserveMutation = useMutation({
    mutationFn: async (data: Omit<CreateReserveData, 'id'>) => {
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
      setCreateModalOpen(false);
      form.reset();
    },
  });

  const form = useForm<Omit<CreateReserveData, 'id'>>({
    resolver: zodResolver(insertReserveSchema.omit({ id: true })),
    defaultValues: {
      name: "",
      comune: "",
      emailContatto: "",
    },
  });

  const onSubmit = (data: Omit<CreateReserveData, 'id'>) => {
    createReserveMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Caricamento dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Dashboard Super Amministratore
              </h1>
              <p className="text-gray-600">
                Gestisci tutte le riserve di caccia sulla piattaforma SeleApp
              </p>
            </div>
            <div className="flex gap-3">
              <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Nuova Riserva
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crea Nuova Riserva</DialogTitle>
                  <DialogDescription>
                    Aggiungi una nuova riserva di caccia al sistema
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome Riserva</Label>
                    <Input
                      id="name"
                      {...form.register("name")}
                      placeholder="es. Riserva di Valstagna"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="comune">Comune</Label>
                    <Input
                      id="comune"
                      {...form.register("comune")}
                      placeholder="es. Valstagna"
                    />
                    {form.formState.errors.comune && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.comune.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="emailContatto">Email di Contatto</Label>
                    <Input
                      id="emailContatto"
                      type="email"
                      {...form.register("emailContatto")}
                      placeholder="es. admin@riservavalstagna.it"
                    />
                    {form.formState.errors.emailContatto && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.emailContatto.message}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setCreateModalOpen(false)}
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
              <Button 
                onClick={handleLogout}
                variant="outline" 
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Riserve Totali</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reserves?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utenti Totali</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reserves?.reduce((sum, reserve) => sum + reserve.stats.totalUsers, 0) || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Zone Totali</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reserves?.reduce((sum, reserve) => sum + reserve.stats.totalZones, 0) || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prenotazioni Attive</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reserves?.reduce((sum, reserve) => sum + reserve.stats.activeReservations, 0) || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reserves List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reserves?.map((reserve) => (
            <Card key={reserve.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{reserve.name}</CardTitle>
                <CardDescription>
                  {reserve.comune} • {reserve.emailContatto}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2 text-blue-600" />
                    <span>{reserve.stats.totalUsers} utenti</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-green-600" />
                    <span>{reserve.stats.totalZones} zone</span>
                  </div>
                  <div className="flex items-center">
                    <Target className="w-4 h-4 mr-2 text-orange-600" />
                    <span>{reserve.stats.totalQuotas} quote</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-purple-600" />
                    <span>{reserve.stats.activeReservations} attive</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => {
                      // TODO: Implement reserve switching/impersonation
                      console.log("Switch to reserve:", reserve.id);
                    }}
                  >
                    Accedi alla Riserva
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {reserves?.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nessuna riserva</h3>
            <p className="mt-1 text-sm text-gray-500">
              Inizia creando la prima riserva di caccia.
            </p>
            <div className="mt-6">
              <Button 
                onClick={() => setCreateModalOpen(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crea Prima Riserva
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
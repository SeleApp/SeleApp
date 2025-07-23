import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { createAdminSchema, type CreateAdminRequest } from "@shared/schema";
import { UserPlus, Shield, Trash2, Users, CheckCircle, XCircle } from "lucide-react";

interface AdminManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AdminUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminManagementModal({ open, onOpenChange }: AdminManagementModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateAdminRequest>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      role: "ADMIN",
    },
  });

  // Query per ottenere tutti gli admin
  const { data: admins = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/superadmin/admins"],
    enabled: open,
  });

  // Mutation per creare nuovo admin
  const createAdminMutation = useMutation({
    mutationFn: async (data: CreateAdminRequest) => {
      const response = await fetch("/api/superadmin/create-admin", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Errore durante la creazione dell'admin");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Admin creato",
        description: "Account amministratore creato con successo",
      });
      form.reset();
      setIsCreating(false);
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/admins"] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la creazione dell'admin",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateAdminRequest) => {
    createAdminMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestione Account Amministratori
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form creazione nuovo admin */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserPlus className="h-5 w-5" />
                Crea Nuovo Admin
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isCreating ? (
                <Button 
                  onClick={() => setIsCreating(true)}
                  className="w-full"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Aggiungi Nuovo Amministratore
                </Button>
              ) : (
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Nome</Label>
                      <Input
                        id="firstName"
                        {...form.register("firstName")}
                        placeholder="Mario"
                        disabled={createAdminMutation.isPending}
                      />
                      {form.formState.errors.firstName && (
                        <p className="text-sm text-red-600">{form.formState.errors.firstName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Cognome</Label>
                      <Input
                        id="lastName"
                        {...form.register("lastName")}
                        placeholder="Rossi"
                        disabled={createAdminMutation.isPending}
                      />
                      {form.formState.errors.lastName && (
                        <p className="text-sm text-red-600">{form.formState.errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      {...form.register("email")}
                      placeholder="admin@riserva.com"
                      disabled={createAdminMutation.isPending}
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      {...form.register("password")}
                      placeholder="Minimo 6 caratteri"
                      disabled={createAdminMutation.isPending}
                    />
                    {form.formState.errors.password && (
                      <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreating(false);
                        form.reset();
                      }}
                      disabled={createAdminMutation.isPending}
                      className="flex-1"
                    >
                      Annulla
                    </Button>
                    <Button
                      type="submit"
                      disabled={createAdminMutation.isPending}
                      className="flex-1"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Crea Admin
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Lista admin esistenti */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5" />
                Amministratori Esistenti
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Caricamento...</p>
                </div>
              ) : !admins || (Array.isArray(admins) && admins.length === 0) ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nessun amministratore trovato</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {Array.isArray(admins) && admins.map((admin: AdminUser) => (
                    <div 
                      key={admin.id} 
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">
                            {admin.firstName} {admin.lastName}
                          </span>
                          {admin.isActive ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{admin.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Creato: {new Date(admin.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          admin.isActive 
                            ? "bg-green-100 text-green-800" 
                            : "bg-red-100 text-red-800"
                        }`}>
                          {admin.isActive ? "Attivo" : "Disattivo"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Chiudi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
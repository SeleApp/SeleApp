import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { registerHunterSchema, type RegisterHunterRequest, type Reserve } from "@shared/schema";
import { UserPlus, Shield, Eye, EyeOff, Loader2 } from "lucide-react";

interface AccessCodeRegistrationProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AccessCodeRegistration({ onSuccess, onCancel }: AccessCodeRegistrationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeReserves, setActiveReserves] = useState<Reserve[]>([]);
  const [loadingReserves, setLoadingReserves] = useState(true);
  const { toast } = useToast();

  const form = useForm<RegisterHunterRequest>({
    resolver: zodResolver(registerHunterSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      reserveId: "",
      accessCode: "",
    },
  });

  // Carica le riserve attive all'avvio
  useEffect(() => {
    const fetchActiveReserves = async () => {
      try {
        const response = await fetch('/api/reserves/active');
        if (response.ok) {
          const reserves = await response.json();
          setActiveReserves(reserves);
        } else {
          toast({
            title: "Errore",
            description: "Impossibile caricare le riserve disponibili",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Errore di Connessione",
          description: "Impossibile contattare il server",
          variant: "destructive",
        });
      } finally {
        setLoadingReserves(false);
      }
    };

    fetchActiveReserves();
  }, [toast]);

  const onSubmit = async (data: RegisterHunterRequest) => {
    try {
      setIsLoading(true);
      const { confirmPassword, ...registrationData } = data;
      
      // Debug: log dei dati inviati
      console.log("Dati registrazione:", registrationData);
      
      const response = await fetch("/api/auth/register-hunter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registrationData),
      });

      if (response.ok) {
        toast({
          title: "Registrazione Completata",
          description: "Account creato con successo. Puoi ora effettuare il login.",
        });
        onSuccess();
      } else {
        const error = await response.json();
        toast({
          title: "Errore Registrazione",
          description: error.error || "Errore durante la registrazione",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore di connessione durante la registrazione",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <Shield className="h-6 w-6 text-green-600" />
        </div>
        <CardTitle className="text-xl font-bold">Registrazione Cacciatore</CardTitle>
        <p className="text-sm text-gray-600">
          Seleziona la tua riserva e inserisci il codice d'accesso
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Nome e Cognome */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Nome</Label>
              <Input
                id="firstName"
                {...form.register("firstName")}
                disabled={isLoading}
                required
              />
              {form.formState.errors.firstName && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.firstName.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName">Cognome</Label>
              <Input
                id="lastName"
                {...form.register("lastName")}
                disabled={isLoading}
                required
              />
              {form.formState.errors.lastName && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...form.register("email")}
              disabled={isLoading}
              required
            />
            {form.formState.errors.email && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          {/* Selezione Riserva */}
          <div>
            <Label htmlFor="reserveId">Riserva di Caccia</Label>
            {loadingReserves ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-gray-600">Caricamento riserve...</span>
              </div>
            ) : (
              <Select 
                onValueChange={(value) => form.setValue("reserveId", value, { shouldValidate: true })} 
                disabled={isLoading}
                value={form.watch("reserveId")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona la tua riserva" />
                </SelectTrigger>
                <SelectContent>
                  {activeReserves.map((reserve) => (
                    <SelectItem key={reserve.id} value={reserve.id}>
                      {reserve.name} - {reserve.comune}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {form.formState.errors.reserveId && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.reserveId.message}
              </p>
            )}
          </div>

          {/* Codice d'Accesso */}
          <div>
            <Label htmlFor="accessCode">Codice d'Accesso</Label>
            <Input
              id="accessCode"
              {...form.register("accessCode")}
              disabled={isLoading}
              placeholder="Inserisci il codice fornito dalla riserva"
              required
            />
            {form.formState.errors.accessCode && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.accessCode.message}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Il codice d'accesso ti è stato fornito dalla tua riserva di caccia
            </p>
          </div>

          {/* Selezione Gruppo (solo per Cison di Valmarino) */}
          {form.watch("reserveId") === "cison-valmarino" && (
            <div>
              <Label htmlFor="hunterGroup">Gruppo di Appartenenza</Label>
              <Select value={form.watch("hunterGroup") || ""} onValueChange={(value) => form.setValue("hunterGroup", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona il tuo gruppo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Gruppo A</SelectItem>
                  <SelectItem value="B">Gruppo B</SelectItem>
                  <SelectItem value="C">Gruppo C</SelectItem>
                  <SelectItem value="D">Gruppo D</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-600 mt-1">
                Per la riserva di Cison di Valmarino è obbligatorio specificare il gruppo di appartenenza
              </p>
              {form.formState.errors.hunterGroup && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.hunterGroup.message}
                </p>
              )}
            </div>
          )}

          {/* Password */}
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                {...form.register("password")}
                disabled={isLoading}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {form.formState.errors.password && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          {/* Conferma Password */}
          <div>
            <Label htmlFor="confirmPassword">Conferma Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                {...form.register("confirmPassword")}
                disabled={isLoading}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {form.formState.errors.confirmPassword && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Bottoni */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={isLoading || loadingReserves}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrazione...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Registrati
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
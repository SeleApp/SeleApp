import { useState, useEffect } from "react";
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
import { UserPlus, Shield, CheckCircle, XCircle, Loader2, Eye, EyeOff } from "lucide-react";

interface HunterRegistrationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function HunterRegistrationForm({ onSuccess, onCancel }: HunterRegistrationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeReserves, setActiveReserves] = useState<Reserve[]>([]);
  const [loadingReserves, setLoadingReserves] = useState(true);
  const [selectedReserve, setSelectedReserve] = useState<Reserve | null>(null);
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
      hunterGroup: undefined,
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
      
      // Verifica che sia stata selezionata una riserva
      if (!selectedReserve) {
        toast({
          title: "Errore",
          description: "Devi selezionare una riserva prima di procedere",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch("/api/auth/register-hunter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Errore durante la registrazione");
      }

      toast({
        title: "Registrazione completata",
        description: "Account cacciatore creato con successo. Ora puoi effettuare il login.",
      });

      form.reset();
      setSelectedReserve(null);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la registrazione",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <UserPlus className="h-6 w-6 text-green-600" />
        </div>
        <CardTitle className="text-2xl font-bold">Registrazione Cacciatore</CardTitle>
        <p className="text-muted-foreground">
          Solo cacciatori con riserva attiva possono registrarsi
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nome</Label>
              <Input
                id="firstName"
                {...form.register("firstName")}
                placeholder="Mario"
                disabled={isLoading}
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
                disabled={isLoading}
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
              placeholder="mario.rossi@email.com"
              disabled={isLoading}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reserveId">Riserva di Caccia</Label>
            <Select
              value={form.watch("reserveId") || ""}
              onValueChange={(value) => {
                form.setValue("reserveId", value);
                // Trova la riserva selezionata per mostrare la selezione gruppo
                const reserve = activeReserves.find(r => r.id === value);
                setSelectedReserve(reserve || null);
              }}
              disabled={isLoading || loadingReserves}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingReserves ? "Caricamento riserve..." : "Seleziona la tua riserva"} />
              </SelectTrigger>
              <SelectContent>
                {activeReserves.map(reserve => (
                  <SelectItem key={reserve.id} value={reserve.id}>
                    {reserve.name} - {reserve.comune}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.reserveId && (
              <p className="text-sm text-red-600">{form.formState.errors.reserveId.message}</p>
            )}
            
            {/* Indicatore riserva selezionata */}
            {selectedReserve && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-green-600">
                  {selectedReserve.managementType === 'zones_groups' ? 
                    `Riserva con sistema "Zone & gruppi" selezionata` :
                    `Riserva selezionata`
                  }
                </span>
              </div>
            )}
          </div>

          {/* Selezione gruppo per riserve "Zone & gruppi" */}
          {selectedReserve?.managementType === 'zones_groups' && (
            <div className="space-y-2">
              <Label htmlFor="hunterGroup">Gruppo di Appartenenza</Label>
              <Select
                value={form.watch("hunterGroup") || ""}
                onValueChange={(value) => form.setValue("hunterGroup", value as 'A' | 'B' | 'C' | 'D' | 'E' | 'F')}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Seleziona il tuo gruppo (${selectedReserve.activeGroups?.join(', ') || 'A, B, C, D'})`} />
                </SelectTrigger>
                <SelectContent>
                  {(selectedReserve.activeGroups || ['A', 'B', 'C', 'D']).map(group => (
                    <SelectItem key={group} value={group}>Gruppo {group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.hunterGroup && (
                <p className="text-sm text-red-600">{form.formState.errors.hunterGroup.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Questa riserva utilizza il sistema "Zone & gruppi". Ogni cacciatore deve appartenere a un gruppo specifico.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              {...form.register("password")}
              placeholder="Minimo 6 caratteri"
              disabled={isLoading}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Conferma Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              {...form.register("confirmPassword")}
              placeholder="Ripeti la password"
              disabled={isLoading}
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-sm text-red-600">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>

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
              disabled={isLoading || !reserveValidation.valid}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Shield className="h-4 w-4 mr-2" />
              )}
              Registrati
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
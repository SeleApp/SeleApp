import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { loginSchema, type LoginRequest } from "@shared/schema";
import React from "react";
import { LogIn, UserPlus, Shield } from "lucide-react";
import logoPath from "@assets/ChatGPT Image 24 giu 2025, 00_38_53_1750799612475.png";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const { toast } = useToast();

  const loginForm = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm({
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
    },
  });

  // Check authentication on mount
  React.useEffect(() => {
    if (authService.isAuthenticated()) {
      if (authService.isAdmin()) {
        navigate("/admin");
      } else {
        navigate("/hunter");
      }
    }
  }, [navigate]);

  const onLogin = async (data: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.login(data);
      toast({
        title: "Accesso effettuato",
        description: `Benvenuto, ${response.user.firstName}!`,
      });

      // Redirect based on role
      if (response.user.role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/hunter");
      }
    } catch (error: any) {
      toast({
        title: "Errore di accesso",
        description: error.message || "Credenziali non valide",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onRegister = async (data: any) => {
    setIsLoading(true);

    // Validazioni
    if (data.password !== data.confirmPassword) {
      toast({
        title: "Errore",
        description: "Le password non corrispondono",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (data.password.length < 6) {
      toast({
        title: "Errore", 
        description: "La password deve essere di almeno 6 caratteri",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiRequest("POST", "/api/auth/register", {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: "HUNTER"
      });

      toast({
        title: "Registrazione completata",
        description: "Il tuo account cacciatore è stato creato. Ora puoi effettuare l'accesso.",
      });

      // Reset form e torna al login
      setIsRegistering(false);
      registerForm.reset();
      loginForm.reset();
    } catch (error: any) {
      toast({
        title: "Errore di registrazione",
        description: error.message || "Errore nella creazione dell'account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center">
            <img
              src={logoPath}
              alt="SeleApp Logo"
              className="h-20 w-20 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            SeleApp Cison
          </CardTitle>
          <p className="text-sm text-gray-600">
            Sistema di Gestione Prenotazioni di Caccia
          </p>
        </CardHeader>
        <CardContent>
          {/* Toggle tra Login e Registrazione */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(false);
                registerForm.reset();
                loginForm.reset();
              }}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                !isRegistering
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LogIn className="mr-2 h-4 w-4 inline" />
              Accedi
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegistering(true);
                registerForm.reset();
                loginForm.reset();
              }}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                isRegistering
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <UserPlus className="mr-2 h-4 w-4 inline" />
              Registrati
            </button>
          </div>

          {/* Form di Login */}
          {!isRegistering && (
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  {...loginForm.register("email")}
                  id="email"
                  type="email"
                  placeholder="mario.rossi@email.com"
                  className="h-11"
                />
                {loginForm.formState.errors.email && (
                  <p className="text-sm text-red-600">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  {...loginForm.register("password")}
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="h-11"
                />
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-red-600">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-green-600 hover:bg-green-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  "Accesso in corso..."
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Accedi
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Form di Registrazione */}
          {isRegistering && (
            <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome</Label>
                  <Input
                    {...registerForm.register("firstName")}
                    id="firstName"
                    type="text"
                    placeholder="Mario"
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Cognome</Label>
                  <Input
                    {...registerForm.register("lastName")}
                    id="lastName"
                    type="text"
                    placeholder="Rossi"
                    className="h-11"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="registerEmail">Email</Label>
                <Input
                  {...registerForm.register("email")}
                  id="registerEmail"
                  type="email"
                  placeholder="mario.rossi@email.com"
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registerPassword">Password</Label>
                <Input
                  {...registerForm.register("password")}
                  id="registerPassword"
                  type="password"
                  placeholder="••••••••"
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Conferma Password</Label>
                <Input
                  {...registerForm.register("confirmPassword")}
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="h-11"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-green-600 hover:bg-green-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  "Registrazione in corso..."
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Crea Account Cacciatore
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 text-center">
                Creando un account, confermi di essere un cacciatore autorizzato per Cison di Val Marino
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
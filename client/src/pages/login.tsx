import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/lib/auth";
import { loginSchema, type LoginRequest } from "@shared/schema";
import AccessCodeRegistration from "@/components/access-code-registration";

import { LogIn, UserPlus, Shield, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import logoPath from "@assets/ChatGPT Image 24 giu 2025, 00_38_53_1750799612475.png";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const { toast } = useToast();

  // Immediate demo check on component mount
  const urlParams = new URLSearchParams(window.location.search);
  const demoType = urlParams.get('demo');
  
  console.log('IMMEDIATE DEMO CHECK:', { 
    demoType, 
    search: window.location.search, 
    href: window.location.href,
    pathname: window.location.pathname 
  });

  const loginForm = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Check for demo parameter and handle demo login
  useEffect(() => {
    console.log('USEEFFECT TRIGGERED - Demo check in useEffect');
    const urlParams = new URLSearchParams(window.location.search);
    const demoType = urlParams.get('demo');
    
    console.log('USEEFFECT Demo check:', { demoType, search: window.location.search, url: window.location.href });
    
    if (demoType && ['hunter', 'admin', 'superadmin', 'tecnico-faunistico'].includes(demoType)) {
      console.log('USEEFFECT Starting demo login for:', demoType);
      setIsDemoLoading(true);
      // Auto-login demo senza mostrare il form
      handleDemoLogin(demoType);
      return;
    }

    // Regular authentication check
    if (authService.isAuthenticated()) {
      const user = authService.getUser();
      console.log('USEEFFECT User already authenticated:', user);
      if (user?.role === "SUPERADMIN") {
        navigate("/superadmin");
      } else if (user?.role === "ADMIN") {
        navigate("/admin");
      } else if (user?.role === "BIOLOGO" || user?.role === "PROVINCIA") {
        navigate("/fauna");
      } else {
        navigate("/hunter");
      }
    }
  }, [navigate]); // Include navigate in dependencies

  const handleDemoLogin = async (demoType: string) => {
    console.log('handleDemoLogin called for:', demoType);
    setIsLoading(true);
    setIsDemoLoading(true);
    try {
      console.log('DEMO: Starting setup...');
      // Prima crea la riserva demo se non esiste
      const setupResponse = await apiRequest('/api/demo/setup', { method: 'POST' });
      await setupResponse.json(); // Consume the response
      console.log('DEMO: Setup completed, starting demo session...');
      
      // Poi avvia la sessione demo
      const apiResponse = await apiRequest(`/api/demo/start/${demoType}`, { method: 'POST' });
      const response = await apiResponse.json();
      console.log('DEMO: API response received:', response);
      console.log('DEMO: Response type:', typeof response);
      console.log('DEMO: Response keys:', Object.keys(response || {}));
      console.log('DEMO: Response.success specifically:', response?.success);
      
      if (response && response.success) {
        console.log('DEMO: Success confirmed, saving token...');
        // Salva il token di demo usando le chiavi corrette per authService
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('auth_user', JSON.stringify(response.user));
        
        // Forza l'aggiornamento dell'authService re-inizializzandolo
        const currentToken = localStorage.getItem('auth_token');
        const currentUser = localStorage.getItem('auth_user');
        console.log('DEMO: Forcing authService refresh with:', { currentToken: currentToken ? 'EXISTS' : 'MISSING', currentUser: currentUser ? 'EXISTS' : 'MISSING' });
        
        // Re-inizializza authService per caricare i nuovi dati
        (authService as any).token = response.token;
        (authService as any).user = response.user;
        
        console.log('DEMO: Token saved, showing toast...');
        
        toast({
          title: `Demo ${demoType.charAt(0).toUpperCase() + demoType.slice(1)} Avviata`,
          description: `Benvenuto nella demo! Hai ${response.demoInfo.durationMinutes} minuti per esplorare.`,
        });
        console.log('DEMO: Toast shown, preparing navigation...');

        // Redirect basato sul tipo demo
        console.log('Demo login successful, navigating to dashboard for role:', response.user.role);
        
        // Force navigation with setTimeout to ensure state updates
        setTimeout(() => {
          console.log('DEMO: Executing navigation now...');
          console.log('DEMO: Current localStorage token:', localStorage.getItem('token') ? 'EXISTS' : 'MISSING');
          console.log('DEMO: Current authService.isAuthenticated():', authService.isAuthenticated());
          console.log('DEMO: Current authService.getUser():', authService.getUser());
          
          if (response.user.role === "SUPERADMIN") {
            navigate("/superadmin");
          } else if (response.user.role === "ADMIN") {
            navigate("/admin");
          } else if (response.user.role === "BIOLOGO" || response.user.role === "PROVINCIA") {
            navigate("/fauna");
          } else {
            navigate("/hunter");
          }
        }, 100);
      } else {
        console.log('DEMO: Response success was false:', response);
      }
    } catch (error: any) {
      toast({
        title: "Errore Demo",
        description: error.message || "Impossibile avviare la demo",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsDemoLoading(false);
    }
  };

  const onLogin = async (data: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.login(data);
      toast({
        title: "Accesso effettuato",
        description: `Benvenuto, ${response.user.firstName}!`,
      });

      // Redirect based on role
      if (response.user.role === "SUPERADMIN") {
        navigate("/superadmin");
      } else if (response.user.role === "ADMIN") {
        navigate("/admin");
      } else if (response.user.role === "BIOLOGO" || response.user.role === "PROVINCIA") {
        navigate("/fauna");
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



  // Se la demo è in caricamento, mostra solo il loading
  if (isDemoLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center">
              <img
                src={logoPath}
                alt="SeleApp Logo"
                className="h-20 w-20 object-contain"
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">SeleApp</h2>
            <p className="text-lg text-gray-600 text-center mb-6">
              Avvio demo in corso...
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <CardTitle className="text-2xl font-bold text-gray-900">SeleApp</CardTitle>
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
            <AccessCodeRegistration 
              onSuccess={() => {
                toast({
                  title: "Registrazione Completata",
                  description: "Account creato con successo. Puoi ora effettuare il login.",
                });
                setIsRegistering(false);
              }}
              onCancel={() => setIsRegistering(false)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
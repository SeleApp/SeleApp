import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/lib/auth";
import { loginSchema, type LoginRequest } from "@shared/schema";
import { Mountain, LogIn } from "lucide-react";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginRequest) => {
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
    } catch (error) {
      toast({
        title: "Errore di accesso",
        description: error instanceof Error ? error.message : "Credenziali non valide",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect if already authenticated
  if (authService.isAuthenticated()) {
    const user = authService.getUser();
    if (user?.role === "ADMIN") {
      navigate("/admin");
    } else {
      navigate("/hunter");
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-primary/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Mountain className="text-white text-3xl" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">SeleApp</h1>
            <p className="text-lg text-gray-600">Cison di Val Marino</p>
            <p className="text-base text-gray-500 mt-1">Sistema Gestione Caccia</p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="email" className="block text-lg font-medium text-gray-700 mb-2">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="la.tua@email.com"
                {...form.register("email")}
                className="input-large"
                disabled={isLoading}
              />
              {form.formState.errors.email && (
                <p className="text-destructive text-sm mt-1">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password" className="block text-lg font-medium text-gray-700 mb-2">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...form.register("password")}
                className="input-large"
                disabled={isLoading}
              />
              {form.formState.errors.password && (
                <p className="text-destructive text-sm mt-1">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full btn-large bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <LogIn className="mr-2" size={20} />
              {isLoading ? "Accesso in corso..." : "Accedi"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <a href="#" className="text-primary hover:underline text-base">
              Password dimenticata?
            </a>
          </div>

          <div className="mt-8 p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600 mb-2 font-medium">Credenziali di test:</p>
            <p className="text-sm text-gray-500">Admin: admin@seleapp.com / admin123</p>
            <p className="text-sm text-gray-500">Cacciatore: mario.rossi@email.com / hunter123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

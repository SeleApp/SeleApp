// © 2025 Alessandro Favero - Tutti i diritti riservati
// Licenza: Uso riservato esclusivamente alle riserve attivate tramite contratto
// Vietata la riproduzione, distribuzione o modifica non autorizzata

import { Switch, Route, Redirect, useLocation } from "wouter";
import { ComponentType } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { authService } from "./lib/auth";
import LoginPage from "./pages/login";
import HunterDashboard from "./pages/hunter-dashboard-simple";
import AdminDashboard from "./pages/admin-dashboard-new";
import SuperAdminDashboard from "./pages/superadmin-dashboard";
import DashboardFauna from "./pages/dashboard-fauna";
import NotFound from "@/pages/not-found";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import DemoIndicator from "@/components/demo-indicator";

function ProtectedRoute({ component: Component, requiredRole }: { 
  component: ComponentType; 
  requiredRole?: string | string[];
}) {
  if (!authService.isAuthenticated()) {
    return <Redirect to="/app" />;
  }

  const user = authService.getUser();
  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!user?.role || !allowedRoles.includes(user.role)) {
      return <Redirect to="/app" />;
    }
  }

  return <Component />;
}

function AppRoute() {
  const [location] = useLocation();
  
  // Match /app with or without query parameters
  if (location === "/app" || location.startsWith("/app?")) {
    return <LoginPage />;
  }
  
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LoginPage} />
      <Route path="/app" component={AppRoute} />
      <Route path="/hunter">
        <ProtectedRoute component={HunterDashboard} requiredRole="HUNTER" />
      </Route>
      <Route path="/admin">
        <ProtectedRoute component={AdminDashboard} requiredRole="ADMIN" />
      </Route>
      <Route path="/superadmin">
        <ProtectedRoute component={SuperAdminDashboard} requiredRole="SUPERADMIN" />
      </Route>
      <Route path="/fauna">
        <ProtectedRoute component={DashboardFauna} requiredRole={["BIOLOGO", "PROVINCIA"]} />
      </Route>
      <Route>
        {() => {
          const [location] = useLocation();
          // Catch app routes with query params that didn't match above
          if (location.startsWith("/app")) {
            return <LoginPage />;
          }
          return <NotFound />;
        }}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <DemoIndicator />
        <PWAInstallPrompt />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

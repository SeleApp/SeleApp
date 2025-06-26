import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { authService } from "./lib/auth";
import LoginPage from "./pages/login";
import HunterDashboard from "./pages/hunter-dashboard-simple";
import AdminDashboard from "./pages/admin-dashboard-new";
import SuperAdminDashboard from "./pages/superadmin-dashboard";
import NotFound from "@/pages/not-found";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";

function ProtectedRoute({ component: Component, requiredRole }: { 
  component: React.ComponentType; 
  requiredRole?: string;
}) {
  if (!authService.isAuthenticated()) {
    return <Redirect to="/" />;
  }

  if (requiredRole && authService.getUser()?.role !== requiredRole) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LoginPage} />
      <Route path="/app" component={LoginPage} />
      <Route path="/hunter">
        <ProtectedRoute component={HunterDashboard} requiredRole="HUNTER" />
      </Route>
      <Route path="/admin">
        <ProtectedRoute component={AdminDashboard} requiredRole="ADMIN" />
      </Route>
      <Route path="/superadmin">
        <ProtectedRoute component={SuperAdminDashboard} requiredRole="SUPERADMIN" />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <PWAInstallPrompt />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

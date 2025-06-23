import { Button } from "@/components/ui/button";
import { authService } from "@/lib/auth";
import { Mountain, LogOut } from "lucide-react";

export default function Header() {
  const user = authService.getUser();

  const handleLogout = () => {
    authService.logout();
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mr-4">
              <Mountain className="text-white text-xl" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SeleApp</h1>
              <p className="text-sm text-gray-500">
                Dashboard {user?.role === 'ADMIN' ? 'Amministratore' : 'Cacciatore'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-lg text-gray-700">
              {user?.firstName} {user?.lastName}
            </span>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700"
            >
              <LogOut size={20} />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

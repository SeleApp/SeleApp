import { Button } from "@/components/ui/button";
import { authService } from "@/lib/auth";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export default function Header() {
  const user = authService.getUser();

  const handleLogout = () => {
    authService.logout();
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          <div className="flex items-center min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-12 sm:h-12 mr-2 sm:mr-4 flex items-center justify-center flex-shrink-0">
              <Logo className="w-6 h-6 sm:w-10 sm:h-10 object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">SeleApp</h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                <span className="hidden sm:inline">Dashboard </span>
                {user?.role === 'ADMIN' ? 'Admin' : user?.role === 'SUPERADMIN' ? 'SuperAdmin' : 'Cacciatore'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            <span className="text-sm sm:text-lg text-gray-700 hidden sm:block truncate max-w-32 lg:max-w-none">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="text-xs text-gray-700 sm:hidden truncate max-w-20">
              {user?.firstName}
            </span>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700 p-2 sm:p-3"
              size="sm"
            >
              <LogOut size={16} className="sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

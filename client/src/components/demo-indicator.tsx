import { useState, useEffect } from "react";
import { Clock, Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface DemoStatus {
  isDemo: boolean;
  demoType: string;
  minutesRemaining: number;
  isExpired: boolean;
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}

export default function DemoIndicator() {
  const [demoStatus, setDemoStatus] = useState<DemoStatus | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    checkDemoStatus();
    const interval = setInterval(checkDemoStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const checkDemoStatus = async () => {
    try {
      const status = await apiRequest('/api/demo/status', { method: 'GET' }) as any;
      setDemoStatus(status);
      
      if (status.isExpired) {
        // Demo scaduta, fai logout
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/app';
      }
    } catch (error) {
      // Non è una sessione demo o errore
      setDemoStatus(null);
    }
  };

  if (!demoStatus || !demoStatus.isDemo || !isVisible) {
    return null;
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'hunter': return 'bg-green-100 text-green-800 border-green-200';
      case 'admin': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'tecnico-faunistico': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'superadmin': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-orange-100 text-orange-800 border-orange-200';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'hunter': return 'Demo Cacciatore';
      case 'admin': return 'Demo Amministratore';
      case 'superadmin': return 'Demo SuperAdmin';
      default: return 'Demo';
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm ${getTypeColor(demoStatus.demoType)} border rounded-lg p-3 shadow-lg backdrop-blur-sm`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <Info className="h-4 w-4 flex-shrink-0" />
          <div className="text-sm">
            <div className="font-semibold">{getTypeLabel(demoStatus.demoType)}</div>
            <div className="flex items-center space-x-1 mt-1">
              <Clock className="h-3 w-3" />
              <span className="text-xs">
                {demoStatus.minutesRemaining > 0 
                  ? `${demoStatus.minutesRemaining} min rimanenti`
                  : 'Demo scaduta'
                }
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-current opacity-60 hover:opacity-100 transition-opacity"
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {demoStatus.minutesRemaining <= 5 && (
        <div className="mt-2 text-xs opacity-75">
          La demo sta per scadere. Salvate le vostre osservazioni!
        </div>
      )}
    </div>
  );
}
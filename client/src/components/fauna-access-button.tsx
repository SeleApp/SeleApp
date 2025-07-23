import { Button } from "@/components/ui/button";
import { Microscope } from "lucide-react";
import { useLocation } from "wouter";
import { authService } from "@/lib/auth";

export function FaunaAccessButton() {
  const [, setLocation] = useLocation();
  const user = authService.getUser();

  // Mostra il pulsante solo per utenti BIOLOGO o PROVINCIA
  if (!user || !['BIOLOGO', 'PROVINCIA'].includes(user.role)) {
    return null;
  }

  const handleClick = () => {
    setLocation('/fauna');
  };

  return (
    <Button 
      onClick={handleClick} 
      className="bg-green-600 hover:bg-green-700 text-white"
      size="sm"
    >
      <Microscope className="h-4 w-4 mr-2" />
      Gestione Faunistica
    </Button>
  );
}
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, RefreshCw, Edit3, Check, X, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AccessCodeManagerProps {
  reserve: {
    id: string;
    name: string;
    accessCode: string;
    codeActive: boolean;
  };
}

export default function AccessCodeManager({ reserve }: AccessCodeManagerProps) {
  const [showCode, setShowCode] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newCode, setNewCode] = useState(reserve.accessCode);
  const [isActive, setIsActive] = useState(reserve.codeActive);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateAccessCodeMutation = useMutation({
    mutationFn: async (data: { accessCode?: string; codeActive?: boolean; generateNew?: boolean }) => {
      const response = await apiRequest(`/api/superadmin/access-codes/${reserve.id}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reserves"] });
      setNewCode(data.reserve.accessCode);
      setEditMode(false);
      toast({
        title: "Codice aggiornato",
        description: "Il codice di accesso è stato aggiornato con successo.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateNewCode = () => {
    if (confirm("Generare un nuovo codice casuale? Il codice attuale non sarà più valido.")) {
      updateAccessCodeMutation.mutate({ generateNew: true, codeActive: isActive });
    }
  };

  const saveChanges = () => {
    if (newCode.length < 4) {
      toast({
        title: "Errore",
        description: "Il codice deve avere almeno 4 caratteri.",
        variant: "destructive",
      });
      return;
    }
    updateAccessCodeMutation.mutate({ 
      accessCode: newCode, 
      codeActive: isActive 
    });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(reserve.accessCode);
    toast({
      title: "Copiato",
      description: "Codice copiato negli appunti.",
    });
  };

  const displayCode = showCode ? reserve.accessCode : "●".repeat(reserve.accessCode.length);

  return (
    <div className="flex items-center gap-2">
      {/* Indicatore stato */}
      <div className={`w-2 h-2 rounded-full ${reserve.codeActive ? 'bg-green-500' : 'bg-red-500'}`} />
      
      {/* Codice mascherato/visibile */}
      <span className="font-mono text-sm min-w-[80px]">
        {displayCode}
      </span>

      {/* Bottone mostra/nascondi */}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setShowCode(!showCode)}
        className="h-6 w-6 p-0"
      >
        {showCode ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </Button>

      {/* Bottone copia */}
      <Button
        size="sm"
        variant="ghost"
        onClick={copyToClipboard}
        className="h-6 w-6 p-0"
        title="Copia codice"
      >
        <Copy className="h-3 w-3" />
      </Button>

      {/* Dialog per gestione completa */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            title="Gestisci codice"
          >
            <Edit3 className="h-3 w-3" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gestisci Codice Accesso</DialogTitle>
            <p className="text-sm text-gray-600">
              Riserva: <strong>{reserve.name}</strong>
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {/* Stato attivo/disattivo */}
            <div className="flex items-center justify-between">
              <Label htmlFor="code-active">Codice attivo</Label>
              <Switch
                id="code-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            {/* Codice attuale */}
            <div className="space-y-2">
              <Label>Codice di accesso</Label>
              {editMode ? (
                <div className="flex gap-2">
                  <Input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="Inserisci nuovo codice"
                    className="font-mono"
                    maxLength={20}
                  />
                  <Button
                    size="sm"
                    onClick={saveChanges}
                    disabled={updateAccessCodeMutation.isPending}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditMode(false);
                      setNewCode(reserve.accessCode);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={reserve.accessCode}
                    readOnly
                    className="font-mono bg-gray-50"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditMode(true)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Generazione automatica */}
            <div className="pt-4 border-t">
              <Button
                onClick={generateNewCode}
                disabled={updateAccessCodeMutation.isPending}
                className="w-full"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Genera Nuovo Codice Casuale
              </Button>
            </div>

            {/* Info */}
            <div className="text-xs text-gray-500 space-y-1">
              <p>• Il codice deve avere tra 4 e 20 caratteri</p>
              <p>• I cacciatori usano questo codice per registrarsi</p>
              <p>• Se disattivato, le nuove registrazioni saranno bloccate</p>
            </div>

            {/* Salva stato */}
            {(isActive !== reserve.codeActive) && !editMode && (
              <Button
                onClick={() => updateAccessCodeMutation.mutate({ codeActive: isActive })}
                disabled={updateAccessCodeMutation.isPending}
                className="w-full"
              >
                Aggiorna Stato
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
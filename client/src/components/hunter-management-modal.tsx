import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, UserCheck, UserX, Plus } from "lucide-react";
import HunterModal from "./hunter-modal";

interface HunterManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function HunterManagementModal({ open, onOpenChange }: HunterManagementModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showHunterModal, setShowHunterModal] = useState(false);
  const [selectedHunter, setSelectedHunter] = useState<any>(null);

  const { data: hunters = [] } = useQuery({
    queryKey: ["/api/admin/hunters"],
    enabled: open,
  });

  const toggleHunterStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return await apiRequest(`/api/admin/hunters/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Stato aggiornato",
        description: "Lo stato del cacciatore è stato modificato con successo.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hunters"] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nell'aggiornamento dello stato.",
        variant: "destructive",
      });
    },
  });

  const deleteHunterMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/admin/hunters/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Cacciatore eliminato",
        description: "L'account del cacciatore è stato eliminato con successo.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hunters"] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nell'eliminazione del cacciatore.",
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Gestione Account Cacciatori</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-gray-600">Gestisci gli account dei cacciatori registrati nel sistema</p>
              <Button
                onClick={() => setShowHunterModal(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4" />
                Nuovo Cacciatore
              </Button>
            </div>

            <div className="bg-white rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Data Registrazione</TableHead>
                    <TableHead>Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hunters.map((hunter: any) => (
                    <TableRow key={hunter.id}>
                      <TableCell className="font-medium">
                        {hunter.firstName} {hunter.lastName}
                      </TableCell>
                      <TableCell>{hunter.email}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={hunter.isActive ? "default" : "secondary"}
                          className={hunter.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                        >
                          {hunter.isActive ? "Attivo" : "Disattivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {hunter.createdAt && new Date(hunter.createdAt).toLocaleDateString('it-IT')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedHunter(hunter);
                              setShowHunterModal(true);
                            }}
                            title="Modifica"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleHunterStatusMutation.mutate({
                              id: hunter.id,
                              isActive: !hunter.isActive
                            })}
                            title={hunter.isActive ? "Disattiva" : "Attiva"}
                          >
                            {hunter.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm("Sei sicuro di voler eliminare questo cacciatore?")) {
                                deleteHunterMutation.mutate(hunter.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-700"
                            title="Elimina"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {hunters.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-lg">Nessun cacciatore registrato</div>
                  <p className="text-sm text-gray-400">Usa il pulsante "Nuovo Cacciatore" per aggiungere il primo account</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <HunterModal
        open={showHunterModal}
        onOpenChange={(open) => {
          setShowHunterModal(open);
          if (!open) setSelectedHunter(null);
        }}
        hunter={selectedHunter}
      />
    </>
  );
}
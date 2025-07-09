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
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold">Gestione Account Cacciatori</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Header responsivo */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <p className="text-gray-600 text-sm sm:text-base">Gestisci gli account dei cacciatori registrati nel sistema</p>
              <Button
                onClick={() => setShowHunterModal(true)}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                <span className="sm:inline">Nuovo Cacciatore</span>
              </Button>
            </div>

            {/* Desktop: Tabella tradizionale */}
            <div className="hidden lg:block bg-white rounded-lg border">
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
            </div>

            {/* Mobile/Tablet: Card layout */}
            <div className="lg:hidden space-y-3">
              {hunters.map((hunter: any) => (
                <div key={hunter.id} className="bg-white rounded-lg border p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{hunter.firstName} {hunter.lastName}</h3>
                        <Badge 
                          variant={hunter.isActive ? "default" : "secondary"}
                          className={`${hunter.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"} text-xs`}
                        >
                          {hunter.isActive ? "Attivo" : "Disattivo"}
                        </Badge>
                      </div>
                      <p className="text-gray-600 text-sm mb-1">{hunter.email}</p>
                      <p className="text-gray-500 text-xs">
                        Registrato: {hunter.createdAt && new Date(hunter.createdAt).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    
                    <div className="flex flex-row sm:flex-col gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedHunter(hunter);
                          setShowHunterModal(true);
                        }}
                        className="flex items-center gap-2 flex-1 sm:flex-none"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sm:hidden">Modifica</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleHunterStatusMutation.mutate({
                          id: hunter.id,
                          isActive: !hunter.isActive
                        })}
                        className="flex items-center gap-2 flex-1 sm:flex-none"
                      >
                        {hunter.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        <span className="sm:hidden">{hunter.isActive ? "Disattiva" : "Attiva"}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm("Sei sicuro di voler eliminare questo cacciatore?")) {
                            deleteHunterMutation.mutate(hunter.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-700 flex items-center gap-2 flex-1 sm:flex-none"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sm:hidden">Elimina</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Stato vuoto */}
            {hunters.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-lg">Nessun cacciatore registrato</div>
                <p className="text-sm text-gray-400">Usa il pulsante "Nuovo Cacciatore" per aggiungere il primo account</p>
              </div>
            )}
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
// © 2025 Alessandro Favero - Tutti i diritti riservati
// Licenza: Uso riservato esclusivamente alle riserve attivate tramite contratto
// Vietata la riproduzione, distribuzione o modifica non autorizzata

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Trophy, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { insertLotterySchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface LotteryManagementProps {
  userRole: 'ADMIN' | 'HUNTER';
}

export function LotteryManagement({ userRole }: LotteryManagementProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lotteries = [], isLoading } = useQuery({
    queryKey: ['/api/lottery'],
    enabled: true,
  });

  const { data: activeLotteries = [] } = useQuery({
    queryKey: ['/api/lottery/active'],
    enabled: userRole === 'HUNTER',
  });

  const createLotteryMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/lottery', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lottery'] });
      setShowCreateDialog(false);
      toast({ title: "Sorteggio creato con successo" });
    },
    onError: () => {
      toast({ title: "Errore nella creazione del sorteggio", variant: "destructive" });
    },
  });

  const joinLotteryMutation = useMutation({
    mutationFn: (lotteryId: number) => apiRequest(`/api/lottery/${lotteryId}/join`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lottery'] });
      toast({ title: "Iscrizione al sorteggio completata" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Errore nell'iscrizione", 
        description: error.message || "Errore sconosciuto",
        variant: "destructive" 
      });
    },
  });

  const drawWinnersMutation = useMutation({
    mutationFn: (lotteryId: number) => apiRequest(`/api/lottery/${lotteryId}/draw`, { method: 'POST' }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/lottery'] });
      toast({ 
        title: "Estrazione completata", 
        description: `${data.winners?.length || 0} vincitori estratti` 
      });
    },
    onError: () => {
      toast({ title: "Errore nell'estrazione", variant: "destructive" });
    },
  });

  const createForm = useForm({
    resolver: zodResolver(insertLotterySchema),
    defaultValues: {
      title: '',
      description: '',
      species: 'roe_deer' as 'roe_deer',
      category: 'M0',
      totalSpots: 1,
      registrationStart: '',
      registrationEnd: '',
      drawDate: '',
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'active': return 'default';
      case 'completed': return 'outline';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return <div className="p-4">Caricamento sorteggi...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">Sistema di Sorteggio</h3>
          <p className="text-muted-foreground">
            {userRole === 'ADMIN' ? 'Gestisci sorteggi e assegnazioni random' : 'Partecipa ai sorteggi attivi'}
          </p>
        </div>
        {userRole === 'ADMIN' && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Sorteggio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Crea Nuovo Sorteggio</DialogTitle>
              </DialogHeader>
              <form onSubmit={createForm.handleSubmit((data) => createLotteryMutation.mutate(data))} className="space-y-4">
                <div>
                  <Label htmlFor="title">Titolo</Label>
                  <Input
                    id="title"
                    {...createForm.register('title')}
                    placeholder="es. Sorteggio Capriolo M0 - Gennaio"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Descrizione</Label>
                  <Textarea
                    id="description"
                    {...createForm.register('description')}
                    placeholder="Dettagli del sorteggio..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="species">Specie</Label>
                    <Select onValueChange={(value) => createForm.setValue('species', value as 'roe_deer' | 'red_deer')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="roe_deer">Capriolo</SelectItem>
                        <SelectItem value="red_deer">Cervo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="category">Categoria</Label>
                    <Select onValueChange={(value) => createForm.setValue('category', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M0">M0</SelectItem>
                        <SelectItem value="F0">F0</SelectItem>
                        <SelectItem value="FA">FA</SelectItem>
                        <SelectItem value="M1">M1</SelectItem>
                        <SelectItem value="MA">MA</SelectItem>
                        <SelectItem value="CL0">CL0</SelectItem>
                        <SelectItem value="FF">FF</SelectItem>
                        <SelectItem value="MM">MM</SelectItem>
                        <SelectItem value="MCL1">MCL1</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="totalSpots">Posti Disponibili</Label>
                  <Input
                    id="totalSpots"
                    type="number"
                    min="1"
                    {...createForm.register('totalSpots', { valueAsNumber: true })}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="registrationStart">Inizio Registrazioni</Label>
                    <Input
                      id="registrationStart"
                      type="datetime-local"
                      {...createForm.register('registrationStart')}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="registrationEnd">Fine Registrazioni</Label>
                    <Input
                      id="registrationEnd"
                      type="datetime-local"
                      {...createForm.register('registrationEnd')}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="drawDate">Data Estrazione</Label>
                    <Input
                      id="drawDate"
                      type="datetime-local"
                      {...createForm.register('drawDate')}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Annulla
                  </Button>
                  <Button type="submit" disabled={createLotteryMutation.isPending}>
                    {createLotteryMutation.isPending ? 'Creazione...' : 'Crea Sorteggio'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4">
        {(userRole === 'ADMIN' ? lotteries : activeLotteries).map((lottery: any) => (
          <Card key={lottery.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {lottery.title}
                    <Badge variant={getStatusColor(lottery.status)}>
                      {lottery.status.charAt(0).toUpperCase() + lottery.status.slice(1)}
                    </Badge>
                  </CardTitle>
                  <CardDescription>{lottery.description}</CardDescription>
                </div>
                {lottery.winnersDrawn && (
                  <Trophy className="h-5 w-5 text-yellow-500" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{lottery.participationsCount || 0} iscritti</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                  <span>{lottery.totalSpots} posti</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{lottery.species === 'roe_deer' ? 'Capriolo' : 'Cervo'} {lottery.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Estrazione: {formatDate(lottery.drawDate)}</span>
                </div>
              </div>

              <div className="mt-4 flex justify-end space-x-2">
                {userRole === 'HUNTER' && lottery.isRegistrationOpen && !lottery.winnersDrawn && (
                  <Button 
                    onClick={() => joinLotteryMutation.mutate(lottery.id)}
                    disabled={joinLotteryMutation.isPending}
                    size="sm"
                  >
                    {joinLotteryMutation.isPending ? 'Iscrizione...' : 'Iscriviti'}
                  </Button>
                )}

                {userRole === 'ADMIN' && lottery.status === 'active' && !lottery.winnersDrawn && (
                  <Button 
                    onClick={() => drawWinnersMutation.mutate(lottery.id)}
                    disabled={drawWinnersMutation.isPending}
                    size="sm"
                    variant="outline"
                  >
                    {drawWinnersMutation.isPending ? 'Estrazione...' : 'Estrai Vincitori'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(userRole === 'ADMIN' ? lotteries : activeLotteries).length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {userRole === 'ADMIN' 
                ? 'Nessun sorteggio creato. Crea il primo sorteggio per iniziare.' 
                : 'Nessun sorteggio attivo al momento.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
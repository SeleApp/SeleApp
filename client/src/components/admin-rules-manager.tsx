import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit2, Trash2, Clock, Target, Settings, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ReserveRule = {
  id: number;
  reserveId: string;
  ruleName: string;
  ruleType: 'zone_cooldown' | 'harvest_limit' | 'custom';
  isActive: boolean;
  zoneCooldownHours?: number;
  zoneCooldownTime?: string;
  targetSpecies?: string;
  maxHarvestPerSeason?: number;
  maxHarvestPerMonth?: number;
  maxHarvestPerWeek?: number;
  seasonalStartDate?: string;
  seasonalEndDate?: string;
  bonusHarvestAllowed?: number;
  customParameters?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

const ruleFormSchema = z.object({
  ruleName: z.string().min(1, "Nome regola richiesto"),
  ruleType: z.enum(['zone_cooldown', 'harvest_limit', 'custom']),
  isActive: z.boolean().default(true),
  zoneCooldownHours: z.number().optional(),
  zoneCooldownTime: z.string().optional(),
  targetSpecies: z.enum(['roe_deer', 'red_deer', 'fallow_deer', 'mouflon', 'chamois']).optional(),
  maxHarvestPerSeason: z.number().min(1).optional(),
  maxHarvestPerMonth: z.number().min(1).optional(),
  maxHarvestPerWeek: z.number().min(1).optional(),
  seasonalStartDate: z.string().optional(),
  seasonalEndDate: z.string().optional(),
  bonusHarvestAllowed: z.number().min(1).optional(),
  customParameters: z.string().optional(),
  description: z.string().optional(),
});

type RuleFormData = z.infer<typeof ruleFormSchema>;

export function AdminRulesManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ReserveRule | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery<ReserveRule[]>({
    queryKey: ['/api/admin/rules'],
  });

  const createRuleMutation = useMutation({
    mutationFn: (data: RuleFormData) => apiRequest('/api/admin/rules', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/rules'] });
      setIsCreateDialogOpen(false);
      toast({ description: "Regola creata con successo" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", description: error.message || "Errore nella creazione della regola" });
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RuleFormData> }) => 
      apiRequest(`/api/admin/rules/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/rules'] });
      setEditingRule(null);
      toast({ description: "Regola aggiornata con successo" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", description: error.message || "Errore nell'aggiornamento della regola" });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/rules/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/rules'] });
      toast({ description: "Regola eliminata con successo" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", description: error.message || "Errore nell'eliminazione della regola" });
    },
  });

  const form = useForm<RuleFormData>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: {
      ruleName: "",
      ruleType: "zone_cooldown",
      isActive: true,
      description: "",
    },
  });

  const watchedRuleType = form.watch("ruleType");

  const onSubmit = (data: RuleFormData) => {
    if (editingRule) {
      updateRuleMutation.mutate({ id: editingRule.id, data });
    } else {
      createRuleMutation.mutate(data);
    }
  };

  const handleEdit = (rule: ReserveRule) => {
    setEditingRule(rule);
    form.reset({
      ruleName: rule.ruleName,
      ruleType: rule.ruleType,
      isActive: rule.isActive,
      zoneCooldownHours: rule.zoneCooldownHours || undefined,
      zoneCooldownTime: rule.zoneCooldownTime || "",
      targetSpecies: rule.targetSpecies as any || undefined,
      maxHarvestPerSeason: rule.maxHarvestPerSeason || undefined,
      maxHarvestPerMonth: rule.maxHarvestPerMonth || undefined,
      maxHarvestPerWeek: rule.maxHarvestPerWeek || undefined,
      seasonalStartDate: rule.seasonalStartDate || "",
      seasonalEndDate: rule.seasonalEndDate || "",
      bonusHarvestAllowed: rule.bonusHarvestAllowed || undefined,
      customParameters: rule.customParameters || "",
      description: rule.description || "",
    });
  };

  const handleToggleActive = (rule: ReserveRule) => {
    updateRuleMutation.mutate({
      id: rule.id,
      data: { isActive: !rule.isActive }
    });
  };

  const resetForm = () => {
    form.reset({
      ruleName: "",
      ruleType: "zone_cooldown",
      isActive: true,
      description: "",
    });
    setEditingRule(null);
  };

  const getRuleTypeIcon = (ruleType: string) => {
    switch (ruleType) {
      case 'zone_cooldown':
        return <Clock className="h-4 w-4" />;
      case 'harvest_limit':
        return <Target className="h-4 w-4" />;
      case 'custom':
        return <Settings className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const getRuleTypeLabel = (ruleType: string) => {
    switch (ruleType) {
      case 'zone_cooldown':
        return 'Limitazione Zone';
      case 'harvest_limit':
        return 'Limite Prelievi';
      case 'custom':
        return 'Personalizzata';
      default:
        return ruleType;
    }
  };

  const getSpeciesLabel = (species: string) => {
    const labels: Record<string, string> = {
      'roe_deer': 'Capriolo',
      'red_deer': 'Cervo',
      'fallow_deer': 'Daino',
      'mouflon': 'Muflone',
      'chamois': 'Camoscio'
    };
    return labels[species] || species;
  };

  if (isLoading) {
    return <div className="p-6 text-center">Caricamento regole...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold">Gestione Limitazioni</h2>
          <p className="text-sm sm:text-base text-gray-600">
            Configura regole per limitazioni temporali zone e limiti di prelievo
          </p>
        </div>
        <Dialog open={isCreateDialogOpen || !!editingRule} onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateDialogOpen(true)} size="sm" className="w-full sm:w-auto">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">Nuova Regola</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-[95vw] sm:max-w-2xl lg:max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Modifica Regola' : 'Crea Nuova Regola'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ruleName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Regola</FormLabel>
                        <FormControl>
                          <Input placeholder="Es. Cooldown 12 ore" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ruleType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo Regola</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="zone_cooldown">Limitazione Zone</SelectItem>
                            <SelectItem value="harvest_limit">Limite Prelievi</SelectItem>
                            <SelectItem value="custom">Personalizzata</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {watchedRuleType === 'zone_cooldown' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="zoneCooldownHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ore di Attesa</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="12"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="zoneCooldownTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Orario Limite (opzionale)</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              placeholder="20:00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {watchedRuleType === 'harvest_limit' && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="targetSpecies"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specie Target</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona specie" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="roe_deer">Capriolo</SelectItem>
                              <SelectItem value="red_deer">Cervo</SelectItem>
                              <SelectItem value="fallow_deer">Daino</SelectItem>
                              <SelectItem value="mouflon">Muflone</SelectItem>
                              <SelectItem value="chamois">Camoscio</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Periodo Bonus Stagionale (opzionale)</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="seasonalStartDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data Inizio (MM-DD)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="01-15"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="seasonalEndDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data Fine (MM-DD)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="01-31"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="bonusHarvestAllowed"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Capi Bonus</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="1"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="maxHarvestPerSeason"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max/Stagione</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="2"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="maxHarvestPerMonth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max/Mese</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="1"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="maxHarvestPerWeek"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max/Settimana</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="1"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {watchedRuleType === 'custom' && (
                  <FormField
                    control={form.control}
                    name="customParameters"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parametri Personalizzati (JSON)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder='{"customRule": true, "value": 100}'
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrizione</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descrizione della regola..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Regola Attiva</FormLabel>
                        <div className="text-sm text-gray-500">
                          La regola sarà applicata alle prenotazioni
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
                  >
                    {editingRule ? 'Aggiorna' : 'Crea'} Regola
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {rules.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-gray-500">
                <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nessuna regola configurata</p>
                <p className="text-sm">Crea la prima regola per limitare prenotazioni zone o prelievi</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader className="pb-3 p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                    {getRuleTypeIcon(rule.ruleType)}
                    <div className="flex-1">
                      <CardTitle className="text-base sm:text-lg">{rule.ruleName}</CardTitle>
                      <CardDescription className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                        <Badge variant={rule.isActive ? "default" : "secondary"} className="text-xs">
                          {getRuleTypeLabel(rule.ruleType)}
                        </Badge>
                        {rule.isActive ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                            <Check className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
                            Attiva
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <X className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
                            Disattiva
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2 w-full sm:w-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleActive(rule)}
                      disabled={updateRuleMutation.isPending}
                      className="text-xs flex-1 sm:flex-none"
                    >
                      {rule.isActive ? 'Disattiva' : 'Attiva'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(rule)} className="px-2">
                      <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteRuleMutation.mutate(rule.id)}
                      disabled={deleteRuleMutation.isPending}
                      className="text-red-600 hover:text-red-700 px-2"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="space-y-2">
                  {rule.description && (
                    <p className="text-xs sm:text-sm text-gray-600">{rule.description}</p>
                  )}
                  
                  {rule.ruleType === 'zone_cooldown' && (
                    <div className="text-sm space-y-1">
                      {rule.zoneCooldownHours && (
                        <p><strong>Attesa:</strong> {rule.zoneCooldownHours} ore</p>
                      )}
                      {rule.zoneCooldownTime && (
                        <p><strong>Orario limite:</strong> {rule.zoneCooldownTime}</p>
                      )}
                    </div>
                  )}
                  
                  {rule.ruleType === 'harvest_limit' && (
                    <div className="text-sm space-y-1">
                      {rule.targetSpecies && (
                        <p><strong>Specie:</strong> {getSpeciesLabel(rule.targetSpecies)}</p>
                      )}
                      {rule.maxHarvestPerSeason && (
                        <p><strong>Limite stagionale:</strong> {rule.maxHarvestPerSeason} capi</p>
                      )}
                      {rule.maxHarvestPerMonth && (
                        <p><strong>Limite mensile:</strong> {rule.maxHarvestPerMonth} capi</p>
                      )}
                      {rule.maxHarvestPerWeek && (
                        <p><strong>Limite settimanale:</strong> {rule.maxHarvestPerWeek} capi</p>
                      )}
                      {rule.seasonalStartDate && rule.seasonalEndDate && rule.bonusHarvestAllowed && (
                        <p className="text-green-600">
                          <strong>Bonus stagionale:</strong> +{rule.bonusHarvestAllowed} capi dal {rule.seasonalStartDate} al {rule.seasonalEndDate}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {rule.ruleType === 'custom' && rule.customParameters && (
                    <div className="text-sm">
                      <p><strong>Parametri:</strong></p>
                      <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                        {JSON.stringify(JSON.parse(rule.customParameters), null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
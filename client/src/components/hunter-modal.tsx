import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const hunterSchema = z.object({
  firstName: z.string().min(1, "Nome obbligatorio"),
  lastName: z.string().min(1, "Cognome obbligatorio"),  
  email: z.string().email("Email non valida"),
  password: z.string().min(6, "Password minimo 6 caratteri").optional(),
  isActive: z.boolean().default(true),
});

type HunterFormData = z.infer<typeof hunterSchema>;

interface HunterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hunter?: any | null;
}

export default function HunterModal({ open, onOpenChange, hunter }: HunterModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!hunter;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<HunterFormData>({
    resolver: zodResolver(hunterSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (hunter) {
      reset({
        firstName: hunter.firstName || "",
        lastName: hunter.lastName || "",
        email: hunter.email || "",
        password: "",
        isActive: hunter.isActive ?? true,
      });
    } else {
      reset({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        isActive: true,
      });
    }
  }, [hunter, reset]);

  const hunterMutation = useMutation({
    mutationFn: async (data: HunterFormData) => {
      const url = isEdit ? `/api/admin/hunters/${hunter.id}` : "/api/admin/hunters";
      const method = isEdit ? "PATCH" : "POST";
      
      // Don't send empty password on edit
      const payload = { ...data };
      if (isEdit && !payload.password) {
        delete payload.password;
      }
      
      return await apiRequest(url, {
        method,
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast({
        title: isEdit ? "Cacciatore aggiornato" : "Cacciatore creato",
        description: isEdit 
          ? "Le informazioni del cacciatore sono state aggiornate con successo."
          : "Il nuovo account cacciatore è stato creato con successo.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hunters"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'operazione.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: HunterFormData) => {
    hunterMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {isEdit ? "Modifica Cacciatore" : "Nuovo Cacciatore"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nome e Cognome in una riga su schermi più grandi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium">Nome</Label>
              <Input
                id="firstName"
                {...register("firstName")}
                placeholder="Inserisci il nome"
                className="w-full"
              />
              {errors.firstName && (
                <p className="text-sm text-red-600">{errors.firstName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium">Cognome</Label>
              <Input
                id="lastName"
                {...register("lastName")}
                placeholder="Inserisci il cognome"
                className="w-full"
              />
              {errors.lastName && (
                <p className="text-sm text-red-600">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="Inserisci l'email"
              className="w-full"
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              {isEdit ? "Nuova Password" : "Password"}
            </Label>
            <Input
              id="password"
              type="password"
              {...register("password")}
              placeholder={isEdit ? "Lascia vuoto per non modificare" : "Inserisci la password"}
              className="w-full"
            />
            {isEdit && (
              <p className="text-xs text-gray-500">Lascia vuoto per non modificare la password</p>
            )}
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center space-x-3 py-2">
            <Switch
              id="isActive"
              checked={watch("isActive")}
              onCheckedChange={(checked) => setValue("isActive", checked)}
            />
            <Label htmlFor="isActive" className="text-sm font-medium">Account attivo</Label>
          </div>

          {/* Pulsanti responsive */}
          <div className="flex flex-col sm:flex-row sm:justify-between gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Annulla
            </Button>
            <Button 
              type="submit" 
              disabled={hunterMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto order-1 sm:order-2"
            >
              {hunterMutation.isPending 
                ? (isEdit ? "Aggiornando..." : "Creando...") 
                : (isEdit ? "Aggiorna Cacciatore" : "Crea Cacciatore")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
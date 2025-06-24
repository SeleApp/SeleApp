import React from "react";
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

  React.useEffect(() => {
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifica Cacciatore" : "Nuovo Cacciatore"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Nome</Label>
            <Input
              id="firstName"
              {...register("firstName")}
              placeholder="Inserisci il nome"
            />
            {errors.firstName && (
              <p className="text-sm text-red-600">{errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Cognome</Label>
            <Input
              id="lastName"
              {...register("lastName")}
              placeholder="Inserisci il cognome"
            />
            {errors.lastName && (
              <p className="text-sm text-red-600">{errors.lastName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="Inserisci l'email"
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              {isEdit ? "Nuova Password (lascia vuoto per non modificare)" : "Password"}
            </Label>
            <Input
              id="password"
              type="password"
              {...register("password")}
              placeholder={isEdit ? "Lascia vuoto per non modificare" : "Inserisci la password"}
            />
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={watch("isActive")}
              onCheckedChange={(checked) => setValue("isActive", checked)}
            />
            <Label htmlFor="isActive">Account attivo</Label>
          </div>

          <div className="flex justify-between pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Annulla
            </Button>
            <Button 
              type="submit" 
              disabled={hunterMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {hunterMutation.isPending 
                ? (isEdit ? "Aggiornando..." : "Creando...") 
                : (isEdit ? "Aggiorna" : "Crea Cacciatore")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
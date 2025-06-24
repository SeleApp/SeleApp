import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ZoneWithQuotas } from "@/lib/types";
import { CalendarPlus } from "lucide-react";

interface ZoneCardProps {
  zone: ZoneWithQuotas;
  onReserve: (zoneId: number) => void;
}

export default function ZoneCard({ zone, onReserve }: ZoneCardProps) {
  const getQuotaDisplay = (species: string, sex: string, ageClass: string) => {
    const key = `${species}_${sex}_${ageClass}`;
    const quota = zone.quotas[key];
    if (!quota) return "0/0";
    return `${quota.available}/${quota.total}`;
  };

  const isQuotaExhausted = zone.quotaStatus === '🔴';

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-gray-900">{zone.name}</h3>
          <div className="flex items-center">
            <span className="text-2xl mr-1">{zone.quotaStatus}</span>
            <span className="text-sm text-gray-600">{zone.quotaText}</span>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Quote Regionali Disponibili:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center">
                <span className="font-bold text-amber-600">🦌 Capriolo</span>
                <div className="text-gray-600">Tutte le categorie</div>
              </div>
              <div className="text-center">
                <span className="font-bold text-red-600">🦌 Cervo</span>
                <div className="text-gray-600">Tutte le categorie</div>
              </div>
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Cervi F/A:</span>
            <span className="font-semibold">
              {getQuotaDisplay('red_deer', 'female', 'adult')}
            </span>
          </div>
        </div>

        <div className="space-y-2 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Mattina:</span>
            <Badge className="status-available text-white">Libero</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Pomeriggio:</span>
            <Badge className="status-available text-white">Libero</Badge>
          </div>
        </div>

        <Button
          onClick={() => onReserve(zone.id)}
          disabled={isQuotaExhausted}
          className="w-full btn-large bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CalendarPlus className="mr-2" size={20} />
          {isQuotaExhausted ? 'Quote Esaurite' : 'Prenota'}
        </Button>
      </CardContent>
    </Card>
  );
}

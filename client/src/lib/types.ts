export interface ZoneWithQuotas {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  quotas: Record<string, {
    harvested: number;
    total: number;
    available: number;
  }>;
  quotaStatus: string;
  quotaText: string;
}

export interface ZoneAvailability {
  morning: boolean;
  afternoon: boolean;
}

export interface ReservationWithDetails {
  id: number;
  hunterId: number;
  zoneId: number;
  huntDate: string;
  timeSlot: 'morning' | 'afternoon';
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  zone: {
    id: number;
    name: string;
    description?: string;
    isActive: boolean;
  };
  hunter: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
  };
}

export interface AdminStats {
  activeHunters: number;
  todayReservations: number;
  totalHarvested: number;
  lowQuotas: number;
}

export interface CreateReservationRequest {
  zoneId: number;
  huntDate: string;
  timeSlot: 'morning' | 'afternoon';
}

export interface CreateHuntReportRequest {
  reservationId: number;
  outcome: 'no_harvest' | 'harvest';
  species?: 'roe_deer' | 'red_deer';
  sex?: 'male' | 'female';
  ageClass?: 'adult' | 'young';
  notes?: string;
}

export const TIME_SLOT_LABELS = {
  morning: 'Mattina (6:00 - 12:00)',
  afternoon: 'Pomeriggio (14:00 - 18:00)',
} as const;

export const SPECIES_LABELS = {
  roe_deer: 'Capriolo',
  red_deer: 'Cervo',
} as const;

export const SEX_LABELS = {
  male: 'Maschio',
  female: 'Femmina',
} as const;

export const AGE_CLASS_LABELS = {
  adult: 'Adulto',
  young: 'Giovane',
} as const;

export const STATUS_LABELS = {
  active: 'Attiva',
  completed: 'Completata',
  cancelled: 'Annullata',
} as const;

export const OUTCOME_LABELS = {
  no_harvest: 'Nessun prelievo',
  harvest: 'Prelievo effettuato',
} as const;

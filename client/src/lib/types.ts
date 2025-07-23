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
  reserveId: string;
  huntDate: string;
  timeSlot: 'morning' | 'afternoon' | 'full_day';
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  // Campi target species opzionali
  targetSpecies?: 'roe_deer' | 'red_deer';
  targetRoeDeerCategory?: 'M0' | 'F0' | 'FA' | 'M1' | 'MA';
  targetRedDeerCategory?: 'CL0' | 'FF' | 'MM' | 'MCL1';
  targetSex?: 'male' | 'female';
  targetAgeClass?: 'adult' | 'young';
  targetNotes?: string;
  zone: {
    id: number;
    name: string;
    description?: string;
    isActive: boolean;
    reserveId: string;
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
  timeSlot: 'morning' | 'afternoon' | 'full_day';
  // Campi opzionali per selezione capo target
  targetSpecies?: 'roe_deer' | 'red_deer';
  targetRoeDeerCategory?: 'M0' | 'F0' | 'FA' | 'M1' | 'MA';
  targetRedDeerCategory?: 'CL0' | 'FF' | 'MM' | 'MCL1';
  targetSex?: 'male' | 'female';
  targetAgeClass?: 'adult' | 'young';
  targetNotes?: string;
}

export interface CreateHuntReportRequest {
  reservationId: number;
  reserveId: string;
  outcome: 'no_harvest' | 'harvest';
  species?: 'roe_deer' | 'red_deer';
  roeDeerCategory?: 'M0' | 'F0' | 'FA' | 'M1' | 'MA';
  redDeerCategory?: 'CL0' | 'FF' | 'MM' | 'MCL1';
  sex?: 'male' | 'female';
  ageClass?: 'adult' | 'young';
  notes?: string;
  killCardPhoto?: string; // Base64 della foto opzionale
  // Dati biometrici dell'animale
  weight?: string;
  length?: string;
  antlerPoints?: string;
  antlerLength?: string;
  chestGirth?: string;
  hindLegLength?: string;
  earLength?: string;
  tailLength?: string;
  bodyCondition?: 'ottima' | 'buona' | 'media' | 'scarsa';
  furCondition?: string;
  teethCondition?: string;
  reproductiveStatus?: string;
  estimatedAge?: string;
  biometricNotes?: string;
}

export const TIME_SLOT_LABELS = {
  morning: 'Alba - 12:00',
  afternoon: '12:00 - Tramonto', 
  full_day: 'Alba - Tramonto',
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

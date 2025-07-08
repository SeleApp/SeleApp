// © 2025 Alessandro Favero - Tutti i diritti riservati
// Licenza: Uso riservato esclusivamente alle riserve attivate tramite contratto
// Vietata la riproduzione, distribuzione o modifica non autorizzata

/**
 * Sistema modulare per diverse tipologie di gestione delle riserve
 * Ogni tipologia ha funzionalità specifiche e interfacce adattive
 */

export type ManagementType = 
  | 'standard_zones'      // Standard con prenotazione zone (es. Cison)
  | 'standard_random'     // Standard con assegnazione random capi (es. Pederobba)
  | 'quota_only'          // Solo gestione quote senza zone
  | 'custom';             // Personalizzato per esigenze specifiche

export interface ManagementTypeConfig {
  id: ManagementType;
  name: string;
  description: string;
  features: {
    hasZones: boolean;           // Gestione zone fisiche
    hasReservations: boolean;    // Sistema prenotazioni
    hasQuotas: boolean;          // Gestione quote regionali
    hasRandomAssignment: boolean; // Assegnazione casuale capi

    hasAdvancedReporting: boolean; // Report avanzati
    hasCustomWorkflows: boolean;  // Flussi personalizzati
  };
  modules: string[];             // Moduli abilitati
  dashboardLayout: 'hunter_standard' | 'admin_standard' | 'custom';
}

export const MANAGEMENT_TYPE_CONFIGS: Record<ManagementType, ManagementTypeConfig> = {
  standard_zones: {
    id: 'standard_zones',
    name: 'Standard con Zone',
    description: 'Gestione classica con prenotazione zone fisiche (es. Cison di Valmarino)',
    features: {
      hasZones: true,
      hasReservations: true,
      hasQuotas: true,
      hasRandomAssignment: false,
      hasAdvancedReporting: false,
      hasCustomWorkflows: false,
    },
    modules: ['zones', 'reservations', 'regional_quotas', 'hunt_reports'],
    dashboardLayout: 'hunter_standard',
  },

  standard_random: {
    id: 'standard_random',
    name: 'Standard Random',
    description: 'Sistema standard con assegnazione casuale capi invece di zone (es. Pederobba)',
    features: {
      hasZones: false,
      hasReservations: false,
      hasQuotas: true,
      hasRandomAssignment: true,
      hasAdvancedReporting: true,
      hasCustomWorkflows: false,
    },
    modules: ['random_assignment', 'regional_quotas', 'hunt_reports', 'lottery_system'],
    dashboardLayout: 'hunter_standard',
  },



  quota_only: {
    id: 'quota_only',
    name: 'Solo Quote',
    description: 'Gestione semplificata con solo controllo quote regionali',
    features: {
      hasZones: false,
      hasReservations: false,
      hasQuotas: true,
      hasRandomAssignment: false,
      hasAdvancedReporting: false,
      hasCustomWorkflows: false,
    },
    modules: ['regional_quotas', 'simple_reports'],
    dashboardLayout: 'hunter_standard',
  },

  custom: {
    id: 'custom',
    name: 'Personalizzato',
    description: 'Configurazione personalizzata per esigenze specifiche della riserva',
    features: {
      hasZones: true,
      hasReservations: true,
      hasQuotas: true,
      hasRandomAssignment: true,
      hasAdvancedReporting: true,
      hasCustomWorkflows: true,
    },
    modules: ['all_modules_configurable'],
    dashboardLayout: 'custom',
  },
};

/**
 * Utility functions per la gestione dei tipi
 */
export class ManagementTypeManager {
  static getConfig(type: ManagementType): ManagementTypeConfig {
    return MANAGEMENT_TYPE_CONFIGS[type];
  }

  static hasFeature(type: ManagementType, feature: keyof ManagementTypeConfig['features']): boolean {
    return MANAGEMENT_TYPE_CONFIGS[type].features[feature];
  }

  static getAvailableModules(type: ManagementType): string[] {
    return MANAGEMENT_TYPE_CONFIGS[type].modules;
  }

  static getDashboardLayout(type: ManagementType): string {
    return MANAGEMENT_TYPE_CONFIGS[type].dashboardLayout;
  }

  static getDisplayName(type: ManagementType): string {
    return MANAGEMENT_TYPE_CONFIGS[type].name;
  }

  static getDescription(type: ManagementType): string {
    return MANAGEMENT_TYPE_CONFIGS[type].description;
  }

  /**
   * Determina se una funzionalità dovrebbe essere visibile per una riserva
   */
  static shouldShowFeature(reserveType: ManagementType, feature: string): boolean {
    const config = this.getConfig(reserveType);
    
    switch (feature) {
      case 'zones_tab':
        return config.features.hasZones;
      case 'reservations_tab':
        return config.features.hasReservations;
      case 'quotas_tab':
        return config.features.hasQuotas;
      case 'random_assignment':
        return config.features.hasRandomAssignment;

      case 'advanced_reporting':
        return config.features.hasAdvancedReporting;
      default:
        return true; // Default: mostra la funzionalità
    }
  }

  /**
   * Ottiene la configurazione delle tab per il dashboard hunter
   */
  static getHunterDashboardTabs(reserveType: ManagementType): Array<{
    id: string;
    label: string;
    enabled: boolean;
  }> {
    const config = this.getConfig(reserveType);
    
    return [
      {
        id: 'zones',
        label: 'Zone',
        enabled: config.features.hasZones,
      },
      {
        id: 'lottery',
        label: 'Sorteggio',
        enabled: config.features.hasRandomAssignment,
      },
      {
        id: 'reservations',
        label: 'Prenotazioni',
        enabled: config.features.hasReservations,
      },
      {
        id: 'quotas',
        label: 'Quote Regionali',
        enabled: config.features.hasQuotas,
      },
      {
        id: 'reports',
        label: 'Report',
        enabled: true, // Sempre abilitato
      },

    ].filter(tab => tab.enabled);
  }

  /**
   * Ottiene la configurazione delle funzionalità admin
   */
  static getAdminFeatures(reserveType: ManagementType): Array<{
    id: string;
    label: string;
    enabled: boolean;
  }> {
    const config = this.getConfig(reserveType);
    
    return [
      {
        id: 'hunter_management',
        label: 'Gestione Cacciatori',
        enabled: true, // Sempre abilitato
      },
      {
        id: 'zone_management',
        label: 'Gestione Zone',
        enabled: config.features.hasZones,
      },
      {
        id: 'quota_management',
        label: 'Gestione Quote',
        enabled: config.features.hasQuotas,
      },
      {
        id: 'reservation_management',
        label: 'Gestione Prenotazioni',
        enabled: config.features.hasReservations,
      },
      {
        id: 'lottery_management',
        label: 'Gestione Sorteggi',
        enabled: config.features.hasRandomAssignment,
      },
      {
        id: 'advanced_reports',
        label: 'Report Avanzati',
        enabled: config.features.hasAdvancedReporting,
      },

    ].filter(feature => feature.enabled);
  }
}

/**
 * Hook per l'utilizzo nei componenti React
 */
export function useManagementType(type: ManagementType) {
  return {
    config: ManagementTypeManager.getConfig(type),
    hasFeature: (feature: keyof ManagementTypeConfig['features']) => 
      ManagementTypeManager.hasFeature(type, feature),
    shouldShow: (feature: string) => 
      ManagementTypeManager.shouldShowFeature(type, feature),
    hunterTabs: ManagementTypeManager.getHunterDashboardTabs(type),
    adminFeatures: ManagementTypeManager.getAdminFeatures(type),
  };
}
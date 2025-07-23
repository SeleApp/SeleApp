// © 2025 Alessandro Favero - Tutti i diritti riservati
// Licenza: Uso riservato esclusivamente alle riserve attivate tramite contratto
// Vietata la riproduzione, distribuzione o modifica non autorizzata

import { 
  users, zones, wildlifeQuotas, regionalQuotas, reservations, huntReports, reserves, groupQuotas,
  reserveSettings, contracts, supportTickets, billing, materials, materialAccessLog,
  lotteries, lotteryParticipations, reserveRules,
  type User, type InsertUser, type Zone, type InsertZone, type Reserve, type InsertReserve,
  type WildlifeQuota, type InsertWildlifeQuota, type RegionalQuota, type InsertRegionalQuota,
  type Reservation, type InsertReservation, type HuntReport, type InsertHuntReport,
  type ReserveSettings, type InsertReserveSettings, type Contract, type InsertContract,
  type SupportTicket, type InsertSupportTicket, type Billing, type InsertBilling,
  type Material, type InsertMaterial, type MaterialAccessLog, type InsertMaterialAccessLog,
  type Lottery, type InsertLottery, type LotteryParticipation, type InsertLotteryParticipation,
  type ReserveRule, type InsertReserveRule, type GroupQuota, type InsertGroupQuota
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, count, isNotNull } from "drizzle-orm";

export interface IStorage {
  // Reserves Management (SUPERADMIN only)
  getAllReserves(): Promise<Reserve[]>;
  getReserve(id: string): Promise<Reserve | undefined>;
  createReserve(reserve: InsertReserve): Promise<Reserve>;
  updateReserve(id: string, data: Partial<Reserve>): Promise<Reserve | undefined>;
  deleteReserve(id: string): Promise<void>;
  updateReserveAccessCode(reserveId: string, data: { accessCode?: string; codeActive?: boolean }): Promise<Reserve | undefined>;
  getReserveStats(reserveId: string): Promise<{
    totalUsers: number;
    totalZones: number;
    totalQuotas: number;
    activeReservations: number;
  }>;

  // Reserve Settings Management (SUPERADMIN only)
  getReserveSettings(reserveId: string): Promise<ReserveSettings | undefined>;
  createReserveSettings(settings: InsertReserveSettings): Promise<ReserveSettings>;
  updateReserveSettings(reserveId: string, data: Partial<ReserveSettings>): Promise<ReserveSettings | undefined>;

  // Contracts Management (SUPERADMIN only)
  getAllContracts(): Promise<(Contract & { reserve: Reserve })[]>;
  getContractByReserve(reserveId: string): Promise<Contract | undefined>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: number, data: Partial<Contract>): Promise<Contract | undefined>;
  deleteContract(id: number): Promise<void>;

  // Support Tickets Management (SUPERADMIN only)
  getAllSupportTickets(filters?: { status?: string; priority?: string; reserveId?: string }): Promise<(SupportTicket & { reserve: Reserve; admin?: User })[]>;
  getSupportTicket(id: number): Promise<(SupportTicket & { reserve: Reserve; admin?: User }) | undefined>;
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  respondToSupportTicket(id: number, response: string, status?: string): Promise<SupportTicket | undefined>;
  updateSupportTicketStatus(id: number, status: string): Promise<SupportTicket | undefined>;

  // Billing Management (SUPERADMIN only)
  getAllBilling(): Promise<(Billing & { reserve: Reserve })[]>;
  getBillingByReserve(reserveId: string): Promise<Billing | undefined>;
  createBilling(billing: InsertBilling): Promise<Billing>;
  updateBilling(id: number, data: Partial<Billing>): Promise<Billing | undefined>;

  // Materials Management (SUPERADMIN only)
  getAllMaterials(): Promise<Material[]>;
  getMaterial(id: number): Promise<Material | undefined>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterial(id: number, data: Partial<Material>): Promise<Material | undefined>;
  deleteMaterial(id: number): Promise<void>;
  logMaterialAccess(materialId: number, userId: number): Promise<MaterialAccessLog>;
  getMaterialAccessLogs(materialId?: number, userId?: number): Promise<(MaterialAccessLog & { material: Material; user: User })[]>;

  // Lottery System (for standard_random reserves)
  getLotteries(reserveId: string): Promise<(Lottery & { participationsCount: number })[]>;
  getActiveLotteries(reserveId: string): Promise<(Lottery & { participationsCount: number; isRegistrationOpen: boolean })[]>;
  createLottery(lottery: InsertLottery): Promise<Lottery>;
  updateLottery(id: number, data: Partial<Lottery>, reserveId: string): Promise<Lottery | undefined>;
  deleteLottery(id: number, reserveId: string): Promise<void>;
  joinLottery(lotteryId: number, hunterId: number, reserveId: string): Promise<LotteryParticipation>;
  getLotteryParticipations(lotteryId: number, reserveId: string): Promise<(LotteryParticipation & { hunter: User })[]>;
  getHunterParticipations(hunterId: number, reserveId: string): Promise<(LotteryParticipation & { lottery: Lottery })[]>;
  drawLotteryWinners(lotteryId: number, reserveId: string): Promise<(LotteryParticipation & { hunter: User })[]>;
  
  // Users (filtered by reserveId for non-SUPERADMIN)
  getUser(id: number, reserveId?: string): Promise<User | undefined>;
  getUserByEmail(email: string, reserveId?: string): Promise<User | undefined>;
  createUser(user: InsertUser, creatorReserveId?: string): Promise<User>;
  
  // Zones (filtered by reserveId)
  getAllZones(reserveId: string): Promise<Zone[]>;
  getZone(id: number, reserveId: string): Promise<Zone | undefined>;
  createZone(zone: InsertZone): Promise<Zone>;
  
  // Wildlife Quotas (deprecato - ora si usano le quote regionali)
  getZoneQuotas(zoneId: number, reserveId: string): Promise<WildlifeQuota[]>;
  getAllQuotas(reserveId: string): Promise<WildlifeQuota[]>;
  updateQuota(id: number, reserveId: string, harvested?: number, totalQuota?: number): Promise<WildlifeQuota | undefined>;
  
  // Regional Quotas Management (filtered by reserveId)
  getRegionalQuotas(reserveId: string): Promise<(RegionalQuota & { available: number; isExhausted: boolean; isInSeason: boolean })[]>;
  updateRegionalQuota(id: number, reserveId: string, data: Partial<RegionalQuota>): Promise<RegionalQuota | undefined>;
  // SuperAdmin specific methods
  createRegionalQuota(quota: InsertRegionalQuota): Promise<RegionalQuota>;
  deleteRegionalQuota(id: number): Promise<boolean>;
  deleteAllRegionalQuotasForReserve(reserveId: string): Promise<void>;
  createOrUpdateRegionalQuota(quota: InsertRegionalQuota): Promise<RegionalQuota>;
  isSpeciesCategoryAvailable(species: 'roe_deer' | 'red_deer', category: string, reserveId: string): Promise<boolean>;
  
  // Reservations (filtered by reserveId)
  getReservations(reserveId: string, hunterId?: number): Promise<(Reservation & { zone: Zone; hunter: User })[]>;
  getReservation(id: number, reserveId: string): Promise<Reservation | undefined>;
  getZoneReservations(zoneId: number, date: string, timeSlot: string, reserveId: string): Promise<Reservation[]>;
  createReservation(reservation: InsertReservation): Promise<Reservation>;
  cancelReservation(id: number, reserveId: string): Promise<void>;
  
  // Hunt Reports (filtered by reserveId)
  createHuntReport(report: InsertHuntReport): Promise<HuntReport>;
  getHuntReports(reserveId: string): Promise<(HuntReport & { reservation: Reservation & { zone: Zone; hunter: User } })[]>;
  deleteHuntReport(id: number, reserveId: string): Promise<void>;
  
  // Admin Statistics (filtered by reserveId)
  getAdminStats(reserveId: string): Promise<{
    activeHunters: number;
    todayReservations: number;
    totalHarvested: number;
    lowQuotas: number;
  }>;

  // Hunter Management (filtered by reserveId)
  getHuntersByReserve(reserveId: string): Promise<User[]>;
  getHunterByIdAndReserve(hunterId: number, reserveId: string): Promise<User | undefined>;
  updateHunterStatus(id: number, isActive: boolean, reserveId: string): Promise<User | undefined>;
  updateHunter(id: number, data: Partial<User>, reserveId: string): Promise<User | undefined>;
  createHunter(data: InsertUser): Promise<User>;
  deleteHunter(id: number, reserveId: string): Promise<void>;
  
  // Reserve Rules Management (ADMIN only)
  getReserveRules(reserveId: string): Promise<ReserveRule[]>;
  createReserveRule(rule: InsertReserveRule): Promise<ReserveRule>;
  updateReserveRule(id: number, data: Partial<ReserveRule>): Promise<ReserveRule | undefined>;
  deleteReserveRule(id: number): Promise<void>;
  checkZoneCooldown(reserveId: string, userId: number, zoneId: number): Promise<{ allowed: boolean; waitUntil?: Date; reason?: string }>;
  checkHarvestLimits(reserveId: string, userId: number, species: string): Promise<{ allowed: boolean; current: number; limit: number; reason?: string }>;

  // Group Quotas Management (for zones_groups management type)
  getGroupQuotas(reserveId: string): Promise<GroupQuota[]>;
  createGroupQuota(quota: InsertGroupQuota): Promise<GroupQuota>;
  updateGroupQuota(id: number, data: Partial<GroupQuota>): Promise<GroupQuota | undefined>;
  deleteGroupQuota(id: number): Promise<void>;
  bulkUpdateGroupQuotas(quotasUpdate: Array<{ hunterGroup: string; species: string; category: string; totalQuota: number }>, reserveId: string): Promise<void>;

  // Reserve Validation and Admin Management (SUPERADMIN only)
  validateActiveReserve(reserveName: string): Promise<boolean>;
  getActiveReserves(): Promise<Reserve[]>;
  validateReserveAccess(reserveId: string, accessCode: string): Promise<Reserve | null>;
  createAdminAccount(data: InsertUser): Promise<User>;
  getAllAdmins(): Promise<User[]>;
  updateAdmin(id: number, data: Partial<User>): Promise<User | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Reserves Management (SUPERADMIN only)
  async getAllReserves(): Promise<Reserve[]> {
    return await db.select().from(reserves);
  }

  async getReserve(id: string): Promise<Reserve | undefined> {
    const [reserve] = await db.select().from(reserves).where(eq(reserves.id, id));
    return reserve || undefined;
  }

  async createReserve(reserve: InsertReserve): Promise<Reserve> {
    const [newReserve] = await db.insert(reserves).values(reserve).returning();
    
    // Inizializzazione automatica della riserva con zone e quote
    await this.initializeNewReserve(newReserve);
    
    return newReserve;
  }

  private async initializeNewReserve(reserve: Reserve): Promise<void> {
    console.log(`Initializing new reserve: ${reserve.name} (${reserve.id})`);
    
    try {
      // 1. Crea le zone specificate se managementType include zone
      if (reserve.managementType === 'standard_zones' || reserve.managementType === 'zones_groups' || reserve.managementType === 'custom') {
        await this.createStandardZones(reserve.id, reserve.numberOfZones || 16);
      }
      
      // 2. Crea le quote appropriate al tipo di gestione
      if (reserve.managementType === 'zones_groups') {
        await this.createGroupQuotasForSelectedSpecies(reserve.id, reserve.species);
      } else {
        await this.createQuotasForSelectedSpecies(reserve.id, reserve.species);
      }
      
      // 3. Crea impostazioni di default per la riserva
      await this.createReserveSettings({
        reserveId: reserve.id,
        logoUrl: null,
        silenceDays: "[2,5]", // Martedì e Venerdì di default
        emailTemplateCustomizations: "{}"
      });
      
      console.log(`Successfully initialized reserve: ${reserve.name}`);
    } catch (error) {
      console.error(`Error initializing reserve ${reserve.id}:`, error);
      // Non bloccare la creazione della riserva per errori di inizializzazione
    }
  }

  private async createStandardZones(reserveId: string, numberOfZones: number = 16): Promise<void> {
    // Crea zone personalizzate per la riserva
    const zoneNames = [];
    for (let i = 1; i <= numberOfZones; i++) {
      zoneNames.push(`Zona ${i}`);
    }

    const zonesToCreate = zoneNames.map(name => ({
      name,
      reserveId,
      isActive: true,
    }));

    await db.insert(zones).values(zonesToCreate);
    console.log(`Created ${zoneNames.length} zones for reserve ${reserveId}`);
  }

  private async createQuotasForSelectedSpecies(reserveId: string, speciesJson: string): Promise<void> {
    try {
      const selectedSpecies: string[] = JSON.parse(speciesJson || '[]');
      console.log(`Creating quotas for selected species: ${selectedSpecies.join(', ')}`);
      
      const quotasToCreate: any[] = [];
      const currentYear = new Date().getFullYear();
      
      // Crea quote per ogni specie selezionata
      for (const species of selectedSpecies) {
        const normalizedSpecies = species.toLowerCase();
        
        if (normalizedSpecies === 'capriolo') {
          // Quote standard per Capriolo (5 categorie)
          const roeDeerQuotas = [
            { category: 'M0', quota: 10 },
            { category: 'F0', quota: 8 },
            { category: 'FA', quota: 12 },
            { category: 'M1', quota: 6 },
            { category: 'MA', quota: 4 }
          ];
          
          for (const cat of roeDeerQuotas) {
            quotasToCreate.push({
              species: 'roe_deer',
              roeDeerCategory: cat.category,
              redDeerCategory: null,
              fallowDeerCategory: null,
              mouflonCategory: null,
              chamoisCategory: null,
              totalQuota: cat.quota,
              harvested: 0,
              reserveId,
              season: currentYear.toString(),
              isActive: true,
              huntingStartDate: new Date(`${currentYear}-10-01`),
              huntingEndDate: new Date(`${currentYear + 1}-01-31`),
              notes: `Quote ${species} - create automaticamente`
            });
          }
        } else if (normalizedSpecies === 'cervo') {
          // Quote standard per Cervo (4 categorie)
          const redDeerQuotas = [
            { category: 'CL0', quota: 5 },
            { category: 'FF', quota: 8 },
            { category: 'MM', quota: 3 },
            { category: 'MCL1', quota: 2 }
          ];
          
          for (const cat of redDeerQuotas) {
            quotasToCreate.push({
              species: 'red_deer',
              roeDeerCategory: null,
              redDeerCategory: cat.category,
              fallowDeerCategory: null,
              mouflonCategory: null,
              chamoisCategory: null,
              totalQuota: cat.quota,
              harvested: 0,
              reserveId,
              season: currentYear.toString(),
              isActive: true,
              huntingStartDate: new Date(`${currentYear}-10-01`),
              huntingEndDate: new Date(`${currentYear + 1}-01-31`),
              notes: `Quote ${species} - create automaticamente`
            });
          }
        } else if (normalizedSpecies === 'daino') {
          // Quote standard per Daino (6 categorie) - Classificazioni ufficiali
          const fallowDeerQuotas = [
            { category: 'DA-M-0', quota: 4 }, // Fusone maschio
            { category: 'DA-M-I', quota: 5 }, // Palanchino 2-4 anni
            { category: 'DA-M-II', quota: 3 }, // Palcuto ≥5 anni
            { category: 'DA-F-0', quota: 3 }, // Cerbiatta
            { category: 'DA-F-I', quota: 4 }, // Giovane femmina 2-4 anni
            { category: 'DA-F-II', quota: 6 } // Femmina adulta ≥5 anni
          ];
          
          for (const cat of fallowDeerQuotas) {
            quotasToCreate.push({
              species: 'fallow_deer',
              roeDeerCategory: null,
              redDeerCategory: null,
              fallowDeerCategory: cat.category,
              mouflonCategory: null,
              chamoisCategory: null,
              totalQuota: cat.quota,
              harvested: 0,
              reserveId,
              season: currentYear.toString(),
              isActive: true,
              huntingStartDate: new Date(`${currentYear}-10-01`),
              huntingEndDate: new Date(`${currentYear + 1}-01-31`),
              notes: `Quote ${species} - create automaticamente`
            });
          }
        } else if (normalizedSpecies === 'muflone') {
          // Quote standard per Muflone (6 categorie) - Classificazioni ufficiali
          const mouflonQuotas = [
            { category: 'MU-M-0', quota: 3 }, // Agnello maschio
            { category: 'MU-M-I', quota: 4 }, // Giovane maschio 2-4 anni
            { category: 'MU-M-II', quota: 2 }, // Adulto maschio ≥5 anni
            { category: 'MU-F-0', quota: 2 }, // Agnella
            { category: 'MU-F-I', quota: 3 }, // Giovane femmina 2-4 anni
            { category: 'MU-F-II', quota: 4 } // Adulta femmina ≥5 anni
          ];
          
          for (const cat of mouflonQuotas) {
            quotasToCreate.push({
              species: 'mouflon',
              roeDeerCategory: null,
              redDeerCategory: null,
              fallowDeerCategory: null,
              mouflonCategory: cat.category,
              chamoisCategory: null,
              totalQuota: cat.quota,
              harvested: 0,
              reserveId,
              season: currentYear.toString(),
              isActive: true,
              huntingStartDate: new Date(`${currentYear}-10-01`),
              huntingEndDate: new Date(`${currentYear + 1}-01-31`),
              notes: `Quote ${species} - create automaticamente`
            });
          }
        } else if (normalizedSpecies === 'camoscio') {
          // Quote standard per Camoscio (8 categorie) - Classificazioni ufficiali
          const chamoisQuotas = [
            { category: 'CA-M-0', quota: 2 }, // Capretto maschio
            { category: 'CA-M-I', quota: 3 }, // Yearling maschio 1-2 anni
            { category: 'CA-M-II', quota: 4 }, // Adulto maschio 2-6 anni
            { category: 'CA-M-III', quota: 1 }, // Vecchio adulto maschio ≥7 anni
            { category: 'CA-F-0', quota: 2 }, // Capretta
            { category: 'CA-F-I', quota: 3 }, // Yearling femmina 1-2 anni
            { category: 'CA-F-II', quota: 5 }, // Adulta femmina 2-6 anni
            { category: 'CA-F-III', quota: 2 } // Vecchia adulta femmina ≥7 anni
          ];
          
          for (const cat of chamoisQuotas) {
            quotasToCreate.push({
              species: 'chamois',
              roeDeerCategory: null,
              redDeerCategory: null,
              fallowDeerCategory: null,
              mouflonCategory: null,
              chamoisCategory: cat.category,
              totalQuota: cat.quota,
              harvested: 0,
              reserveId,
              season: currentYear.toString(),
              isActive: true,
              huntingStartDate: new Date(`${currentYear}-10-01`),
              huntingEndDate: new Date(`${currentYear + 1}-01-31`),
              notes: `Quote ${species} - create automaticamente`
            });
          }
        }
      }
      
      if (quotasToCreate.length > 0) {
        await db.insert(regionalQuotas).values(quotasToCreate);
        console.log(`Created ${quotasToCreate.length} quotas for selected species in reserve ${reserveId}`);
      } else {
        console.log(`No quotas created - no valid species found for reserve ${reserveId}`);
      }
    } catch (error) {
      console.error(`Error creating quotas for selected species:`, error);
      // Fallback: crea quote standard per capriolo e cervo
      await this.createStandardRegionalQuotas(reserveId);
    }
  }

  private async createStandardRegionalQuotas(reserveId: string): Promise<void> {
    // Quote standard di fallback (solo capriolo e cervo)
    const quotaCategories = [
      // Capriolo (5 categorie)
      { species: 'roe_deer' as const, roeDeerCategory: 'M0', totalQuota: 10, harvested: 0 },
      { species: 'roe_deer' as const, roeDeerCategory: 'F0', totalQuota: 8, harvested: 0 },
      { species: 'roe_deer' as const, roeDeerCategory: 'FA', totalQuota: 12, harvested: 0 },
      { species: 'roe_deer' as const, roeDeerCategory: 'M1', totalQuota: 6, harvested: 0 },
      { species: 'roe_deer' as const, roeDeerCategory: 'MA', totalQuota: 4, harvested: 0 },
      // Cervo (4 categorie)
      { species: 'red_deer' as const, redDeerCategory: 'CL0', totalQuota: 5, harvested: 0 },
      { species: 'red_deer' as const, redDeerCategory: 'FF', totalQuota: 8, harvested: 0 },
      { species: 'red_deer' as const, redDeerCategory: 'MM', totalQuota: 3, harvested: 0 },
      { species: 'red_deer' as const, redDeerCategory: 'MCL1', totalQuota: 2, harvested: 0 },
    ];

    const quotasToCreate = quotaCategories.map(quota => ({
      species: quota.species,
      roeDeerCategory: quota.species === 'roe_deer' ? quota.roeDeerCategory : null,
      redDeerCategory: quota.species === 'red_deer' ? quota.redDeerCategory : null,
      totalQuota: quota.totalQuota,
      harvested: quota.harvested,
      reserveId,
      season: new Date().getFullYear().toString(),
      isActive: true,
      huntingStartDate: new Date(`${new Date().getFullYear()}-10-01`),
      huntingEndDate: new Date(`${new Date().getFullYear() + 1}-01-31`),
      notes: 'Quote standard create automaticamente'
    }));

    await db.insert(regionalQuotas).values(quotasToCreate);
    console.log(`Created ${quotaCategories.length} standard regional quotas for reserve ${reserveId}`);
  }

  private async createGroupQuotasForSelectedSpecies(reserveId: string, speciesJson: string): Promise<void> {
    try {
      const selectedSpecies: string[] = JSON.parse(speciesJson || '[]');
      console.log(`Creating group quotas for selected species: ${selectedSpecies.join(', ')}`);
      
      // Ottieni i gruppi configurati per questa riserva
      const [reserve] = await db.select({
        activeGroups: reserves.activeGroups,
        numberOfGroups: reserves.numberOfGroups
      }).from(reserves).where(eq(reserves.id, reserveId));
      
      const activeGroups = reserve?.activeGroups || ['A', 'B', 'C', 'D'];
      console.log(`Using active groups for reserve ${reserveId}: ${activeGroups.join(', ')}`);
      
      const groupsQuotasToCreate: any[] = [];
      const currentYear = new Date().getFullYear();
      
      // Crea quote per ogni gruppo attivo e ogni specie selezionata
      for (const group of activeGroups) {
        for (const species of selectedSpecies) {
          const normalizedSpecies = species.toLowerCase();
          
          if (normalizedSpecies === 'capriolo') {
            // Quote standard per Capriolo per gruppo (5 categorie)
            const roeDeerQuotas = [
              { category: 'M0', quota: 3 },
              { category: 'F0', quota: 2 },
              { category: 'FA', quota: 3 },
              { category: 'M1', quota: 2 },
              { category: 'MA', quota: 1 }
            ];
            
            for (const cat of roeDeerQuotas) {
              groupsQuotasToCreate.push({
                reserveId,
                hunterGroup: group,
                species: 'roe_deer',
                roeDeerCategory: cat.category,
                redDeerCategory: null,
                fallowDeerCategory: null,
                mouflonCategory: null,
                chamoisCategory: null,
                totalQuota: cat.quota,
                harvested: 0,
                season: currentYear.toString(),
                isActive: true,
                notes: `Quote ${species} - Gruppo ${group}`
              });
            }
          } else if (normalizedSpecies === 'cervo') {
            // Quote standard per Cervo per gruppo (4 categorie)
            const redDeerQuotas = [
              { category: 'CL0', quota: 1 },
              { category: 'FF', quota: 2 },
              { category: 'MM', quota: 1 },
              { category: 'MCL1', quota: 1 }
            ];
            
            for (const cat of redDeerQuotas) {
              groupsQuotasToCreate.push({
                reserveId,
                hunterGroup: group,
                species: 'red_deer',
                roeDeerCategory: null,
                redDeerCategory: cat.category,
                fallowDeerCategory: null,
                mouflonCategory: null,
                chamoisCategory: null,
                totalQuota: cat.quota,
                harvested: 0,
                season: currentYear.toString(),
                isActive: true,
                notes: `Quote ${species} - Gruppo ${group}`
              });
            }
          }
        }
      }
      
      if (groupsQuotasToCreate.length > 0) {
        await db.insert(groupQuotas).values(groupsQuotasToCreate);
        console.log(`Created ${groupsQuotasToCreate.length} group quotas for selected species in reserve ${reserveId}`);
      } else {
        console.log(`No group quotas created - no valid species found for reserve ${reserveId}`);
      }
    } catch (error) {
      console.error(`Error creating group quotas for selected species:`, error);
    }
  }

  async updateReserve(id: string, data: Partial<Reserve>): Promise<Reserve | undefined> {
    const [updatedReserve] = await db.update(reserves)
      .set(data)
      .where(eq(reserves.id, id))
      .returning();
    return updatedReserve || undefined;
  }

  async deleteReserve(id: string): Promise<void> {
    console.log(`Starting deletion of reserve: ${id}`);
    
    try {
      // Elimina tutti i record associati prima di eliminare la riserva
      console.log('Deleting associated records...');
      
      // Elimina hunt reports
      await db.delete(huntReports).where(eq(huntReports.reserveId, id));
      
      // Elimina reservations  
      await db.delete(reservations).where(eq(reservations.reserveId, id));
      
      // Elimina regional quotas
      await db.delete(regionalQuotas).where(eq(regionalQuotas.reserveId, id));
      
      // Elimina zones
      await db.delete(zones).where(eq(zones.reserveId, id));
      
      // Elimina users
      await db.delete(users).where(eq(users.reserveId, id));
      
      // Elimina support tickets
      await db.delete(supportTickets).where(eq(supportTickets.reserveId, id));
      
      // Elimina billing
      await db.delete(billing).where(eq(billing.reserveId, id));
      
      // Elimina contracts
      await db.delete(contracts).where(eq(contracts.reserveId, id));
      
      // Elimina reserve settings
      await db.delete(reserveSettings).where(eq(reserveSettings.reserveId, id));
      
      // Infine elimina la riserva
      const result = await db.delete(reserves).where(eq(reserves.id, id));
      console.log(`Successfully deleted reserve: ${id}`);
    } catch (error) {
      console.error(`Error deleting reserve ${id}:`, error);
      throw error;
    }
  }

  async updateReserveAccessCode(reserveId: string, data: { accessCode?: string; codeActive?: boolean }): Promise<Reserve | undefined> {
    const [updatedReserve] = await db
      .update(reserves)
      .set(data)
      .where(eq(reserves.id, reserveId))
      .returning();
    return updatedReserve || undefined;
  }

  async getReserveStats(reserveId: string): Promise<{
    totalUsers: number;
    totalZones: number;
    totalQuotas: number;
    activeReservations: number;
  }> {
    const [userCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.reserveId, reserveId));

    const [zoneCount] = await db
      .select({ count: count() })
      .from(zones)
      .where(eq(zones.reserveId, reserveId));

    const [quotaCount] = await db
      .select({ count: count() })
      .from(regionalQuotas)
      .where(eq(regionalQuotas.reserveId, reserveId));

    const [reservationCount] = await db
      .select({ count: count() })
      .from(reservations)
      .where(and(
        eq(reservations.reserveId, reserveId),
        eq(reservations.status, 'active')
      ));

    return {
      totalUsers: userCount.count,
      totalZones: zoneCount.count,
      totalQuotas: quotaCount.count,
      activeReservations: reservationCount.count,
    };
  }

  async getUser(id: number, reserveId?: string): Promise<User | undefined> {
    const conditions = [eq(users.id, id)];
    if (reserveId) {
      conditions.push(eq(users.reserveId, reserveId));
    }
    const [user] = await db.select().from(users).where(and(...conditions));
    return user || undefined;
  }

  async getUserByEmail(email: string, reserveId?: string): Promise<User | undefined> {
    const conditions = [eq(users.email, email)];
    if (reserveId) {
      conditions.push(eq(users.reserveId, reserveId));
    }
    const [user] = await db.select().from(users).where(and(...conditions));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser, creatorReserveId?: string): Promise<User> {
    // Se viene specificato un reserveId del creatore, lo eredita
    const userData = creatorReserveId ? { ...insertUser, reserveId: creatorReserveId } : insertUser;
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async getAllZones(reserveId: string): Promise<Zone[]> {
    return await db.select().from(zones).where(
      and(eq(zones.isActive, true), eq(zones.reserveId, reserveId))
    );
  }

  async getZone(id: number, reserveId: string): Promise<Zone | undefined> {
    const [zone] = await db.select().from(zones).where(
      and(eq(zones.id, id), eq(zones.reserveId, reserveId))
    );
    return zone || undefined;
  }

  async createZone(zone: InsertZone): Promise<Zone> {
    const [newZone] = await db.insert(zones).values(zone).returning();
    return newZone;
  }

  async getZoneQuotas(zoneId: number, reserveId: string): Promise<WildlifeQuota[]> {
    return await db.select().from(wildlifeQuotas)
      .innerJoin(zones, eq(wildlifeQuotas.zoneId, zones.id))
      .where(and(
        eq(wildlifeQuotas.zoneId, zoneId),
        eq(zones.reserveId, reserveId)
      ));
  }

  async getAllQuotas(reserveId: string): Promise<WildlifeQuota[]> {
    const quotas = await db
      .select({
        id: zones.id,
        name: zones.name,
        description: zones.description,
        quotas: sql<any[]>`json_agg(
          json_build_object(
            'id', ${wildlifeQuotas.id},
            'zoneId', ${wildlifeQuotas.zoneId},
            'species', ${wildlifeQuotas.species},
            'roeDeerCategory', ${wildlifeQuotas.roeDeerCategory},
            'redDeerCategory', ${wildlifeQuotas.redDeerCategory},
            'sex', ${wildlifeQuotas.sex},
            'ageClass', ${wildlifeQuotas.ageClass},
            'totalQuota', ${wildlifeQuotas.totalQuota},
            'harvested', ${wildlifeQuotas.harvested}
          )
        )`,
      })
      .from(zones)
      .leftJoin(wildlifeQuotas, eq(zones.id, wildlifeQuotas.zoneId))
      .where(and(
        eq(zones.isActive, true),
        isNotNull(wildlifeQuotas.id)
      ))
      .groupBy(zones.id, zones.name, zones.description)
      .orderBy(zones.id);

    return quotas as any;
  }

  async updateQuota(id: number, reserveId: string, harvested?: number, totalQuota?: number): Promise<WildlifeQuota | undefined> {
    const updateData: any = {};
    if (harvested !== undefined) updateData.harvested = harvested;
    if (totalQuota !== undefined) updateData.totalQuota = totalQuota;
    
    if (Object.keys(updateData).length === 0) {
      return undefined;
    }
    
    const [quota] = await db
      .update(wildlifeQuotas)
      .set(updateData)
      .where(eq(wildlifeQuotas.id, id))
      .returning();
    return quota || undefined;
  }

  async getReservations(reserveId: string, hunterId?: number): Promise<(Reservation & { zone: Zone; hunter: User })[]> {
    const query = db
      .select({
        id: reservations.id,
        hunterId: reservations.hunterId,
        zoneId: reservations.zoneId,
        huntDate: reservations.huntDate,
        timeSlot: reservations.timeSlot,
        status: reservations.status,
        reserveId: reservations.reserveId,
        createdAt: reservations.createdAt,
        zone: {
          id: zones.id,
          name: zones.name,
          description: zones.description,
          isActive: zones.isActive,
        },
        hunter: {
          id: users.id,
          email: users.email,
          password: users.password,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
        },
      })
      .from(reservations)
      .innerJoin(zones, eq(reservations.zoneId, zones.id))
      .innerJoin(users, eq(reservations.hunterId, users.id))
      .where(eq(reservations.reserveId, reserveId))
      .orderBy(desc(reservations.huntDate));

    if (hunterId) {
      return await query.where(eq(reservations.hunterId, hunterId));
    }

    return await query;
  }

  async getReservation(id: number): Promise<Reservation | undefined> {
    const [reservation] = await db.select().from(reservations).where(eq(reservations.id, id));
    return reservation || undefined;
  }

  async getZoneReservations(zoneId: number, date: string, timeSlot: string): Promise<Reservation[]> {
    return await db
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.zoneId, zoneId),
          eq(reservations.huntDate, new Date(date)),
          eq(reservations.timeSlot, timeSlot as any),
          eq(reservations.status, 'active')
        )
      );
  }

  async createReservation(reservation: InsertReservation): Promise<Reservation> {
    try {
      // Verifica conflitti di prenotazione per lo stesso cacciatore nella stessa data
      const existingReservations = await db
        .select({ id: reservations.id, timeSlot: reservations.timeSlot })
        .from(reservations)
        .where(
          and(
            eq(reservations.hunterId, reservation.hunterId),
            eq(reservations.huntDate, reservation.huntDate),
            eq(reservations.status, 'active'),
            eq(reservations.reserveId, reservation.reserveId)
          )
        );

      // Controlla conflitti specifici
      for (const existing of existingReservations) {
        // Se esiste già una prenotazione "tutto il giorno", non permettere altre
        if (existing.timeSlot === 'full_day') {
          throw new Error('Hai già una prenotazione per tutto il giorno in questa data');
        }
        
        // Se sto prenotando "tutto il giorno" ma esistono già slot specifici
        if (reservation.timeSlot === 'full_day') {
          throw new Error('Non puoi prenotare tutto il giorno se hai già slot specifici');
        }
        
        // Se sto prenotando lo stesso slot specifico
        if (existing.timeSlot === reservation.timeSlot) {
          throw new Error(`Hai già una prenotazione per ${reservation.timeSlot === 'morning' ? 'la mattina' : 'il pomeriggio'} in questa data`);
        }
      }

      // Verifica conflitti per zona/data considerando "tutto il giorno" vs slot specifici
      const zoneReservations = await db
        .select({ id: reservations.id, timeSlot: reservations.timeSlot })
        .from(reservations)
        .where(
          and(
            eq(reservations.zoneId, reservation.zoneId),
            eq(reservations.huntDate, reservation.huntDate),
            eq(reservations.status, 'active'),
            eq(reservations.reserveId, reservation.reserveId)
          )
        );

      // Controlla conflitti specifici per la zona
      for (const existing of zoneReservations) {
        // Se esiste già una prenotazione "tutto il giorno", non permettere altri slot
        if (existing.timeSlot === 'full_day') {
          throw new Error('Questa zona è già prenotata per tutto il giorno');
        }
        
        // Se sto prenotando "tutto il giorno" ma esistono già slot specifici
        if (reservation.timeSlot === 'full_day') {
          throw new Error('Non puoi prenotare tutto il giorno: zona già occupata in altri orari');
        }
        
        // Se sto prenotando lo stesso slot specifico
        if (existing.timeSlot === reservation.timeSlot) {
          throw new Error('Questa zona è già prenotata per questo orario');
        }
      }

      const [newReservation] = await db
        .insert(reservations)
        .values(reservation)
        .returning();
      
      return newReservation;
    } catch (error) {
      console.error('Error in createReservation:', error);
      throw error;
    }
  }

  async cancelReservation(id: number): Promise<void> {
    await db
      .update(reservations)
      .set({ status: 'cancelled' })
      .where(eq(reservations.id, id));
  }

  /**
   * Crea un report di caccia e aggiorna automaticamente le quote regionali
   * Le quote sono a livello regionale, non per zona - ogni prelievo scala la quota totale disponibile
   */
  async createHuntReport(report: InsertHuntReport): Promise<HuntReport> {
    const [newReport] = await db.insert(huntReports).values(report).returning();
    
    // Se è stato dichiarato un prelievo, aggiorna la quota regionale
    if (report.outcome === 'harvest' && report.species) {
      await this.updateRegionalQuotaAfterHarvestByCategory(
        report.species, 
        report.roeDeerCategory, 
        report.redDeerCategory, 
        report.reserveId
      );
    }
    
    // Marca la prenotazione come completata
    await db
      .update(reservations)
      .set({ status: 'completed' })
      .where(eq(reservations.id, report.reservationId));
    
    return newReport;
  }

  /**
   * Aggiorna le quote regionali dopo un prelievo usando le categorie specifiche
   * Decrementa direttamente la quota della categoria selezionata
   */
  private async updateRegionalQuotaAfterHarvestByCategory(
    species: 'roe_deer' | 'red_deer',
    roeDeerCategory?: string | null,
    redDeerCategory?: string | null,
    reserveId?: string
  ): Promise<void> {
    let categoryToUpdate: string | null = null;
    
    // Usa direttamente la categoria specifica fornita dal form
    if (species === 'roe_deer' && roeDeerCategory) {
      categoryToUpdate = roeDeerCategory;
    } else if (species === 'red_deer' && redDeerCategory) {
      categoryToUpdate = redDeerCategory;
    }
    
    if (!categoryToUpdate) {
      console.warn('Categoria non specificata per il prelievo:', { species, roeDeerCategory, redDeerCategory });
      return;
    }
    
    console.log(`🎯 Aggiornamento quota: ${species} categoria ${categoryToUpdate} per riserva ${reserveId}`);
    
    // Trova e aggiorna la quota regionale
    const quotaCondition = species === 'roe_deer' 
      ? eq(regionalQuotas.roeDeerCategory, categoryToUpdate as any)
      : eq(regionalQuotas.redDeerCategory, categoryToUpdate as any);
    
    const [quotaToUpdate] = await db
      .select()
      .from(regionalQuotas)
      .where(
        and(
          eq(regionalQuotas.species, species),
          eq(regionalQuotas.reserveId, reserveId || 'cison-valmarino'),
          quotaCondition
        )
      );
    
    if (quotaToUpdate && quotaToUpdate.harvested < quotaToUpdate.totalQuota) {
      console.log(`✅ Quota trovata - Incremento harvested da ${quotaToUpdate.harvested} a ${quotaToUpdate.harvested + 1}`);
      await db
        .update(regionalQuotas)
        .set({ 
          harvested: quotaToUpdate.harvested + 1,
          updatedAt: new Date()
        })
        .where(eq(regionalQuotas.id, quotaToUpdate.id));
      
      console.log(`Quota regionale aggiornata: ${species}-${categoryToUpdate}, prelevati: ${quotaToUpdate.harvested + 1}/${quotaToUpdate.totalQuota}`);
    } else {
      console.warn(`Quota esaurita o non trovata per: ${species}-${categoryToUpdate}`);
    }
  }

  /**
   * Verifica se una combinazione specie/categoria è ancora disponibile a livello regionale
   * Da usare prima di permettere prenotazioni
   */
  async isSpeciesCategoryAvailable(
    species: 'roe_deer' | 'red_deer',
    category: string
  ): Promise<boolean> {
    const quotaCondition = species === 'roe_deer' 
      ? eq(regionalQuotas.roeDeerCategory, category as any)
      : eq(regionalQuotas.redDeerCategory, category as any);
    
    const [quota] = await db
      .select()
      .from(regionalQuotas)
      .where(
        and(
          eq(regionalQuotas.species, species),
          quotaCondition
        )
      );
    
    return quota ? quota.harvested < quota.totalQuota : false;
  }

  /**
   * Ottiene tutte le quote regionali con stato disponibilità e periodo di caccia
   */
  async getRegionalQuotas(reserveId: string): Promise<(RegionalQuota & { available: number; isExhausted: boolean; isInSeason: boolean })[]> {
    const quotas = await db.select().from(regionalQuotas)
      .where(eq(regionalQuotas.reserveId, reserveId))
      .orderBy(regionalQuotas.species, regionalQuotas.roeDeerCategory, regionalQuotas.redDeerCategory);
    const now = new Date();
    
    return quotas.map(quota => ({
      ...quota,
      available: quota.totalQuota - quota.harvested,
      isExhausted: quota.harvested >= quota.totalQuota,
      isInSeason: quota.huntingStartDate && quota.huntingEndDate 
        ? now >= quota.huntingStartDate && now <= quota.huntingEndDate && quota.isActive
        : quota.isActive
    }));
  }

  /**
   * Aggiorna una quota regionale (admin può modificare totali, periodi, note)
   */
  async updateRegionalQuota(id: number, reserveId: string, data: Partial<RegionalQuota>): Promise<RegionalQuota | undefined> {
    try {
      const updateData = { 
        ...data, 
        updatedAt: new Date() 
      };
      
      console.log('Updating regional quota:', id, updateData);
      
      const [updatedQuota] = await db
        .update(regionalQuotas)
        .set(updateData)
        .where(eq(regionalQuotas.id, id))
        .returning();
      
      if (!updatedQuota) {
        throw new Error(`Regional quota with id ${id} not found`);
      }
      
      return updatedQuota;
    } catch (error) {
      console.error("Error updating regional quota:", error);
      throw error;
    }
  }

  /**
   * Crea o aggiorna una quota regionale (quando arrivano nuovi numeri dalla regione)
   */
  async createOrUpdateRegionalQuota(quota: InsertRegionalQuota): Promise<RegionalQuota> {
    try {
      // Verifica se esiste già una quota per questa combinazione
      const existingQuota = await db
        .select()
        .from(regionalQuotas)
        .where(
          and(
            eq(regionalQuotas.species, quota.species),
            quota.roeDeerCategory 
              ? eq(regionalQuotas.roeDeerCategory, quota.roeDeerCategory)
              : eq(regionalQuotas.redDeerCategory, quota.redDeerCategory!)
          )
        );

      if (existingQuota.length > 0) {
        // Aggiorna quota esistente
        const [updated] = await db
          .update(regionalQuotas)
          .set({ 
            totalQuota: quota.totalQuota,
            season: quota.season,
            updatedAt: new Date()
          })
          .where(eq(regionalQuotas.id, existingQuota[0].id))
          .returning();
        return updated;
      } else {
        // Crea nuova quota
        const [newQuota] = await db
          .insert(regionalQuotas)
          .values(quota)
          .returning();
        return newQuota;
      }
    } catch (error) {
      console.error("Error creating/updating regional quota:", error);
      throw error;
    }
  }

  /**
   * Elimina un report di caccia e ripristina automaticamente le quote regionali
   * Solo per prelievi (harvest), incrementa la quota disponibile
   */
  /**
   * Aggiorna un report di caccia esistente (solo ADMIN)
   */
  async updateHuntReport(id: number, reserveId: string, data: Partial<InsertHuntReport>): Promise<HuntReport | undefined> {
    try {
      // Prima ottieni il report esistente per confrontare le quote
      const [existingReport] = await db
        .select()
        .from(huntReports)
        .where(and(eq(huntReports.id, id), eq(huntReports.reserveId, reserveId)));
      
      if (!existingReport) {
        return undefined;
      }

      // Aggiorna il report
      const [updatedReport] = await db
        .update(huntReports)
        .set({ 
          ...data, 
          updatedAt: new Date() 
        })
        .where(and(eq(huntReports.id, id), eq(huntReports.reserveId, reserveId)))
        .returning();

      // Gestisci aggiornamento quote se necessario
      if (data.outcome !== undefined || data.species !== undefined || 
          data.roeDeerCategory !== undefined || data.redDeerCategory !== undefined) {
        
        // Se il report precedente era un prelievo, ripristina la quota
        if (existingReport.outcome === 'harvest' && existingReport.species) {
          const oldCategory = existingReport.species === 'roe_deer' 
            ? existingReport.roeDeerCategory! 
            : existingReport.redDeerCategory!;
          await this.restoreRegionalQuotaAfterDelete(existingReport.species, oldCategory, reserveId);
        }

        // Se il nuovo report è un prelievo, aggiorna la quota
        if (updatedReport.outcome === 'harvest' && updatedReport.species) {
          const newCategory = updatedReport.species === 'roe_deer' 
            ? updatedReport.roeDeerCategory! 
            : updatedReport.redDeerCategory!;
          await this.updateRegionalQuotaOnHarvest(updatedReport.species, newCategory, reserveId);
        }
      }

      console.log(`Report ${id} aggiornato con successo`);
      return updatedReport;
    } catch (error) {
      console.error("Errore aggiornamento report:", error);
      throw error;
    }
  }



  /**
   * SUPERADMIN: Crea nuova quota regionale per una riserva
   */
  async createRegionalQuota(quota: InsertRegionalQuota): Promise<RegionalQuota> {
    const [newQuota] = await db
      .insert(regionalQuotas)
      .values(quota)
      .returning();
    return newQuota;
  }

  /**
   * SUPERADMIN: Aggiorna quota regionale esistente (firma semplificata per SuperAdmin)
   * Overload per supportare sia admin che superadmin
   */

  /**
   * SUPERADMIN: Elimina quota regionale
   */
  async deleteRegionalQuota(id: number): Promise<boolean> {
    const result = await db
      .delete(regionalQuotas)
      .where(eq(regionalQuotas.id, id));
    return result.changes > 0;
  }

  /**
   * SUPERADMIN: Elimina tutte le quote regionali per una riserva (per reimportazione)
   */
  async deleteAllRegionalQuotasForReserve(reserveId: string): Promise<void> {
    await db
      .delete(regionalQuotas)
      .where(eq(regionalQuotas.reserveId, reserveId));
    console.log(`🗑️ Deleted all regional quotas for reserve ${reserveId}`);
  }

  async deleteHuntReport(id: number, reserveId: string): Promise<void> {
    try {
      // Prima di eliminare, ottieni i dettagli del report per ripristinare le quote
      const [reportToDelete] = await db
        .select()
        .from(huntReports)
        .where(and(eq(huntReports.id, id), eq(huntReports.reserveId, reserveId)));

      if (!reportToDelete) {
        throw new Error(`Report ${id} non trovato nella riserva ${reserveId}`);
      }

      // Se era un prelievo, ripristina la quota regionale
      if (reportToDelete.outcome === 'harvest' && reportToDelete.species) {
        await this.restoreRegionalQuotaAfterDelete(
          reportToDelete.species,
          reportToDelete.roeDeerCategory || reportToDelete.redDeerCategory || '',
          reserveId
        );
      }

      // Elimina il report
      await db.delete(huntReports).where(and(eq(huntReports.id, id), eq(huntReports.reserveId, reserveId)));
      
      console.log(`Report ${id} eliminato e quote ripristinate`);
    } catch (error) {
      console.error("Errore eliminazione report:", error);
      throw error;
    }
  }

  /**
   * Ripristina le quote regionali dopo l'eliminazione di un report di prelievo
   */
  private async restoreRegionalQuotaAfterDelete(
    species: 'roe_deer' | 'red_deer',
    category: string,
    reserveId: string
  ): Promise<void> {
    if (!category) {
      console.warn("Categoria non specificata per il ripristino quota");
      return;
    }

    const quotaCondition = species === 'roe_deer' 
      ? eq(regionalQuotas.roeDeerCategory, category as any)
      : eq(regionalQuotas.redDeerCategory, category as any);
    
    const [quotaToRestore] = await db
      .select()
      .from(regionalQuotas)
      .where(
        and(
          eq(regionalQuotas.species, species),
          quotaCondition,
          eq(regionalQuotas.reserveId, reserveId)
        )
      );

    if (quotaToRestore && quotaToRestore.harvested > 0) {
      // Decrementa i prelievi (ripristina la quota)
      await db
        .update(regionalQuotas)
        .set({ 
          harvested: quotaToRestore.harvested - 1,
          updatedAt: new Date()
        })
        .where(eq(regionalQuotas.id, quotaToRestore.id));
      
      console.log(`Quota regionale ripristinata: ${species}-${category}, prelievi: ${quotaToRestore.harvested - 1}/${quotaToRestore.totalQuota}`);
    } else {
      console.warn(`Quota non trovata o già a zero per: ${species}-${category}`);
    }
  }

  async getHuntReports(): Promise<(HuntReport & { reservation: Reservation & { zone: Zone; hunter: User } })[]> {
    const results = await db
      .select({
        // Hunt report fields
        reportId: huntReports.id,
        reservationId: huntReports.reservationId,
        outcome: huntReports.outcome,
        species: huntReports.species,
        sex: huntReports.sex,
        ageClass: huntReports.ageClass,
        notes: huntReports.notes,
        reportedAt: huntReports.reportedAt,
        
        // Reservation fields
        resId: reservations.id,
        resHunterId: reservations.hunterId,
        resZoneId: reservations.zoneId,
        resHuntDate: reservations.huntDate,
        resTimeSlot: reservations.timeSlot,
        resStatus: reservations.status,
        resCreatedAt: reservations.createdAt,
        
        // Zone fields
        zoneId: zones.id,
        zoneName: zones.name,
        zoneDescription: zones.description,
        zoneIsActive: zones.isActive,
        
        // Hunter fields
        hunterId: users.id,
        hunterEmail: users.email,
        hunterFirstName: users.firstName,
        hunterLastName: users.lastName,
        hunterRole: users.role,
        hunterIsActive: users.isActive,
      })
      .from(huntReports)
      .innerJoin(reservations, eq(huntReports.reservationId, reservations.id))
      .innerJoin(zones, eq(reservations.zoneId, zones.id))
      .innerJoin(users, eq(reservations.hunterId, users.id))
      .orderBy(desc(huntReports.reportedAt));

    return results.map(row => ({
      id: row.reportId,
      reservationId: row.reservationId,
      outcome: row.outcome,
      species: row.species,
      sex: row.sex,
      ageClass: row.ageClass,
      notes: row.notes,
      reportedAt: row.reportedAt,
      reservation: {
        id: row.resId,
        hunterId: row.resHunterId,
        zoneId: row.resZoneId,
        huntDate: row.resHuntDate,
        timeSlot: row.resTimeSlot,
        status: row.resStatus,
        createdAt: row.resCreatedAt,
        zone: {
          id: row.zoneId,
          name: row.zoneName,
          description: row.zoneDescription,
          isActive: row.zoneIsActive,
        },
        hunter: {
          id: row.hunterId,
          email: row.hunterEmail,
          firstName: row.hunterFirstName,
          lastName: row.hunterLastName,
          role: row.hunterRole,
          isActive: row.hunterIsActive,
        },
      },
    }));
  }

  async getAdminStats(reserveId: string): Promise<{
    activeHunters: number;
    todayReservations: number;
    totalHarvested: number;
    lowQuotas: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [activeHuntersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        eq(users.role, 'HUNTER'), 
        eq(users.isActive, true),
        eq(users.reserveId, reserveId)
      ));

    const [todayReservationsResult] = await db
      .select({ count: count() })
      .from(reservations)
      .where(
        and(
          sql`${reservations.huntDate} >= ${today}`,
          sql`${reservations.huntDate} < ${tomorrow}`,
          eq(reservations.status, 'active'),
          eq(reservations.reserveId, reserveId)
        )
      );

    const [totalHarvestedResult] = await db
      .select({ total: sql<number>`sum(${regionalQuotas.harvested})` })
      .from(regionalQuotas)
      .where(eq(regionalQuotas.reserveId, reserveId));

    const [lowQuotasResult] = await db
      .select({ count: count() })
      .from(regionalQuotas)
      .where(and(
        eq(regionalQuotas.reserveId, reserveId),
        sql`${regionalQuotas.harvested} >= ${regionalQuotas.totalQuota} * 0.8`
      ));

    return {
      activeHunters: activeHuntersResult.count,
      todayReservations: todayReservationsResult.count,
      totalHarvested: totalHarvestedResult.total || 0,
      lowQuotas: lowQuotasResult.count,
    };
  }

  // Hunter Management Methods
  async getHuntersByReserve(reserveId: string): Promise<User[]> {
    return await db.select().from(users).where(
      and(
        eq(users.role, 'HUNTER'),
        eq(users.reserveId, reserveId)
      )
    );
  }

  async getHunterByIdAndReserve(hunterId: number, reserveId: string): Promise<User | undefined> {
    const [hunter] = await db.select().from(users).where(
      and(
        eq(users.id, hunterId),
        eq(users.role, 'HUNTER'),
        eq(users.reserveId, reserveId)
      )
    );
    return hunter || undefined;
  }

  async updateHunterStatus(id: number, isActive: boolean, reserveId: string): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ isActive })
      .where(and(eq(users.id, id), eq(users.reserveId, reserveId)))
      .returning();
    return updated;
  }

  async updateHunter(id: number, data: Partial<User>, reserveId: string): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set(data)
      .where(and(eq(users.id, id), eq(users.reserveId, reserveId)))
      .returning();
    return updated;
  }

  async createHunter(data: InsertUser): Promise<User> {
    // La password dovrebbe già essere hashata nel route handler
    const [hunter] = await db.insert(users).values(data).returning();
    return hunter;
  }

  async deleteHunter(id: number, reserveId: string): Promise<void> {
    await db.delete(users).where(and(eq(users.id, id), eq(users.reserveId, reserveId)));
  }

  /**
   * Ottiene tutte le riserve attive per la registrazione
   */
  async getActiveReserves(): Promise<Reserve[]> {
    return await db
      .select()
      .from(reserves)
      .where(eq(reserves.isActive, true));
  }

  /**
   * Valida l'accesso a una riserva tramite ID e codice d'accesso
   */
  async validateReserveAccess(reserveId: string, accessCode: string): Promise<Reserve | null> {
    const [reserve] = await db
      .select()
      .from(reserves)
      .where(and(
        eq(reserves.id, reserveId),
        eq(reserves.accessCode, accessCode),
        eq(reserves.isActive, true)
      ));
    
    return reserve || null;
  }

  /**
   * Valida se una riserva è attiva e può registrare nuovi cacciatori (legacy)
   */
  async validateActiveReserve(reserveName: string): Promise<boolean> {
    const [reserve] = await db
      .select()
      .from(reserves)
      .where(and(eq(reserves.name, reserveName), eq(reserves.isActive, true)));
    
    return !!reserve;
  }

  /**
   * Crea un account admin (solo SUPERADMIN)
   */
  async createAdminAccount(data: InsertUser): Promise<User> {
    const [admin] = await db
      .insert(users)
      .values({
        ...data,
        role: 'ADMIN',
      })
      .returning();
    return admin;
  }

  /**
   * Ottiene tutti gli account admin (solo SUPERADMIN)
   */
  async getAllAdmins(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.role, 'ADMIN'))
      .orderBy(users.firstName, users.lastName);
  }

  /**
   * Aggiorna un account admin (solo SUPERADMIN)
   */
  async updateAdmin(id: number, data: Partial<User>): Promise<User | undefined> {
    const [updatedAdmin] = await db
      .update(users)
      .set(data)
      .where(and(eq(users.id, id), eq(users.role, 'ADMIN')))
      .returning();
    return updatedAdmin;
  }

  // Reserve Settings Management (SUPERADMIN only)
  async getReserveSettings(reserveId: string): Promise<ReserveSettings | undefined> {
    const [settings] = await db
      .select()
      .from(reserveSettings)
      .where(eq(reserveSettings.reserveId, reserveId));
    return settings || undefined;
  }

  async createReserveSettings(settings: InsertReserveSettings): Promise<ReserveSettings> {
    const [newSettings] = await db
      .insert(reserveSettings)
      .values(settings)
      .returning();
    return newSettings;
  }

  async updateReserveSettings(reserveId: string, data: Partial<ReserveSettings>): Promise<ReserveSettings | undefined> {
    const [updatedSettings] = await db
      .update(reserveSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(reserveSettings.reserveId, reserveId))
      .returning();
    return updatedSettings || undefined;
  }

  // Contracts Management (SUPERADMIN only)
  async getAllContracts(): Promise<(Contract & { reserve: Reserve })[]> {
    const result = await db
      .select()
      .from(contracts)
      .leftJoin(reserves, eq(contracts.reserveId, reserves.id));
    return result.map(row => ({ ...row.contracts, reserve: row.reserves! }));
  }

  async getContractByReserve(reserveId: string): Promise<Contract | undefined> {
    const [contract] = await db
      .select()
      .from(contracts)
      .where(eq(contracts.reserveId, reserveId));
    return contract || undefined;
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const [newContract] = await db
      .insert(contracts)
      .values(contract)
      .returning();
    return newContract;
  }

  async updateContract(id: number, data: Partial<Contract>): Promise<Contract | undefined> {
    const [updatedContract] = await db
      .update(contracts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(contracts.id, id))
      .returning();
    return updatedContract || undefined;
  }

  async deleteContract(id: number): Promise<void> {
    await db.delete(contracts).where(eq(contracts.id, id));
  }

  // Support Tickets Management (SUPERADMIN only)
  async getAllSupportTickets(filters?: { status?: string; priority?: string; reserveId?: string }): Promise<(SupportTicket & { reserve: Reserve; admin?: User })[]> {
    let query = db
      .select()
      .from(supportTickets)
      .leftJoin(reserves, eq(supportTickets.reserveId, reserves.id))
      .leftJoin(users, eq(supportTickets.adminId, users.id));

    const whereConditions = [];
    if (filters?.status) {
      whereConditions.push(eq(supportTickets.status, filters.status));
    }
    if (filters?.priority) {
      whereConditions.push(eq(supportTickets.priority, filters.priority));
    }
    if (filters?.reserveId) {
      whereConditions.push(eq(supportTickets.reserveId, filters.reserveId));
    }

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }

    const result = await query;
    return result.map(row => ({ 
      ...row.support_tickets, 
      reserve: row.reserves!, 
      admin: row.users || undefined 
    }));
  }

  async getSupportTicket(id: number): Promise<(SupportTicket & { reserve: Reserve; admin?: User }) | undefined> {
    const [result] = await db
      .select()
      .from(supportTickets)
      .leftJoin(reserves, eq(supportTickets.reserveId, reserves.id))
      .leftJoin(users, eq(supportTickets.adminId, users.id))
      .where(eq(supportTickets.id, id));
    
    if (!result) return undefined;
    
    return {
      ...result.support_tickets,
      reserve: result.reserves!,
      admin: result.users || undefined
    };
  }

  async createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    const [newTicket] = await db
      .insert(supportTickets)
      .values(ticket)
      .returning();
    return newTicket;
  }

  async respondToSupportTicket(id: number, response: string, status?: string): Promise<SupportTicket | undefined> {
    const updateData: any = { response };
    if (status) {
      updateData.status = status;
      if (status === 'resolved') {
        updateData.resolvedAt = new Date();
      }
    }

    const [updatedTicket] = await db
      .update(supportTickets)
      .set(updateData)
      .where(eq(supportTickets.id, id))
      .returning();
    return updatedTicket || undefined;
  }

  async updateSupportTicketStatus(id: number, status: string): Promise<SupportTicket | undefined> {
    const updateData: any = { status };
    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
    }

    const [updatedTicket] = await db
      .update(supportTickets)
      .set(updateData)
      .where(eq(supportTickets.id, id))
      .returning();
    return updatedTicket || undefined;
  }

  // Billing Management (SUPERADMIN only)
  async getAllBilling(): Promise<(Billing & { reserve: Reserve })[]> {
    const result = await db
      .select()
      .from(billing)
      .leftJoin(reserves, eq(billing.reserveId, reserves.id));
    return result.map(row => ({ ...row.billing, reserve: row.reserves! }));
  }

  async getBillingByReserve(reserveId: string): Promise<Billing | undefined> {
    const [billingRecord] = await db
      .select()
      .from(billing)
      .where(eq(billing.reserveId, reserveId));
    return billingRecord || undefined;
  }

  async createBilling(billingData: InsertBilling): Promise<Billing> {
    const [newBilling] = await db
      .insert(billing)
      .values(billingData)
      .returning();
    return newBilling;
  }

  async updateBilling(id: number, data: Partial<Billing>): Promise<Billing | undefined> {
    const [updatedBilling] = await db
      .update(billing)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(billing.id, id))
      .returning();
    return updatedBilling || undefined;
  }

  // Materials Management (SUPERADMIN only)
  async getAllMaterials(): Promise<Material[]> {
    return await db.select().from(materials).where(eq(materials.isActive, true));
  }

  async getMaterial(id: number): Promise<Material | undefined> {
    const [material] = await db
      .select()
      .from(materials)
      .where(and(eq(materials.id, id), eq(materials.isActive, true)));
    return material || undefined;
  }

  async createMaterial(material: InsertMaterial): Promise<Material> {
    const [newMaterial] = await db
      .insert(materials)
      .values(material)
      .returning();
    return newMaterial;
  }

  async updateMaterial(id: number, data: Partial<Material>): Promise<Material | undefined> {
    const [updatedMaterial] = await db
      .update(materials)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(materials.id, id))
      .returning();
    return updatedMaterial || undefined;
  }

  async deleteMaterial(id: number): Promise<void> {
    await db
      .update(materials)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(materials.id, id));
  }

  async logMaterialAccess(materialId: number, userId: number): Promise<MaterialAccessLog> {
    const [accessLog] = await db
      .insert(materialAccessLog)
      .values({ materialId, userId })
      .returning();
    return accessLog;
  }

  async getMaterialAccessLogs(materialId?: number, userId?: number): Promise<(MaterialAccessLog & { material: Material; user: User })[]> {
    let query = db
      .select()
      .from(materialAccessLog)
      .leftJoin(materials, eq(materialAccessLog.materialId, materials.id))
      .leftJoin(users, eq(materialAccessLog.userId, users.id));

    const whereConditions = [];
    if (materialId) {
      whereConditions.push(eq(materialAccessLog.materialId, materialId));
    }
    if (userId) {
      whereConditions.push(eq(materialAccessLog.userId, userId));
    }

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }

    const result = await query;
    return result.map(row => ({
      ...row.material_access_log,
      material: row.materials!,
      user: row.users!
    }));
  }

  // Lottery System Implementation (standard_random management type)
  
  async getLotteries(reserveId: string): Promise<(Lottery & { participationsCount: number })[]> {
    return await db
      .select({
        id: lotteries.id,
        reserveId: lotteries.reserveId,
        title: lotteries.title,
        description: lotteries.description,
        species: lotteries.species,
        category: lotteries.category,
        totalSpots: lotteries.totalSpots,
        registrationStart: lotteries.registrationStart,
        registrationEnd: lotteries.registrationEnd,
        drawDate: lotteries.drawDate,
        status: lotteries.status,
        winnersDrawn: lotteries.winnersDrawn,
        createdAt: lotteries.createdAt,
        updatedAt: lotteries.updatedAt,
        participationsCount: count(lotteryParticipations.id),
      })
      .from(lotteries)
      .leftJoin(lotteryParticipations, eq(lotteries.id, lotteryParticipations.lotteryId))
      .where(eq(lotteries.reserveId, reserveId))
      .groupBy(lotteries.id)
      .orderBy(desc(lotteries.createdAt));
  }

  async getActiveLotteries(reserveId: string): Promise<(Lottery & { participationsCount: number; isRegistrationOpen: boolean })[]> {
    const now = new Date();
    
    return await db
      .select({
        id: lotteries.id,
        reserveId: lotteries.reserveId,
        title: lotteries.title,
        description: lotteries.description,
        species: lotteries.species,
        category: lotteries.category,
        totalSpots: lotteries.totalSpots,
        registrationStart: lotteries.registrationStart,
        registrationEnd: lotteries.registrationEnd,
        drawDate: lotteries.drawDate,
        status: lotteries.status,
        winnersDrawn: lotteries.winnersDrawn,
        createdAt: lotteries.createdAt,
        updatedAt: lotteries.updatedAt,
        participationsCount: count(lotteryParticipations.id),
        isRegistrationOpen: sql<boolean>`${lotteries.registrationStart} <= ${now} AND ${lotteries.registrationEnd} >= ${now}`,
      })
      .from(lotteries)
      .leftJoin(lotteryParticipations, eq(lotteries.id, lotteryParticipations.lotteryId))
      .where(and(
        eq(lotteries.reserveId, reserveId),
        eq(lotteries.status, 'active')
      ))
      .groupBy(lotteries.id)
      .orderBy(lotteries.drawDate);
  }

  async createLottery(lottery: InsertLottery): Promise<Lottery> {
    const [newLottery] = await db.insert(lotteries).values(lottery).returning();
    return newLottery;
  }

  async updateLottery(id: number, data: Partial<Lottery>, reserveId: string): Promise<Lottery | undefined> {
    const [updatedLottery] = await db
      .update(lotteries)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(lotteries.id, id), eq(lotteries.reserveId, reserveId)))
      .returning();
    return updatedLottery || undefined;
  }

  async deleteLottery(id: number, reserveId: string): Promise<void> {
    await db
      .delete(lotteries)
      .where(and(eq(lotteries.id, id), eq(lotteries.reserveId, reserveId)));
  }

  async joinLottery(lotteryId: number, hunterId: number, reserveId: string): Promise<LotteryParticipation> {
    // Verifica che la lotteria esista e sia nella riserva corretta
    const [lottery] = await db
      .select()
      .from(lotteries)
      .where(and(eq(lotteries.id, lotteryId), eq(lotteries.reserveId, reserveId)));
    
    if (!lottery) {
      throw new Error('Sorteggio non trovato');
    }

    // Verifica che le registrazioni siano aperte
    const now = new Date();
    if (now < lottery.registrationStart || now > lottery.registrationEnd) {
      throw new Error('Le registrazioni per questo sorteggio sono chiuse');
    }

    // Verifica che l'utente non sia già iscritto
    const [existingParticipation] = await db
      .select()
      .from(lotteryParticipations)
      .where(and(
        eq(lotteryParticipations.lotteryId, lotteryId),
        eq(lotteryParticipations.hunterId, hunterId)
      ));

    if (existingParticipation) {
      throw new Error('Sei già iscritto a questo sorteggio');
    }

    const [participation] = await db
      .insert(lotteryParticipations)
      .values({ lotteryId, hunterId })
      .returning();
    
    return participation;
  }

  async getLotteryParticipations(lotteryId: number, reserveId: string): Promise<(LotteryParticipation & { hunter: User })[]> {
    return await db
      .select({
        id: lotteryParticipations.id,
        lotteryId: lotteryParticipations.lotteryId,
        hunterId: lotteryParticipations.hunterId,
        registeredAt: lotteryParticipations.registeredAt,
        status: lotteryParticipations.status,
        position: lotteryParticipations.position,
        isWinner: lotteryParticipations.isWinner,
        hunter: {
          id: users.id,
          email: users.email,
          password: users.password,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isActive: users.isActive,
          reserveId: users.reserveId,
          isSelezionatore: users.isSelezionatore,
          isEsperto: users.isEsperto,
          partecipatoCensimenti: users.partecipatoCensimenti,
          isOspite: users.isOspite,
          accompagnato: users.accompagnato,
          createdAt: users.createdAt,
        },
      })
      .from(lotteryParticipations)
      .innerJoin(lotteries, eq(lotteryParticipations.lotteryId, lotteries.id))
      .innerJoin(users, eq(lotteryParticipations.hunterId, users.id))
      .where(and(
        eq(lotteryParticipations.lotteryId, lotteryId),
        eq(lotteries.reserveId, reserveId)
      ))
      .orderBy(lotteryParticipations.registeredAt);
  }

  async getHunterParticipations(hunterId: number, reserveId: string): Promise<(LotteryParticipation & { lottery: Lottery })[]> {
    return await db
      .select({
        id: lotteryParticipations.id,
        lotteryId: lotteryParticipations.lotteryId,
        hunterId: lotteryParticipations.hunterId,
        registeredAt: lotteryParticipations.registeredAt,
        status: lotteryParticipations.status,
        position: lotteryParticipations.position,
        isWinner: lotteryParticipations.isWinner,
        lottery: {
          id: lotteries.id,
          reserveId: lotteries.reserveId,
          title: lotteries.title,
          description: lotteries.description,
          species: lotteries.species,
          category: lotteries.category,
          totalSpots: lotteries.totalSpots,
          registrationStart: lotteries.registrationStart,
          registrationEnd: lotteries.registrationEnd,
          drawDate: lotteries.drawDate,
          status: lotteries.status,
          winnersDrawn: lotteries.winnersDrawn,
          createdAt: lotteries.createdAt,
          updatedAt: lotteries.updatedAt,
        },
      })
      .from(lotteryParticipations)
      .innerJoin(lotteries, eq(lotteryParticipations.lotteryId, lotteries.id))
      .where(and(
        eq(lotteryParticipations.hunterId, hunterId),
        eq(lotteries.reserveId, reserveId)
      ))
      .orderBy(desc(lotteries.drawDate));
  }

  async drawLotteryWinners(lotteryId: number, reserveId: string): Promise<(LotteryParticipation & { hunter: User })[]> {
    // Verifica che la lotteria esista e sia nella riserva corretta
    const [lottery] = await db
      .select()
      .from(lotteries)
      .where(and(eq(lotteries.id, lotteryId), eq(lotteries.reserveId, reserveId)));
    
    if (!lottery) {
      throw new Error('Sorteggio non trovato');
    }

    if (lottery.winnersDrawn) {
      throw new Error('I vincitori sono già stati estratti per questo sorteggio');
    }

    // Ottieni tutti i partecipanti
    const participants = await db
      .select()
      .from(lotteryParticipations)
      .where(eq(lotteryParticipations.lotteryId, lotteryId));

    if (participants.length === 0) {
      throw new Error('Nessun partecipante trovato per questo sorteggio');
    }

    // Mescola i partecipanti e seleziona i vincitori
    const shuffled = participants.sort(() => Math.random() - 0.5);
    const winners = shuffled.slice(0, lottery.totalSpots);

    // Aggiorna i vincitori nel database
    for (let i = 0; i < winners.length; i++) {
      await db
        .update(lotteryParticipations)
        .set({
          status: 'winner',
          isWinner: true,
          position: i + 1,
        })
        .where(eq(lotteryParticipations.id, winners[i].id));
    }

    // Segna i non vincitori
    const losers = shuffled.slice(lottery.totalSpots);
    for (const loser of losers) {
      await db
        .update(lotteryParticipations)
        .set({
          status: 'excluded',
          isWinner: false,
        })
        .where(eq(lotteryParticipations.id, loser.id));
    }

    // Aggiorna la lotteria come completata
    await db
      .update(lotteries)
      .set({
        status: 'completed',
        winnersDrawn: true,
        updatedAt: new Date(),
      })
      .where(eq(lotteries.id, lotteryId));

    // Restituisci i vincitori con le informazioni del cacciatore
    return await this.getLotteryParticipations(lotteryId, reserveId)
      .then(results => results.filter(p => p.isWinner));
  }

  // Reserve Rules Management
  async getReserveRules(reserveId: string): Promise<ReserveRule[]> {
    return await db.select().from(reserveRules).where(
      and(eq(reserveRules.reserveId, reserveId), eq(reserveRules.isActive, true))
    );
  }

  async createReserveRule(rule: InsertReserveRule): Promise<ReserveRule> {
    const [newRule] = await db.insert(reserveRules).values(rule).returning();
    return newRule;
  }

  async updateReserveRule(id: number, data: Partial<ReserveRule>): Promise<ReserveRule | undefined> {
    const [updatedRule] = await db
      .update(reserveRules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(reserveRules.id, id))
      .returning();
    return updatedRule || undefined;
  }

  async deleteReserveRule(id: number): Promise<void> {
    await db.delete(reserveRules).where(eq(reserveRules.id, id));
  }

  async checkZoneCooldown(reserveId: string, userId: number, zoneId: number): Promise<{ allowed: boolean; waitUntil?: Date; reason?: string }> {
    // Ottieni le regole di cooldown per la riserva
    const cooldownRules = await db.select().from(reserveRules).where(
      and(
        eq(reserveRules.reserveId, reserveId),
        eq(reserveRules.ruleType, 'zone_cooldown'),
        eq(reserveRules.isActive, true)
      )
    );

    if (cooldownRules.length === 0) {
      return { allowed: true };
    }

    // Ottieni l'ultima prenotazione dell'utente per questa zona
    const lastReservation = await db
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.hunterId, userId),
          eq(reservations.zoneId, zoneId),
          eq(reservations.reserveId, reserveId),
          eq(reservations.status, 'completed')
        )
      )
      .orderBy(desc(reservations.huntDate))
      .limit(1);

    if (lastReservation.length === 0) {
      return { allowed: true };
    }

    const lastHunt = lastReservation[0];
    const now = new Date();

    for (const rule of cooldownRules) {
      if (rule.zoneCooldownHours) {
        const cooldownMs = rule.zoneCooldownHours * 60 * 60 * 1000;
        const waitUntil = new Date(lastHunt.huntDate.getTime() + cooldownMs);
        
        if (now < waitUntil) {
          return {
            allowed: false,
            waitUntil,
            reason: `Devi attendere ${rule.zoneCooldownHours} ore dall'ultima uscita in questa zona`
          };
        }
      }

      if (rule.zoneCooldownTime) {
        const [hour, minute] = rule.zoneCooldownTime.split(':').map(Number);
        const todayCooldownTime = new Date();
        todayCooldownTime.setHours(hour, minute, 0, 0);
        
        // Se siamo oltre l'orario limite di oggi, può prenotare
        if (now >= todayCooldownTime) {
          return { allowed: true };
        }

        return {
          allowed: false,
          waitUntil: todayCooldownTime,
          reason: `Puoi prenotare questa zona solo dalle ${rule.zoneCooldownTime} in poi`
        };
      }
    }

    return { allowed: true };
  }

  async checkHarvestLimits(reserveId: string, userId: number, species: string): Promise<{ allowed: boolean; current: number; limit: number; reason?: string }> {
    // Ottieni le regole di limite prelievo per la riserva e specie
    const harvestRules = await db.select().from(reserveRules).where(
      and(
        eq(reserveRules.reserveId, reserveId),
        eq(reserveRules.ruleType, 'harvest_limit'),
        eq(reserveRules.targetSpecies, species as any),
        eq(reserveRules.isActive, true)
      )
    );

    if (harvestRules.length === 0) {
      return { allowed: true, current: 0, limit: 999 };
    }

    const currentSeason = new Date().getFullYear();
    const seasonStart = new Date(currentSeason, 8, 1); // 1 settembre
    const seasonEnd = new Date(currentSeason + 1, 1, 31); // 31 gennaio

    // Conta i prelievi dell'utente per questa specie nella stagione corrente
    const harvestCount = await db
      .select({ count: count() })
      .from(huntReports)
      .where(
        and(
          eq(huntReports.reserveId, reserveId),
          sql`${huntReports.reportedAt} >= ${seasonStart}`,
          sql`${huntReports.reportedAt} <= ${seasonEnd}`,
          eq(huntReports.outcome, 'harvest'),
          eq(huntReports.species, species as any),
          // Collega alla prenotazione per ottenere l'hunter
          sql`${huntReports.reservationId} IN (
            SELECT id FROM ${reservations} WHERE ${reservations.hunterId} = ${userId}
          )`
        )
      );

    const currentHarvests = harvestCount[0]?.count || 0;
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentDay = now.getDate();

    for (const rule of harvestRules) {
      let effectiveLimit = rule.maxHarvestPerSeason || 999;
      
      // Controlla se siamo nel periodo di bonus stagionale
      if (rule.seasonalStartDate && rule.seasonalEndDate && rule.bonusHarvestAllowed) {
        const [startMonth, startDay] = rule.seasonalStartDate.split('-').map(Number);
        const [endMonth, endDay] = rule.seasonalEndDate.split('-').map(Number);
        
        const isInBonusPeriod = 
          (currentMonth > startMonth || (currentMonth === startMonth && currentDay >= startDay)) &&
          (currentMonth < endMonth || (currentMonth === endMonth && currentDay <= endDay));
        
        if (isInBonusPeriod) {
          effectiveLimit += rule.bonusHarvestAllowed;
        }
      }
      
      if (effectiveLimit && currentHarvests >= effectiveLimit) {
        const bonusInfo = rule.bonusHarvestAllowed && rule.seasonalStartDate ? 
          ` (bonus +${rule.bonusHarvestAllowed} dal ${rule.seasonalStartDate})` : '';
        
        return {
          allowed: false,
          current: currentHarvests,
          limit: effectiveLimit,
          reason: `Limite stagionale raggiunto: ${currentHarvests}/${effectiveLimit} per ${species}${bonusInfo}`
        };
      }
      
      // TODO: Implementare controlli mensili e settimanali se necessario
    }

    return { 
      allowed: true, 
      current: currentHarvests, 
      limit: harvestRules[0]?.maxHarvestPerSeason || 999 
    };
  }

  // Group Quotas Management (for zones_groups management type)
  async getGroupQuotas(reserveId: string): Promise<GroupQuota[]> {
    return await db.select().from(groupQuotas).where(eq(groupQuotas.reserveId, reserveId));
  }

  async createGroupQuota(quota: InsertGroupQuota): Promise<GroupQuota> {
    const [newQuota] = await db.insert(groupQuotas).values(quota).returning();
    return newQuota;
  }

  async updateGroupQuota(id: number, data: Partial<GroupQuota>): Promise<GroupQuota | undefined> {
    const [updatedQuota] = await db.update(groupQuotas)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(groupQuotas.id, id))
      .returning();
    return updatedQuota || undefined;
  }

  async deleteGroupQuota(id: number): Promise<void> {
    await db.delete(groupQuotas).where(eq(groupQuotas.id, id));
  }

  async bulkUpdateGroupQuotas(quotasUpdate: Array<{ hunterGroup: string; species: string; category: string; totalQuota: number }>, reserveId: string): Promise<void> {
    for (const update of quotasUpdate) {
      // Trova la quota esistente per gruppo, specie e categoria
      const existingQuota = await db.select().from(groupQuotas).where(
        and(
          eq(groupQuotas.reserveId, reserveId),
          eq(groupQuotas.hunterGroup, update.hunterGroup as any),
          eq(groupQuotas.species, update.species as any),
          update.species === 'roe_deer' 
            ? eq(groupQuotas.roeDeerCategory, update.category as any)
            : eq(groupQuotas.redDeerCategory, update.category as any)
        )
      );

      if (existingQuota.length > 0) {
        // Aggiorna quota esistente
        await db.update(groupQuotas)
          .set({ 
            totalQuota: update.totalQuota,
            updatedAt: new Date()
          })
          .where(eq(groupQuotas.id, existingQuota[0].id));
      } else {
        // Crea nuova quota
        await db.insert(groupQuotas).values({
          reserveId,
          hunterGroup: update.hunterGroup as any,
          species: update.species as any,
          roeDeerCategory: update.species === 'roe_deer' ? update.category as any : null,
          redDeerCategory: update.species === 'red_deer' ? update.category as any : null,
          fallowDeerCategory: null,
          mouflonCategory: null,
          chamoisCategory: null,
          totalQuota: update.totalQuota,
          harvested: 0,
          season: new Date().getFullYear().toString(),
          isActive: true,
          notes: `Quota gruppo ${update.hunterGroup} - ${update.species}`
        });
      }
    }
  }
}

export const storage = new DatabaseStorage();

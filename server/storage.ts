// © 2025 Alessandro Favero - Tutti i diritti riservati
// Licenza: Uso riservato esclusivamente alle riserve attivate tramite contratto
// Vietata la riproduzione, distribuzione o modifica non autorizzata

import { 
  users, zones, wildlifeQuotas, regionalQuotas, reservations, huntReports, reserves,
  reserveSettings, contracts, supportTickets, billing, materials, materialAccessLog,
  type User, type InsertUser, type Zone, type InsertZone, type Reserve, type InsertReserve,
  type WildlifeQuota, type InsertWildlifeQuota, type RegionalQuota, type InsertRegionalQuota,
  type Reservation, type InsertReservation, type HuntReport, type InsertHuntReport,
  type ReserveSettings, type InsertReserveSettings, type Contract, type InsertContract,
  type SupportTicket, type InsertSupportTicket, type Billing, type InsertBilling,
  type Material, type InsertMaterial, type MaterialAccessLog, type InsertMaterialAccessLog
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
  
  // Admin Statistics (filtered by reserveId)
  getAdminStats(reserveId: string): Promise<{
    activeHunters: number;
    todayReservations: number;
    totalHarvested: number;
    lowQuotas: number;
  }>;

  // Hunter Management (filtered by reserveId)
  getAllHunters(reserveId: string): Promise<User[]>;
  updateHunterStatus(id: number, isActive: boolean, reserveId: string): Promise<User | undefined>;
  updateHunter(id: number, data: Partial<User>, reserveId: string): Promise<User | undefined>;
  createHunter(data: InsertUser): Promise<User>;
  deleteHunter(id: number, reserveId: string): Promise<void>;
  
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
    return newReserve;
  }

  async updateReserve(id: string, data: Partial<Reserve>): Promise<Reserve | undefined> {
    const [updatedReserve] = await db.update(reserves)
      .set(data)
      .where(eq(reserves.id, id))
      .returning();
    return updatedReserve || undefined;
  }

  async deleteReserve(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Elimina tutti i record associati alla riserva
      await tx.delete(huntReports).where(eq(huntReports.reserveId, id));
      await tx.delete(reservations).where(eq(reservations.reserveId, id));
      await tx.delete(regionalQuotas).where(eq(regionalQuotas.reserveId, id));
      await tx.delete(wildlifeQuotas).where(eq(wildlifeQuotas.reserveId, id));
      await tx.delete(zones).where(eq(zones.reserveId, id));
      await tx.delete(users).where(eq(users.reserveId, id));
      
      // Elimina i record superadmin associati
      await tx.delete(supportTickets).where(eq(supportTickets.reserveId, id));
      await tx.delete(billing).where(eq(billing.reserveId, id));
      await tx.delete(contracts).where(eq(contracts.reserveId, id));
      await tx.delete(reserveSettings).where(eq(reserveSettings.reserveId, id));
      
      // Infine elimina la riserva
      await tx.delete(reserves).where(eq(reserves.id, id));
    });
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
            eq(reservations.status, 'active')
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

      // Verifica che non ci siano più di 4 prenotazioni per zona/data/slot
      const slotReservations = await db
        .select({ id: reservations.id })
        .from(reservations)
        .where(
          and(
            eq(reservations.zoneId, reservation.zoneId),
            eq(reservations.huntDate, reservation.huntDate),
            eq(reservations.timeSlot, reservation.timeSlot),
            eq(reservations.status, 'active')
          )
        );

      if (slotReservations.length >= 4) {
        throw new Error('Slot di caccia pieno per questa zona, data e orario');
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
      await this.updateRegionalQuotaAfterHarvest(report.species, report.sex, report.ageClass);
    }
    
    // Marca la prenotazione come completata
    await db
      .update(reservations)
      .set({ status: 'completed' })
      .where(eq(reservations.id, report.reservationId));
    
    return newReport;
  }

  /**
   * Aggiorna le quote regionali dopo un prelievo
   * Identifica la categoria corretta e decrementa la quota disponibile
   */
  private async updateRegionalQuotaAfterHarvest(
    species: 'roe_deer' | 'red_deer',
    sex?: 'male' | 'female' | null,
    ageClass?: 'adult' | 'young' | null
  ): Promise<void> {
    let categoryToUpdate: string | null = null;
    
    // Determina la categoria basata su specie, sesso ed età
    if (species === 'roe_deer' && sex && ageClass) {
      // Capriolo: M0, F0, FA, M1, MA
      if (sex === 'male' && ageClass === 'young') categoryToUpdate = 'M0';
      else if (sex === 'female' && ageClass === 'young') categoryToUpdate = 'F0';
      else if (sex === 'female' && ageClass === 'adult') categoryToUpdate = 'FA';
      else if (sex === 'male' && ageClass === 'adult') categoryToUpdate = 'MA';
    } else if (species === 'red_deer' && sex && ageClass) {
      // Cervo: CL0, FF, MM, MCL1
      if (ageClass === 'young') categoryToUpdate = 'CL0';
      else if (sex === 'female' && ageClass === 'adult') categoryToUpdate = 'FF';
      else if (sex === 'male' && ageClass === 'adult') categoryToUpdate = 'MM';
    }
    
    if (!categoryToUpdate) {
      console.warn('Impossibile determinare la categoria per il prelievo:', { species, sex, ageClass });
      return;
    }
    
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
          quotaCondition
        )
      );
    
    if (quotaToUpdate && quotaToUpdate.harvested < quotaToUpdate.totalQuota) {
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
  async getRegionalQuotas(): Promise<(RegionalQuota & { available: number; isExhausted: boolean; isInSeason: boolean })[]> {
    const quotas = await db.select().from(regionalQuotas).orderBy(regionalQuotas.species, regionalQuotas.roeDeerCategory, regionalQuotas.redDeerCategory);
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

  async getAdminStats(): Promise<{
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
      .where(and(eq(users.role, 'HUNTER'), eq(users.isActive, true)));

    const [todayReservationsResult] = await db
      .select({ count: count() })
      .from(reservations)
      .where(
        and(
          sql`${reservations.huntDate} >= ${today}`,
          sql`${reservations.huntDate} < ${tomorrow}`,
          eq(reservations.status, 'active')
        )
      );

    const [totalHarvestedResult] = await db
      .select({ total: sql<number>`sum(${wildlifeQuotas.harvested})` })
      .from(wildlifeQuotas);

    const [lowQuotasResult] = await db
      .select({ count: count() })
      .from(wildlifeQuotas)
      .where(sql`${wildlifeQuotas.harvested} >= ${wildlifeQuotas.totalQuota} * 0.8`);

    return {
      activeHunters: activeHuntersResult.count,
      todayReservations: todayReservationsResult.count,
      totalHarvested: totalHarvestedResult.total || 0,
      lowQuotas: lowQuotasResult.count,
    };
  }

  // Hunter Management Methods
  async getAllHunters(): Promise<User[]> {
    const results = await db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.role, 'HUNTER'))
      .orderBy(users.lastName, users.firstName);
    return results;
  }

  async updateHunterStatus(id: number, isActive: boolean): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ isActive })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async updateHunter(id: number, data: Partial<User>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async createHunter(data: InsertUser): Promise<User> {
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
}

export const storage = new DatabaseStorage();

import { 
  users, zones, wildlifeQuotas, reservations, huntReports,
  type User, type InsertUser, type Zone, type InsertZone,
  type WildlifeQuota, type InsertWildlifeQuota, type Reservation, 
  type InsertReservation, type HuntReport, type InsertHuntReport
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, count, isNotNull } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Zones
  getAllZones(): Promise<Zone[]>;
  getZone(id: number): Promise<Zone | undefined>;
  createZone(zone: InsertZone): Promise<Zone>;
  
  // Wildlife Quotas
  getZoneQuotas(zoneId: number): Promise<WildlifeQuota[]>;
  getAllQuotas(): Promise<WildlifeQuota[]>;
  updateQuota(id: number, harvested?: number, totalQuota?: number): Promise<WildlifeQuota | undefined>;
  
  // Reservations
  getReservations(hunterId?: number): Promise<(Reservation & { zone: Zone; hunter: User })[]>;
  getZoneReservations(zoneId: number, date: string, timeSlot: string): Promise<Reservation[]>;
  createReservation(reservation: InsertReservation): Promise<Reservation>;
  cancelReservation(id: number): Promise<void>;
  
  // Hunt Reports
  createHuntReport(report: InsertHuntReport): Promise<HuntReport>;
  getHuntReports(): Promise<(HuntReport & { reservation: Reservation & { zone: Zone; hunter: User } })[]>;
  
  // Admin Statistics
  getAdminStats(): Promise<{
    activeHunters: number;
    todayReservations: number;
    totalHarvested: number;
    lowQuotas: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllZones(): Promise<Zone[]> {
    return await db.select().from(zones).where(eq(zones.isActive, true));
  }

  async getZone(id: number): Promise<Zone | undefined> {
    const [zone] = await db.select().from(zones).where(eq(zones.id, id));
    return zone || undefined;
  }

  async createZone(zone: InsertZone): Promise<Zone> {
    const [newZone] = await db.insert(zones).values(zone).returning();
    return newZone;
  }

  async getZoneQuotas(zoneId: number): Promise<WildlifeQuota[]> {
    return await db.select().from(wildlifeQuotas).where(eq(wildlifeQuotas.zoneId, zoneId));
  }

  async getAllQuotas(): Promise<WildlifeQuota[]> {
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
      .where(isNotNull(wildlifeQuotas.id))
      .groupBy(zones.id, zones.name, zones.description)
      .orderBy(zones.id);

    return quotas as any;
  }

  async updateQuota(id: number, harvested?: number, totalQuota?: number): Promise<WildlifeQuota | undefined> {
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

  async getReservations(hunterId?: number): Promise<(Reservation & { zone: Zone; hunter: User })[]> {
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
    const [newReservation] = await db.insert(reservations).values(reservation).returning();
    return newReservation;
  }

  async cancelReservation(id: number): Promise<void> {
    await db
      .update(reservations)
      .set({ status: 'cancelled' })
      .where(eq(reservations.id, id));
  }

  async createHuntReport(report: InsertHuntReport): Promise<HuntReport> {
    const [newReport] = await db.insert(huntReports).values(report).returning();
    
    // If harvest reported, update quota
    if (report.outcome === 'harvest' && report.species && report.sex && report.ageClass) {
      // Get reservation to find zone
      const [reservation] = await db
        .select()
        .from(reservations)
        .where(eq(reservations.id, report.reservationId));
      
      if (reservation) {
        // Find matching quota
        const [quota] = await db
          .select()
          .from(wildlifeQuotas)
          .where(
            and(
              eq(wildlifeQuotas.zoneId, reservation.zoneId),
              eq(wildlifeQuotas.species, report.species),
              eq(wildlifeQuotas.sex, report.sex),
              eq(wildlifeQuotas.ageClass, report.ageClass)
            )
          );
        
        if (quota) {
          await db
            .update(wildlifeQuotas)
            .set({ harvested: quota.harvested + 1 })
            .where(eq(wildlifeQuotas.id, quota.id));
        }
      }
      
      // Mark reservation as completed
      await db
        .update(reservations)
        .set({ status: 'completed' })
        .where(eq(reservations.id, report.reservationId));
    }
    
    return newReport;
  }

  async getHuntReports(): Promise<(HuntReport & { reservation: Reservation & { zone: Zone; hunter: User } })[]> {
    const results = await db
      .select({
        id: huntReports.id,
        reservationId: huntReports.reservationId,
        outcome: huntReports.outcome,
        species: huntReports.species,
        sex: huntReports.sex,
        ageClass: huntReports.ageClass,
        notes: huntReports.notes,
        reportedAt: huntReports.reportedAt,
        resId: reservations.id,
        resHunterId: reservations.hunterId,
        resZoneId: reservations.zoneId,
        resHuntDate: reservations.huntDate,
        resTimeSlot: reservations.timeSlot,
        resStatus: reservations.status,
        resCreatedAt: reservations.createdAt,
        zoneId: zones.id,
        zoneName: zones.name,
        zoneDescription: zones.description,
        zoneIsActive: zones.isActive,
        hunterId: users.id,
        hunterEmail: users.email,
        hunterPassword: users.password,
        hunterFirstName: users.firstName,
        hunterLastName: users.lastName,
        hunterRole: users.role,
        hunterIsActive: users.isActive,
        hunterCreatedAt: users.createdAt,
      })
      .from(huntReports)
      .innerJoin(reservations, eq(huntReports.reservationId, reservations.id))
      .innerJoin(zones, eq(reservations.zoneId, zones.id))
      .innerJoin(users, eq(reservations.hunterId, users.id))
      .orderBy(desc(huntReports.reportedAt));
    
    return results as any;
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
}

export const storage = new DatabaseStorage();

import { pgTable, text, serial, integer, boolean, timestamp, varchar, decimal, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum('user_role', ['HUNTER', 'ADMIN']);
export const timeSlotEnum = pgEnum('time_slot', ['morning', 'afternoon']);
export const speciesEnum = pgEnum('species', ['roe_deer', 'red_deer']);
export const sexEnum = pgEnum('sex', ['male', 'female']);
export const ageClassEnum = pgEnum('age_class', ['adult', 'young']);
// Nuove categorie specifiche per specie
export const roeDeerCategoryEnum = pgEnum('roe_deer_category', ['M0', 'F0', 'FA', 'M1', 'MA']);
export const redDeerCategoryEnum = pgEnum('red_deer_category', ['CL0', 'FF', 'MM', 'MCL1']);
export const reservationStatusEnum = pgEnum('reservation_status', ['active', 'completed', 'cancelled']);
export const huntOutcomeEnum = pgEnum('hunt_outcome', ['no_harvest', 'harvest']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: userRoleEnum("role").notNull().default('HUNTER'),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Hunting zones table
export const zones = pgTable("zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
});

// Wildlife quotas table
export const wildlifeQuotas = pgTable("wildlife_quotas", {
  id: serial("id").primaryKey(),
  zoneId: integer("zone_id").references(() => zones.id).notNull(),
  species: speciesEnum("species").notNull(),
  // Nuove categorie specifiche per specie
  roeDeerCategory: roeDeerCategoryEnum("roe_deer_category"),
  redDeerCategory: redDeerCategoryEnum("red_deer_category"),
  // Manteniamo i campi originali per compatibilità
  sex: sexEnum("sex"),
  ageClass: ageClassEnum("age_class"),
  totalQuota: integer("total_quota").notNull().default(0),
  harvested: integer("harvested").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Reservations table
export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  hunterId: integer("hunter_id").notNull(),
  zoneId: integer("zone_id").notNull(),
  huntDate: timestamp("hunt_date").notNull(),
  timeSlot: timeSlotEnum("time_slot").notNull(),
  status: reservationStatusEnum("status").notNull().default('active'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Hunt reports table
export const huntReports = pgTable("hunt_reports", {
  id: serial("id").primaryKey(),
  reservationId: integer("reservation_id").notNull(),
  outcome: huntOutcomeEnum("outcome").notNull(),
  species: speciesEnum("species"),
  sex: sexEnum("sex"),
  ageClass: ageClassEnum("age_class"),
  notes: text("notes"),
  reportedAt: timestamp("reported_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  reservations: many(reservations),
}));

export const zonesRelations = relations(zones, ({ many }) => ({
  reservations: many(reservations),
  wildlifeQuotas: many(wildlifeQuotas),
}));

export const wildlifeQuotasRelations = relations(wildlifeQuotas, ({ one }) => ({
  zone: one(zones, {
    fields: [wildlifeQuotas.zoneId],
    references: [zones.id],
  }),
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
  hunter: one(users, {
    fields: [reservations.hunterId],
    references: [users.id],
  }),
  zone: one(zones, {
    fields: [reservations.zoneId],
    references: [zones.id],
  }),
  huntReport: one(huntReports, {
    fields: [reservations.id],
    references: [huntReports.reservationId],
  }),
}));

export const huntReportsRelations = relations(huntReports, ({ one }) => ({
  reservation: one(reservations, {
    fields: [huntReports.reservationId],
    references: [reservations.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertZoneSchema = createInsertSchema(zones).omit({
  id: true,
});

export const insertWildlifeQuotaSchema = createInsertSchema(wildlifeQuotas).omit({
  id: true,
});

export const insertReservationSchema = createInsertSchema(reservations).omit({
  id: true,
  createdAt: true,
});

export const insertHuntReportSchema = createInsertSchema(huntReports).omit({
  id: true,
  reportedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Zone = typeof zones.$inferSelect;
export type InsertZone = z.infer<typeof insertZoneSchema>;

export type WildlifeQuota = typeof wildlifeQuotas.$inferSelect;
export type InsertWildlifeQuota = z.infer<typeof insertWildlifeQuotaSchema>;

export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = z.infer<typeof insertReservationSchema>;

export type HuntReport = typeof huntReports.$inferSelect;
export type InsertHuntReport = z.infer<typeof insertHuntReportSchema>;

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(1, "Password richiesta"),
});

export type LoginRequest = z.infer<typeof loginSchema>;

// Extended reservation schema with validation
export const createReservationSchema = insertReservationSchema.extend({
  huntDate: z.string().refine((date) => {
    const day = new Date(date).getDay();
    // Block Tuesday (2) and Friday (5) - silenzio venatorio
    return day !== 2 && day !== 5;
  }, "Caccia non permessa nei giorni di silenzio venatorio (martedì e venerdì)"),
});

export type CreateReservationRequest = z.infer<typeof createReservationSchema>;

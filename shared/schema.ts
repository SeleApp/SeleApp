// © 2025 Alessandro Favero - Tutti i diritti riservati
// Licenza: Uso riservato esclusivamente alle riserve attivate tramite contratto
// Vietata la riproduzione, distribuzione o modifica non autorizzata

import { pgTable, text, serial, integer, boolean, timestamp, varchar, decimal, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum('user_role', ['HUNTER', 'ADMIN', 'SUPERADMIN', 'BIOLOGO', 'PROVINCIA']);
export const timeSlotEnum = pgEnum('time_slot', ['morning', 'afternoon', 'full_day']);
export const speciesEnum = pgEnum('species', ['roe_deer', 'red_deer', 'fallow_deer', 'mouflon', 'chamois']);
export const sexEnum = pgEnum('sex', ['male', 'female']);
export const ageClassEnum = pgEnum('age_class', ['adult', 'young']);
// Gruppi cacciatori per sistema "Zone & gruppi"
export const hunterGroupEnum = pgEnum('hunter_group', ['A', 'B', 'C', 'D', 'E', 'F']);
// Categorie specifiche per specie
export const roeDeerCategoryEnum = pgEnum('roe_deer_category', ['M0', 'F0', 'FA', 'M1', 'MA']);
export const redDeerCategoryEnum = pgEnum('red_deer_category', ['CL0', 'FF', 'MM', 'MCL1']);
export const fallowDeerCategoryEnum = pgEnum('fallow_deer_category', ['DA-M-0', 'DA-M-I', 'DA-M-II', 'DA-F-0', 'DA-F-I', 'DA-F-II']);
export const mouflonCategoryEnum = pgEnum('mouflon_category', ['MU-M-0', 'MU-M-I', 'MU-M-II', 'MU-F-0', 'MU-F-I', 'MU-F-II']);
export const chamoisCategoryEnum = pgEnum('chamois_category', ['CA-M-0', 'CA-M-I', 'CA-M-II', 'CA-M-III', 'CA-F-0', 'CA-F-I', 'CA-F-II', 'CA-F-III']);
export const reservationStatusEnum = pgEnum('reservation_status', ['active', 'completed', 'cancelled']);
export const huntOutcomeEnum = pgEnum('hunt_outcome', ['no_harvest', 'harvest']);
// Tipologie di gestione delle riserve
export const managementTypeEnum = pgEnum('management_type', [
  'standard_zones', // Standard con prenotazione zone (es. Cison)
  'zones_groups', // Zone & gruppi per Cison - zone globali + quote per gruppo
  'standard_random', // Standard con assegnazione random capi (es. Pederobba)
  'quota_only', // Solo gestione quote senza zone
  'custom' // Personalizzato per esigenze specifiche
]);

// Sistema di sorteggio per assegnazione random
export const lotteryStatusEnum = pgEnum('lottery_status', ['draft', 'active', 'closed', 'completed']);
export const participationStatusEnum = pgEnum('participation_status', ['registered', 'winner', 'excluded']);

// Enums per gestione faunistica (BIOLOGO/PROVINCIA)
export const faunaSpeciesEnum = pgEnum('fauna_species', ['capriolo', 'cervo', 'daino', 'muflone', 'camoscio']);
export const faunaSexEnum = pgEnum('fauna_sex', ['M', 'F']);
export const faunaAgeClassEnum = pgEnum('fauna_age_class', ['J', 'Y', 'A']); // J=giovane, Y=yearling, A=adulto
export const faunaObservationTypeEnum = pgEnum('fauna_observation_type', ['prelievo', 'avvistamento', 'fototrappola']);
export const faunaReproductiveStatusEnum = pgEnum('fauna_reproductive_status', ['gravida', 'no', 'n.d.']);
export const faunaBodyConditionEnum = pgEnum('fauna_body_condition', ['buono', 'medio', 'scarso']);

// Reserves table (multi-tenant support)
export const reserves = pgTable("reserves", {
  id: text("id").primaryKey(), // UUID
  name: text("name").notNull(),
  comune: text("comune").notNull(),
  emailContatto: text("email_contatto").notNull(),
  presidentName: text("president_name"), // Nome del presidente della riserva
  huntingType: text("hunting_type"), // Tipo di caccia: "capo_assegnato", "zone", "misto"
  species: text("species").notNull().default("[]"), // Array JSON delle specie: ["capriolo", "cervo", "daino", "muflone", "camoscio"]
  systemType: text("system_type").notNull().default("standard"), // 'standard', 'ca17'
  managementType: managementTypeEnum("management_type").notNull().default("standard_zones"), // Tipologia di gestione
  accessCode: text("access_code").notNull(), // Codice d'accesso per registrazione cacciatori
  codeActive: boolean("code_active").notNull().default(true), // Se false, il codice non permette registrazioni
  isActive: boolean("is_active").notNull().default(true), // Solo riserve attive possono registrare cacciatori
  numberOfZones: integer("number_of_zones").default(16), // Numero di zone da creare per riserve con gestione zone
  numberOfGroups: integer("number_of_groups").default(4), // Numero di gruppi per riserve "zones_groups"
  activeGroups: text("active_groups").array().default(['A', 'B', 'C', 'D']), // Gruppi attivi per la riserva
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Reserve Settings table (personalizzazioni per riserva)
export const reserveSettings = pgTable("reserve_settings", {
  id: serial("id").primaryKey(),
  reserveId: text("reserve_id").notNull().references(() => reserves.id),
  logoUrl: text("logo_url"), // URL del logo personalizzato
  silenceDays: text("silence_days").notNull().default("[]"), // JSON array dei giorni di silenzio [2,5] = martedì, venerdì
  emailTemplateCustomizations: text("email_template_customizations").notNull().default("{}"), // JSON personalizzazioni email
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Contracts table (contratti riserve)
export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  reserveId: text("reserve_id").notNull().references(() => reserves.id),
  status: text("status").notNull().default("attivo"), // 'attivo', 'in_scadenza', 'scaduto'
  fileUrl: text("file_url"), // URL del file PDF del contratto
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Support Tickets table (assistenza)
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  reserveId: text("reserve_id").notNull().references(() => reserves.id),
  adminId: integer("admin_id").references(() => users.id),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"), // 'open', 'resolved'
  priority: text("priority").notNull().default("medium"), // 'low', 'medium', 'high'
  response: text("response"), // Risposta del superadmin
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// Billing table (fatturazione e abbonamenti)
export const billing = pgTable("billing", {
  id: serial("id").primaryKey(),
  reserveId: text("reserve_id").notNull().references(() => reserves.id),
  plan: text("plan").notNull().default("basic"), // 'basic', 'premium', 'enterprise'
  paymentStatus: text("payment_status").notNull().default("active"), // 'active', 'overdue', 'cancelled'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  currency: text("currency").notNull().default("EUR"),
  renewalDate: timestamp("renewal_date").notNull(),
  lastPaymentDate: timestamp("last_payment_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Materials table (materiali formativi)
export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  url: text("url").notNull(), // URL del file PDF o video
  type: text("type").notNull(), // 'pdf', 'video', 'document'
  assignedTo: text("assigned_to").notNull(), // 'admin', 'hunter', 'both'
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Material Access Log (tracciamento accessi materiali)
export const materialAccessLog = pgTable("material_access_log", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").notNull().references(() => materials.id),
  userId: integer("user_id").notNull().references(() => users.id),
  accessedAt: timestamp("accessed_at").notNull().defaultNow(),
});

// Reserve Rules table (limitazioni configurabili per riserva)
export const reserveRules = pgTable("reserve_rules", {
  id: serial("id").primaryKey(),
  reserveId: text("reserve_id").notNull().references(() => reserves.id),
  ruleName: text("rule_name").notNull(), // Nome identificativo della regola
  ruleType: text("rule_type").notNull(), // 'zone_cooldown', 'harvest_limit', 'custom'
  isActive: boolean("is_active").notNull().default(true),
  
  // Limitazioni temporali zone (zone_cooldown)
  zoneCooldownHours: integer("zone_cooldown_hours"), // Ore di attesa prima di riprenotare stessa zona
  zoneCooldownTime: text("zone_cooldown_time"), // Ora limite per prenotazione (es. "20:00")
  
  // Limitazioni di prelievo per specie (harvest_limit)
  targetSpecies: speciesEnum("target_species"), // Specie target per il limite
  maxHarvestPerSeason: integer("max_harvest_per_season"), // Massimo capi prelevabili per stagione
  maxHarvestPerMonth: integer("max_harvest_per_month"), // Massimo capi prelevabili per mese
  maxHarvestPerWeek: integer("max_harvest_per_week"), // Massimo capi prelevabili per settimana
  
  // Limitazioni stagionali avanzate
  seasonalStartDate: text("seasonal_start_date"), // Data inizio validità (es. "01-15" per 15 gennaio)
  seasonalEndDate: text("seasonal_end_date"), // Data fine validità (es. "01-31" per 31 gennaio)
  bonusHarvestAllowed: integer("bonus_harvest_allowed"), // Capi bonus consentiti nel periodo
  
  // Limitazioni personalizzate (custom)
  customParameters: text("custom_parameters").default("{}"), // JSON per regole personalizzate
  
  description: text("description"), // Descrizione umana della regola
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: userRoleEnum("role").notNull().default('HUNTER'),
  isActive: boolean("is_active").notNull().default(true),
  reserveId: text("reserve_id"), // NULL for SUPERADMIN, required for other roles
  // Gruppo per sistema "Zone & gruppi" (solo per riserve con managementType = 'zones_groups')
  hunterGroup: hunterGroupEnum("hunter_group"),
  // Campi specifici per sistema CA17
  isSelezionatore: boolean("is_selezionatore").notNull().default(false),
  isEsperto: boolean("is_esperto").notNull().default(false),
  partecipatoCensimenti: boolean("partecipato_censimenti").notNull().default(false),
  isOspite: boolean("is_ospite").notNull().default(false),
  accompagnato: boolean("accompagnato").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Hunting zones table
export const zones = pgTable("zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  reserveId: text("reserve_id").notNull(),
});

// Wildlife quotas table
// Tabella quote regionali - una sola entry per combinazione specie/categoria per riserva
export const regionalQuotas = pgTable("regional_quotas", {
  id: serial("id").primaryKey(),
  species: speciesEnum("species").notNull(),
  roeDeerCategory: roeDeerCategoryEnum("roe_deer_category"),
  redDeerCategory: redDeerCategoryEnum("red_deer_category"),
  fallowDeerCategory: fallowDeerCategoryEnum("fallow_deer_category"),
  mouflonCategory: mouflonCategoryEnum("mouflon_category"),
  chamoisCategory: chamoisCategoryEnum("chamois_category"),
  totalQuota: integer("total_quota").notNull().default(0),
  harvested: integer("harvested").notNull().default(0),
  season: text("season").notNull().default("2024-2025"),
  // Periodi di caccia per ogni categoria
  huntingStartDate: timestamp("hunting_start_date"),
  huntingEndDate: timestamp("hunting_end_date"),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"), // Note dell'admin sulla categoria
  reserveId: text("reserve_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Manteniamo la tabella esistente per compatibilità ma deprecata
export const wildlifeQuotas = pgTable("wildlife_quotas", {
  id: serial("id").primaryKey(),
  zoneId: integer("zone_id").references(() => zones.id).notNull(),
  species: speciesEnum("species").notNull(),
  roeDeerCategory: roeDeerCategoryEnum("roe_deer_category"),
  redDeerCategory: redDeerCategoryEnum("red_deer_category"),
  fallowDeerCategory: fallowDeerCategoryEnum("fallow_deer_category"),
  mouflonCategory: mouflonCategoryEnum("mouflon_category"),
  chamoisCategory: chamoisCategoryEnum("chamois_category"),
  sex: sexEnum("sex"),
  ageClass: ageClassEnum("age_class"),
  totalQuota: integer("total_quota").notNull().default(0),
  harvested: integer("harvested").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Group quotas table (per sistema "Zone & gruppi")
export const groupQuotas = pgTable("wildlife_quotas_groups", {
  id: serial("id").primaryKey(),
  reserveId: text("reserve_id").notNull().references(() => reserves.id),
  hunterGroup: hunterGroupEnum("hunter_group").notNull(),
  species: speciesEnum("species").notNull(),
  roeDeerCategory: roeDeerCategoryEnum("roe_deer_category"),
  redDeerCategory: redDeerCategoryEnum("red_deer_category"),
  fallowDeerCategory: fallowDeerCategoryEnum("fallow_deer_category"),
  mouflonCategory: mouflonCategoryEnum("mouflon_category"),
  chamoisCategory: chamoisCategoryEnum("chamois_category"),
  totalQuota: integer("total_quota").notNull().default(0),
  harvested: integer("harvested").notNull().default(0),
  season: text("season").notNull().default("2024-2025"),
  huntingStartDate: timestamp("hunting_start_date"),
  huntingEndDate: timestamp("hunting_end_date"),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGroupQuotaSchema = createInsertSchema(groupQuotas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type GroupQuota = typeof groupQuotas.$inferSelect;
export type InsertGroupQuota = z.infer<typeof insertGroupQuotaSchema>;

// Reservations table
export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  hunterId: integer("hunter_id").notNull(),
  zoneId: integer("zone_id").notNull(),
  huntDate: timestamp("hunt_date").notNull(),
  timeSlot: timeSlotEnum("time_slot").notNull(),
  status: reservationStatusEnum("status").notNull().default('active'),
  reserveId: text("reserve_id").notNull(),
  // Campi per selezione capo target (opzionali)
  targetSpecies: speciesEnum("target_species"),
  targetRoeDeerCategory: roeDeerCategoryEnum("target_roe_deer_category"),
  targetRedDeerCategory: redDeerCategoryEnum("target_red_deer_category"),
  targetFallowDeerCategory: fallowDeerCategoryEnum("target_fallow_deer_category"),
  targetMouflonCategory: mouflonCategoryEnum("target_mouflon_category"),
  targetChamoisCategory: chamoisCategoryEnum("target_chamois_category"),
  targetSex: sexEnum("target_sex"),
  targetAgeClass: ageClassEnum("target_age_class"),
  targetNotes: text("target_notes"), // Note aggiuntive del cacciatore
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
  roeDeerCategory: roeDeerCategoryEnum("roe_deer_category"),
  redDeerCategory: redDeerCategoryEnum("red_deer_category"),
  fallowDeerCategory: fallowDeerCategoryEnum("fallow_deer_category"),
  mouflonCategory: mouflonCategoryEnum("mouflon_category"),
  chamoisCategory: chamoisCategoryEnum("chamois_category"),
  notes: text("notes"),
  killCardPhoto: text("kill_card_photo"), // Base64 della foto della scheda di abbattimento
  // Dati biometrici dell'animale
  weight: decimal("weight"), // Peso in kg
  length: decimal("length"), // Lunghezza in cm
  antlerPoints: integer("antler_points"), // Numero punte (solo maschi)
  antlerLength: decimal("antler_length"), // Lunghezza corna in cm
  chestGirth: decimal("chest_girth"), // Circonferenza torace in cm
  hindLegLength: decimal("hind_leg_length"), // Lunghezza zampa posteriore in cm
  earLength: decimal("ear_length"), // Lunghezza orecchio in cm
  tailLength: decimal("tail_length"), // Lunghezza coda in cm
  bodyCondition: text("body_condition"), // Condizione corporea (ottima, buona, media, scarsa)
  furCondition: text("fur_condition"), // Condizione del pelo
  teethCondition: text("teeth_condition"), // Condizione dei denti
  reproductiveStatus: text("reproductive_status"), // Status riproduttivo (per femmine)
  estimatedAge: integer("estimated_age"), // Età stimata in anni
  biometricNotes: text("biometric_notes"), // Note sui dati biometrici
  reserveId: text("reserve_id").notNull(),
  reportedAt: timestamp("reported_at").notNull().defaultNow(),
});

// Relations
export const reservesRelations = relations(reserves, ({ many, one }) => ({
  users: many(users),
  zones: many(zones),
  regionalQuotas: many(regionalQuotas),
  groupQuotas: many(groupQuotas),
  reservations: many(reservations),
  huntReports: many(huntReports),
  settings: one(reserveSettings),
  contracts: many(contracts),
  supportTickets: many(supportTickets),
  billing: one(billing),
}));

export const reserveSettingsRelations = relations(reserveSettings, ({ one }) => ({
  reserve: one(reserves, {
    fields: [reserveSettings.reserveId],
    references: [reserves.id],
  }),
}));

export const contractsRelations = relations(contracts, ({ one }) => ({
  reserve: one(reserves, {
    fields: [contracts.reserveId],
    references: [reserves.id],
  }),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one }) => ({
  reserve: one(reserves, {
    fields: [supportTickets.reserveId],
    references: [reserves.id],
  }),
  admin: one(users, {
    fields: [supportTickets.adminId],
    references: [users.id],
  }),
}));

export const billingRelations = relations(billing, ({ one }) => ({
  reserve: one(reserves, {
    fields: [billing.reserveId],
    references: [reserves.id],
  }),
}));

export const materialsRelations = relations(materials, ({ many }) => ({
  accessLogs: many(materialAccessLog),
}));

export const materialAccessLogRelations = relations(materialAccessLog, ({ one }) => ({
  material: one(materials, {
    fields: [materialAccessLog.materialId],
    references: [materials.id],
  }),
  user: one(users, {
    fields: [materialAccessLog.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  reservations: many(reservations),
  reserve: one(reserves, {
    fields: [users.reserveId],
    references: [reserves.id],
  }),
}));

export const zonesRelations = relations(zones, ({ many, one }) => ({
  reservations: many(reservations),
  wildlifeQuotas: many(wildlifeQuotas),
  reserve: one(reserves, {
    fields: [zones.reserveId],
    references: [reserves.id],
  }),
}));

export const regionalQuotasRelations = relations(regionalQuotas, ({ one, many }) => ({
  reserve: one(reserves, {
    fields: [regionalQuotas.reserveId],
    references: [reserves.id],
  }),
  huntReports: many(huntReports),
}));

export const groupQuotasRelations = relations(groupQuotas, ({ one }) => ({
  reserve: one(reserves, {
    fields: [groupQuotas.reserveId],
    references: [reserves.id],
  }),
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
  reserve: one(reserves, {
    fields: [reservations.reserveId],
    references: [reserves.id],
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
  reserve: one(reserves, {
    fields: [huntReports.reserveId],
    references: [reserves.id],
  }),
}));

// Insert schemas
export const insertReserveSchema = createInsertSchema(reserves).omit({
  createdAt: true,
}).extend({
  managementType: z.enum(['standard_zones', 'zones_groups', 'standard_random', 'quota_only', 'custom']),
  huntingType: z.enum(['capo_assegnato', 'zone', 'misto']).optional(),
  assignmentMode: z.enum(['manual', 'random']).optional(),
  species: z.string().optional(), // JSON array come stringa
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const registerHunterSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password deve essere almeno 6 caratteri"),
  confirmPassword: z.string(),
  reserveId: z.string().min(1, "La selezione della riserva è obbligatoria"),
  accessCode: z.string().min(1, "Il codice d'accesso è obbligatorio"),
  hunterGroup: z.enum(['A', 'B', 'C', 'D']).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non coincidono",
  path: ["confirmPassword"],
});

export const registerHunterBackendSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(6, "Password deve essere almeno 6 caratteri"),
  firstName: z.string().min(1, "Nome richiesto"),
  lastName: z.string().min(1, "Cognome richiesto"),
  reserveId: z.string().min(1, "La selezione della riserva è obbligatoria"),
  accessCode: z.string().min(1, "Il codice d'accesso è obbligatorio"),
  hunterGroup: z.enum(['A', 'B', 'C', 'D']).optional(),
});

export const createAdminSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password deve essere almeno 6 caratteri"),
  role: z.literal("ADMIN"),
});

export const insertZoneSchema = createInsertSchema(zones).omit({
  id: true,
});

export const insertWildlifeQuotaSchema = createInsertSchema(wildlifeQuotas).omit({
  id: true,
});

export const insertRegionalQuotaSchema = createInsertSchema(regionalQuotas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReservationSchema = createInsertSchema(reservations).omit({
  id: true,
  createdAt: true,
});

// Schema per creazione prenotazione con validazione completa
export const createReservationSchema = insertReservationSchema.extend({
  huntDate: z.string().refine((date) => {
    const day = new Date(date).getDay();
    // Block Tuesday (2) and Friday (5) - silenzio venatorio
    return day !== 2 && day !== 5;
  }, "Caccia non permessa nei giorni di silenzio venatorio (martedì e venerdì)"),
  // Campi per selezione capo target (ora obbligatori)
  targetSpecies: z.enum(['roe_deer', 'red_deer'], {
    required_error: "Selezione specie obbligatoria"
  }),
  targetRoeDeerCategory: z.enum(['M0', 'F0', 'FA', 'M1', 'MA']).optional(),
  targetRedDeerCategory: z.enum(['CL0', 'FF', 'MM', 'MCL1']).optional(),
  targetSex: z.enum(['male', 'female']).optional(),
  targetAgeClass: z.enum(['adult', 'young']).optional(),
  targetNotes: z.string().optional(),
}).refine((data) => {
  // Se viene specificata una specie, deve essere specificata anche la categoria corrispondente
  if (data.targetSpecies === 'roe_deer' && !data.targetRoeDeerCategory) {
    return false;
  }
  if (data.targetSpecies === 'red_deer' && !data.targetRedDeerCategory) {
    return false;
  }
  // Se viene specificata una categoria di capriolo, non può essere specificata una categoria di cervo
  if (data.targetRoeDeerCategory && data.targetRedDeerCategory) {
    return false;
  }
  return true;
}, {
  message: "Categoria obbligatoria per la specie selezionata",
  path: ["targetSpecies"],
});

export const insertHuntReportSchema = createInsertSchema(huntReports).omit({
  id: true,
  reportedAt: true,
}).extend({
  killCardPhoto: z.string().optional(),
  // Dati biometrici opzionali
  weight: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
  length: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
  antlerPoints: z.string().optional().transform((val) => val ? parseInt(val) : undefined),
  antlerLength: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
  chestGirth: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
  hindLegLength: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
  earLength: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
  tailLength: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
  bodyCondition: z.enum(['ottima', 'buona', 'media', 'scarsa']).optional(),
  furCondition: z.string().optional(),
  teethCondition: z.string().optional(),
  reproductiveStatus: z.string().optional(),
  estimatedAge: z.string().optional().transform((val) => val ? parseInt(val) : undefined),
  biometricNotes: z.string().optional(),
});

// Types
export type Reserve = typeof reserves.$inferSelect;
export type InsertReserve = z.infer<typeof insertReserveSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Zone = typeof zones.$inferSelect;
export type InsertZone = z.infer<typeof insertZoneSchema>;

export type WildlifeQuota = typeof wildlifeQuotas.$inferSelect;
export type InsertWildlifeQuota = z.infer<typeof insertWildlifeQuotaSchema>;

export type RegionalQuota = typeof regionalQuotas.$inferSelect;
export type InsertRegionalQuota = z.infer<typeof insertRegionalQuotaSchema>;

export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = z.infer<typeof insertReservationSchema>;

export type HuntReport = typeof huntReports.$inferSelect;
export type InsertHuntReport = z.infer<typeof insertHuntReportSchema>;

// Nuovi schema per le tabelle superadmin
export const insertReserveSettingsSchema = createInsertSchema(reserveSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export const insertBillingSchema = createInsertSchema(billing).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMaterialSchema = createInsertSchema(materials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMaterialAccessLogSchema = createInsertSchema(materialAccessLog).omit({
  id: true,
  accessedAt: true,
});

export const insertReserveRuleSchema = createInsertSchema(reserveRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Nuovi tipi per SuperAdmin
export type ReserveSettings = typeof reserveSettings.$inferSelect;
export type InsertReserveSettings = z.infer<typeof insertReserveSettingsSchema>;

export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;

export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;

export type Billing = typeof billing.$inferSelect;
export type InsertBilling = z.infer<typeof insertBillingSchema>;

export type ReserveRule = typeof reserveRules.$inferSelect;
export type InsertReserveRule = z.infer<typeof insertReserveRuleSchema>;

export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;

export type MaterialAccessLog = typeof materialAccessLog.$inferSelect;
export type InsertMaterialAccessLog = z.infer<typeof insertMaterialAccessLogSchema>;

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(1, "Password richiesta"),
});

export type LoginRequest = z.infer<typeof loginSchema>;

export type CreateReservationRequest = z.infer<typeof createReservationSchema>;

export type RegisterHunterRequest = z.infer<typeof registerHunterSchema>;
export type CreateAdminRequest = z.infer<typeof createAdminSchema>;

// CA17 System Tables - Sistema specifico per riserve CA17 (Pederobba)

// CA17 Prelievi table - Tracciamento prelievi con fascette e foto
export const ca17Prelievi = pgTable("ca17_prelievi", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  reserveId: text("reserve_id").notNull().references(() => reserves.id),
  specie: text("specie").notNull(), // 'Capriolo', 'Cervo'
  classe: text("classe").notNull(), // 'M0', 'F0', 'FA', 'M1', 'MA', 'CL0', 'FF', 'MM', 'MCL1'
  zona: text("zona").notNull(),
  data: timestamp("data").notNull(),
  fascetta: text("fascetta"), // Numero fascetta
  fotoUrl: text("foto_url"), // URL foto prelievo
  colpoVano: boolean("colpo_vano").notNull().default(false),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// CA17 Uscite table - Tracciamento uscite settimanali
export const ca17Uscite = pgTable("ca17_uscite", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  reserveId: text("reserve_id").notNull().references(() => reserves.id),
  data: timestamp("data").notNull(),
  zona: text("zona").notNull(),
  orario: text("orario").notNull(), // 'mattina', 'sera'
  status: text("status").notNull().default("prenotata"), // 'prenotata', 'completata', 'annullata'
  esito: text("esito"), // 'prelievo', 'colpo_vano', 'nulla'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// CA17 Blocchi table - Sistema di blocchi e divieti
export const ca17Blocchi = pgTable("ca17_blocchi", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  reserveId: text("reserve_id").notNull().references(() => reserves.id),
  tipoBlocco: text("tipo_blocco").notNull(), // 'M2_CAPRIOLO_CERVO', 'M2_CAPRIOLO', 'CERVO_MASCHI'
  dataInizio: timestamp("data_inizio").notNull(),
  dataFine: timestamp("data_fine"),
  attivo: boolean("attivo").notNull().default(true),
  motivazione: text("motivazione").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Schema di inserimento per CA17
export const insertCa17PrelievoSchema = createInsertSchema(ca17Prelievi).omit({
  id: true,
});

export const insertCa17UscitaSchema = createInsertSchema(ca17Uscite).omit({
  id: true,
});

export const insertCa17BloccoSchema = createInsertSchema(ca17Blocchi).omit({
  id: true,
});

export type Ca17Prelievo = typeof ca17Prelievi.$inferSelect;

// Sistema di Sorteggio/Lotteria (per riserve standard_random)
export const lotteries = pgTable('lotteries', {
  id: serial('id').primaryKey(),
  reserveId: text('reserve_id').notNull().references(() => reserves.id),
  title: text('title').notNull(),
  description: text('description'),
  species: speciesEnum('species').notNull(),
  category: text('category').notNull(), // M0, F0, FA, etc.
  totalSpots: integer('total_spots').notNull().default(1), // Posti disponibili
  registrationStart: timestamp('registration_start').notNull(),
  registrationEnd: timestamp('registration_end').notNull(),
  drawDate: timestamp('draw_date').notNull(),
  status: lotteryStatusEnum('status').notNull().default('draft'),
  winnersDrawn: boolean('winners_drawn').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Partecipazioni al sorteggio
export const lotteryParticipations = pgTable('lottery_participations', {
  id: serial('id').primaryKey(),
  lotteryId: integer('lottery_id').notNull().references(() => lotteries.id, { onDelete: 'cascade' }),
  hunterId: integer('hunter_id').notNull().references(() => users.id),
  registeredAt: timestamp('registered_at').defaultNow().notNull(),
  status: participationStatusEnum('status').notNull().default('registered'),
  position: integer('position'), // Posizione estratta nel sorteggio
  isWinner: boolean('is_winner').notNull().default(false),
});

// Schema per sistema lottery
export const insertLotterySchema = createInsertSchema(lotteries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLotteryParticipationSchema = createInsertSchema(lotteryParticipations).omit({
  id: true,
  registeredAt: true,
});

// Relazioni per lottery system
export const lotteriesRelations = relations(lotteries, ({ one, many }) => ({
  reserve: one(reserves, {
    fields: [lotteries.reserveId],
    references: [reserves.id],
  }),
  participations: many(lotteryParticipations),
}));

export const lotteryParticipationsRelations = relations(lotteryParticipations, ({ one }) => ({
  lottery: one(lotteries, {
    fields: [lotteryParticipations.lotteryId],
    references: [lotteries.id],
  }),
  hunter: one(users, {
    fields: [lotteryParticipations.hunterId],
    references: [users.id],
  }),
}));

// Tipi per lottery system
export type Lottery = typeof lotteries.$inferSelect;
export type InsertLottery = z.infer<typeof insertLotterySchema>;
export type LotteryParticipation = typeof lotteryParticipations.$inferSelect;
export type InsertLotteryParticipation = z.infer<typeof insertLotteryParticipationSchema>;
export type InsertCa17Prelievo = z.infer<typeof insertCa17PrelievoSchema>;

export type Ca17Uscita = typeof ca17Uscite.$inferSelect;
export type InsertCa17Uscita = z.infer<typeof insertCa17UscitaSchema>;

export type Ca17Blocco = typeof ca17Blocchi.$inferSelect;
export type InsertCa17Blocco = z.infer<typeof insertCa17BloccoSchema>;

// Tabella Osservazioni Faunistiche (BIOLOGO/PROVINCIA)
export const osservazioniFaunistiche = pgTable("osservazioni_faunistiche", {
  id: serial("id").primaryKey(),
  specie: faunaSpeciesEnum("specie").notNull(),
  sesso: faunaSexEnum("sesso").notNull(),
  classeEta: faunaAgeClassEnum("classe_eta").notNull(),
  data: timestamp("data").notNull(),
  zonaId: integer("zona_id").notNull().references(() => zones.id),
  sezione: text("sezione").notNull(), // es: pederobba, cison, ecc.
  tipo: faunaObservationTypeEnum("tipo").notNull(),
  peso: decimal("peso", { precision: 5, scale: 2 }), // facoltativo
  statoRiproduttivo: faunaReproductiveStatusEnum("stato_riproduttivo").default('n.d.'),
  statoCorpo: faunaBodyConditionEnum("stato_corpo").default('medio'),
  lunghezzaMandibola: decimal("lunghezza_mandibola", { precision: 5, scale: 2 }), // opzionale
  lunghezzaPalchi: decimal("lunghezza_palchi", { precision: 5, scale: 2 }), // opzionale
  gpsLat: decimal("gps_lat", { precision: 10, scale: 8 }), // opzionale
  gpsLon: decimal("gps_lon", { precision: 11, scale: 8 }), // opzionale
  note: text("note"),
  biologo: text("biologo").notNull(), // nome del biologo/operatore che ha inserito il dato
  reserveId: text("reserve_id").notNull().references(() => reserves.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Schema per inserimento osservazione faunistica
export const insertOsservazioneFaunisticaSchema = createInsertSchema(osservazioniFaunistiche).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Relazioni per osservazioni faunistiche
export const osservazioniFaunisticheRelations = relations(osservazioniFaunistiche, ({ one }) => ({
  zona: one(zones, {
    fields: [osservazioniFaunistiche.zonaId],
    references: [zones.id],
  }),
  reserve: one(reserves, {
    fields: [osservazioniFaunistiche.reserveId],
    references: [reserves.id],
  }),
}));

// Tipi per osservazioni faunistiche
export type OsservazioneFaunistica = typeof osservazioniFaunistiche.$inferSelect;
export type InsertOsservazioneFaunistica = z.infer<typeof insertOsservazioneFaunisticaSchema>;

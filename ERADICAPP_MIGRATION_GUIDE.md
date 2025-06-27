# EradicApp 1.0 - Guida Migrazione SuperAdmin
## Integrazione Architettura Multi-Tenant da SeleApp

---

## Panoramica Migrazione

Questa guida integra l'architettura **SuperAdmin multi-tenant** di SeleApp in EradicApp 1.0 per gestire più territori/enti del Veneto nel controllo fauna selvatica.

### Architettura Target
```
SuperAdmin (Sistema Centrale)
├── Zone Operative (ULSS 1-9, Regioni, Comuni)
│   ├── Amministratori Zona (gestione locale)
│   └── Eradicatori (operatori sul campo)
└── Gestione Centralizzata (contratti, supporto, materiali)
```

---

## FASE 1: Preparazione Database

### 1.1 Backup Database Esistente
```sql
-- Backup completo prima della migrazione
pg_dump eradicapp_db > eradicapp_backup_$(date +%Y%m%d).sql
```

### 1.2 Esecuzione Schema Multi-Tenant
```bash
# Applica lo schema esteso (dal file eradicapp-schema-extension.sql)
psql -d eradicapp_db -f eradicapp-schema-extension.sql
```

### 1.3 Migrazione Dati Esistenti
```sql
-- 1. Crea zona operativa di default per dati esistenti
INSERT INTO operational_zones (id, name, territory_type, province, contact_email, access_code, decree_reference) 
VALUES ('veneto-pilot', 'Veneto Pilota', 'regione', 'Multi-provincia', 'admin@eradicapp.it', 'PILOT2024', 'Decreto 277/2023 - Progetto Pilota');

-- 2. Associa tutti gli utenti esistenti alla zona pilota
UPDATE users SET zone_id = 'veneto-pilot' WHERE zone_id IS NULL;

-- 3. Associa tutti i dati esistenti alla zona pilota
UPDATE altane SET zone_id = 'veneto-pilot' WHERE zone_id IS NULL;
UPDATE prenotazioni SET zone_id = 'veneto-pilot' WHERE zone_id IS NULL;
UPDATE reports SET zone_id = 'veneto-pilot' WHERE zone_id IS NULL;
-- Ripeti per tutte le tabelle principali
```

---

## FASE 2: Aggiornamento Backend

### 2.1 Aggiornamento Schema TypeScript
```typescript
// shared/schema.ts - Aggiungi le nuove tabelle

// Zone Operative (equivalente reserves di SeleApp)
export const operationalZones = pgTable("operational_zones", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  territoryType: text("territory_type").notNull(), // 'ulss', 'regione', 'comune', 'atc'
  province: text("province").notNull(),
  contactEmail: text("contact_email").notNull(),
  accessCode: text("access_code").notNull(),
  codeActive: boolean("code_active").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  decreeReference: text("decree_reference"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Aggiorna tabella users esistente
export const users = pgTable("users", {
  // ... campi esistenti ...
  zoneId: text("zone_id").references(() => operationalZones.id), // NUOVO CAMPO
});

// Ripeti per tutte le tabelle che necessitano multi-tenancy
```

### 2.2 Aggiornamento Storage Layer
```typescript
// server/storage.ts - Modifica le funzioni esistenti

// PRIMA (single-tenant):
async getEradicators(): Promise<User[]> {
  return await this.db.select().from(users).where(eq(users.role, 'ERADICATOR'));
}

// DOPO (multi-tenant):
async getEradicators(zoneId: string): Promise<User[]> {
  return await this.db.select().from(users)
    .where(and(eq(users.role, 'ERADICATOR'), eq(users.zoneId, zoneId)));
}

// Aggiungi nuove funzioni SuperAdmin:
async getAllOperationalZones(): Promise<OperationalZone[]> {
  return await this.db.select().from(operationalZones);
}

async createOperationalZone(data: InsertOperationalZone): Promise<OperationalZone> {
  const [zone] = await this.db.insert(operationalZones).values(data).returning();
  return zone;
}

async getZoneStats(zoneId: string): Promise<ZoneStats> {
  // Implementa statistiche per zona specifica
}
```

### 2.3 Middleware di Autenticazione Aggiornato
```typescript
// server/middleware/auth.ts - Aggiorna per multi-tenancy

export const requireZoneAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = req.user;
  const requestedZoneId = req.params.zoneId || req.body.zoneId;
  
  // SuperAdmin può accedere a tutto
  if (user?.role === 'SUPERADMIN') {
    return next();
  }
  
  // Admin può accedere solo alla propria zona
  if (user?.role === 'ADMIN' && user.zoneId === requestedZoneId) {
    return next();
  }
  
  // Eradicatori possono accedere solo alla propria zona
  if (user?.role === 'ERADICATOR' && user.zoneId === requestedZoneId) {
    return next();
  }
  
  return res.status(403).json({ error: "Accesso negato alla zona richiesta" });
};
```

### 2.4 Routes SuperAdmin
```typescript
// server/routes/superadmin.ts - Integra il file eradicapp-superadmin-routes.ts

import { registerSuperAdminRoutes } from './eradicapp-superadmin-routes';

// In server/index.ts o server/routes.ts:
registerSuperAdminRoutes(app);
```

---

## FASE 3: Aggiornamento Frontend

### 3.1 Routing Multi-Livello
```typescript
// client/src/App.tsx - Aggiorna routing

function App() {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const userData = localStorage.getItem("user");
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  // Routing basato su ruolo
  if (user?.role === 'SUPERADMIN') {
    return <SuperAdminDashboard />;
  } else if (user?.role === 'ADMIN') {
    return <AdminDashboard zoneId={user.zoneId} />;
  } else if (user?.role === 'ERADICATOR') {
    return <EradicatorDashboard zoneId={user.zoneId} />;
  }
  
  return <LoginPage />;
}
```

### 3.2 Context Provider per Zone
```typescript
// client/src/contexts/ZoneContext.tsx

interface ZoneContextType {
  currentZone: OperationalZone | null;
  userRole: string;
  hasZoneAccess: (zoneId: string) => boolean;
}

export const ZoneProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentZone, setCurrentZone] = useState<OperationalZone | null>(null);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  
  const hasZoneAccess = (zoneId: string) => {
    if (user.role === 'SUPERADMIN') return true;
    return user.zoneId === zoneId;
  };
  
  return (
    <ZoneContext.Provider value={{ currentZone, userRole: user.role, hasZoneAccess }}>
      {children}
    </ZoneContext.Provider>
  );
};
```

### 3.3 Componenti Dashboard Aggiornati
```typescript
// client/src/pages/AdminDashboard.tsx - Filtra per zona

export default function AdminDashboard({ zoneId }: { zoneId: string }) {
  // Tutte le query ora includono zoneId
  const { data: eradicators } = useQuery({
    queryKey: [`/api/zones/${zoneId}/eradicators`],
  });
  
  const { data: operations } = useQuery({
    queryKey: [`/api/zones/${zoneId}/operations`],
  });
  
  // Resto del componente rimane uguale, ma i dati sono filtrati per zona
}
```

---

## FASE 4: Sistema Email Multi-Tenant

### 4.1 Template Email Personalizzati
```typescript
// server/email/templates.ts - Template per zone

export const zoneWelcomeTemplate = (data: {
  zoneName: string;
  accessCode: string;
  contactEmail: string;
}) => `
<h2>Benvenuto in EradicApp - ${data.zoneName}</h2>
<p>La vostra zona operativa è stata attivata con successo.</p>
<p><strong>Codice Accesso:</strong> ${data.accessCode}</p>
<p><strong>Contatto Zona:</strong> ${data.contactEmail}</p>
<p>Decreto Regione Veneto 277/2023 - Controllo Fauna Selvatica</p>
`;

export const adminWelcomeTemplate = (data: {
  firstName: string;
  zoneName: string;
  email: string;
}) => `
<h2>Account Amministratore EradicApp</h2>
<p>Ciao ${data.firstName},</p>
<p>Il tuo account amministratore per ${data.zoneName} è stato creato.</p>
<p><strong>Email:</strong> ${data.email}</p>
<p>Accedi a: https://eradicapp.replit.app</p>
`;
```

### 4.2 Notifiche Automatiche
```typescript
// server/services/notifications.ts

export class NotificationService {
  async notifyZoneActivity(zoneId: string, activity: string, data: any) {
    // Notifica agli admin della zona specifica
    const zoneAdmins = await storage.getZoneAdmins(zoneId);
    
    for (const admin of zoneAdmins) {
      await sendEmail({
        to: admin.email,
        subject: `Attività in ${data.zoneName}: ${activity}`,
        template: 'zone_activity',
        data: { ...data, adminName: admin.firstName }
      });
    }
  }
  
  async notifySuperAdmin(event: string, data: any) {
    // Notifica al SuperAdmin per eventi critici
    await sendEmail({
      to: 'superadmin@eradicapp.it',
      subject: `EradicApp Alert: ${event}`,
      template: 'superadmin_alert',
      data
    });
  }
}
```

---

## FASE 5: Configurazione Multi-Tenant

### 5.1 Variabili Ambiente
```bash
# .env - Aggiungi configurazioni multi-tenant

# SuperAdmin Configuration
SUPERADMIN_EMAIL=superadmin@eradicapp.it
SUPERADMIN_PASSWORD=SecurePassword123!

# Multi-tenant Settings
DEFAULT_ZONE_ID=veneto-pilot
MAX_ZONES_PER_SUPERADMIN=50
MAX_ERADICATORS_PER_ZONE=100

# Email Configuration (già esistente)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# Database (già esistente)
DATABASE_URL=postgresql://...
```

### 5.2 Seed Data per Test
```sql
-- Inserimento zone operative Veneto per test
INSERT INTO operational_zones (id, name, territory_type, province, contact_email, access_code, decree_reference) VALUES
('ulss3-test', 'ULSS 3 Serenissima (Test)', 'ulss', 'Venezia', 'test@aulss3.veneto.it', 'TEST2024', 'Decreto 277/2023 - Test'),
('regione-veneto-test', 'Regione Veneto (Test)', 'regione', 'Multi-provincia', 'test@regione.veneto.it', 'RVEN2024', 'Decreto 277/2023 - Regione Test');

-- Creazione account admin test
INSERT INTO users (email, password, first_name, last_name, role, zone_id, is_active) VALUES
('admin.test@ulss3.it', '$2b$10$hashed_password', 'Mario', 'Rossi', 'ADMIN', 'ulss3-test', true),
('admin.test@regione.veneto.it', '$2b$10$hashed_password', 'Luigi', 'Verdi', 'ADMIN', 'regione-veneto-test', true);
```

---

## FASE 6: Testing e Deployment

### 6.1 Testing Multi-Tenant
```bash
# Test API endpoints
curl -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  http://localhost:5000/api/superadmin/zones

curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:5000/api/zones/ulss3-test/eradicators

curl -H "Authorization: Bearer $ERADICATOR_TOKEN" \
  http://localhost:5000/api/zones/ulss3-test/my-operations
```

### 6.2 Validazione Sicurezza
```typescript
// Test isolamento dati tra zone
describe('Multi-tenant Security', () => {
  it('should prevent cross-zone data access', async () => {
    const adminUlss3 = await loginAs('admin@ulss3.it');
    const responseUlss4 = await request(app)
      .get('/api/zones/ulss4-test/eradicators')
      .set('Authorization', `Bearer ${adminUlss3.token}`);
    
    expect(responseUlss4.status).toBe(403);
  });
});
```

---

## FASE 7: Migrazione Produzione

### 7.1 Checklist Pre-Migrazione
- [ ] Backup database completo
- [ ] Test funzionalità esistenti
- [ ] Validazione multi-tenancy in staging
- [ ] Preparazione rollback plan
- [ ] Comunicazione agli utenti

### 7.2 Processo di Migrazione
```bash
# 1. Modalità manutenzione
echo "Sistema in manutenzione per aggiornamento" > maintenance.html

# 2. Backup finale
pg_dump eradicapp_production > backup_final_$(date +%Y%m%d_%H%M).sql

# 3. Applicazione schema
psql -d eradicapp_production -f eradicapp-schema-extension.sql

# 4. Migrazione dati
psql -d eradicapp_production -f migration_data.sql

# 5. Deploy nuovo codice
git pull origin main
npm run build
pm2 restart eradicapp

# 6. Verifica post-migrazione
npm run test:production
```

### 7.3 Configurazione SuperAdmin
```typescript
// Creazione account SuperAdmin in produzione
const superAdminData = {
  email: 'superadmin@eradicapp.it',
  password: await bcrypt.hash('SecurePassword123!', 10),
  firstName: 'Super',
  lastName: 'Admin',
  role: 'SUPERADMIN',
  zoneId: null, // SuperAdmin non è associato a zona specifica
  isActive: true
};

await storage.createUser(superAdminData);
```

---

## FASE 8: Documentazione e Training

### 8.1 Aggiornamento Documentazione
- Manuale SuperAdmin per gestione zone
- Guida Admin per funzionalità multi-tenant
- FAQ migrazione per utenti esistenti

### 8.2 Training Utenti
- Sessioni formative per nuovi Admin di zona
- Documentazione codici accesso per registrazione
- Procedure di supporto multi-livello

---

## Risultato Finale

### Architettura Completa EradicApp 2.0
```
SuperAdmin Dashboard
├── Gestione 9 Zone Operative Veneto (ULSS 1-9)
├── Creazione/Gestione Amministratori Zona
├── Sistema Support Tickets
├── Gestione Contratti/Convenzioni
├── Fatturazione/Abbonamenti
└── Materiali Formativi Centralizzati

Ogni Zona Operativa
├── Dashboard Admin Zona
├── Gestione Eradicatori Locali
├── Operazioni Controllo Fauna
├── Report Conformità Decreto 277/2023
└── Comunicazione con SuperAdmin
```

### Benefici Ottenuti
1. **Scalabilità**: Gestione centralizzata di tutto il Veneto
2. **Isolamento Dati**: Sicurezza e privacy tra zone
3. **Conformità Normativa**: Adeguamento Decreto 277/2023
4. **Efficienza Operativa**: Automazioni centralizzate
5. **Supporto Strutturato**: Sistema ticket multi-livello

---

## Supporto Post-Migrazione

**Contatti Tecnici:**
- SuperAdmin: superadmin@eradicapp.it
- Supporto Tecnico: supporto@eradicapp.it
- Documentazione: https://docs.eradicapp.it

**Credenziali Default:**
- SuperAdmin: superadmin@eradicapp.it / SecurePassword123!
- Zone Test: vedi file `seed_data.sql`
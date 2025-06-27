-- EradicApp 1.0 - Estensione Multi-Tenant SuperAdmin
-- Adattamento dell'architettura SeleApp per controllo fauna selvatica

-- ==========================================
-- TABELLE MULTI-TENANT PRINCIPALI
-- ==========================================

-- Enti/Territori (equivalente alle "reserves" di SeleApp)
CREATE TABLE operational_zones (
  id TEXT PRIMARY KEY, -- es: "ulss3-serenissima", "regione-veneto-est"
  name TEXT NOT NULL, -- "ULSS 3 Serenissima", "Regione Veneto Est"
  territory_type TEXT NOT NULL, -- "ulss", "regione", "comune", "atc"
  province TEXT NOT NULL, -- "Venezia", "Padova", "Treviso", etc.
  contact_email TEXT NOT NULL,
  access_code TEXT NOT NULL, -- Codice per registrazione eradicatori
  code_active BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  decree_reference TEXT, -- Riferimento specifico al Decreto 277/2023
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Impostazioni personalizzate per ente
CREATE TABLE zone_settings (
  id SERIAL PRIMARY KEY,
  zone_id TEXT NOT NULL REFERENCES operational_zones(id),
  logo_url TEXT,
  hunting_periods TEXT NOT NULL DEFAULT '{}', -- JSON periodi caccia consentiti
  species_targets TEXT NOT NULL DEFAULT '["wild_boar"]', -- JSON specie target
  reporting_requirements TEXT NOT NULL DEFAULT '{}', -- JSON requisiti report specifici ente
  automation_config TEXT NOT NULL DEFAULT '{}', -- JSON configurazioni automazioni
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Contratti/Convenzioni con enti
CREATE TABLE zone_contracts (
  id SERIAL PRIMARY KEY,
  zone_id TEXT NOT NULL REFERENCES operational_zones(id),
  contract_type TEXT NOT NULL, -- "convenzione", "autorizzazione", "decreto"
  status TEXT NOT NULL DEFAULT 'attivo',
  file_url TEXT, -- PDF contratto/convenzione
  authority_reference TEXT, -- Numero protocollo/decreto
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  renewal_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tickets di supporto tecnico
CREATE TABLE support_tickets (
  id SERIAL PRIMARY KEY,
  zone_id TEXT NOT NULL REFERENCES operational_zones(id),
  admin_id INTEGER REFERENCES users(id),
  category TEXT NOT NULL DEFAULT 'technical', -- 'technical', 'legal', 'reporting'
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  response TEXT,
  attachments TEXT, -- JSON array URLs allegati
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- Fatturazione/Abbonamenti enti
CREATE TABLE zone_billing (
  id SERIAL PRIMARY KEY,
  zone_id TEXT NOT NULL REFERENCES operational_zones(id),
  subscription_plan TEXT NOT NULL DEFAULT 'standard', -- 'basic', 'standard', 'premium'
  payment_status TEXT NOT NULL DEFAULT 'active',
  monthly_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  annual_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'EUR',
  renewal_date TIMESTAMP NOT NULL,
  last_payment_date TIMESTAMP,
  invoice_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Materiali formativi e legali
CREATE TABLE training_materials (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  material_type TEXT NOT NULL, -- 'decree', 'manual', 'training_video', 'form_template'
  target_audience TEXT NOT NULL, -- 'admin', 'eradicator', 'superadmin', 'all'
  zone_specific BOOLEAN NOT NULL DEFAULT false, -- Se true, materiale per zone specifiche
  applicable_zones TEXT, -- JSON array zone IDs se zone_specific=true
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  version TEXT NOT NULL DEFAULT '1.0',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Log accessi materiali
CREATE TABLE material_access_log (
  id SERIAL PRIMARY KEY,
  material_id INTEGER NOT NULL REFERENCES training_materials(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  zone_id TEXT NOT NULL REFERENCES operational_zones(id),
  access_type TEXT NOT NULL DEFAULT 'view', -- 'view', 'download', 'complete'
  accessed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==========================================
-- MODIFICA TABELLE ESISTENTI
-- ==========================================

-- Aggiungere zone_id a tutte le tabelle esistenti per multi-tenancy
ALTER TABLE users ADD COLUMN zone_id TEXT REFERENCES operational_zones(id);
ALTER TABLE altane ADD COLUMN zone_id TEXT REFERENCES operational_zones(id); -- se esiste
ALTER TABLE prenotazioni ADD COLUMN zone_id TEXT REFERENCES operational_zones(id); -- se esiste
ALTER TABLE reports ADD COLUMN zone_id TEXT REFERENCES operational_zones(id); -- se esiste

-- ==========================================
-- INDICI PER PERFORMANCE
-- ==========================================

CREATE INDEX idx_operational_zones_active ON operational_zones(is_active);
CREATE INDEX idx_users_zone ON users(zone_id);
CREATE INDEX idx_support_tickets_zone_status ON support_tickets(zone_id, status);
CREATE INDEX idx_material_access_zone_user ON material_access_log(zone_id, user_id);

-- ==========================================
-- DATI INIZIALI VENETO
-- ==========================================

-- SuperAdmin account
INSERT INTO users (email, password, first_name, last_name, role, is_active, zone_id) 
VALUES ('superadmin@eradicapp.it', '$2b$10$hash_password_here', 'Admin', 'Sistema', 'SUPERADMIN', true, NULL);

-- Zone operative principali Veneto
INSERT INTO operational_zones (id, name, territory_type, province, contact_email, access_code, decree_reference) VALUES
('ulss1-dolomiti', 'ULSS 1 Dolomiti', 'ulss', 'Belluno', 'controllo.fauna@aulss1.veneto.it', 'DOLO2024', 'Decreto 277/2023 - Area Dolomiti'),
('ulss2-marca', 'ULSS 2 Marca Trevigiana', 'ulss', 'Treviso', 'eradicazione@aulss2.veneto.it', 'MARC2024', 'Decreto 277/2023 - Marca Trevigiana'),
('ulss3-serenissima', 'ULSS 3 Serenissima', 'ulss', 'Venezia', 'cinghiali@aulss3.veneto.it', 'SERE2024', 'Decreto 277/2023 - Serenissima'),
('ulss4-veneto-orient', 'ULSS 4 Veneto Orientale', 'ulss', 'Venezia', 'fauna@aulss4.veneto.it', 'ORIE2024', 'Decreto 277/2023 - Veneto Orientale'),
('ulss5-polesana', 'ULSS 5 Polesana', 'ulss', 'Rovigo', 'controllo@aulss5.veneto.it', 'POLE2024', 'Decreto 277/2023 - Polesana'),
('ulss6-euganea', 'ULSS 6 Euganea', 'ulss', 'Padova', 'eradica@aulss6.veneto.it', 'EUGA2024', 'Decreto 277/2023 - Euganea'),
('ulss7-pedemontana', 'ULSS 7 Pedemontana', 'ulss', 'Vicenza', 'cinghiale@aulss7.veneto.it', 'PEDE2024', 'Decreto 277/2023 - Pedemontana'),
('ulss8-berica', 'ULSS 8 Berica', 'ulss', 'Vicenza', 'fauna.selvatica@aulss8.veneto.it', 'BERI2024', 'Decreto 277/2023 - Berica'),
('ulss9-scaligera', 'ULSS 9 Scaligera', 'ulss', 'Verona', 'controllo.cinghiali@aulss9.veneto.it', 'SCAL2024', 'Decreto 277/2023 - Scaligera');

-- Materiali formativi standard
INSERT INTO training_materials (title, description, file_url, material_type, target_audience, is_mandatory) VALUES
('Decreto Regione Veneto 277/2023', 'Normativa completa per il controllo del cinghiale', '/materials/decreto-277-2023.pdf', 'decree', 'all', true),
('Manuale Eradicatore Cinghiali', 'Guida completa per operatori controllo fauna', '/materials/manuale-eradicatore.pdf', 'manual', 'eradicator', true),
('Modulo Report Mensile ULSS', 'Template per rendicontazione mensile', '/materials/modulo-report-ulss.pdf', 'form_template', 'admin', true),
('Video Formazione Sicurezza', 'Protocolli sicurezza durante eradicazione', '/materials/video-sicurezza.mp4', 'training_video', 'eradicator', true);
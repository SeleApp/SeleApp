# SeleApp - Manuale Utente Completo
## Gestione Professionale della Caccia di Selezione

---

## Indice

1. [Introduzione](#introduzione)
2. [Accesso al Sistema](#accesso-al-sistema)
3. [Guida SuperAdmin](#guida-superadmin)
4. [Guida Amministratore](#guida-amministratore)
5. [Guida Cacciatore](#guida-cacciatore)
6. [App Mobile (PWA)](#app-mobile-pwa)
7. [FAQ e Risoluzione Problemi](#faq-e-risoluzione-problemi)
8. [Supporto Tecnico](#supporto-tecnico)

---

## Introduzione

SeleApp è un sistema professionale per la gestione della caccia di selezione progettato per riserve alpine. Il sistema gestisce prenotazioni, quote faunistiche, report di caccia e formazione attraverso tre livelli di accesso: SuperAdmin, Amministratore e Cacciatore.

### Caratteristiche Principali
- **Multi-tenant**: Un'applicazione che serve multiple riserve con isolamento dati
- **Progressive Web App**: Installabile su dispositivi mobili
- **Email automatiche**: Notifiche per tutte le attività importanti
- **Gestione quote regionali**: Tracciamento fauna selvatica in tempo reale
- **Sistema formativo**: Materiali e documentazione centralizzata

---

## Accesso al Sistema

### Landing Page
1. Visitare il sito principale SeleApp
2. Cliccare "Accedi all'App" per accedere al sistema
3. La landing page contiene FAQ, funzionalità e contatti

### Login Utente
**URL**: `/app`

**Credenziali di esempio:**
- **SuperAdmin**: favero.a97@gmail.com / Monfenera.1.
- **Admin**: admin@seleapp.com / admin123
- **Cacciatore**: Registrazione tramite codice accesso riserva

### Registrazione Nuovo Cacciatore
1. Cliccare "Non hai un account? Registrati"
2. Selezionare la riserva dall'elenco
3. Inserire il codice di accesso fornito dall'amministratore
4. Compilare dati personali (nome, cognome, email, password)
5. Confermare la registrazione

---

## Guida SuperAdmin

Il SuperAdmin ha controllo completo su tutte le riserve e funzionalità avanzate.

### Dashboard Principale
Accesso a 6 sezioni principali tramite tab:
- **Riserve**: Gestione riserve contrattualizzate
- **Amministratori**: Creazione account admin
- **Impostazioni**: Configurazioni riserve specifiche
- **Supporto**: Sistema ticket di assistenza
- **Fatturazione**: Gestione pagamenti e contratti
- **Formazione**: Materiali educativi per tutti gli utenti

### 1. Gestione Riserve

#### Visualizzazione Riserve
- Tabella con: Nome, Comune, Email, Utenti, Codice Accesso, Stato
- Filtri per stato attivo/inattivo
- Statistiche utenti per riserva

#### Creazione Nuova Riserva
1. Cliccare "Nuova Riserva"
2. Compilare:
   - **Nome**: Es. "Riserva Monte Bianco"
   - **Comune**: Località geografica
   - **Email Contatto**: Email amministrativa
   - **Codice Accesso**: Generato automaticamente (6 caratteri)
3. Confermare creazione

#### Gestione Codici Accesso
- **Visualizza/Nascondi**: Toggle per sicurezza
- **Copia**: Copia negli appunti per condivisione
- **Rigenera**: Crea nuovo codice casuale
- **Attiva/Disattiva**: Controlla registrazioni

### 2. Gestione Amministratori

#### Lista Amministratori
- Visualizzazione tutti gli account admin
- Informazioni: Nome, Email, Riserva, Stato, Data Creazione

#### Creazione Nuovo Admin
1. Cliccare "Nuovo Amministratore"
2. Compilare modulo:
   - **Nome e Cognome**
   - **Email**: Deve essere unica nel sistema
   - **Password**: Minimo 6 caratteri
   - **Riserva**: Selezione dalla lista
3. Confermare creazione
4. L'admin riceve email automatica con credenziali

#### Modifica Amministratori
- Aggiornamento dati personali
- Cambio password
- Attivazione/disattivazione account
- Cambio riserva di competenza

### 3. Impostazioni Riserve

#### Configurazione Logo
- Upload logo personalizzato per riserva
- Formati supportati: PNG, JPG, SVG
- Dimensioni consigliate: 200x200px

#### Giorni di Silenzio Venatorio
- Configurazione giorni specifici senza caccia
- Calendario interattivo per selezione date
- Applicazione automatica alle prenotazioni

#### Template Email Personalizzati
- Personalizzazione email automatiche per riserva
- Template per: conferme, cancellazioni, benvenuto
- Variabili dinamiche disponibili: {nome}, {riserva}, {data}

### 4. Sistema Supporto

#### Gestione Ticket
- **Visualizzazione**: Tutti i ticket da tutte le riserve
- **Filtri**: Per stato, priorità, riserva
- **Priorità**: Bassa, Media, Alta, Critica
- **Stati**: Aperto, In Lavorazione, Risolto, Chiuso

#### Risposta ai Ticket
1. Selezionare ticket dalla lista
2. Leggere descrizione problema
3. Inserire risposta dettagliata
4. Cambiare stato se necessario
5. Inviare risposta (email automatica al richiedente)

#### Analytics Supporto
- Tempo medio risoluzione
- Ticket per riserva
- Problemi più frequenti
- Valutazioni soddisfazione

### 5. Gestione Fatturazione

#### Contratti Attivi
- Lista contratti per riserva
- Tipologie: Mensile, Annuale, Custom
- Date inizio/fine validità
- Importi e scadenze

#### Fatturazione Automatica
- Generazione fatture automatica
- Email promemoria scadenze
- Tracking pagamenti ricevuti
- Report entrate mensili/annuali

#### Stati Pagamento
- **Pagato**: Verde, tutto regolare
- **In Scadenza**: Giallo, promemoria inviato
- **Scaduto**: Rosso, servizio sospeso
- **Sospeso**: Grigio, accesso bloccato

### 6. Materiali Formativi

#### Tipologie Materiali
- **Video**: Formati MP4, AVI, MOV
- **PDF**: Documenti normativi, guide operative
- **Link**: Collegamenti esterni (YouTube, siti normativi)

#### Caricamento Materiali
1. Cliccare "Nuovo Materiale"
2. Selezionare tipologia
3. Upload file o inserire URL
4. Compilare:
   - **Titolo**: Nome descrittivo
   - **Categoria**: Es. "Normative", "Sicurezza", "Tecniche"
   - **Target**: SuperAdmin, Admin, Cacciatori, Tutti
   - **Descrizione**: Spiegazione contenuto
5. Pubblicare materiale

#### Gestione Accessi
- **Log Accessi**: Chi ha visualizzato cosa e quando
- **Certificazioni**: Tracciamento completamento formazione
- **Notifiche**: Alert automatici per nuovi materiali

---

## Guida Amministratore

Gli Amministratori gestiscono una singola riserva con funzionalità specifiche.

### Dashboard Admin
4 tab principali:
- **Zone**: Gestione zone di caccia
- **Quote Regionali**: Monitoraggio fauna
- **Prenotazioni**: Supervisione prenotazioni
- **Cacciatori**: Gestione account utenti

### 1. Gestione Zone

#### Visualizzazione Zone
- Lista delle 16 zone di Cison di Valmarino
- Stato attivazione per zona
- Prenotazioni attive per zona

#### Configurazione Zone
- Attivazione/disattivazione zone
- Descrizioni specifiche
- Limitazioni accesso (se necessario)

### 2. Quote Regionali

#### Monitoraggio Quote
**Capriolo (5 categorie):**
- M0: Maschi giovani
- F0: Femmine giovani  
- FA: Femmine adulte
- M1: Maschi 1 anno
- MA: Maschi adulti

**Cervo (4 categorie):**
- CL0: Cerbiatti
- FF: Femmine fertili
- MM: Maschi maturi
- MCL1: Maschi classe 1

#### Aggiornamento Quote
1. Inserire nuove quote regionali ricevute
2. Il sistema calcola automaticamente disponibilità
3. Quote esaurite vengono evidenziate in rosso
4. Notifiche automatiche per quote basse (≤2)

#### Periodo di Caccia
- Configurazione date apertura/chiusura
- Controllo automatico prenotazioni in stagione
- Blocco prenotazioni fuori periodo

### 3. Gestione Prenotazioni

#### Supervisione Prenotazioni
- Visualizzazione tutte le prenotazioni della riserva
- Filtri: Data, Cacciatore, Zona, Stato
- Stati: Attiva, Completata, Cancellata

#### Cancellazione Prenotazioni
- Possibilità cancellare prenotazioni per emergenze
- Email automatica di notifica al cacciatore
- Log delle modifiche per tracciabilità

#### Statistiche Prenotazioni
- Prenotazioni per periodo
- Zone più richieste
- Tassi di completamento
- Report mensili automatici

### 4. Gestione Cacciatori

#### Lista Cacciatori
- Tutti i cacciatori registrati nella riserva
- Informazioni: Nome, Email, Stato, Ultima Attività
- Filtri per stato attivo/inattivo

#### Creazione Nuovo Cacciatore
1. Cliccare "Nuovo Cacciatore"
2. Compilare dati anagrafici
3. Generare password temporanea
4. Inviare credenziali via email
5. Il cacciatore deve cambiare password al primo accesso

#### Modifica Account Cacciatori
- Aggiornamento dati personali
- Reset password
- Attivazione/disattivazione account
- Storico attività cacciatore

#### Gestione Segnalazioni
- Ricezione segnalazioni da cacciatori
- Apertura ticket verso SuperAdmin se necessario
- Risoluzione problemi locali

### 5. Report e Analytics

#### Report Mensili
- Prenotazioni effettuate
- Prelievi per specie
- Utilizzo quote regionali
- Attività cacciatori

#### Export Dati
- Export Excel delle prenotazioni
- Report PDF per enti competenti
- Backup dati riserva

---

## Guida Cacciatore

I Cacciatori accedono alle funzionalità di prenotazione e reporting.

### Dashboard Cacciatore
4 tab principali:
- **Zone**: Prenotazione battute di caccia
- **Quote Regionali**: Consultazione disponibilità
- **Prenotazioni**: Gestione prenotazioni personali
- **Report**: Invio report post-caccia

### 1. Prenotazione Zone

#### Visualizzazione Zone
- Griglia delle 16 zone disponibili
- Codici zona: A1-A4, B1-B4, C1-C4, D1-D4
- Indicatori stato: Disponibile, Occupata, Non Attiva

#### Procedura Prenotazione
1. Selezionare zona desiderata
2. Scegliere data (no martedì e venerdì)
3. Selezionare fascia oraria:
   - **Alba-12:00**: Mattutina
   - **12:00-Tramonto**: Pomeridiana  
   - **Alba-Tramonto**: Intera giornata
4. Confermare prenotazione
5. Ricevere email di conferma automatica

#### Restrizioni Prenotazioni
- **Giorni Vietati**: Martedì e Venerdì (silenzio venatorio)
- **Conflitti**: Impossibile prenotare stesso slot se già occupato
- **Quote**: Prenotazione bloccata se categoria esaurita
- **Anticipo**: Prenotazioni possibili fino a 30 giorni

### 2. Consultazione Quote

#### Visualizzazione Disponibilità
**Capriolo:**
- M0, F0, FA, M1, MA con contatori in tempo reale
- Indicatori colore: Verde (>5), Giallo (2-5), Rosso (0-1)

**Cervo:**
- CL0, FF, MM, MCL1 con disponibilità aggiornata
- Stessa codifica colori per facilità lettura

#### Informazioni Aggiuntive
- Periodo di caccia attivo
- Date apertura/chiusura stagione
- Note amministrative regionali

### 3. Gestione Prenotazioni

#### Le Mie Prenotazioni
- Lista cronologica prenotazioni
- Dettagli: Data, Zona, Orario, Stato
- Possibilità cancellazione (fino a 24h prima)

#### Cancellazione Prenotazioni
1. Selezionare prenotazione da cancellare
2. Confermare cancellazione
3. Ricevere email di conferma cancellazione
4. La zona torna disponibile per altri

#### Storico Prenotazioni
- Archivio prenotazioni passate
- Filtri per data e zona
- Collegamento ai report inviati

### 4. Report di Caccia

#### Invio Report Obbligatorio
Dopo ogni battuta di caccia (entro 24h):

1. Selezionare prenotazione completata
2. Indicare esito:
   - **Prelievo**: Cattura effettuata
   - **Nessun Prelievo**: Battuta senza catture

#### Report con Prelievo
Se effettuato prelievo, specificare:
- **Specie**: Capriolo o Cervo
- **Categoria**: M0, F0, FA, M1, MA (capriolo) o CL0, FF, MM, MCL1 (cervo)
- **Foto**: Upload foto del cartellino uccisione
- **Note**: Dettagli aggiuntivi (peso, circostanze, ecc.)

#### Validazione Report
- Il sistema verifica disponibilità quota per categoria
- Aggiornamento automatico contatori regionali
- Email conferma invio report
- Notifica admin per controllo

### 5. Materiali Formativi

#### Accesso Materiali
- Sezione dedicata a video e documenti
- Categorie: Normative, Sicurezza, Tecniche di Caccia
- Materiali sempre aggiornati dal SuperAdmin

#### Tracciamento Formazione
- Sistema registra visualizzazione materiali
- Certificazioni di completamento corsi
- Promemoria per aggiornamenti obbligatori

---

## App Mobile (PWA)

### Installazione su Android
1. Aprire SeleApp in Chrome
2. Apparirà banner "Aggiungi a schermata Home"
3. Toccare "Installa" o "Aggiungi"
4. L'app appare come icona nativa

### Installazione su iOS (Safari)
1. Aprire SeleApp in Safari
2. Toccare icona "Condividi" (quadrato con freccia)
3. Scorrere e toccare "Aggiungi alla schermata Home"
4. Confermare "Aggiungi"

### Funzionalità Offline
- Cache delle pagine principali
- Sincronizzazione automatica al riconnettersi
- Notifiche push per aggiornamenti importanti

### Ottimizzazione Mobile
- Interface adattiva per schermi piccoli
- Tab scorrevoli su dispositivi stretti
- Bottoni dimensionati per touch
- Form semplificati per inserimento rapido

---

## FAQ e Risoluzione Problemi

### Domande Comuni

**Q: Ho dimenticato la password, come recuperarla?**
A: Contattare l'amministratore della propria riserva per reset password. Il SuperAdmin può resettare password admin.

**Q: Posso prenotare più zone nello stesso giorno?**
A: Sì, è possibile prenotare fasce orarie diverse (mattina/pomeriggio) nella stessa giornata, ma non la stessa fascia in zone diverse.

**Q: Cosa succede se non invio il report entro 24h?**
A: Il sistema invia promemoria automatici. Reports in ritardo devono essere giustificati all'amministratore.

**Q: Come funzionano le quote regionali?**
A: Le quote sono condivise tra tutte le zone. Quando una categoria raggiunge 0, diventa non disponibile in tutta la riserva.

**Q: Posso modificare una prenotazione già effettuata?**
A: No, è necessario cancellare e riprenotare. La cancellazione è possibile fino a 24h prima.

**Q: L'app funziona senza internet?**
A: Parzialmente. È possibile consultare dati già caricati, ma prenotazioni e report richiedono connessione.

### Problemi Tecnici Comuni

**Problema: L'app non si carica**
- Verificare connessione internet
- Cancellare cache browser
- Provare modalità navigazione privata
- Contattare supporto se persiste

**Problema: Login non funziona**
- Verificare email e password corrette
- Controllare che account sia attivo
- Provare reset password
- Contattare amministratore riserva

**Problema: Non ricevo email**
- Controllare cartella spam/posta indesiderata
- Verificare indirizzo email nel profilo
- Aggiungere seleapp.info@gmail.com ai contatti
- Segnalare problema all'admin

**Problema: Le zone non si vedono**
- Ricaricare pagina (F5)
- Verificare periodo caccia aperto
- Controllare che account sia attivo
- Contattare supporto

---

## Supporto Tecnico

### Contatti Supporto
- **Email Principale**: seleapp.info@gmail.com
- **Supporto Admin**: Tramite sistema ticket interno
- **Supporto Cacciatori**: Contattare admin della propria riserva

### Orari Supporto
- **Lun-Ven**: 9:00-18:00
- **Sabato**: 9:00-13:00 (solo emergenze)
- **Domenica**: Chiuso

### Informazioni da Fornire
Quando si contatta il supporto, includere:
1. **Ruolo utente**: SuperAdmin/Admin/Cacciatore
2. **Riserva**: Nome riserva di appartenenza
3. **Browser utilizzato**: Chrome, Safari, Firefox, ecc.
4. **Dispositivo**: Desktop, Mobile, Tablet
5. **Descrizione problema**: Cosa stava facendo quando è avvenuto l'errore
6. **Messaggio errore**: Screenshot se possibile

### Escalation Problemi
1. **Cacciatore** → Contatta Admin riserva
2. **Admin** → Apre ticket verso SuperAdmin
3. **SuperAdmin** → Contatta sviluppatori se necessario

---

## Note Finali

### Aggiornamenti Sistema
- Il sistema si aggiorna automaticamente
- Nuove funzionalità comunicate via email
- Backup automatici giornalieri garantiti
- Cronologia modifiche disponibile in `replit.md`

### Sicurezza e Privacy
- Tutti i dati sono crittografati
- Password protette con hash bcrypt
- Accesso multi-livello con isolamento dati
- Conformità GDPR per gestione dati personali

### Licenza e Utilizzo
- Software proprietario riservato a riserve alpine contrattualizzate
- Uso commerciale non autorizzato severamente vietato
- Tutti i diritti riservati SeleApp

---

*Manuale aggiornato al 26 Giugno 2025*
*Versione: 2.1*
*Per segnalazioni su questo manuale: seleapp.info@gmail.com*
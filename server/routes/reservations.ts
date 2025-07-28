// © 2025 Alessandro Favero - Tutti i diritti riservati
// Licenza: Uso riservato esclusivamente alle riserve attivate tramite contratto
// Vietata la riproduzione, distribuzione o modifica non autorizzata

import { Router } from "express";
import { storage } from "../storage";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { createReservationSchema } from "@shared/schema";
import { EmailService } from "../services/emailService";
import { db } from "../db";
import { groupQuotas, reserves } from "../../shared/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Utente non autenticato" });
    }
    const hunterId = req.user.role === 'HUNTER' ? req.user.id : undefined;
    const reservations = await storage.getReservations(req.user.reserveId!, hunterId);
    res.json(reservations);
  } catch (error) {
    console.error("Error fetching reservations:", error);
    res.status(500).json({ message: "Errore nel recupero delle prenotazioni" });
  }
});

router.post("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    console.log("🔥 Ricevuto body request:", JSON.stringify(req.body, null, 2));
    console.log("🔑 User info:", { id: req.user.id, reserveId: req.user.reserveId });
    
    if (!req.user || req.user.role !== 'HUNTER') {
      return res.status(403).json({ message: "Solo i cacciatori possono prenotare" });
    }

    // ⏰ CONTROLLO LIMITAZIONI ORARIE: 19:00-21:00 per prenotare il giorno dopo
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    const startTime = 19 * 60; // 19:00
    const endTime = 21 * 60;   // 21:00
    
    if (currentTime < startTime || currentTime > endTime) {
      return res.status(400).json({ 
        message: `Le prenotazioni sono consentite solo dalle 19:00 alle 21:00. Ora attuale: ${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}` 
      });
    }

    // ⏰ CONTROLLO DATA E GIORNI DI SILENZIO: Solo per il giorno successivo, no martedì/venerdì
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    let tomorrowDay = tomorrow.getDay();
    
    // Se domani è martedì (2) o venerdì (5), le prenotazioni sono CHIUSE
    if (tomorrowDay === 2) {
      return res.status(400).json({ 
        message: "Prenotazioni chiuse: domani è martedì (silenzio venatorio). Riprova domani sera per prenotare mercoledì." 
      });
    }
    if (tomorrowDay === 5) {
      return res.status(400).json({ 
        message: "Prenotazioni chiuse: domani è venerdì (silenzio venatorio). Riprova domani sera per prenotare sabato." 
      });
    }
    
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    if (req.body.huntDate !== tomorrowStr) {
      return res.status(400).json({ 
        message: `Puoi prenotare solo per domani (${tomorrowStr}). Data richiesta: ${req.body.huntDate}` 
      });
    }

    const reservationData = createReservationSchema.parse({
      ...req.body,
      hunterId: req.user.id,
      reserveId: req.user.reserveId!,
    });

    console.log("✅ Dati validati con successo:", reservationData);

    // Check if zone exists and is active for this reserve
    const zone = await storage.getZone(reservationData.zoneId, req.user.reserveId!);
    if (!zone || !zone.isActive) {
      return res.status(400).json({ message: "Zona non valida o non attiva" });
    }

    // Validate and parse the hunt date
    const huntDateStr = reservationData.huntDate;
    if (!huntDateStr || typeof huntDateStr !== 'string') {
      return res.status(400).json({ message: "Data non valida" });
    }

    const huntDate = new Date(huntDateStr + 'T12:00:00Z'); // Add time to avoid timezone issues
    if (isNaN(huntDate.getTime())) {
      return res.status(400).json({ message: "Formato data non valido" });
    }

    // Check for hunting day restrictions
    const huntDayOfWeek = huntDate.getDay();
    if (huntDayOfWeek === 2 || huntDayOfWeek === 5) { // Tuesday or Friday
      return res.status(400).json({ 
        message: "Caccia non permessa nei giorni di silenzio venatorio (martedì e venerdì)" 
      });
    }

    // 📊 CONTROLLO 3 USCITE SETTIMANALI: Verifica che non superi il limite settimanale
    const existingReservations = await storage.getReservations(req.user.reserveId!, req.user.id);
    
    // Calcola inizio e fine della settimana corrente (lunedì-domenica)
    const huntDateObj = new Date(huntDateStr + 'T12:00:00Z');
    const startOfWeek = new Date(huntDateObj);
    const weekDayOfWeek = huntDateObj.getDay();
    const daysToMonday = weekDayOfWeek === 0 ? 6 : weekDayOfWeek - 1; // Domenica = 0, quindi 6 giorni indietro
    startOfWeek.setDate(huntDateObj.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    // Conta prenotazioni attive nella settimana
    const weeklyReservations = existingReservations.filter(r => {
      const resDate = new Date(r.huntDate);
      return resDate >= startOfWeek && resDate <= endOfWeek && r.status === 'active';
    });
    
    if (weeklyReservations.length >= 3) {
      return res.status(400).json({ 
        message: `Limite settimanale raggiunto: hai già ${weeklyReservations.length}/3 uscite prenotate questa settimana (${startOfWeek.toLocaleDateString('it-IT')} - ${endOfWeek.toLocaleDateString('it-IT')})` 
      });
    }

    // 🚫 CONTROLLO ZONA OCCUPATA: 1 cacciatore per zona per slot
    const zoneConflict = existingReservations.some(r => {
      const reservationDate = new Date(r.huntDate).toISOString().split('T')[0];
      return reservationDate === huntDateStr && 
             r.zoneId === reservationData.zoneId &&
             r.timeSlot === reservationData.timeSlot && 
             r.status === 'active';
    });

    if (zoneConflict) {
      return res.status(400).json({ 
        message: "Questa zona è già prenotata per questo orario da un altro cacciatore" 
      });
    }

    // Check zone cooldown rules
    const zoneCooldownCheck = await storage.checkZoneCooldown(
      req.user.reserveId!, 
      req.user.id, 
      reservationData.zoneId
    );

    if (!zoneCooldownCheck.allowed) {
      return res.status(400).json({ 
        message: zoneCooldownCheck.reason || "Non puoi prenotare questa zona al momento",
        cooldownInfo: {
          waitUntil: zoneCooldownCheck.waitUntil,
          reason: zoneCooldownCheck.reason
        }
      });
    }

    // Get reserve management type to check if group quota validation is needed
    const reserve = await db.select().from(reserves).where(eq(reserves.id, req.user.reserveId!)).limit(1);
    const isZoneGroupsReserve = reserve[0]?.managementType === 'zones_groups';

    // For zones_groups reserves: check group quotas for target species
    if (isZoneGroupsReserve && reservationData.targetSpecies) {
      const hunter = await storage.getUser(req.user.id);
      if (!hunter?.hunterGroup) {
        return res.status(400).json({ 
          message: "Gruppo cacciatore non definito. Contatta l'amministratore." 
        });
      }

      const targetCategory = reservationData.targetSpecies === 'roe_deer' 
        ? reservationData.targetRoeDeerCategory 
        : reservationData.targetRedDeerCategory;

      if (targetCategory) {
        // Find the specific quota for this group, species and category
        const categoryField = reservationData.targetSpecies === 'roe_deer' ? 'roeDeerCategory' : 'redDeerCategory';
        const groupQuota = await db.select()
          .from(groupQuotas)
          .where(
            and(
              eq(groupQuotas.reserveId, req.user.reserveId!),
              eq(groupQuotas.hunterGroup, hunter.hunterGroup),
              eq(groupQuotas.species, reservationData.targetSpecies),
              eq(groupQuotas[categoryField as 'roeDeerCategory' | 'redDeerCategory'], targetCategory)
            )
          )
          .limit(1);

        if (groupQuota.length === 0) {
          return res.status(400).json({ 
            message: `Quota non trovata per ${targetCategory} nel gruppo ${hunter.hunterGroup}` 
          });
        }

        const quota = groupQuota[0];
        const available = quota.totalQuota - quota.harvested;
        
        if (available <= 0) {
          return res.status(400).json({ 
            message: `Quota esaurita per ${targetCategory} nel gruppo ${hunter.hunterGroup} (${quota.harvested}/${quota.totalQuota})` 
          });
        }

        console.log(`✅ Group quota check passed: ${targetCategory} - ${available} available in group ${hunter.hunterGroup}`);
      }
    }

    // Prepare target species data if provided
    const targetSpeciesData: any = {};
    if (reservationData.targetSpecies) {
      targetSpeciesData.targetSpecies = reservationData.targetSpecies;
      if (reservationData.targetSpecies === 'roe_deer' && reservationData.targetRoeDeerCategory) {
        targetSpeciesData.targetRoeDeerCategory = reservationData.targetRoeDeerCategory;
      }
      if (reservationData.targetSpecies === 'red_deer' && reservationData.targetRedDeerCategory) {
        targetSpeciesData.targetRedDeerCategory = reservationData.targetRedDeerCategory;
      }
      if (reservationData.targetSex) {
        targetSpeciesData.targetSex = reservationData.targetSex;
      }
      if (reservationData.targetAgeClass) {
        targetSpeciesData.targetAgeClass = reservationData.targetAgeClass;
      }
      if (reservationData.targetNotes) {
        targetSpeciesData.targetNotes = reservationData.targetNotes;
      }
    }

    console.log("Creating reservation with final data:", {
      hunterId: req.user.id,
      zoneId: reservationData.zoneId,
      huntDate,
      timeSlot: reservationData.timeSlot,
      status: 'active',
      ...targetSpeciesData,
    });

    const reservation = await storage.createReservation({
      hunterId: req.user.id,
      zoneId: reservationData.zoneId,
      huntDate,
      timeSlot: reservationData.timeSlot,
      status: 'active',
      reserveId: req.user.reserveId,
      ...targetSpeciesData,
    });

    console.log("Reservation created successfully:", reservation);

    // Invia email di conferma al cacciatore
    try {
      const timeSlotText = reservation.timeSlot === 'morning' 
        ? 'morning' 
        : reservation.timeSlot === 'afternoon' 
        ? 'afternoon' 
        : 'full_day';

      await EmailService.sendReservationConfirmation({
        hunterEmail: req.user.email,
        hunterName: `${req.user.firstName} ${req.user.lastName}`,
        zoneName: zone.name,
        huntDate: reservation.huntDate.toISOString(),
        timeSlot: timeSlotText,
        reservationId: reservation.id,
        targetSpecies: reservation.targetSpecies || undefined,
        targetCategory: reservation.targetRoeDeerCategory || reservation.targetRedDeerCategory || undefined,
        targetSex: reservation.targetSex || undefined,
        targetAgeClass: reservation.targetAgeClass || undefined,
        targetNotes: reservation.targetNotes || undefined
      });
    } catch (emailError) {
      console.error("Errore invio email conferma:", emailError);
      // Non fallire la prenotazione se l'email non viene inviata
    }

    // Invia notifica all'admin della riserva
    try {
      // Trova l'admin della riserva
      const admins = await storage.getAllAdmins();
      const reserveAdmin = admins.find(admin => 
        admin.reserveId === req.user.reserveId && admin.role === 'ADMIN'
      );

      if (reserveAdmin) {
        await EmailService.sendAdminNewReservationAlert({
          adminEmail: reserveAdmin.email,
          hunterName: `${req.user.firstName} ${req.user.lastName}`,
          zoneName: zone.name,
          huntDate: reservation.huntDate.toLocaleDateString('it-IT'),
          timeSlot: reservation.timeSlot
        });
      }
    } catch (emailError) {
      console.error("Errore invio notifica admin:", emailError);
      // Non fallire la prenotazione se l'email non viene inviata
    }

    res.status(201).json(reservation);
  } catch (error) {
    console.error("❌ ERRORE CRITICO durante creazione prenotazione:", error);
    console.error("❌ Stack trace:", error instanceof Error ? error.stack : "No stack trace");
    console.error("❌ Dati richiesta:", JSON.stringify(req.body, null, 2));
    console.error("❌ User info:", req.user);
    
    res.status(500).json({ 
      message: "Errore nella creazione della prenotazione",
      error: error instanceof Error ? error.message : "Unknown error",
      details: error instanceof Error ? error.stack : undefined
    });
  }
});

router.delete("/:id", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const reservationId = parseInt(req.params.id);
    
    if (isNaN(reservationId)) {
      return res.status(400).json({ message: "ID prenotazione non valido" });
    }

    console.log(`Admin/Hunter ${req.user?.email} attempting to cancel reservation ${reservationId}`);

    // Per admin: ottieni tutte le prenotazioni, per hunter: solo le proprie
    const reservations = await storage.getReservations(req.user.reserveId, req.user?.role === 'ADMIN' ? undefined : req.user?.id);
    const reservation = reservations.find(r => r.id === reservationId);
    
    console.log(`Found ${reservations.length} reservations, looking for ID ${reservationId}`);
    console.log('Available reservation IDs:', reservations.map(r => r.id));
    
    if (!reservation) {
      return res.status(404).json({ message: "Prenotazione non trovata" });
    }

    console.log(`Found reservation:`, { id: reservation.id, status: reservation.status, hunterId: reservation.hunterId });

    // Verifica autorizzazioni
    if (req.user?.role === 'HUNTER' && reservation.hunterId !== req.user.id) {
      return res.status(403).json({ message: "Non puoi cancellare questa prenotazione" });
    }

    // Verifica che sia attiva
    if (reservation.status !== 'active') {
      return res.status(400).json({ message: "Impossibile cancellare una prenotazione non attiva" });
    }

    await storage.cancelReservation(reservationId, req.user.reserveId);
    console.log(`Successfully cancelled reservation ${reservationId}`);

    // Invia email di notifica cancellazione
    try {
      const cancelledBy = req.user?.role === 'ADMIN' && reservation.hunterId !== req.user.id ? 'admin' : 'hunter';
      
      await EmailService.sendReservationCancellation({
        hunterEmail: reservation.hunter.email,
        hunterName: `${reservation.hunter.firstName} ${reservation.hunter.lastName}`,
        zoneName: reservation.zone.name,
        huntDate: reservation.huntDate.toISOString(),
        timeSlot: reservation.timeSlot,
        reservationId: reservation.id
      }, cancelledBy);
    } catch (emailError) {
      console.error("Errore invio email cancellazione:", emailError);
      // Non fallire la cancellazione se l'email non viene inviata
    }

    res.json({ message: "Prenotazione cancellata" });
  } catch (error) {
    console.error("Error cancelling reservation:", error);
    res.status(500).json({ message: "Errore nella cancellazione della prenotazione" });
  }
});

export default router;

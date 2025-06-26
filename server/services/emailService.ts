// © 2025 Alessandro Favero - Tutti i diritti riservati
// Licenza: Uso riservato esclusivamente alle riserve attivate tramite contratto
// Vietata la riproduzione, distribuzione o modifica non autorizzata

import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || "",
});

// Email del mittente (dovrai verificare questo dominio su MailerSend)
const fromEmail = "noreply@seleapp.com"; // Sostituisci con il tuo dominio verificato
const fromName = "SeleApp Cison di Val Marino";

interface ReservationEmailData {
  hunterEmail: string;
  hunterName: string;
  zoneName: string;
  huntDate: string;
  timeSlot: string;
  reservationId: number;
}

interface ContactRequestData {
  firstName: string;
  lastName: string;
  email: string;
  organization: string;
  phone: string;
  message: string;
}

export class EmailService {
  
  /**
   * Invia email di conferma per nuova prenotazione
   */
  static async sendReservationConfirmation(data: ReservationEmailData): Promise<boolean> {
    try {
      const timeSlotText = data.timeSlot === 'morning' 
        ? 'Alba-12:00' 
        : data.timeSlot === 'afternoon' 
        ? '12:00-Tramonto' 
        : 'Alba-Tramonto';

      const sentFrom = new Sender(fromEmail, fromName);
      const recipients = [new Recipient(data.hunterEmail, data.hunterName)];

      const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setSubject("✅ Prenotazione Confermata - SeleApp")
        .setHtml(`
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2d5016; text-align: center;">🦌 Prenotazione Confermata</h2>
            
            <div style="background-color: #f8fdf4; border: 2px solid #4ade80; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #2d5016; margin-top: 0;">Dettagli della Prenotazione</h3>
              <p><strong>Cacciatore:</strong> ${data.hunterName}</p>
              <p><strong>Zona:</strong> ${data.zoneName}</p>
              <p><strong>Data:</strong> ${new Date(data.huntDate).toLocaleDateString('it-IT', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
              <p><strong>Orario:</strong> ${timeSlotText}</p>
              <p><strong>ID Prenotazione:</strong> #${data.reservationId}</p>
            </div>

            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <h4 style="color: #92400e; margin-top: 0;">⚠️ Promemoria Importante</h4>
              <ul style="color: #92400e; margin: 0;">
                <li>Rispetta gli orari di caccia stabiliti</li>
                <li>Porta sempre con te documenti e licenza di caccia</li>
                <li>Ricorda di completare il report post-caccia</li>
                <li>Rispetta l'ambiente e la fauna</li>
              </ul>
            </div>

            <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px;">
              Questa è una email automatica del sistema SeleApp<br>
              Cison di Val Marino - Gestione Attività Venatoria
            </p>
          </div>
        `)
        .setText(`
          PRENOTAZIONE CONFERMATA - SeleApp
          
          Caro ${data.hunterName},
          
          La tua prenotazione è stata confermata con successo:
          
          Zona: ${data.zoneName}
          Data: ${new Date(data.huntDate).toLocaleDateString('it-IT')}
          Orario: ${timeSlotText}
          ID Prenotazione: #${data.reservationId}
          
          PROMEMORIA IMPORTANTE:
          - Rispetta gli orari di caccia stabiliti
          - Porta sempre con te documenti e licenza di caccia
          - Ricorda di completare il report post-caccia
          - Rispetta l'ambiente e la fauna
          
          Buona caccia!
          
          SeleApp - Cison di Val Marino
        `);

      await mailerSend.email.send(emailParams);
      console.log(`Email di conferma prenotazione inviata a ${data.hunterEmail}`);
      return true;
    } catch (error) {
      console.error('Errore invio email conferma prenotazione:', error);
      return false;
    }
  }

  /**
   * Invia email di notifica per cancellazione prenotazione
   */
  static async sendReservationCancellation(data: ReservationEmailData, cancelledBy: 'hunter' | 'admin'): Promise<boolean> {
    try {
      const timeSlotText = data.timeSlot === 'morning' 
        ? 'Alba-12:00' 
        : data.timeSlot === 'afternoon' 
        ? '12:00-Tramonto' 
        : 'Alba-Tramonto';

      const reason = cancelledBy === 'hunter' 
        ? 'da te' 
        : 'dall\'amministratore del sistema';

      const sentFrom = new Sender(fromEmail, fromName);
      const recipients = [new Recipient(data.hunterEmail, data.hunterName)];

      const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setSubject("❌ Prenotazione Annullata - SeleApp")
        .setHtml(`
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #dc2626; text-align: center;">❌ Prenotazione Annullata</h2>
            
            <div style="background-color: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #dc2626; margin-top: 0;">Dettagli della Prenotazione Annullata</h3>
              <p><strong>Cacciatore:</strong> ${data.hunterName}</p>
              <p><strong>Zona:</strong> ${data.zoneName}</p>
              <p><strong>Data:</strong> ${new Date(data.huntDate).toLocaleDateString('it-IT', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
              <p><strong>Orario:</strong> ${timeSlotText}</p>
              <p><strong>ID Prenotazione:</strong> #${data.reservationId}</p>
              <p><strong>Annullata:</strong> ${reason}</p>
            </div>

            ${cancelledBy === 'admin' ? `
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <h4 style="color: #92400e; margin-top: 0;">ℹ️ Informazione</h4>
              <p style="color: #92400e; margin: 0;">
                Questa prenotazione è stata annullata dall'amministratore del sistema. 
                Se hai domande, contatta l'amministrazione di SeleApp.
              </p>
            </div>
            ` : ''}

            <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
              <h4 style="color: #1e40af; margin-top: 0;">💡 Prossimi Passi</h4>
              <p style="color: #1e40af; margin: 0;">
                Puoi effettuare una nuova prenotazione accedendo al sistema SeleApp. 
                Ricorda di verificare la disponibilità delle zone e degli orari.
              </p>
            </div>

            <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px;">
              Questa è una email automatica del sistema SeleApp<br>
              Cison di Val Marino - Gestione Attività Venatoria
            </p>
          </div>
        `)
        .setText(`
          PRENOTAZIONE ANNULLATA - SeleApp
          
          Caro ${data.hunterName},
          
          La tua prenotazione è stata annullata ${reason}:
          
          Zona: ${data.zoneName}
          Data: ${new Date(data.huntDate).toLocaleDateString('it-IT')}
          Orario: ${timeSlotText}
          ID Prenotazione: #${data.reservationId}
          
          ${cancelledBy === 'admin' ? 
            'Questa prenotazione è stata annullata dall\'amministratore del sistema. Se hai domande, contatta l\'amministrazione di SeleApp.' : 
            ''
          }
          
          Puoi effettuare una nuova prenotazione accedendo al sistema SeleApp.
          
          SeleApp - Cison di Val Marino
        `);

      await mailerSend.email.send(emailParams);
      console.log(`Email di cancellazione prenotazione inviata a ${data.hunterEmail}`);
      return true;
    } catch (error) {
      console.error('Errore invio email cancellazione prenotazione:', error);
      return false;
    }
  }

  /**
   * Invia email per richieste di contatto dal form della landing page
   */
  static async sendContactRequest(data: ContactRequestData): Promise<boolean> {
    try {
      const emailParams = new EmailParams()
        .setFrom(fromEmail)
        .setFromName("SeleApp Contact Form")
        .setRecipients([
          new Recipient("seleapp.info@gmail.com", "SeleApp Support")
        ])
        .setReplyTo(data.email, `${data.firstName} ${data.lastName}`)
        .setSubject(`Nuova Richiesta di Informazioni - ${data.firstName} ${data.lastName}`)
        .setHtml(`
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #28a745; text-align: center; margin-bottom: 30px;">
                Nuova Richiesta di Informazioni
              </h2>
              
              <div style="background-color: #e8f5e8; border: 1px solid #c3e6c3; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #155724; margin-top: 0;">Dati del Richiedente:</h3>
                <p style="margin: 5px 0; color: #155724;"><strong>Nome:</strong> ${data.firstName} ${data.lastName}</p>
                <p style="margin: 5px 0; color: #155724;"><strong>Email:</strong> ${data.email}</p>
                <p style="margin: 5px 0; color: #155724;"><strong>Organizzazione:</strong> ${data.organization}</p>
                <p style="margin: 5px 0; color: #155724;"><strong>Telefono:</strong> ${data.phone}</p>
              </div>
              
              <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #495057; margin-top: 0;">Messaggio:</h3>
                <p style="color: #495057; line-height: 1.6; white-space: pre-wrap;">${data.message}</p>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
                Ricevuto tramite il form di contatto di SeleApp<br>
                Data: ${new Date().toLocaleString('it-IT')}
              </p>
            </div>
          </div>
        `)
        .setText(`
          NUOVA RICHIESTA DI INFORMAZIONI - SeleApp
          
          Dati del Richiedente:
          - Nome: ${data.firstName} ${data.lastName}
          - Email: ${data.email}
          - Organizzazione: ${data.organization}
          - Telefono: ${data.phone}
          
          Messaggio:
          ${data.message}
          
          Ricevuto tramite il form di contatto di SeleApp
          Data: ${new Date().toLocaleString('it-IT')}
        `);

      await mailerSend.email.send(emailParams);
      console.log(`Richiesta di contatto inviata da ${data.email}`);
      return true;
    } catch (error) {
      console.error('Errore invio richiesta di contatto:', error);
      return false;
    }
  }
}
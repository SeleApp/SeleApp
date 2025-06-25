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
}
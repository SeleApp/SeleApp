// © 2025 Alessandro Favero - Tutti i diritti riservati
// Licenza: Uso riservato esclusivamente alle riserve attivate tramite contratto
// Vietata la riproduzione, distribuzione o modifica non autorizzata

import nodemailer from 'nodemailer';

// Configurazione Gmail con Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

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

interface WelcomeEmailData {
  hunterEmail: string;
  hunterName: string;
  reserveName: string;
}

interface AdminCreatedEmailData {
  adminEmail: string;
  adminName: string;
  reserveName: string;
  temporaryPassword: string;
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

      const mailOptions = {
        from: `"SeleApp" <${process.env.GMAIL_USER}>`,
        to: data.hunterEmail,
        subject: "✅ Prenotazione Confermata - SeleApp",
        html: `
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
              Per assistenza: <a href="mailto:seleapp.info@gmail.com">seleapp.info@gmail.com</a>
            </p>
          </div>
        `,
        text: `
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
          
          SeleApp - Per assistenza: seleapp.info@gmail.com
        `
      };

      await transporter.sendMail(mailOptions);
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

      const mailOptions = {
        from: `"SeleApp" <${process.env.GMAIL_USER}>`,
        to: data.hunterEmail,
        subject: "❌ Prenotazione Annullata - SeleApp",
        html: `
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
              Per assistenza: <a href="mailto:seleapp.info@gmail.com">seleapp.info@gmail.com</a>
            </p>
          </div>
        `,
        text: `
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
          
          SeleApp - Per assistenza: seleapp.info@gmail.com
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`Email di cancellazione prenotazione inviata a ${data.hunterEmail}`);
      return true;
    } catch (error) {
      console.error('Errore invio email cancellazione prenotazione:', error);
      return false;
    }
  }

  /**
   * Invia email di benvenuto per nuovo cacciatore registrato
   */
  static async sendHunterWelcome(data: WelcomeEmailData): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"SeleApp" <${process.env.GMAIL_USER}>`,
        to: data.hunterEmail,
        subject: "🎯 Benvenuto in SeleApp - Account Creato con Successo",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2d5016; text-align: center;">🦌 Benvenuto in SeleApp!</h2>
            
            <div style="background-color: #f8fdf4; border: 2px solid #4ade80; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #2d5016; margin-top: 0;">Account Creato con Successo</h3>
              <p><strong>Nome:</strong> ${data.hunterName}</p>
              <p><strong>Email:</strong> ${data.hunterEmail}</p>
              <p><strong>Riserva:</strong> ${data.reserveName}</p>
              <p style="color: #16a34a;"><strong>✅ Il tuo account è ora attivo e pronto all'uso!</strong></p>
            </div>

            <div style="background-color: #e0f2fe; border-left: 4px solid #0288d1; padding: 15px; margin: 20px 0;">
              <h4 style="color: #01579b; margin-top: 0;">🚀 Cosa puoi fare ora:</h4>
              <ul style="color: #01579b; margin: 0;">
                <li>Accedere al sistema con le tue credenziali</li>
                <li>Visualizzare le zone di caccia disponibili</li>
                <li>Prenotare le tue uscite di caccia</li>
                <li>Consultare le quote regionali in tempo reale</li>
                <li>Compilare i report post-caccia</li>
              </ul>
            </div>

            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <h4 style="color: #92400e; margin-top: 0;">📋 Informazioni Importanti:</h4>
              <ul style="color: #92400e; margin: 0;">
                <li>Conserva le tue credenziali di accesso in luogo sicuro</li>
                <li>Rispetta sempre i regolamenti di caccia della riserva</li>
                <li>Completa sempre i report dopo ogni uscita</li>
                <li>Per assistenza contatta: seleapp.info@gmail.com</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <p style="font-size: 18px; color: #2d5016;"><strong>Buona caccia e benvenuto nella famiglia SeleApp!</strong></p>
            </div>

            <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px;">
              Questa è una email automatica del sistema SeleApp<br>
              Per assistenza: <a href="mailto:seleapp.info@gmail.com">seleapp.info@gmail.com</a>
            </p>
          </div>
        `,
        text: `
          BENVENUTO IN SELEAPP - Account Creato con Successo
          
          Caro ${data.hunterName},
          
          Il tuo account SeleApp è stato creato con successo!
          
          DETTAGLI ACCOUNT:
          - Nome: ${data.hunterName}
          - Email: ${data.hunterEmail}
          - Riserva: ${data.reserveName}
          
          COSA PUOI FARE ORA:
          - Accedere al sistema con le tue credenziali
          - Visualizzare le zone di caccia disponibili
          - Prenotare le tue uscite di caccia
          - Consultare le quote regionali in tempo reale
          - Compilare i report post-caccia
          
          INFORMAZIONI IMPORTANTI:
          - Conserva le tue credenziali di accesso in luogo sicuro
          - Rispetta sempre i regolamenti di caccia della riserva
          - Completa sempre i report dopo ogni uscita
          - Per assistenza contatta: seleapp.info@gmail.com
          
          Buona caccia e benvenuto nella famiglia SeleApp!
          
          SeleApp - Per assistenza: seleapp.info@gmail.com
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`Email di benvenuto inviata a ${data.hunterEmail}`);
      return true;
    } catch (error) {
      console.error('Errore invio email benvenuto cacciatore:', error);
      return false;
    }
  }

  /**
   * Invia email di conferma per nuovo account amministratore
   */
  static async sendAdminCreated(data: AdminCreatedEmailData): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"SeleApp" <${process.env.GMAIL_USER}>`,
        to: data.adminEmail,
        subject: "🔑 Account Amministratore Creato - SeleApp",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #7c2d12; text-align: center;">🛡️ Account Amministratore Creato</h2>
            
            <div style="background-color: #fef7ff; border: 2px solid #a855f7; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #7c2d12; margin-top: 0;">Credenziali di Accesso</h3>
              <p><strong>Nome:</strong> ${data.adminName}</p>
              <p><strong>Email:</strong> ${data.adminEmail}</p>
              <p><strong>Riserva:</strong> ${data.reserveName}</p>
              <p><strong>Password Temporanea:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${data.temporaryPassword}</code></p>
            </div>

            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
              <h4 style="color: #dc2626; margin-top: 0;">🔒 Sicurezza - Azione Richiesta:</h4>
              <ul style="color: #dc2626; margin: 0;">
                <li><strong>Cambia immediatamente la password</strong> al primo accesso</li>
                <li>Non condividere mai le credenziali con terzi</li>
                <li>Usa una password forte (almeno 8 caratteri, maiuscole, numeri, simboli)</li>
                <li>Accedi solo da dispositivi sicuri e personali</li>
              </ul>
            </div>

            <div style="background-color: #e0f2fe; border-left: 4px solid #0288d1; padding: 15px; margin: 20px 0;">
              <h4 style="color: #01579b; margin-top: 0;">🛠️ Funzionalità Amministratore:</h4>
              <ul style="color: #01579b; margin: 0;">
                <li>Gestione cacciatori della riserva</li>
                <li>Controllo quote regionali</li>
                <li>Supervisione prenotazioni</li>
                <li>Gestione report di caccia</li>
                <li>Statistiche e monitoraggio attività</li>
              </ul>
            </div>

            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <h4 style="color: #92400e; margin-top: 0;">📞 Supporto Tecnico:</h4>
              <p style="color: #92400e; margin: 0;">
                Per qualsiasi problema tecnico o domande sul sistema, 
                contatta il supporto SeleApp: seleapp.info@gmail.com
              </p>
            </div>

            <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px;">
              Questa è una email automatica del sistema SeleApp<br>
              Per assistenza: <a href="mailto:seleapp.info@gmail.com">seleapp.info@gmail.com</a>
            </p>
          </div>
        `,
        text: `
          ACCOUNT AMMINISTRATORE CREATO - SeleApp
          
          Caro ${data.adminName},
          
          È stato creato un account amministratore SeleApp per te.
          
          CREDENZIALI DI ACCESSO:
          - Email: ${data.adminEmail}
          - Password Temporanea: ${data.temporaryPassword}
          - Riserva: ${data.reserveName}
          
          SICUREZZA - AZIONE RICHIESTA:
          - Cambia immediatamente la password al primo accesso
          - Non condividere mai le credenziali con terzi
          - Usa una password forte (almeno 8 caratteri, maiuscole, numeri, simboli)
          - Accedi solo da dispositivi sicuri e personali
          
          FUNZIONALITÀ AMMINISTRATORE:
          - Gestione cacciatori della riserva
          - Controllo quote regionali
          - Supervisione prenotazioni
          - Gestione report di caccia
          - Statistiche e monitoraggio attività
          
          SUPPORTO TECNICO:
          Per qualsiasi problema tecnico o domande sul sistema, 
          contatta il supporto SeleApp: seleapp.info@gmail.com
          
          SeleApp - Per assistenza: seleapp.info@gmail.com
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`Email account amministratore creato inviata a ${data.adminEmail}`);
      return true;
    } catch (error) {
      console.error('Errore invio email admin creato:', error);
      return false;
    }
  }

  /**
   * Invia email per richieste di contatto dal form della landing page
   */
  static async sendContactRequest(data: ContactRequestData): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"${data.firstName} ${data.lastName}" <${process.env.GMAIL_USER}>`,
        to: 'seleapp.info@gmail.com',
        replyTo: data.email,
        subject: `Nuova Richiesta di Informazioni - ${data.firstName} ${data.lastName}`,
        html: `
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
        `,
        text: `
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
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`Richiesta di contatto inviata da ${data.email}`);
      return true;
    } catch (error) {
      console.error('Errore invio richiesta di contatto:', error);
      return false;
    }
  }
}
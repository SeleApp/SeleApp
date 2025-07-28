// Script per importare i dati REALI dai PDF ufficiali
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

async function extractPDFData() {
  try {
    // Leggi il PDF del capriolo
    const pdfPath = path.join(__dirname, 'attached_assets', 'PdP capriolo 2025-2026 x CA_AFV_1753310379860.pdf');
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    
    console.log('PDF CAPRIOLO ESTRATTO:');
    console.log('====================');
    
    // Cerca la tabella dei dati
    const text = data.text;
    const lines = text.split('\n');
    
    let inTable = false;
    let comprensorio = '';
    let currentData = {};
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Trova l'inizio della tabella
      if (line.includes('PIANO ABBATTIMENTO CAPRIOLO 2025-2026')) {
        inTable = true;
        continue;
      }
      
      if (inTable) {
        // Se è un numero (N. comprensorio)
        if (/^[0-9]+$/.test(line)) {
          const numero = parseInt(line);
          // Il nome dovrebbe essere nelle righe successive
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            const nextLine = lines[j].trim();
            if (nextLine && !(/^[0-9]+$/.test(nextLine)) && nextLine.length > 2) {
              comprensorio = nextLine;
              console.log(`\nN.${numero} ${comprensorio}:`);
              break;
            }
          }
        }
        
        // Se è una riga di dati numerici (5 numeri separati)
        const numbers = line.split(/\s+/).filter(n => /^[0-9]+$/.test(n));
        if (numbers.length === 5) {
          const [m1, m2, f1ff, pm, pf] = numbers.map(n => parseInt(n));
          const total = m1 + m2 + f1ff + pm + pf;
          console.log(`  M1=${m1}, M2=${m2}, F1_FF=${f1ff}, PM=${pm}, PF=${pf} (TOT=${total})`);
          
          // SQL per inserimento
          if (comprensorio) {
            console.log(`  -- SQL: INSERT per ${comprensorio}`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Errore:', error);
  }
}

extractPDFData();
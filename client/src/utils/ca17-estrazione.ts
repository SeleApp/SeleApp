// Sistema di estrazione CA17 per riserva di Pederobba
// Implementa le priorità specifiche del regolamento CA17

export interface UtenteCA17 {
  id: number;
  firstName: string;
  lastName: string;
  isSelezionatore?: boolean;
  isEsperto?: boolean;
  partecipatoCensimenti?: boolean;
  isOspite?: boolean;
  accompagnato?: boolean;
  role: string;
}

/**
 * Genera lista estrazione con priorità CA17:
 * - Priorità 21: Selezionatori + Esperti + Partecipato censimenti
 * - Priorità 22: Selezionatori O Cacciatori normali (esclusi priorità 21)
 * - Priorità 23: Ospiti
 */
export function generaListaEstrazione(partecipanti: UtenteCA17[]): UtenteCA17[] {
  // Priorità 21: Selezionatori + Esperti + Partecipato censimenti
  const priorita21 = partecipanti.filter(u => 
    u.isSelezionatore && u.isEsperto && u.partecipatoCensimenti
  );
  
  // Priorità 22: Selezionatori O Cacciatori normali (esclusi quelli già in priorità 21)
  const priorita22 = partecipanti.filter(u => 
    (u.isSelezionatore || u.role === "HUNTER") && !priorita21.includes(u)
  );
  
  // Priorità 23: Ospiti
  const priorita23 = partecipanti.filter(u => u.isOspite);

  // Funzione per mescolare array (Fisher-Yates shuffle)
  const mescola = <T>(arr: T[]): T[] => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Restituisce lista ordinata per priorità con mescolamento interno
  return [
    ...mescola(priorita21),
    ...mescola(priorita22), 
    ...mescola(priorita23)
  ];
}

/**
 * Verifica se un utente ha diritto a una priorità specifica
 */
export function verificaPriorita(utente: UtenteCA17): 21 | 22 | 23 | null {
  if (utente.isSelezionatore && utente.isEsperto && utente.partecipatoCensimenti) {
    return 21;
  }
  if (utente.isSelezionatore || utente.role === "HUNTER") {
    return 22;
  }
  if (utente.isOspite) {
    return 23;
  }
  return null;
}

/**
 * Conta partecipanti per ogni priorità
 */
export function contaPriorita(partecipanti: UtenteCA17[]) {
  return {
    priorita21: partecipanti.filter(u => verificaPriorita(u) === 21).length,
    priorita22: partecipanti.filter(u => verificaPriorita(u) === 22).length,
    priorita23: partecipanti.filter(u => verificaPriorita(u) === 23).length,
    totale: partecipanti.length
  };
}
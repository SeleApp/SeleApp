# Test Sistema "Zone & gruppi"

## Riserva di Test
Creare una riserva con le seguenti caratteristiche:
- Nome: "Riserva Test Gruppi"
- Comune: "Test"
- Email: test@test.com
- Specie: ["Capriolo", "Cervo"]
- **Management Type: zones_groups**

## Cacciatori di Test
Registrare cacciatori con gruppi diversi:
- Cacciatore Gruppo A
- Cacciatore Gruppo B  
- Cacciatore Gruppo C
- Cacciatore Gruppo D

## Quote per Gruppo
Il sistema dovrebbe creare automaticamente:
- 4 gruppi (A, B, C, D)
- Quote per Capriolo: M0, F0, FA, M1, MA (per ogni gruppo)
- Quote per Cervo: CL0, FF, MM, MCL1 (per ogni gruppo)
- Totale: 36 quote (9 categorie × 4 gruppi)

## Test Dashboard
- Admin vede tutte le quote per tutti i gruppi
- Cacciatore vede solo le quote del proprio gruppo
- Zone rimangono globali (accessibili a tutti)

## Workflow Test
1. SuperAdmin crea riserva "zones_groups"
2. Admin registra cacciatori con gruppi specifici
3. Admin gestisce quote per gruppo
4. Cacciatori vedono solo le loro quote
5. Prenotazioni zone funzionano per tutti i gruppi
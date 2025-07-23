import re
import sys

# Leggi il file di testo estratto dal PDF
with open('capriolo_clean.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern per trovare i comprensori e i loro dati
lines = content.split('\n')
comprensori = []
current_data = {}

i = 0
while i < len(lines):
    line = lines[i].strip()
    
    # Cerca numero del comprensorio
    if re.match(r'^\d+$', line):
        num = int(line)
        # Cerca il nome nelle righe successive
        for j in range(i+1, min(i+10, len(lines))):
            next_line = lines[j].strip()
            if next_line and not re.match(r'^\d+$', next_line) and len(next_line) > 2:
                name = next_line
                # Cerca i dati numerici nelle righe successive
                for k in range(j+1, min(j+20, len(lines))):
                    data_line = lines[k].strip()
                    numbers = re.findall(r'\b\d+\b', data_line)
                    if len(numbers) >= 5:
                        m1, m2, f1ff, pm, pf = map(int, numbers[:5])
                        total = m1 + m2 + f1ff + pm + pf
                        print(f"N.{num:2d} {name:25s}: M1={m1:2d}, M2={m2:2d}, F1_FF={f1ff:2d}, PM={pm:2d}, PF={pf:2d} (TOT={total:2d})")
                        
                        # Mappa ai codici CA TV
                        ca_code = f"ca-tv{num:02d}" if num < 32 else f"ca-tv{num}"
                        if num == 28:
                            ca_code = "cison-valmarino"
                        
                        print(f"  --> {ca_code}")
                        break
                break
        i = j + 10
    else:
        i += 1


import re

file_path = r'lib\technical-specs.ts'

print("Leyendo archivo...")
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total líneas: {len(lines)}")

# Encontrar el objeto 00559 (línea 82707, índice 82706)
start_line = 82706  # "00559": {
end_line = None

# Buscar el cierre del objeto 00559
brace_count = 0
for i in range(start_line, min(start_line + 2000, len(lines))):
    line = lines[i]
    if '{' in line:
        brace_count += line.count('{')
    if '}' in line:
        brace_count -= line.count('}')
    
    if i > start_line and brace_count == 0:
        end_line = i
        break

if end_line:
    print(f "Objeto 00559: líneas {start_line+1} a {end_line+1}")
   
    # Corregir indentación: quitar un nivel de tabs (8 espacios) de las líneas 82709 en adelante
    for i in range(82708, end_line):  # Desde línea 82709 (índice 82708)
        line = lines[i]
        # Si la línea empieza con espacios/tabs, quitar 8 espacios o 1 tab
        if line.startswith('                        '):  # 24 espacios
            lines[i] = line[8:]  # Quitar 8 espacios
        elif line.startswith('\t\t\t'):  # 3 tabs
            lines[i] = line[1:]  # Quitar 1 tab
    
    print(f"Corrigiendo indentación de {end_line - 82708} líneas...")
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    
    print("✓ Indentación corregida")
else:
    print("ERROR: No se encontró el cierre del objeto 00559")

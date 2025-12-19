#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script definitivo para corregir TODA la estructura desde línea 83180 en adelante
"""

file_path = r'lib\technical-specs.ts'

print("=" * 70)
print("CORRECCIÓN DEFINITIVA DE ESTRUCTURA - TECHNICAL-SPECS.TS")
print("=" * 70)

# Leer archivo
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Encontrar donde empieza el problema (después del objeto 00540)
# La línea 83180 tiene el cierre correcto del objeto 00540
# Necesitamos reemplazar todo lo que sigue hasta el final

# Buscar el patrón "00540" para encontrar donde termina correctamente
import re

# Encontrar el último objeto bien formado antes del problema
match_540 = re.search(r'"00540":\s*\{[^}]*?"defects":\s*\[[^\]]*?\]\s*\}', content, re.DOTALL)

if not match_540:
    print("ERROR: No se encontró el objeto 00540")
    exit(1)

# La posición donde termina 00540
end_540_pos = match_540.end()

print(f"✓ Objeto 00540 encontrado, termina en posición: {end_540_pos}")

# Buscar el cierre final correcto (}; al final del archivo)
final_close = content.rfind('};')
if final_close == -1:
    print("ERROR: No se encontró el cierre final }; del archivo")
    exit(1)

print(f"✓ Cierre final }; encontrado en posición: {final_close}")

# Extraer todo entre el final de 00540 y el cierre final
problem_section = content[end_540_pos:final_close]

print(f"✓ Sección problemática tiene {len(problem_section)} caracteres")
print(f"✓ Número de líneas problemáticas: {problem_section.count(chr(10))}")

# Limpiar la sección problemática:
# 1. Eliminar cierres incorrectos y comas sueltas
# 2. Normalizar indentación

lines_problem = problem_section.split('\n')
cleaned_lines = []
skip_next = False

for i, line in enumerate(lines_problem):
    stripped = line.strip()
    
    # Saltar líneas problemáticas
    if stripped == '};' and i < len(lines_problem) - 10:  # No es el cierre final
        print(f"  - Eliminando cierre incorrecto: línea {i}")
        continue
    if stripped == '}' and len(stripped) == 1 and i > 0 and lines_problem[i-1].strip() == '};':
        print(f"  - Eliminando } extra: línea {i}")
        continue
    if stripped == ',' and len(stripped) == 1:  # Coma suelta
        print(f"  - Eliminando coma suelta: línea {i}")
        continue
    if stripped == '':
        cleaned_lines.append('')
        continue
    
    # Normalizar indentación
    if stripped.startswith('"'):  # Es una propiedad o clave de objeto
        if stripped.startswith('"00'):  # Es un código de producto
            cleaned_lines.append('        ' + stripped)
        elif stripped.startswith('"code"') or stripped.startswith('"description"') or \
             stripped.startswith('"client"') or stripped.startswith('"brand"') or \
             stripped.startswith('"destination"') or stripped.startswith('"version"') or \
             stripped.startswith('"productType"') or stripped.startswith('"freezingMethod"') or \
             stripped.startswith('"certification"') or stripped.startswith('"color"') or \
             stripped.startswith('"packing"') or stripped.startswith('"preservative"') or \
             stripped.startswith('"glazingRatio"') or stripped.startswith('"glazingUnit"') or \
             stripped.startswith('"overweightPct"') or stripped.startswith('"netWeightUnit"') or \
             stripped.startswith('"netWeight"') or stripped.startswith('"grossWeightUnit"') or \
             stripped.startswith('"grossWeight"') or stripped.startswith('"grossWeightMastersUnit"') or \
             stripped.startswith('"grossWeightMasters"') or stripped.startswith('"sizes"') or \
             stripped.startswith('"defects"'):
            # Propiedad de nivel 1
            cleaned_lines.append('                ' + stripped)
        elif stripped.startswith('"sizeMp"') or stripped.startswith('"countMp"') or \
             stripped.startswith('"countFinal"') or stripped.startswith('"sizeMarked"') or \
             stripped.startswith('"uniformity"') or stripped.startswith('"defect"') or \
             stripped.startswith('"limit"'):
            # Propiedad dentro de array (nivel 2)
            cleaned_lines.append('                                ' + stripped)
        else:
            # Otros casos, mantener indentación mínima
            cleaned_lines.append('                ' + stripped)
    elif stripped.startswith('{'):
        # Apertura de objeto
        # Si es inicio de item en array, usar 16 espacios
        if i > 0 and ('"sizes"' in lines_problem[i-1] or '"defects"' in lines_problem[i-1] or \
                     lines_problem[i-1].strip() in ['{', '[']):
            cleaned_lines.append('                        ' + stripped)
        else:
            cleaned_lines.append('        ' + stripped)
    elif stripped.startswith('['):
        # Apertura de array - mismo nivel que la propiedad
        cleaned_lines.append('        ' + stripped)
    elif stripped.startswith(']'):
        # Cierre de array
        cleaned_lines.append('                ' + stripped)
    elif stripped.startswith('}'):
        # Cierre de objeto
        # Determinar nivel basado en contexto
        if i > 0 and '"limit"' in lines_problem[i-1]:
            # Cierre de objeto en array
            cleaned_lines.append('                        ' + stripped)
        else:
            # Cierre de objeto principal
            cleaned_lines.append('        ' + stripped)
    else:
        # Mantener la línea con indentación mínima
        cleaned_lines.append('        ' + stripped)

# Reconstruir el contenido
new_problem_section = '\n'.join(cleaned_lines)

# Reconstruir el archivo completo
new_content = content[:end_540_pos] + new_problem_section + '\n};\n'

# Guardar
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("\n" + "=" * 70)
print("CORRECCIÓN COMPLETADA")
print("=" * 70)
print(f"✓ Archivo corregido y guardado")
print(f"✓ Tamaño original: {len(content)} bytes")
print(f"✓ Tamaño nuevo: {len(new_content)} bytes")

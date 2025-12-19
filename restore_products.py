#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extraer productos 520-554 del commit anterior y agregarlos al archivo actual
"""
import re

old_file = r'temp_old_specs.ts'
current_file = r'lib\technical-specs.ts'

print("=" * 70)
print("RESTAURANDO PRODUCTOS 520-554")
print("=" * 70)

# Leer archivo antiguo
print("\n1. Leyendo archivo del commit 13147bc...")
with open(old_file, 'r', encoding='utf-8') as f:
    old_content = f.read()

# Extraer cada producto
codes = [
    '00520', '00522', '00525', '00528', '00529', '00530', '00531', '00532', '00533',
    '00537', '00540', '00541', '00542', '00543', '00545', '00546', '00551', '00552',
    '00553', '00554'
]

extracted_objects = []

print("2. Extrayendo productos...")
for code in codes:
    # Patrón para extraer el objeto completo
    pattern = rf'"{code}":\s*\{{.*?"defects":\s*\[.*?\]\s*\}}'
    match = re.search(pattern, old_content, re.DOTALL)
    
    if match:
        obj = match.group(0)
        extracted_objects.append(f"        {obj}")
        print(f"   ✓ {code} extraído ({len(obj)} chars)")
    else:
        print(f"   ✗ {code} NO ENCONTRADO")

if len(extracted_objects) == 0:
    print("\nERROR: No se pudo extraer ningún producto")
    exit(1)

print(f"\n3. Total productos extraídos: {len(extracted_objects)}")

# Leer archivo actual
print("4. Leyendo archivo actual...")
with open(current_file, 'r', encoding='utf-8') as f:
    current_lines = f.readlines()

print(f"   Líneas actuales: {len(current_lines)}")

# Encontrar donde insertar (antes del };)
insert_pos = None
for i in range(len(current_lines) - 1, -1, -1):
    if current_lines[i].strip() == '};':
        insert_pos = i
        break

if insert_pos is None:
    print("ERROR: No se encontró el cierre }; en el archivo")
    exit(1)

print(f"5. Insertando productos en línea {insert_pos + 1}...")

# Insertar los objetos
new_lines = current_lines[:insert_pos]

# Agregar coma al último objeto existente si no la tiene
if new_lines and new_lines[-1].strip() == '}':
    new_lines[-1] = new_lines[-1].rstrip() + ',\r\n'
elif new_lines and new_lines[-2].strip() == '}':
    new_lines[-2] = new_lines[-2].rstrip().rstrip(',') + ',\r\n'

# Agregar los productos extraídos
for obj in extracted_objects:
    new_lines.append(obj + ',\r\n')

# Quitar la coma del último producto
new_lines[-1] = new_lines[-1].rstrip(',\r\n') + '\r\n'

# Agregar el cierre
new_lines.extend(current_lines[insert_pos:])

# Guardar
print("6. Guardando archivo...")
with open(current_file, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"   Nuevas líneas totales: {len(new_lines)}")
print("\n" + "=" * 70)
print("✓ PRODUCTOS RESTAURADOS EXITOSAMENTE")
print("=" * 70)

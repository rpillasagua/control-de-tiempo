#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Corregir tipos inconsistentes en product-data.ts
Usar technical-specs.ts como fuente de verdad
"""
import re

specs_file = r'lib\technical-specs.ts'
data_file = r'lib\product-data.ts'

print("=" * 80)
print("CORRECCIÓN DE TIPOS INCONSISTENTES")
print("=" * 80)

# Leer archivos
with open(specs_file, 'r', encoding='utf-8') as f:
    specs_content = f.read()

with open(data_file, 'r', encoding='utf-8') as f:
    data_content = f.read()

# Lista de productos con tipos inconsistentes (del análisis)
inconsistent_codes = [
    '00016', '00028', '00099', '00116', '00143', '00147', '00149', '00162',
    '00184', '00195', '00196', '00203', '00205', '00249', '00252', '00276',
    '00283', '00355', '00377', '00398', '00401', '00410', '00439', '00449',
    '00469', '00476', '00500'
]

print(f"\n1. Procesando {len(inconsistent_codes)} productos con tipos inconsistentes...")

corrections_made = []
not_found = []

for code in inconsistent_codes:
    # Buscar tipo en specs
    specs_match = re.search(rf'"{code}":\s*\{{[^}}]*?"productType":\s*"([^"]+)"', specs_content, re.DOTALL)
    
    if not specs_match:
        not_found.append((code, 'specs'))
        print(f"   WARN: {code} no encontrado en specs")
        continue
    
    correct_type = specs_match.group(1)
    
    # Buscar y reemplazar en data
    # Patrón: '00XXX': { ... type: 'XXXX' ...
    data_pattern = rf"('{code}':\s*\{{[^}}]*?type:\s*)'([^']+)'"
    data_match = re.search(data_pattern, data_content, re.DOTALL)
    
    if not data_match:
        not_found.append((code, 'data'))
        print(f"   WARN: {code} no encontrado en data")
        continue
    
    current_type = data_match.group(2)
    
    if current_type != correct_type:
        # Reemplazar
        replacement = rf"\1'{correct_type}'"
        data_content = re.sub(data_pattern, replacement, data_content, count=1)
        corrections_made.append((code, current_type, correct_type))
        print(f"   ✓ {code}: {current_type} → {correct_type}")
    else:
        print(f"   - {code}: Ya correcto ({current_type})")

print(f"\n2. Guardando cambios...")

if corrections_made:
    with open(data_file, 'w', encoding='utf-8') as f:
        f.write(data_content)
    print(f"   ✓ Archivo actualizado")
else:
    print(f"   - No se realizaron cambios")

print("\n" + "=" * 80)
print("RESUMEN")
print("=" * 80)
print(f"Total procesados: {len(inconsistent_codes)}")
print(f"Correcciones realizadas: {len(corrections_made)}")
print(f"No encontrados: {len(not_found)}")

if corrections_made:
    print("\nCORRECCIONES:")
    for code, old, new in corrections_made:
        print(f"  {code}: {old} → {new}")

if not_found:
    print("\nNO ENCONTRADOS:")
    for code, where in not_found:
        print(f"  {code} en {where}")

print("\n" + "=" * 80)

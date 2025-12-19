#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PARTE 4: Verificación de consistencia entre archivos
"""
import re

specs_file = r'lib\technical-specs.ts'
data_file = r'lib\product-data.ts'

print("=" * 80)
print("ANÁLISIS PARTE 4: CONSISTENCIA ENTRE ARCHIVOS")
print("=" * 80)

errors = []
warnings = []

# Leer ambos archivos
with open(specs_file, 'r', encoding='utf-8') as f:
    specs_content = f.read()

with open(data_file, 'r', encoding='utf-8') as f:
    data_content = f.read()

# Extraer códigos de ambos archivos
print("\n1. Extrayendo códigos de ambos archivos...")
specs_codes = set(re.findall(r'"([0-9]{5})":\s*\{', specs_content))
data_codes = set(re.findall(r"'([0-9]{5})':\s*\{", data_content))

print(f"   Códigos en technical-specs.ts: {len(specs_codes)}")
print(f"   Códigos en product-data.ts: {len(data_codes)}")

# Verificar 1: Códigos en specs pero no en data
missing_in_data = specs_codes - data_codes
if missing_in_data:
    errors.append(f"Códigos en specs pero NO en data: {len(missing_in_data)}")
    print(f"\n   ERROR: {len(missing_in_data)} códigos en specs NO están en data:")
    for code in sorted(missing_in_data)[:10]:
        print(f"     - {code}")
else:
    print("   OK: Todos los códigos de specs están en data")

# Verificar 2: Códigos en data pero no en specs
missing_in_specs = data_codes - specs_codes
if missing_in_specs:
    warnings.append(f"Códigos en data pero NO en specs: {len(missing_in_specs)}")
    print(f"\n   WARN: {len(missing_in_specs)} códigos en data NO tienen specs:")
    for code in sorted(missing_in_specs)[:10]:
        print(f"     - {code}")
else:
    print("   OK: Todos los códigos de data tienen specs")

# Verificar 3: Consistencia de productType
print("\n2. Verificando consistencia de productType...")
inconsistencies = []

# Para cada código en ambos archivos
common_codes = specs_codes & data_codes
sample_codes = list(common_codes)[:50]  # Verificar muestra

for code in sample_codes:
    # Extraer productType de specs
    specs_match = re.search(rf'"{code}":\s*\{{[^}}]*?"productType":\s*"([^"]+)"', specs_content, re.DOTALL)
    # Extraer type de data
    data_match = re.search(rf"'{code}':\s*\{{[^}}]*?type:\s*'([^']+)'", data_content, re.DOTALL)
    
    if specs_match and data_match:
        specs_type = specs_match.group(1)
        data_type = data_match.group(1)
        
        if specs_type != data_type:
            inconsistencies.append((code, specs_type, data_type))

if inconsistencies:
    errors.append(f"Tipos inconsistentes: {len(inconsistencies)}")
    print(f"   ERROR: {len(inconsistencies)} códigos con tipos diferentes:")
    for code, st, dt in inconsistencies[:5]:
        print(f"     {code}: specs='{st}' vs data='{dt}'")
else:
    print(f"   OK: Tipos consistentes (verificados {len(sample_codes)} códigos)")

# Verificar 4: Productos 520-554 en ambos archivos
print("\n3. Verificando productos 520-554 en ambos archivos...")
target_codes = [
    '00520', '00522', '00525', '00528', '00529', '00530', '00531', '00532', '00533',
    '00537', '00540', '00541', '00542', '00543', '00545', '00546', '00551', '00552',
    '00553', '00554'
]

missing_520_554 = []
for code in target_codes:
    in_specs = code in specs_codes
    in_data = code in data_codes
    
    if not in_specs or not in_data:
        missing_520_554.append((code, in_specs, in_data))

if missing_520_554:
    errors.append(f"Productos 520-554 incompletos: {len(missing_520_554)}")
    print(f"   ERROR: {len(missing_520_554)} productos 520-554 faltantes:")
    for code, in_s, in_d in missing_520_554:
        print(f"     {code}: specs={in_s}, data={in_d}")
else:
    print(f"   OK: Todos los 20 productos 520-554 en ambos archivos")

print("\n" + "=" * 80)
print("RESUMEN PARTE 4")
print("=" * 80)
print(f"Códigos comunes: {len(common_codes)}")
print(f"Solo en specs: {len(missing_in_data)}")
print(f"Solo en data: {len(missing_in_specs)}")
print(f"Types inconsistentes: {len(inconsistencies)}")
print(f"Errores críticos: {len(errors)}")
print(f"Advertencias: {len(warnings)}")

if errors:
    print("\nERRORES:")
    for i, error in enumerate(errors, 1):
        print(f"  {i}. {error}")

# Guardar reporte
with open('analisis_parte4.txt', 'w', encoding='utf-8') as f:
    f.write("ANÁLISIS PARTE 4: CONSISTENCIA\n")
    f.write("=" * 80 + "\n\n")
    f.write(f"Códigos en specs: {len(specs_codes)}\n")
    f.write(f"Códigos en data: {len(data_codes)}\n")
    f.write(f"Códigos comunes: {len(common_codes)}\n")
    f.write(f"Solo en specs: {len(missing_in_data)}\n")
    f.write(f"Solo en data: {len(missing_in_specs)}\n\n")
    
    if missing_in_data:
        f.write("CÓDIGOS SOLO EN SPECS:\n")
        for code in sorted(missing_in_data):
            f.write(f"  - {code}\n")
    
    if missing_in_specs:
        f.write("\nCÓDIGOS SOLO EN DATA:\n")
        for code in sorted(missing_in_specs):
            f.write(f"  - {code}\n")
    
    if inconsistencies:
        f.write("\nTIPOS INCONSISTENTES:\n")
        for code, st, dt in inconsistencies:
            f.write(f"  - {code}: specs={st}, data={dt}\n")

print("\n✓ Reporte guardado en analisis_parte4.txt")
print("\n" + "=" * 80)

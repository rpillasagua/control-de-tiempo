#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Identificar qué falta y qué información se necesita
"""
import re

specs_file = r'lib\technical-specs.ts'
data_file = r'lib\product-data.ts'

print("=" * 80)
print("RESUMEN DE LO QUE FALTA")
print("=" * 80)

# Leer archivos
with open(specs_file, 'r', encoding='utf-8') as f:
    specs_content = f.read()

with open(data_file, 'r', encoding='utf-8') as f:
    data_content = f.read()

# Extraer códigos
specs_codes = set(re.findall(r'"([0-9]{5})":\s*\{', specs_content))
data_codes = set(re.findall(r"'([0-9]{5})':\s*\{", data_content))

# Códigos faltantes
missing_in_data = sorted(specs_codes - data_codes)
missing_in_specs = sorted(data_codes - specs_codes)

print(f"\n1. CODIGOS SOLO EN TECHNICAL-SPECS (necesitan agregarse a product-data):")
print(f"   Total: {len(missing_in_data)}\n")
for code in missing_in_data:
    # Buscar info
    match = re.search(rf'"{code}":\s*\{{[^}}]*?"client":\s*"([^"]*)"', specs_content, re.DOTALL)
    if match:
        client = match.group(1)[:40]
        print(f"   {code}: {client}... [INFO DISPONIBLE]")
    else:
        print(f"   {code}: [NO ENCONTRADO]")

print(f"\n2. CODIGOS SOLO EN PRODUCT-DATA (necesitan specs completas):")
print(f"   Total: {len(missing_in_specs)}\n")
for code in missing_in_specs:
    match = re.search(rf"'{code}':\s*\{{[^}}]*?client:\s*'([^']*)'", data_content)
    if match:
        client = match.group(1)[:40]
        print(f"   {code}: {client}... [NECESITA FICHA PDF]")
    else:
        print(f"   {code}: [NO ENCONTRADO]")

# Glazing extremos
print(f"\n3. GLAZING RATIOS EXTREMOS (valores > 100):\n")
glazing_pattern = r'"([0-9]{5})":[^}}]*?"glazingRatio":\s*([0-9.]+)'
all_glazing = re.findall(glazing_pattern, specs_content, re.DOTALL)
extremos = [(code, float(val)) for code, val in all_glazing if float(val) > 100]

if extremos:
    extremos.sort(key=lambda x: x[1], reverse=True)
    for code, val in extremos[:10]:
        print(f"   {code}: {val}")
else:
    print("   Ninguno encontrado")

print("\n" + "=" * 80)
print("ACCIONES POSIBLES SIN INFORMACION ADICIONAL")
print("=" * 80)

print(f"\n1. Puedo agregar {len(missing_in_data)} productos a product-data.ts")
print("   (Informacion ya disponible en technical-specs.ts)")

print(f"\n2. Para los {len(missing_in_specs)} productos faltantes en specs:")
print("   NECESITO: Fichas tecnicas PDF o informacion completa de:")
for code in missing_in_specs:
    print(f"   - {code}")

print(f"\n3. Para glazing ratios ({len(extremos)} extremos):")
print("   NECESITO: Confirmar si los valores son correctos")
print("   Proporciona las fichas o confirma que deben mantenerse")

print("\n" + "=" * 80)

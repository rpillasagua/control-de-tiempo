#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
REPORTE CONSOLIDADO - Todas las partes
"""
import re

file_path = r'lib\technical-specs.ts'

# Abrir archivo de reporte
report = open('reporte_analisis_completo.txt', 'w', encoding='utf-8')

def log(msg):
    report.write(msg + '\n')
    print(msg)

log("=" * 80)
log("REPORTE CONSOLIDADO - ANÁLISIS PROFUNDO")
log("=" * 80)

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# === PARTE 1: ESTRUCTURA ===
log("\n### PARTE 1: ESTRUCTURA Y SINTAXIS ###\n")

open_braces = content.count('{')
close_braces = content.count('}')
open_brackets = content.count('[')
close_brackets = content.count(']')

log(f"Llaves: {open_braces} {{ vs {close_braces} }}")
log(f"Corchetes: {open_brackets} [ vs {close_brackets} ]")

if open_braces == close_braces:
    log("OK: Llaves balanceadas")
else:
    log(f"ERROR: Llaves desbalanceadas ({abs(open_braces - close_braces)} diferencia)")

if open_brackets == close_brackets:
    log("OK: Corchetes balanceados")
else:
    log(f"ERROR: Corchetes desbalanceados ({abs(open_brackets - close_brackets)} diferencia)")

# Códigos
code_pattern = r'"([0-9]{5})":\s*\{'
all_codes = re.findall(code_pattern, content)
unique_codes = set(all_codes)
log(f"\nCódigos totales: {len(all_codes)}")
log(f"Códigos únicos: {len(unique_codes)}")

# Duplicados
duplicates = {c: all_codes.count(c) for c in unique_codes if all_codes.count(c) > 1}
if duplicates:
    log(f"ERROR: {len(duplicates)} códigos duplicados:")
    for code, count in duplicates.items():
        log(f"  - {code}: {count} veces")
else:
    log("OK: Sin duplicados")

# === PARTE 2: PRODUCTOS 520-554 ===
log("\n### PARTE 2: PRODUCTOS 520-554 ###\n")

target_codes = [
    '00520', '00522', '00525', '00528', '00529', '00530', '00531', '00532', '00533',
    '00537', '00540', '00541', '00542', '00543', '00545', '00546', '00551', '00552',
    '00553', '00554'
]

missing = []
for code in target_codes:
    if code not in all_codes:
        missing.append(code)

if missing:
    log(f"ERROR: {len(missing)} productos faltantes:")
    for code in missing:
        log(f"  - {code}")
else:
    log("OK: Todos los 20 productos presentes")

# === PARTE 3: TIPOS Y VALORES ==
log("\n### PARTE 3: TIPOS Y VALORES ###\n")

# productType
product_types = re.findall(r'"productType":\s*"([^"]+)"', content)
valid_types = ['ENTERO', 'COLA', 'VALOR_AGREGADO', 'REMUESTREO']
invalid_types = [pt for pt in product_types if pt not in valid_types]

if invalid_types:
    unique_invalid = set(invalid_types)
    log(f"ERROR: {len(invalid_types)} productType invalidos encontrados:")
    for inv_type in unique_invalid:
        count = invalid_types.count(inv_type)
        log(f"  - '{inv_type}': {count} veces")
else:
    log("OK: Todos los productType son validos")

# Unidades de peso
weight_units = re.findall(r'"(?:net|gross|grossMasters)WeightUnit":\s*"([^"]+)"', content)
valid_units = ['KG', 'LB', 'kg', 'lb']
invalid_units = [u for u in weight_units if u not in valid_units]

if invalid_units:
    log(f"ERROR: {len(invalid_units)} unidades de peso invalidas:")
    for unit in set(invalid_units):
        log(f"  - '{unit}': {invalid_units.count(unit)} veces")
else:
    log(f"OK: Todas las {len(weight_units)} unidades de peso son validas")

# === RESUMEN FINAL ===
log("\n" + "=" * 80)
log("RESUMEN FINAL")
log("=" * 80)

total_errors = 0
if open_braces != close_braces:
    total_errors += 1
if open_brackets != close_brackets:
    total_errors += 1
if duplicates:
    total_errors += len(duplicates)
if missing:
    total_errors += len(missing)
if invalid_types:
    total_errors += 1
if invalid_units:
    total_errors += 1

log(f"\nTotal errores criticos detectados: {total_errors}")

if total_errors == 0:
    log("\nESTADO: ARCHIVO VALIDO - Sin errores criticos detectados")
else:
    log("\nESTADO: ERRORES DETECTADOS - Requiere correccion")

log("\n" + "=" * 80)

report.close()
print("\nReporte completo guardado en: reporte_analisis_completo.txt")

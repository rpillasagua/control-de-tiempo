#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PARTE 6: Verificación de arrays de defectos y tallas
"""
import re
import json

file_path = r'lib\technical-specs.ts'

print("=" * 80)
print("ANÁLISIS PARTE 6: DEFECTOS Y TALLAS")
print("=" * 80)

errors = []
warnings = []

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Extraer todos los códigos
code_pattern = r'"([0-9]{5})":\s*\{([^}]*?)"defects":\s*\[.*?\]\s*\}'
all_products = re.finditer(code_pattern, content, re.DOTALL)

print("\n1. Analizando arrays de defectos y tallas...")

products_no_sizes = []
products_no_defects = []
products_empty_sizes = []
products_empty_defects = []

# Analizar primeros 100 productos
count = 0
for match in all_products:
    if count >= 100:
        break
    
    code = match.group(1)
    obj_content = match.group(0)
    
    # Verificar si tiene sizes
    if '"sizes":' not in obj_content:
        products_no_sizes.append(code)
    else:
        # Verificar si sizes está vacío
        sizes_match = re.search(r'"sizes":\s*\[(.*?)\]', obj_content, re.DOTALL)
        if sizes_match:
            sizes_content = sizes_match.group(1).strip()
            if not sizes_content or sizes_content == '':
                products_empty_sizes.append(code)
    
    # Verificar si tiene defects
    if '"defects":' not in obj_content:
        products_no_defects.append(code)
    else:
        # Verificar si defects está vacío
        defects_match = re.search(r'"defects":\s*\[(.*?)\]', obj_content, re.DOTALL)
        if defects_match:
            defects_content = defects_match.group(1).strip()
            if not defects_content or defects_content == '':
                products_empty_defects.append(code)
    
    count += 1

if products_no_sizes:
    errors.append(f"Productos sin 'sizes': {len(products_no_sizes)}")
    print(f"   ERROR: {len(products_no_sizes)} productos SIN array 'sizes'")
    for code in products_no_sizes[:5]:
        print(f"     - {code}")

if products_empty_sizes:
    warnings.append(f"Productos con sizes vacío: {len(products_empty_sizes)}")
    print(f"   WARN: {len(products_empty_sizes)} productos con 'sizes' vacío")

if products_no_defects:
    errors.append(f"Productos sin 'defects': {len(products_no_defects)}")
    print(f"   ERROR: {len(products_no_defects)} productos SIN array 'defects'")

if products_empty_defects:
    warnings.append(f"Productos con defects vacío: {len(products_empty_defects)}")
    print(f"   WARN: {len(products_empty_defects)} productos con 'defects' vacío")

if not (products_no_sizes or products_empty_sizes or products_no_defects or products_empty_defects):
    print(f"   OK: {count} productos analizados, todos tienen sizes y defects")

# Verificar 2: Límites de defectos vacíos o null
print("\n2. Verificando límites de defectos...")
defect_limits = re.findall(r'"defect":\s*"([^"]+)",\s*"limit":\s*"([^"]*)"', content)

empty_limits = [(defect, limit) for defect, limit in defect_limits if not limit or limit.strip() == '']
if empty_limits:
    warnings.append(f"Límites vacíos: {len(empty_limits)}")
    print(f"   WARN: {len(empty_limits)} defectos con límite vacío")
    for defect, _ in set(empty_limits[:5]):
        print(f"     - {defect}")
else:
    print(f"   OK: Todos los {len(defect_limits)} límites tienen valor")

# Verificar 3: Tallas sin uniformidad
print("\n3. Verificando uniformidad en tallas...")
sizes_pattern = r'\{\s*"sizeMp":\s*"[^"]+",\s*"countMp":\s*"[^"]+",\s*"countFinal":\s*"[^"]+",\s*"sizeMarked":\s*"[^"]+",\s*"uniformity":\s*(null|[0-9.]+)\s*\}'
all_sizes = re.findall(sizes_pattern, content)

null_uniformities = [u for u in all_sizes if u == 'null']
if null_uniformities:
    warnings.append(f"Tallas sin uniformidad: {len(null_uniformities)}")
    print(f"   WARN: {len(null_uniformities)} tallas con uniformidad null")
else:
    print(f"   OK: {len(all_sizes)} tallas verificadas, todas con uniformidad")

# Verificar 4: Productos 520-554 específicamente
print("\n4. Verificación específica productos 520-554...")
target_codes = [
    '00520', '00522', '00525', '00528', '00529', '00530', '00531', '00532', '00533',
    '00537', '00540', '00541', '00542', '00543', '00545', '00546', '00551', '00552',
    '00553', '00554'
]

issues_520_554 = []
for code in target_codes:
    # Buscar el producto
    product_match = re.search(rf'"{code}":\s*\{{([^}}]*?)"defects":\s*\[.*?\]\s*\}}', content, re.DOTALL)
    
    if not product_match:
        issues_520_554.append(f"{code}: NO ENCONTRADO")
        continue
    
    obj_content = product_match.group(0)
    
    # Verificar componentes
    has_sizes = '"sizes":' in obj_content
    has_defects = '"defects":' in obj_content
    
    # Contar elementos
    sizes_count = obj_content.count('"sizeMp":')
    defects_count = obj_content.count('"defect":')
    
    if not has_sizes or sizes_count == 0:
        issues_520_554.append(f"{code}: Sin tallas")
    
    if not has_defects or defects_count == 0:
        issues_520_554.append(f"{code}: Sin defectos")

if issues_520_554:
    errors.append(f"Problemas en 520-554: {len(issues_520_554)}")
    print(f"   ERROR: {len(issues_520_554)} problemas detectados:")
    for issue in issues_520_554:
        print(f"     - {issue}")
else:
    print(f"   OK: Los 20 productos tienen tallas y defectos completos")

print("\n" + "=" * 80)
print("RESUMEN PARTE 6")
print("=" * 80)
print(f"Productos analizados: {count}")
print(f"Total defect limits: {len(defect_limits)}")
print(f"Total tallas: {len(all_sizes)}")
print(f"Errores críticos: {len(errors)}")
print(f"Advertencias: {len(warnings)}")

if errors:
    print("\nERRORES:")
    for i, error in enumerate(errors, 1):
        print(f"  {i}. {error}")

if warnings:
    print("\nADVERTENCIAS:")
    for i, warn in enumerate(warnings[:5], 1):
        print(f"  {i}. {warn}")

print("\n" + "=" * 80)

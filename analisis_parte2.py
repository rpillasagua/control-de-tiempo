#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PARTE 2: Validación de completitud de datos
"""
import re

file_path = r'lib\technical-specs.ts'

print("=" * 80)
print("ANÁLISIS PROFUNDO - PARTE 2: COMPLETITUD DE DATOS")
print("=" * 80)

errors = []
warnings = []

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Propiedades requeridas para cada producto
required_props = [
    'code', 'description', 'client', 'brand', 'destination', 'version',
    'productType', 'freezingMethod', 'certification', 'color', 'packing',
    'preservative', 'glazingRatio', 'glazingUnit', 'overweightPct',
    'netWeightUnit', 'netWeight', 'grossWeightUnit', 'grossWeight',
    'grossWeightMastersUnit', 'grossWeightMasters', 'sizes', 'defects'
]

print(f"\n1. Extrayendo productos...")
# Extraer todos los objetos de productos
product_pattern = r'"([0-9]{5})":\s*\{[^}]*?"defects":\s*\[.*?\]\s*\}'
products = re.findall(product_pattern, content, re.DOTALL)
print(f"   Productos detectados con patrón completo: {len(products)}")

# Para análisis detallado, extraer todos los códigos y verificar uno por uno
code_pattern = r'"([0-9]{5})":\s*\{'
all_codes = re.findall(code_pattern, content)
unique_codes = sorted(set(all_codes))

print(f"\n2. Analizando completitud de {len(unique_codes)} productos únicos...")

incomplete_products = []
missing_sizes = []
missing_defects = []

for code in unique_codes[:20]:  # Analizar primeros 20 para no saturar
    # Buscar el objeto del producto
    start_pattern = f'"{code}":\\s*{{'
    start_match = re.search(start_pattern, content)
    
    if not start_match:
        continue
    
    start_pos = start_match.start()
    
    # Encontrar el cierre del objeto
    # Contar llaves para encontrar el cierre correcto
    depth = 0
    in_object = False
    end_pos = start_pos
    
    for i in range(start_pos, min(start_pos + 50000, len(content))):
        if content[i] == '{':
            depth += 1
            in_object = True
        elif content[i] == '}':
            depth -= 1
            if depth == 0 and in_object:
                end_pos = i + 1
                break
    
    obj_content = content[start_pos:end_pos]
    
    # Verificar propiedades
    missing = []
    for prop in required_props:
        if f'"{prop}":' not in obj_content:
            missing.append(prop)
    
    # Contar sizes y defects
    sizes_count = obj_content.count('"sizeMp":')
    defects_count = obj_content.count('"defect":')
    
    if missing:
        incomplete_products.append((code, missing))
        print(f"   WARN {code}: Faltan {len(missing)} propiedades: {', '.join(missing[:3])}...")
    
    if sizes_count == 0:
        missing_sizes.append(code)
        warnings.append(f"{code}: Sin tallas")
        print(f"   WARN {code}: Sin tallas (sizes)")
    
    if defects_count == 0:
        missing_defects.append(code)
        warnings.append(f"{code}: Sin defectos")
        print(f"   WARN {code}: Sin defectos")

# Verificar productos 520-554 específicamente
print(f"\n3. Verificación específica de productos 520-554...")
target_codes = [
    '00520', '00522', '00525', '00528', '00529', '00530', '00531', '00532', '00533',
    '00537', '00540', '00541', '00542', '00543', '00545', '00546', '00551', '00552',
    '00553', '00554'
]

missing_target = []
for code in target_codes:
    if code not in all_codes:
        missing_target.append(code)
        errors.append(f"Producto {code} NO encontrado")
        print(f"   ERROR: {code} FALTA")
    else:
        count = all_codes.count(code)
        if count > 1:
            errors.append(f"Producto {code} duplicado {count} veces")
            print(f"   ERROR: {code} duplicado {count}x")
        else:
            print(f"   OK: {code} presente")

print("\n" + "=" * 80)
print("RESUMEN PARTE 2")
print("=" * 80)
print(f"Productos analizados: {min(20, len(unique_codes))}")
print(f"Productos con propiedades faltantes: {len(incomplete_products)}")
print(f"Productos sin tallas: {len(missing_sizes)}")
print(f"Productos sin defectos: {len(missing_defects)}")
print(f"Productos 520-554 faltantes: {len(missing_target)}")
print(f"Errores críticos: {len(errors)}")
print(f"Advertencias: {len(warnings)}")

if errors:
    print("\nERRORES:")
    for i, error in enumerate(errors, 1):
        print(f"  {i}. {error}")

if incomplete_products[:5]:
    print("\nPRIMEROS PRODUCTOS INCOMPLETOS:")
    for code, missing in incomplete_products[:5]:
        print(f"  {code}: {', '.join(missing)}")

print("\n" + "=" * 80)

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Verificación exhaustiva de datos completos de productos 520-554
"""
import re
import json

file_path = r'lib\technical-specs.ts'

print("=" * 70)
print("VERIFICACIÓN EXHAUSTIVA DE DATOS")
print("=" * 70)

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

codes_to_check = [
    '00520', '00522', '00525', '00528', '00529', '00530', '00531', '00532', '00533',
    '00537', '00540', '00541', '00542', '00543', '00545', '00546', '00551', '00552',
    '00553', '00554'
]

required_props = [
    'code', 'description', 'client', 'brand', 'destination', 'version',
    'productType', 'freezingMethod', 'certification', 'color', 'packing',
    'preservative', 'glazingRatio', 'glazingUnit', 'overweightPct',
    'netWeightUnit', 'netWeight', 'grossWeightUnit', 'grossWeight',
    'grossWeightMastersUnit', 'grossWeightMasters', 'sizes', 'defects'
]

print(f"\nVerificando {len(codes_to_check)} productos...\n")

results = []
errors = []

for code in codes_to_check:
    # Buscar el objeto del producto
    pattern = rf'"{code}":\s*\{{([^}}]*?)"defects":\s*\[.*?\]\s*\}}'
    match = re.search(pattern, content, re.DOTALL)
    
    if not match:
        errors.append(f"✗ {code}: NO ENCONTRADO en el archivo")
        results.append({'code': code, 'found': False})
        continue
    
    obj_content = match.group(0)
    
    # Verificar propiedades requeridas
    missing = []
    for prop in required_props:
        if f'"{prop}":' not in obj_content:
            missing.append(prop)
    
    # Contar sizes
    sizes_count = obj_content.count('"sizeMp":')
    
    # Contar defects
    defects_count = obj_content.count('"defect":')
    
    result = {
        'code': code,
        'found': True,
        'missing_props': missing,
        'sizes_count': sizes_count,
        'defects_count': defects_count,
        'has_description': '"description":' in obj_content
    }
    results.append(result)
    
    # Reporte
    status = "✓" if len(missing) == 0 and sizes_count > 0 and defects_count > 0 else "✗"
    print(f"{status} {code}:")
    print(f"   Props: {len(required_props) - len(missing)}/{len(required_props)}", end="")
    if missing:
        print(f" (Faltan: {', '.join(missing[:5])}...)" if len(missing) > 5 else f" (Faltan: {', '.join(missing)})")
    else:
        print(" ✓")
    print(f"   Tallas: {sizes_count}, Defectos: {defects_count}")
    
    if len(missing) > 0 or sizes_count == 0 or defects_count == 0:
        errors.append(f"{code}: missing={len(missing)}, sizes={sizes_count}, defects={defects_count}")

print("\n" + "=" * 70)
print("RESUMEN")
print("=" * 70)

complete = sum(1 for r in results if r['found'] and len(r.get('missing_props', [])) == 0 and r.get('sizes_count', 0) > 0 and r.get('defects_count', 0) > 0)
print(f"Productos completos: {complete} / {len(codes_to_check)}")
print(f"Productos con problemas: {len(errors)}")

if errors:
    print("\nPROBLEMAS DETECTADOS:")
    for error in errors:
        print(f"  - {error}")
else:
    print("\n✓ TODOS LOS PRODUCTOS ESTÁN COMPLETOS")

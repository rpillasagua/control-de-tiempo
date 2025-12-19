#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Agregar códigos faltantes a product-data.ts
"""
import re

specs_file = r'lib\technical-specs.ts'
data_file = r'lib\product-data.ts'

print("=" * 80)
print("AGREGANDO CÓDIGOS FALTANTES A PRODUCT-DATA.TS") 
print("=" * 80)

# Códigos que están en specs pero no en data
missing_in_data = ['00031', '00038', '00330', '00340', '00342', '00345', '00353', '00356', '00360', '00362', '00380', '00407']

# Leer archivos
with open(specs_file, 'r', encoding='utf-8') as f:
    specs_content = f.read()

with open(data_file, 'r', encoding='utf-8') as f:
    data_content = f.read()

print(f"\n1. Procesando {len(missing_in_data)} códigos faltantes...")

new_entries = []

for code in missing_in_data:
    # Extraer info de specs
    specs_match = re.search(rf'"{code}":\s*\{{[^}}]*?"client":\s*"([^"]*)"[^}}]*?"brand":\s*"([^"]*)"[^}}]*?"productType":\s*"([^"]*)"[^}}]*?"packing":\s*"([^"]*)"', specs_content, re.DOTALL)
    
    if specs_match:
        client = specs_match.group(1)
        brand = specs_match.group(2)
        product_type = specs_match.group(3)
        packing = specs_match.group(4)
        
        # Derivar unit del packing
        unit_match = re.search(r'([0-9.]+)\s*(Kg|kg|KG|Lb|lb|LB)', packing)
        unit = unit_match.group(0) if unit_match else packing
        
        # Crear entrada
        entry = f"    '{code}': {{ client: '{client}', type: '{product_type}', master: '{packing}', brand: '{brand}', unit: deriveUnit('{packing}') }}"
        new_entries.append((code, entry))
        print(f"   ✓ {code}: {client[:30]}... - {product_type}")
    else:
        print(f"   ✗ {code}: NO encontrado en specs")

if new_entries:
    print(f"\n2. Insertando {len(new_entries)} entradas en product-data.ts...")
    
    # Encontrar el punto de inserción (antes del último })
    # Buscar el patrón del último producto
    last_entry_pattern = r"(\s+'[0-9]{5}':\s*\{[^}]+\})\s*\n\s*\};\s*$"
    match = re.search(last_entry_pattern, data_content, re.DOTALL)
    
    if match:
        # Insertar después del último producto, antes del cierre
        insert_pos = match.end(1)
        
        # Construir el texto a insertar
        insert_text = ",\n" + ",\n".join([entry for code, entry in new_entries])
        
        # Insertar
        new_content = data_content[:insert_pos] + insert_text + data_content[insert_pos:]
        
        # Guardar
        with open(data_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"   ✓ {len(new_entries)} productos agregados")
    else:
        print("   ✗ No se encontró punto de inserción")
else:
    print("\n   - No hay entradas para agregar")

print("\n" + "=" * 80)
print("COMPLETADO")
print("=" * 80)

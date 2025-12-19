#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Agregar 12 códigos manualmente extrayendo de specs
"""
import re

specs_file = r'lib\technical-specs.ts'
data_file = r'lib\product-data.ts'

missing_codes = ['00031', '00038', '00330', '00340', '00342', '00345', 
                 '00353', '00356', '00360', '00362', '00380', '00407']

print("Extrayendo informacion de technical-specs.ts...\n")

# Leer specs
with open(specs_file, 'r', encoding='utf-8') as f:
    specs = f.read()

# Leer data
with open(data_file, 'r', encoding='utf-8') as f:
    data = f.read()

# Extraer info de cada código
products_info = []

for code in missing_codes:
    # Buscar el producto completo
    pattern = rf'"{code}":\s*\{{([^{{}}]*?(?:\{{[^{{}}]*?\}}[^{{}}]*?)*?"defects":\s*\[[^\]]*?\])\s*\}}'
    match = re.search(pattern, specs, re.DOTALL)
    
    if match:
        obj = match.group(0)
        
        # Extraer campos
        client = re.search(r'"client":\s*"([^"]*)"', obj)
        brand = re.search(r'"brand":\s*"([^"]*)"', obj)
        ptype = re.search(r'"productType":\s*"([^"]*)"', obj)
        packing = re.search(r'"packing":\s*"([^"]*)"', obj)
        
        if all([client, brand, ptype, packing]):
            products_info.append({
                'code': code,
                'client': client.group(1),
                'brand': brand.group(1),
                'type': ptype.group(1),
                'packing': packing.group(1)
            })
            print(f"OK {code}: {client.group(1)[:30]}... - {ptype.group(1)}")
        else:
            print(f"PARCIAL {code}: Falta alguna propiedad")
    else:
        print(f"ERROR {code}: No encontrado")

print(f"\nEncontrados: {len(products_info)} productos")

if products_info:
    print("\nGenerando entradas para product-data.ts...\n")
    
    # Generar código TypeScript
    entries = []
    for p in products_info:
        # Escapar comillas simples
        client = p['client'].replace("'", "\\'")
        brand = p['brand'].replace("'", "\\'")
        packing = p['packing'].replace("'", "\\'")
        
        entry = f"    '{p['code']}': {{ client: '{client}', type: '{p['type']}', master: '{packing}', brand: '{brand}', unit: deriveUnit('{packing}') }},"
        entries.append(entry)
        print(entry)
    
    # Buscar donde insertar - antes del cierre final
    insert_pattern = r'(\s+};)\s*$'
    match = re.search(insert_pattern, data)
    
    if match:
        # Insertar antes del };
        insert_pos = match.start(1)
        new_data = data[:insert_pos] + '\n'.join(entries) + '\n' + data[insert_pos:]
        
        # Guardar
        with open(data_file, 'w', encoding='utf-8') as f:
            f.write(new_data)
        
        print(f"\nOK {len(entries)} productos agregados a product-data.ts")
    else:
        print("\nERROR: No se encontro punto de insercion")
        print("SOLUCION: Copiar las entradas manualmente antes del cierre")
else:
    print("\nNo se encontro informacion para agregar")

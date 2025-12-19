#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Agregar los 12 códigos faltantes a product-data.ts
Extrayendo información de technical-specs.ts
"""
import re

specs_file = r'lib\technical-specs.ts'
data_file = r'lib\product-data.ts'

print("Agregando 12 codigos faltantes a product-data.ts...")

# Códigos faltantes
missing_codes = ['00031', '00038', '00330', '00340', '00342', '00345', 
                 '00353', '00356', '00360', '00362', '00380', '00407']

# Leer specs
with open(specs_file, 'r', encoding='utf-8') as f:
    specs_content = f.read()

# Leer data
with open(data_file, 'r', encoding='utf-8') as f:
    data_lines = f.readlines()

print(f"\nExtrayendo informacion de {len(missing_codes)} productos...\n")

entries_to_add = []

for code in missing_codes:
    # Buscar el producto en specs
    pattern = rf'"{code}":\s*\{{[^}}]*?"client":\s*"([^"]*)"[^}}]*?"brand":\s*"([^"]*)"[^}}]*?"productType":\s*"([^"]*)"[^}}]*?"packing":\s*"([^"]*)"'
    match = re.search(pattern, specs_content, re.DOTALL)
    
    if match:
        client = match.group(1).replace("'", "\\'")  # Escapar comillas simples
        brand = match.group(2).replace("'", "\\'")
        product_type = match.group(3)
        packing = match.group(4).replace("'", "\\'")
        
        # Crear la entrada
        entry = f"    '{code}': {{ client: '{client}', type: '{product_type}', master: '{packing}', brand: '{brand}', unit: deriveUnit('{packing}') }},\n"
        entries_to_add.append(entry)
        
        print(f"OK {code}: {client[:30]}... - {product_type}")
    else:
        print(f"ERROR {code}: No encontrado en specs")

if entries_to_add:
    print(f"\nInsertando {len(entries_to_add)} productos en product-data.ts...")
    
    # Encontrar la posición antes del cierre final
    # Buscar la última línea que contiene un producto
    insertion_point = None
    for i in range(len(data_lines) - 1, -1, -1):
        if re.match(r"\s*'[0-9]{5}':", data_lines[i]):
            insertion_point = i + 1
            break
    
    if insertion_point:
        # Insertar las nuevas entradas
        for entry in entries_to_add:
            data_lines.insert(insertion_point, entry)
            insertion_point += 1
        
        # Guardar
        with open(data_file, 'w', encoding='utf-8') as f:
            f.writelines(data_lines)
        
        print(f"OK {len(entries_to_add)} productos agregados exitosamente")
    else:
        print("ERROR: No se encontro punto de insercion")
else:
    print("\nNo hay productos para agregar")

print("\nCompletado!")

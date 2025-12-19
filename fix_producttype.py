#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Encontrar y corregir productType con espacio
"""
import re

file_path = r'lib\technical-specs.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Buscar y reemplazar
count_before = content.count('"productType": "VALOR AGREGADO"')
print(f"Casos encontrados antes: {count_before}")

# Reemplazar
content_fixed = content.replace('"productType": "VALOR AGREGADO"', '"productType": "VALOR_AGREGADO"')

count_after = content_fixed.count('"productType": "VALOR AGREGADO"')
print(f"Casos encontrados después: {count_after}")

if count_before > count_after:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(content_fixed)
    print(f"\n✓ Corregidos {count_before - count_after} casos")
else:
    print("\n✓ No se encontraron casos para corregir")

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re

file_path = r'lib\technical-specs.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Códigos con valores altos detectados previamente
codes_to_check = ['00154', '00278', '00041', '00264', '00511', '00476']

print("Verificando unidades de glaseado para valores altos:")
for code in codes_to_check:
    # Buscar el bloque del producto
    pattern = rf'"{code}":\s*\{{[^}}]*?"glazingRatio":\s*([0-9.]+)[^}}]*?"glazingUnit":\s*"([^"]*)"'
    match = re.search(pattern, content, re.DOTALL)
    
    if match:
        ratio = match.group(1)
        unit = match.group(2)
        print(f"Code {code}: {ratio} {unit}")
    else:
        print(f"Code {code}: No encontrado o formato diferente")

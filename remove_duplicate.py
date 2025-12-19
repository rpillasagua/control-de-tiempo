#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Eliminar el primer 00559 duplicado (líneas 82707-82838)
"""

file_path = r'lib\technical-specs.ts'

print("Leyendo archivo...")
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total líneas: {len(lines)}")
print(f"Línea 82707: {lines[82706][:50]}...")
print(f"Línea 82838: {lines[82837][:50]}...")
print(f"Línea 82839: {lines[82838][:50]}...")

# Eliminar líneas 82707 a 82838 (índices 82706 a 82837, inclusive)
# Son 132 líneas a eliminar
del lines[82706:82838]

print(f"\n✓ Eliminadas 132 líneas (primera aparición de 00559)")
print(f"Nuevas líneas totales: {len(lines)}")

# Guardar
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("✓ Archivo guardado")

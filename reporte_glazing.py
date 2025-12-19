#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Reporte completo de glazing ratios
"""
import re

file_path = r'lib\technical-specs.ts'

print("=" * 80)
print("REPORTE DE GLAZING RATIOS")
print("=" * 80)

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Buscar todos los glazing ratios con sus códigos
pattern = r'"([0-9]{5})":[^}}]*?"glazingRatio":\s*([0-9.]+)[^}}]*?"glazingUnit":\s*"([^"]*)"'
all_glazing = re.findall(pattern, content, re.DOTALL)

print(f"\nTotal productos con glazing: {len(all_glazing)}\n")

# Clasificar por rango
normal = []
altos = []
muy_altos = []
extremos = []

for code, ratio_str, unit in all_glazing:
    ratio = float(ratio_str)
    
    if ratio <= 30:
        normal.append((code, ratio, unit))
    elif ratio <= 100:
        altos.append((code, ratio, unit))
    elif ratio <= 500:
        muy_altos.append((code, ratio, unit))
    else:
        extremos.append((code, ratio, unit))

print("CLASIFICACION:")
print(f"  Normal (0-30):     {len(normal)} productos")
print(f"  Alto (31-100):     {len(altos)} productos")
print(f"  Muy Alto (101-500): {len(muy_altos)} productos")
print(f"  Extremo (>500):    {len(extremos)} productos")

print("\n" + "=" * 80)
print("VALORES ALTOS (31-100)")
print("=" * 80)
if altos:
    altos.sort(key=lambda x: x[1], reverse=True)
    for code, ratio, unit in altos:
        print(f"  {code}: {ratio} {unit}")
else:
    print("  Ninguno")

print("\n" + "=" * 80)
print("VALORES MUY ALTOS (101-500) - REVISAR")
print("=" * 80)
if muy_altos:
    muy_altos.sort(key=lambda x: x[1], reverse=True)
    for code, ratio, unit in muy_altos:
        print(f"  {code}: {ratio} {unit}")
else:
    print("  Ninguno")

print("\n" + "=" * 80)
print("VALORES EXTREMOS (>500) - PROBABLEMENTE INCORRECTOS")
print("=" * 80)
if extremos:
    extremos.sort(key=lambda x: x[1], reverse=True)
    for code, ratio, unit in extremos:
        print(f"  {code}: {ratio} {unit}")
else:
    print("  Ninguno")

print("\n" + "=" * 80)
print("RECOMENDACIONES")
print("=" * 80)

todos_problematicos = altos + muy_altos + extremos
if todos_problematicos:
    print(f"\nTotal a revisar: {len(todos_problematicos)} productos")
    print("\nPara cada producto:")
    print("1. Verificar en ficha tecnica PDF")
    print("2. Si es porcentaje: debe estar entre 0-30%")
    print("3. Si es mililitros: valores tipicos 200-600ml")
    print("4. Si hay error, probablemente es:")
    print("   - 400 → 4% o 40%")
    print("   - 750 → 7.5% o 75ml")

# Guardar reporte
with open('reporte_glazing.txt', 'w', encoding='utf-8') as f:
    f.write("REPORTE GLAZING RATIOS\n")
    f.write("=" * 80 + "\n\n")
    
    if muy_altos or extremos:
        f.write("PRODUCTOS CON VALORES SOSPECHOSOS (>100):\n\n")
        for code, ratio, unit in muy_altos + extremos:
            f.write(f"{code}: {ratio} {unit}\n")
    
    f.write(f"\nTotal a revisar: {len(muy_altos) + len(extremos)}\n")

print(f"\nReporte guardado en: reporte_glazing.txt")
print("\n" + "=" * 80)

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PARTE 5: Verificación de valores numéricos y rangos
"""
import re

file_path = r'lib\technical-specs.ts'

print("=" * 80)
print("ANÁLISIS PARTE 5: VALORES NUMÉRICOS Y RANGOS")
print("=" * 80)

errors = []
warnings = []

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Verificar 1: Pesos negativos o cero
print("\n1. Verificando pesos negativos o cero...")
weight_pattern = r'"(netWeight|grossWeight|grossWeightMasters)":\s*([0-9.]+)'
weights = re.findall(weight_pattern, content)

zero_weights = [(prop, val) for prop, val in weights if float(val) == 0]
negative_weights = [(prop, val) for prop, val in weights if float(val) < 0]

if zero_weights:
    warnings.append(f"Pesos en cero: {len(zero_weights)}")
    print(f"   WARN: {len(zero_weights)} pesos en cero")
    for prop, val in set(zero_weights[:3]):
        print(f"     {prop}: {val}")

if negative_weights:
    errors.append(f"Pesos negativos: {len(negative_weights)}")
    print(f"   ERROR: {len(negative_weights)} pesos negativos")
else:
    print(f"   OK: {len(weights)} pesos verificados, ninguno negativo")

# Verificar 2: Glazing ratios fuera de rango
print("\n2. Verificando glazingRatio...")
glazing_pattern = r'"glazingRatio":\s*([0-9.]+)'
glazing_values = [float(v) for v in re.findall(glazing_pattern, content)]

if glazing_values:
    min_glaz = min(glazing_values)
    max_glaz = max(glazing_values)
    
    # Valores sospechosos (más de 100% o más de 1000ml)
    suspicious_glaz = [g for g in glazing_values if g > 100]
    
    if suspicious_glaz:
        warnings.append(f"GlazingRatio alto: {len(suspicious_glaz)} casos")
        print(f"   WARN: {len(suspicious_glaz)} valores > 100")
        print(f"     Rango: {min_glaz} - {max_glaz}")
    else:
        print(f"   OK: Rango {min_glaz} - {max_glaz}")
else:
    print("   INFO: No se encontraron valores de glazingRatio")

# Verificar 3: Versiones
print("\n3. Verificando números de versión...")
version_pattern = r'"version":\s*([0-9]+)'
versions = [int(v) for v in re.findall(version_pattern, content)]

if versions:
    min_ver = min(versions)
    max_ver = max(versions)
    
    if max_ver > 50:
        warnings.append(f"Versiones muy altas: max={max_ver}")
        print(f"   WARN: Versión máxima = {max_ver}")
    else:
        print(f"   OK: Rango {min_ver} - {max_ver}")
else:
    print("   INFO: No se encontraron versiones")

# Verificar 4: Porcentajes de sobrepeso
print("\n4. Verificando overweightPct...")
ovw_pattern = r'"overweightPct":\s*"([0-9.%]+)"'
overweights = re.findall(ovw_pattern, content)

if overweights:
    # Extraer números
    ovw_numbers = []
    for ovw in overweights:
        num = re.search(r'([0-9.]+)', ovw)
        if num:
            ovw_numbers.append(float(num.group(1)))
    
    if ovw_numbers:
        suspicious_ovw = [o for o in ovw_numbers if o > 10]
        if suspicious_ovw:
            warnings.append(f"Sobrepeso alto: {len(suspicious_ovw)} casos > 10%")
            print(f"   WARN: {len(suspicious_ovw)} casos con sobrepeso > 10%")
        else:
            print(f"   OK: Todos los sobrepesos <= 10%")
else:
    print("   INFO: No se encontraron overweightPct")

# Verificar 5: Caracteres especiales problemáticos
print("\n5. Buscando caracteres especiales problemáticos...")
# Buscar caracteres no-ASCII sospechosos
special_chars = re.findall(r'[^\x00-\x7F\xC0-\xFF]', content)

if special_chars:
    unique_special = set(special_chars)
    warnings.append(f"Caracteres especiales: {len(unique_special)} tipos")
    print(f"   WARN: {len(special_chars)} caracteres no-ASCII estándar")
    print(f"     Únicos: {len(unique_special)}")
else:
    print("   OK: Solo caracteres ASCII y latinos estándar")

# Verificar 6: Strings muy largos (posibles errores)
print("\n6. Verificando strings excesivamente largos...")
long_strings = re.findall(r'"([^"]{500,})"', content)

if long_strings:
    warnings.append(f"Strings muy largos: {len(long_strings)}")
    print(f"   WARN: {len(long_strings)} strings > 500 caracteres")
    for s in long_strings[:2]:
        print(f"     Longitud: {len(s)} chars")
else:
    print("   OK: No hay strings excesivamente largos")

print("\n" + "=" * 80)
print("RESUMEN PARTE 5")
print("=" * 80)
print(f"Errores críticos: {len(errors)}")
print(f"Advertencias: {len(warnings)}")

if errors:
    print("\nERRORES:")
    for i, error in enumerate(errors, 1):
        print(f"  {i}. {error}")

if warnings:
    print("\nADVERTENCIAS:")
    for i, warn in enumerate(warnings, 1):
        print(f"  {i}. {warn}")
else:
    print("\n✓ NO SE DETECTARON PROBLEMAS EN PARTE 5")

print("\n" + "=" * 80)

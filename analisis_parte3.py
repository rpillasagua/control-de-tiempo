#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PARTE 3: Validación de tipos de datos y valores
"""
import re

file_path = r'lib\technical-specs.ts'

print("=" * 80)
print("ANÁLISIS PROFUNDO - PARTE 3: TIPOS Y VALORES")
print("=" * 80)

errors = []
warnings = []

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Verificación 1: Números en strings que deberían ser números
print("\n1. Buscando números en formato incorrecto...")
# Buscar patrones como "netWeight": "12.5" (debería ser sin comillas)
number_in_string = re.findall(r'"(netWeight|grossWeight|grossWeightMasters|glazingRatio|version|uniformity)":\s*"([0-9.]+)"', content)
if number_in_string:
    errors.append(f"Números como strings: {len(number_in_string)} casos")
    print(f"   ERROR: {len(number_in_string)} números guardados como strings")
    for prop, val in number_in_string[:3]:
        print(f"     Ejemplo: {prop}: \"{val}\" (debería ser sin comillas)")
else:
    print("   OK: Números con formato correcto")

# Verificación 2: Strings vacíos
print("\n2. Buscando strings vacíos...")
empty_strings = re.findall(r':\s*""', content)
if empty_strings:
    warnings.append(f"Strings vacíos: {len(empty_strings)}")
    print(f"   WARN: {len(empty_strings)} strings vacíos")
else:
    print(f"   OK: No hay strings vacíos")

# Verificación 3: Valores de productType
print("\n3. Verificando valores de productType...")
product_types = re.findall(r'"productType":\s*"([^"]+)"', content)
valid_types = ['ENTERO', 'COLA', 'VALOR_AGREGADO', 'REMUESTREO']
invalid_types = [pt for pt in product_types if pt not in valid_types]
if invalid_types:
    unique_invalid = set(invalid_types)
    errors.append(f"productType inválidos: {unique_invalid}")
    print(f"   ERROR: {len(invalid_types)} tipos inválidos")
    for inv_type in unique_invalid:
        count = invalid_types.count(inv_type)
        print(f"     '{inv_type}': {count} veces")
else:
    print(f"   OK: Todos los productType son válidos")
    type_counts = {t: product_types.count(t) for t in valid_types}
    for t, count in type_counts.items():
        if count > 0:
            print(f"     {t}: {count}")

# Verificación 4: Unidades de peso
print("\n4. Verificando unidades de peso...")
weight_units = re.findall(r'"(net|gross|grossMasters)WeightUnit":\s*"([^"]+)"', content)
valid_units = ['KG', 'LB', 'kg', 'lb']
invalid_units = [(prop, unit) for prop, unit in weight_units if unit not in valid_units]
if invalid_units:
    errors.append(f"Unidades de peso inválidas: {len(invalid_units)}")
    print(f"   ERROR: {len(invalid_units)} unidades inválidas")
    for prop, unit in set((p, u) for p, u in invalid_units):
        print(f"     {prop}WeightUnit: '{unit}'")
else:
    print(f"   OK: Todas las unidades son válidas")

# Verificación 5: Valores de glazingUnit
print("\n5. Verificando glazingUnit...")
glazing_units = re.findall(r'"glazingUnit":\s*"([^"]+)"', content)
valid_glazing = ['%', 'ml', 'ML', '%', 'N/A']
invalid_glazing = [g for g in glazing_units if g not in valid_glazing]
if invalid_glazing:
    warnings.append(f"glazingUnit no estándar: {len(invalid_glazing)}")
    print(f"   WARN: {len(invalid_glazing)} valores no estándar")
    for val in set(invalid_glazing):
        print(f"     '{val}': {invalid_glazing.count(val)} veces")
else:
    print(f"   OK: Todas las unidades de glaseo son válidas")

# Verificación 6: Códigos de 5 dígitos
print("\n6. Verificando formato de códigos...")
code_pattern = r'"code":\s*"([^"]+)"'
all_code_values = re.findall(code_pattern, content)
invalid_codes = [c for c in all_code_values if not re.match(r'^[0-9]{5}$', c)]
if invalid_codes:
    errors.append(f"Códigos con formato incorrecto: {len(invalid_codes)}")
    print(f"   ERROR: {len(invalid_codes)} códigos inválidos")
    for code in set(invalid_codes):
        print(f"     '{code}'")
else:
    print(f"   OK: Todos los códigos tienen 5 dígitos")

# Verificación 7: Límites de defectos
print("\n7. Verificando límites de defectos...")
limit_pattern = r'"limit":\s*"([^"]+)"'
all_limits = re.findall(limit_pattern, content)
# Los límites válidos pueden ser porcentajes, rangos, o texto
# Buscar límites sospechosos
suspicious_limits = []
for limit in all_limits:
    # Verificar que no tengan caracteres extraños
    if not re.match(r'^[0-9%<>\-./a-zA-Z\s,()]+$', limit):
        suspicious_limits.append(limit)

if suspicious_limits:
    warnings.append(f"Límites con caracteres extraños: {len(suspicious_limits)}")
    print(f"   WARN: {len(suspicious_limits)} límites sospechosos")
    for lim in set(suspicious_limits[:5]):
        print(f"     '{lim}'")
else:
    print(f"   OK: Todos los límites tienen formato válido")

# Verificación 8: Valores de uniformidad
print("\n8. Verificando valores de uniformidad...")
uniformity_pattern = r'"uniformity":\s*([0-9.]+|null)'
uniformities = re.findall(uniformity_pattern, content)
numeric_unif = [float(u) for u in uniformities if u != 'null']
if numeric_unif:
    min_unif = min(numeric_unif)
    max_unif = max(numeric_unif)
    if min_unif < 1.0 or max_unif > 3.0:
        warnings.append(f"Uniformidades fuera de rango normal: {min_unif}-{max_unif}")
        print(f"   WARN: Rango {min_unif:.2f} - {max_unif:.2f} (esperado 1.0-3.0)")
    else:
        print(f"   OK: Rango {min_unif:.2f} - {max_unif:.2f}")
else:
    print("   INFO: No se encontraron valores de uniformidad")

print("\n" + "=" * 80)
print("RESUMEN PARTE 3")
print("=" * 80)
print(f"Errores críticos: {len(errors)}")
print(f"Advertencias: {len(warnings)}")

if errors:
    print("\nERRORES:")
    for i, error in enumerate(errors, 1):
        print(f"  {i}. {error}")

if warnings:
    print("\nADVERTENCIAS:")
    for i, warn in enumerate(warnings[:5], 1):
        print(f"  {i}. {warn}")

print("\n" + "=" * 80)

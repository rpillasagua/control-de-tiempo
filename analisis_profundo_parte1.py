#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Análisis profundo de technical-specs.ts para detectar errores ocultos
PARTE 1: Validación de estructura JSON y sintaxis
"""
import re
import json

file_path = r'lib\technical-specs.ts'

print("=" * 80)
print("ANÁLISIS PROFUNDO - PARTE 1: ESTRUCTURA Y SINTAXIS")
print("=" * 80)

errors = []
warnings = []

# Leer archivo
print("\n1. Leyendo archivo...")
try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    print(f"   ✓ Archivo leído: {len(content)} caracteres")
except Exception as e:
    print(f"   ✗ ERROR leyendo archivo: {e}")
    exit(1)

# Verificación 1: Comillas correctas
print("\n2. Verificando comillas...")
smart_quotes = re.findall(r'[""''`]', content)
if smart_quotes:
    errors.append(f"Comillas inteligentes encontradas ({len(set(smart_quotes))} tipos): {set(smart_quotes)}")
    print(f"   ✗ {len(smart_quotes)} comillas inteligentes detectadas")
else:
    print("   ✓ Todas las comillas son estándar")

# Verificación 2: Comas faltantes o duplicadas
print("\n3. Verificando comas...")
# Buscar patrones problemáticos
missing_comma_pattern = r'\}\s*\n\s*"[0-9]{5}":'
missing_commas = re.findall(missing_comma_pattern, content)
if missing_commas:
    errors.append(f"Posibles comas faltantes: {len(missing_commas)} casos")
    print(f"   ✗ {len(missing_commas)} posibles comas faltantes entre objetos")
else:
    print("   ✓ No se detectaron comas faltantes obvias")

# Buscar comas dobles
double_comma = re.findall(r',,', content)
if double_comma:
    errors.append(f"Comas dobles: {len(double_comma)} casos")
    print(f"   ✗ {len(double_comma)} comas dobles detectadas")
else:
    print("   ✓ No hay comas dobles")

# Verificación 3: Llaves balanceadas
print("\n4. Verificando balance de llaves...")
open_braces = content.count('{')
close_braces = content.count('}')
print(f"   Llaves abiertas: {open_braces}")
print(f"   Llaves cerradas: {close_braces}")
if open_braces != close_braces:
    errors.append(f"Llaves desbalanceadas: {open_braces} abiertas vs {close_braces} cerradas")
    print(f"   ✗ DESBALANCE: diferencia de {abs(open_braces - close_braces)}")
else:
    print("   ✓ Llaves balanceadas")

# Verificación 4: Corchetes balanceados
print("\n5. Verificando balance de corchetes...")
open_brackets = content.count('[')
close_brackets = content.count(']')
print(f"   Corchetes abiertos: {open_brackets}")
print(f"   Corchetes cerrados: {close_brackets}")
if open_brackets != close_brackets:
    errors.append(f"Corchetes desbalanceados: {open_brackets} abiertos vs {close_brackets} cerrados")
    print(f"   ✗ DESBALANCE: diferencia de {abs(open_brackets - close_brackets)}")
else:
    print("   ✓ Corchetes balanceados")

# Verificación 5: Cierre correcto del archivo
print("\n6. Verificando cierre del archivo...")
last_100 = content[-100:].strip()
if last_100.endswith('};'):
    print("   ✓ Archivo termina correctamente con '};'")
else:
    errors.append(f"Archivo no termina con '};'. Termina con: {last_100[-20:]}")
    print(f"   ✗ Archivo no termina correctamente")

# Verificación 6: Códigos duplicados
print("\n7. Buscando códigos de producto duplicados...")
code_pattern = r'"([0-9]{5})":\s*\{'
all_codes = re.findall(code_pattern, content)
duplicates = {}
for code in all_codes:
    if all_codes.count(code) > 1:
        duplicates[code] = all_codes.count(code)

if duplicates:
    for code, count in duplicates.items():
        errors.append(f"Código {code} duplicado {count} veces")
        print(f"   ✗ {code}: {count} veces")
else:
    print(f"   ✓ No hay códigos duplicados ({len(set(all_codes))} únicos)")

# Verificación 7: Propiedades con valores null o undefined incorrectos
print("\n8. Verificando valores null/undefined...")
null_issues = re.findall(r':\s*(null|undefined)\s*[,}]', content)
if 'undefined' in str(null_issues):
    errors.append(f"'undefined' encontrado (debería ser null): {null_issues.count('undefined')}")
    print(f"   ✗ {null_issues.count('undefined')} casos de 'undefined'")
else:
    print(f"   ✓ Solo valores 'null' ({null_issues.count('null')} casos)")

print("\n" + "=" * 80)
print("RESUMEN PARTE 1")
print("=" * 80)
print(f"Errores críticos: {len(errors)}")
print(f"Advertencias: {len(warnings)}")

if errors:
    print("\nERRORES DETECTADOS:")
    for i, error in enumerate(errors, 1):
        print(f"  {i}. {error}")
else:
    print("\n✓ NO SE DETECTARON ERRORES EN PARTE 1")

# Guardar reporte
with open('analisis_parte1.txt', 'w', encoding='utf-8') as f:
    f.write("ANÁLISIS PROFUNDO - PARTE 1\n")
    f.write("=" * 80 + "\n\n")
    f.write(f"Total códigos encontrados: {len(all_codes)}\n")
    f.write(f"Códigos únicos: {len(set(all_codes))}\n")
    f.write(f"Llaves: {open_braces} abiertas, {close_braces} cerradas\n")
    f.write(f"Corchetes: {open_brackets} abiertos, {close_brackets} cerrados\n\n")
    f.write(f"ERRORES: {len(errors)}\n")
    for error in errors:
        f.write(f"  - {error}\n")

print("\n✓ Reporte guardado en analisis_parte1.txt")

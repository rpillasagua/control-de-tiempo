#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Análisis profundo de technical-specs.ts para detectar errores ocultos
PARTE 1: Validación de estructura JSON y sintaxis
"""
import re

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
    print(f"   OK Archivo leído: {len(content)} caracteres")
except Exception as e:
    print(f"   ERROR leyendo archivo: {e}")
    exit(1)

# Verificación 1: Comillas correctas
print("\n2. Verificando comillas...")
smart_quotes_pattern = r'[""''`]'
smart_quotes = re.findall(smart_quotes_pattern, content)
if smart_quotes:
    unique_quotes = set(smart_quotes)
    errors.append(f"Comillas inteligentes: {len(smart_quotes)} casos")
    print(f"   ERROR: {len(smart_quotes)} comillas inteligentes")
else:
    print("   OK: Comillas estándar")

# Verificación 2: Llaves balanceadas
print("\n3. Verificando balance de llaves...")
open_braces = content.count('{')
close_braces = content.count('}')
print(f"   Abiertas: {open_braces}, Cerradas: {close_braces}")
if open_braces != close_braces:
    errors.append(f"Llaves desbalanceadas: {open_braces} vs {close_braces}")
    print(f"   ERROR: Diferencia de {abs(open_braces - close_braces)}")
else:
    print("   OK: Balanceadas")

# Verificación 3: Corchetes balanceados
print("\n4. Verificando balance de corchetes...")
open_brackets = content.count('[')
close_brackets = content.count(']')
print(f"   Abiertos: {open_brackets}, Cerrados: {close_brackets}")
if open_brackets != close_brackets:
    errors.append(f"Corchetes desbalanceados: {open_brackets} vs {close_brackets}")
    print(f"   ERROR: Diferencia de {abs(open_brackets - close_brackets)}")
else:
    print("   OK: Balanceados")

# Verificación 4: Cierre del archivo
print("\n5. Verificando cierre del archivo...")
last_100 = content[-100:].strip()
if last_100.endswith('};'):
    print("   OK: Termina con '};'")
else:
    errors.append("Archivo no termina con '};'")
    print(f"   ERROR: Termina con: ...{last_100[-20:]}")

# Verificación 5: Códigos duplicados
print("\n6. Buscando códigos duplicados...")
code_pattern = r'"([0-9]{5})":\s*\{'
all_codes = re.findall(code_pattern, content)
code_counts = {}
for code in all_codes:
    code_counts[code] = code_counts.get(code, 0) + 1

duplicates = {k: v for k, v in code_counts.items() if v > 1}
if duplicates:
    for code, count in duplicates.items():
        errors.append(f"Código {code} duplicado {count} veces")
        print(f"   ERROR: {code} aparece {count} veces")
else:
    print(f"   OK: {len(set(all_codes))} códigos únicos, sin duplicados")

# Verificación 6: Valores undefined
print("\n7. Verificando valores 'undefined'...")
undefined_count = content.count('undefined')
if undefined_count > 0:
    warnings.append(f"'undefined' encontrado {undefined_count} veces")
    print(f"   WARN: {undefined_count} casos de 'undefined'")
else:
    print("   OK: No hay 'undefined'")

# Verificación 7: Comas problemáticas
print("\n8. Verificando comas...")
double_commas = content.count(',,')
if double_commas > 0:
    errors.append(f"Comas dobles: {double_commas}")
    print(f"   ERROR: {double_commas} comas dobles")
else:
    print("   OK: No hay comas dobles")

# Buscar comas antes de ]
bad_comma_bracket = len(re.findall(r',\s*\]', content))
if bad_comma_bracket > 0:
    # Esto es normal en TypeScript, no es error
    print(f"   INFO: {bad_comma_bracket} comas finales en arrays (permitido)")

print("\n" + "=" * 80)
print("RESUMEN PARTE 1")
print("=" * 80)
print(f"Total códigos: {len(all_codes)}")
print(f"Códigos únicos: {len(set(all_codes))}")
print(f"Errores críticos: {len(errors)}")
print(f"Advertencias: {len(warnings)}")

if errors:
    print("\nERRORES:")
    for i, error in enumerate(errors, 1):
        print(f"  {i}. {error}")
else:
    print("\nOK: NO SE DETECTARON ERRORES EN PARTE 1")

print("\n" + "=" * 80)

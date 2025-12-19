#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para corregir la estructura y indentación del archivo technical-specs.ts
"""

file_path = r'lib\technical-specs.ts'

print("=" * 60)
print("CORRECCIÓN DE ESTRUCTURA Y INDENTACIÓN")
print("=" * 60)

# Leer archivo
print("\n1. Leyendo archivo...")
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"   Total líneas originales: {len(lines)}")

# Paso 1: Eliminar las líneas incorrectas 83182-83185 (índices 83181-83184)
print("\n2. Eliminando líneas incorrectas (83182-83185)...")
print(f"   Línea 83182: {lines[83181][:40]}...")
print(f"   Línea 83183: {lines[83182][:40]}...")
print(f"   Línea 83184: {lines[83183][:40]}...")
print(f"   Línea 83185: {lines[83184][:40]}...")

# Eliminar en orden inverso para mantener índices
del lines[83184]  # Línea 83185 (coma)
del lines[83183]  # Línea 83184 (vacía)
del lines[83182]  # Línea 83183 (})
del lines[83181]  # Línea 83182 (};)

print(f"   ✓ 4 líneas eliminadas")
print(f"   Nuevas líneas totales: {len(lines)}")

# Paso 2: Corregir indentación desde lo que era línea 83187 (ahora 83183)
print("\n3. Corrigiendo indentación excesiva...")

# Encontrar el final del archivo (donde está el verdadero };)
last_line_idx = len(lines) - 1
while last_line_idx > 0 and lines[last_line_idx].strip() == '':
    last_line_idx -= 1

print(f"   Última línea no vacía: {last_line_idx + 1}")
print(f"   Contenido: {lines[last_line_idx][:40]}...")

# Corregir indentación desde 83183 (era 83187) hasta antes del };  final
fixed_count = 0
for i in range(83182, last_line_idx):  # Desde línea 83183 (índice 83182)
    original_line = lines[i]
    
    # Contar espacios al inicio
    stripped = original_line.lstrip(' \t')
    if stripped:  # Si la línea no está vacía
        leading_spaces = len(original_line) - len(stripped)
        
        # Si tiene más de 8 espacios al inicio (más de 1 nivel de indentación base)
        if leading_spaces > 8:
            # Calcular cuántos niveles de más tiene
            # La indentación correcta máxima es 16 espacios (2 niveles para propiedades dentro de objeto)
            if leading_spaces > 16:
                # Reducir al nivel correcto
                # Mantener solo 8 espacios (1 nivel) para propiedades raíz del objeto
                # y 16 para propiedades anidadas
                if stripped.startswith('"code"') or stripped.startswith('"description"') or \
                   stripped.startswith('"client"') or stripped.startswith('"brand"') or \
                   stripped.startswith('"destination"') or stripped.startswith('"version"') or \
                   stripped.startswith('"productType"') or stripped.startswith('"freezingMethod"') or \
                   stripped.startswith('"certification"') or stripped.startswith('"color"') or \
                   stripped.startswith('"packing"') or stripped.startswith('"preservative"') or \
                   stripped.startswith('"glazing') or stripped.startswith('"overweight') or \
                   stripped.startswith('"netWeight') or stripped.startswith('"grossWeight') or \
                   stripped.startswith('"sizes"') or stripped.startswith('"defects"'):
                    # Propiedad de primer nivel del objeto: 8 espacios
                    lines[i] = '        ' + stripped
                    fixed_count += 1
                elif stripped.startswith('"sizeMp"') or stripped.startswith('"countMp"') or \
                     stripped.startswith('"countFinal"') or stripped.startswith('"sizeMarked"') or \
                     stripped.startswith('"uniformity"') or stripped.startswith('"defect"') or \
                     stripped.startswith('"limit"'):
                    # Propiedad dentro de array: 16 espacios
                    lines[i] = '                ' + stripped
                    fixed_count += 1
                elif stripped.startswith('{'):
                    # Apertura de objeto en array: 16 espacios
                    lines[i] = '                ' + stripped
                    fixed_count += 1
                elif stripped.startswith('}'):
                    # Cierre de objeto en array o del objeto principal: 16 u 8 espacios
                    # Determinar nivel basado en contexto
                    if i > 0 and '\"limit\"' in lines[i-1]:
                        # Cierre de defecto/size: 16 espacios
                        lines[i] = '                ' + stripped
                    else:
                        # Cierre de objeto principal: 8 espacios
                        lines[i] = '        ' + stripped
                    fixed_count += 1
                elif stripped.startswith('['):
                    # Apertura de array: depende del contexto (generalmente después de "sizes" o "defects")
                    lines[i] = '        ' + stripped
                    fixed_count += 1
                elif stripped.startswith(']'):
                    # Cierre de array: 8 espacios
                    lines[i] = '        ' + stripped
                    fixed_count += 1

print(f"   ✓ {fixed_count} líneas con indentación corregida")

# Guardar archivo
print("\n4. Guardando archivo corregido...")
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"   ✓ Archivo guardado")
print(f"   Total líneas final: {len(lines)}")

print("\n" + "=" * 60)
print("CORRECCIÓN COMPLETADA")
print("=" * 60)

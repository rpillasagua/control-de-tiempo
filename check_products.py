import re

# Leer el archivo
with open('lib/technical-specs.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Códigos sospechosos identificados
suspicious_codes = ['00031', '00038', '00330', '00340', '00342', '00345', '00353', '00356', '00360', '00362', '00407']


# Abrir archivo de salida
output_file = open('productos_mal_clasificados.txt', 'w', encoding='utf-8')

output_file.write("=" * 120 + "\n")
output_file.write("ANÁLISIS DE PRODUCTOS MAL CLASIFICADOS\n")
output_file.write("=" * 120 + "\n")

mal_clasificados = []

for code in suspicious_codes:
    # Buscar el producto
    pattern = f'"{code}"\\s*:\\s*{{'
    match = re.search(pattern, content)
    
    if match:
        start = match.start()
        # Encontrar el final del objeto
        next_code_pattern = r'"(\d{5})"\s*:\s*{'
        next_match = re.search(next_code_pattern, content[start+10:])
        if next_match:
            end = start + 10 + next_match.start()
        else:
            end = start + 2000
        
        block = content[start:end]
        
        # Extraer campos
        desc_match = re.search(r'"description"\s*:\s*"([^"]+)"', block)
        type_match = re.search(r'"productType"\s*:\s*"([^"]+)"', block)
        
        description = desc_match.group(1) if desc_match else "N/A"
        product_type = type_match.group(1) if type_match else "N/A"
        
        # Analizar el tipo correcto basado en la descripción
        desc_upper = description.upper()
        
        correct_type = None
        reason = ""
        
        # HLSO = Head-Less Shell-On = COLA (sin cabeza pero con cáscara)
        if 'HLSO' in desc_upper or 'HEAD LESS SHELL ON' in desc_upper or 'HEADLESS SHELL ON' in desc_upper:
            correct_type = "COLA"
            reason = "HLSO (sin cabeza, con cáscara) es tipo COLA"
        
        # PD = Peeled Deveined = VALOR_AGREGADO
        elif 'PD ' in desc_upper or 'TAIL ON' in desc_upper or 'PDTON' in desc_upper:
            correct_type = "VALOR_AGREGADO"
            reason = "PD/PDTON (pelado desvenado con cola) es tipo VALOR_AGREGADO"
        
        # PPV = Peeled, deveined, vein removed = VALOR_AGREGADO
        elif 'PPV' in desc_upper:
            correct_type = "VALOR_AGREGADO"
            reason = "PPV (pelado, desvenado, sin vena) es tipo VALOR_AGREGADO"
        
        output_file.write(f"\n{'='*120}\n")
        output_file.write(f"Código: {code}\n")
        output_file.write(f"Descripción: {description}\n")
        output_file.write(f"Tipo Actual: {product_type}\n")
        if correct_type and correct_type != product_type:
            output_file.write(f"❌ TIPO CORRECTO: {correct_type}\n")
            output_file.write(f"   Razón: {reason}\n")
            mal_clasificados.append({
                'code': code,
                'current': product_type,
                'correct': correct_type,
                'description': description
            })
        else:
            output_file.write(f"✓ Clasificación correcta\n")
        output_file.write(f"{'='*120}\n")

output_file.write("\n\n" + "=" * 120 + "\n")
output_file.write(f"RESUMEN: {len(mal_clasificados)} productos mal clasificados\n")
output_file.write("=" * 120 + "\n")

for p in mal_clasificados:
    output_file.write(f"\n{p['code']}: {p['current']} → {p['correct']}\n")

output_file.close()
print(f"Análisis guardado en 'productos_mal_clasificados.txt'")
print(f"Total productos mal clasificados: {len(mal_clasificados)}")

import re

# Leer el archivo
with open('lib/technical-specs.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Patrones de tallas que típicamente indican COLA
cola_size_patterns = ['16-20', '21-25', '26-30', '31-35', '36-40', '41-50', '51-60', '61-70', '71-90', '91-110']

# Buscar todos los productos
product_pattern = r'"(\d{5})"\s*:\s*{'
product_matches = list(re.finditer(product_pattern, content))

products_with_odd_sizes = []

for i, match in enumerate(product_matches):
    code = match.group(1)
    start_pos = match.start()
    
    # Buscar el final del objeto del producto
    if i < len(product_matches) - 1:
        end_pos = product_matches[i+1].start()
    else:
        end_pos = len(content)
    
    product_block = content[start_pos:end_pos]
    
    # Extraer productType
    type_match = re.search(r'"productType"\s*:\s*"([^"]+)"', product_block)
    if not type_match:
        continue
    
    product_type = type_match.group(1)
    
    # Extraer description
    desc_match = re.search(r'"description"\s*:\s*"([^"]+)"', product_block)
    description = desc_match.group(1) if desc_match else "N/A"
    
    # Extraer sizes
    size_matches = re.findall(r'"sizeMp"\s*:\s*"([^"]+)"', product_block)
    
    if not size_matches:
        continue
    
    # Verificar si tiene tallas típicas de cola
    has_cola_sizes = any(size in cola_size_patterns for size in size_matches)
    
    if has_cola_sizes:
        products_with_odd_sizes.append({
            'code': code,
            'type': product_type,
            'description': description,
            'sizes': list(set(size_matches))
        })

# Guardar resultados en archivo
with open('analisis_tallas.txt', 'w', encoding='utf-8') as f:
    f.write("=" * 100 + "\n")
    f.write(f"PRODUCTOS CON TALLAS TÍPICAS DE COLA: {len(products_with_odd_sizes)}\n")
    f.write("=" * 100 + "\n\n")
    
    # Agrupar por tipo
    by_type = {}
    for p in products_with_odd_sizes:
        ptype = p['type']
        if ptype not in by_type:
            by_type[ptype] = []
        by_type[ptype].append(p)
    
    f.write("RESUMEN POR TIPO:\n")
    for ptype in sorted(by_type.keys()):
        f.write(f"  {ptype}: {len(by_type[ptype])} productos\n")
    
    # Identificar posibles mal clasificados
    entero_with_cola = [p for p in products_with_odd_sizes if p['type'] == 'ENTERO']
    
    f.write("\n" + "=" * 100 + "\n")
    f.write(f"⚠️  POSIBLES MAL CLASIFICADOS: {len(entero_with_cola)} productos tipo ENTERO con tallas típicas de COLA\n")
    f.write("=" * 100 + "\n\n")
    
    for p in sorted(entero_with_cola, key=lambda x: x['code']):
        sizes_str = ', '.join(sorted(p['sizes']))
        f.write(f"Código {p['code']}: {p['description'][:60]}...\n")
        f.write(f"  Tallas: {sizes_str}\n\n")
    
    f.write(f"\nTotal potencialmente mal clasificados: {len(entero_with_cola)} productos\n")
    
    # Productos correctamente clasificados como COLA
    f.write("\n\n" + "=" * 100 + "\n")
    f.write("✓ PRODUCTOS CORRECTAMENTE CLASIFICADOS COMO COLA:\n")
    f.write("=" * 100 + "\n\n")
    
    cola_products = [p for p in products_with_odd_sizes if p['type'] == 'COLA']
    f.write(f"Total: {len(cola_products)} productos\n\n")
    for p in sorted(cola_products[:20], key=lambda x: x['code']):
        sizes_str = ', '.join(sorted(p['sizes']))
        f.write(f"Código {p['code']}: {sizes_str}\n")
    
    if len(cola_products) > 20:
        f.write(f"... y {len(cola_products) - 20} más\n")
    
    # Productos VALOR_AGREGADO
    f.write("\n\n" + "=" * 100 + "\n")
    f.write("✓ PRODUCTOS TIPO VALOR_AGREGADO:\n")
    f.write("=" * 100 + "\n\n")
    
    va_products = [p for p in products_with_odd_sizes if p['type'] == 'VALOR_AGREGADO']
    f.write(f"Total: {len(va_products)} productos\n\n")
    for p in sorted(va_products[:20], key=lambda x: x['code']):
        sizes_str = ', '.join(sorted(p['sizes']))
        f.write(f"Código {p['code']}: {sizes_str}\n")
    
    if len(va_products) > 20:
        f.write(f"... y {len(va_products) - 20} más\n")

print("Análisis completo guardado en 'analisis_tallas.txt'")

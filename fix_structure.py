import sys

file_path = r'lib\technical-specs.ts'

print("Leyendo archivo...")
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total líneas: {len(lines)}")
print(f"Línea 82704: {lines[82703][:50]}...")

# Insertar las líneas correctivas después de la línea 82704 (índice 82703)
insert_at = 82704  # Después de línea 82704

lines_to_insert = [
    '                ]\n',
    '        },\n',
    '        "00559": {\n',
    '                "code": "00559",\n'
]

print(f"Insertando {len(lines_to_insert)} líneas en posición {insert_at}...")

# Insertar en orden inverso para mantener los índices correctos
for i, line in enumerate(lines_to_insert):
    lines.insert(insert_at + i, line)

print("Escribiendo archivo corregido...")
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"✓ Corrección aplicada exitosamente")
print(f"  - Nuevas líneas total: {len(lines)}")
print(f"  - Insertadas 4 líneas correctivas")

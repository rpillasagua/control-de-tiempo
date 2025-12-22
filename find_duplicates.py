
import re

filename = r'c:\Users\jarroyo\Analisis_Descongelado-main\lib\technical-specs.ts'

with open(filename, 'r', encoding='utf-8') as f:
    lines = f.readlines()

key_pattern = re.compile(r'"(\d{5})":\s*{')

for i, line in enumerate(lines):
    match = key_pattern.search(line)
    if match:
        key = match.group(1)
        if key == "00554":
            print(f"Found code 00554 at line {i+1}")

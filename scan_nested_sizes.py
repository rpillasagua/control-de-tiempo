
filename = r'c:\Users\jarroyo\Analisis_Descongelado-main\lib\technical-specs.ts'

with open(filename, 'r', encoding='utf-8') as f:
    lines = f.readlines()

in_sizes = False
sizes_balance = 0
nested_indices = []

for i, line in enumerate(lines):
    stripped = line.strip()
    if '"sizes": [' in line:
        if in_sizes:
            print(f"Found nested sizes at line {i+1}")
            nested_indices.append(i+1)
            # We don't reset in_sizes, just note it.
        else:
            in_sizes = True
            sizes_balance = 1 # Start with open bracket
            # We assume the line contains `[` and it opens the array
    elif in_sizes:
        # Simple bracket counting
        sizes_balance += line.count('[')
        sizes_balance -= line.count(']')
        if sizes_balance <= 0:
            in_sizes = False
            sizes_balance = 0


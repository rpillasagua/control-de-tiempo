
import os

file_path = r'c:\Users\jarroyo\Analisis_Descongelado-main\lib\technical-specs.ts'
temp_path = file_path + '.tmp2'

# Line 84104 is 0-indexed 84103.
# We want to remove line 84104 ("sizes": [) and line 84119 (],).
# Wait, if I remove line 84104, indices shift.

lines_to_remove = {84103, 84118} # 0-indexed

with open(file_path, 'r', encoding='utf-8') as f_in, open(temp_path, 'w', encoding='utf-8') as f_out:
    for i, line in enumerate(f_in):
        if i in lines_to_remove:
            continue
        f_out.write(line)

os.replace(temp_path, file_path)
print("Successfully removed header/footer lines for nested sizes.")


import os

file_path = r'c:\Users\jarroyo\Analisis_Descongelado-main\lib\technical-specs.ts'
temp_path = file_path + '.fix00551'

# 1-based lines to replace: 84104 to 84116
# 0-based indices: 84103 to 84115

start_index = 84103
end_index = 84115

replacement_text = """                        {
                                "sizeMp": "30-40",
                                "countMp": "34-36",
                                "countFinal": "34-36",
                                "sizeMarked": "30-40",
                                "uniformity": 1.30
                        },
                        {
                                "sizeMp": "40-50",
                                "countMp": "44-46",
                                "countFinal": "44-46",
                                "sizeMarked": "40-50",
                                "uniformity": 1.30
                        }
                ],
"""

with open(file_path, 'r', encoding='utf-8') as f_in, open(temp_path, 'w', encoding='utf-8') as f_out:
    for i, line in enumerate(f_in):
        if i == start_index:
            f_out.write(replacement_text)
        
        if start_index <= i <= end_index:
            continue
            
        f_out.write(line)

os.replace(temp_path, file_path)
print("Successfully fixed 00551 block.")

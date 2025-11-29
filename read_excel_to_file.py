import pandas as pd
import sys

file_path = 'Base_Datos_Fichas_Tecnicas_DEFINITIVA.xlsx'
output_file = 'excel_structure.txt'

try:
    with open(output_file, 'w', encoding='utf-8') as f:
        xl = pd.ExcelFile(file_path)
        f.write(f"SHEETS: {xl.sheet_names}\n\n")
        
        for sheet in xl.sheet_names:
            f.write(f"--- SHEET: {sheet} ---\n")
            df = pd.read_excel(file_path, sheet_name=sheet, nrows=5)
            f.write(f"COLUMNS: {list(df.columns)}\n")
            f.write(df.to_string())
            f.write("\n\n")
    print("Done")
except Exception as e:
    print(f"Error: {e}")

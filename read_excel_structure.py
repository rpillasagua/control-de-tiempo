import pandas as pd

file_path = 'Base_Datos_Fichas_Tecnicas_DEFINITIVA.xlsx'

try:
    xl = pd.ExcelFile(file_path)
    for sheet in xl.sheet_names:
        print(f"\n--- Sheet: {sheet} ---")
        df = pd.read_excel(file_path, sheet_name=sheet, nrows=5)
        print("Columns:", df.columns.tolist())
        print(df.to_string())
except Exception as e:
    print(f"Error: {e}")

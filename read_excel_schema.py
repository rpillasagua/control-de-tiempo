import pandas as pd

file_path = 'Base_Datos_Fichas_Tecnicas_DEFINITIVA.xlsx'

try:
    xl = pd.ExcelFile(file_path)
    for sheet in xl.sheet_names:
        print(f"SHEET: {sheet}")
        df = pd.read_excel(file_path, sheet_name=sheet, nrows=1)
        print(f"COLUMNS: {list(df.columns)}")
except Exception as e:
    print(f"Error: {e}")

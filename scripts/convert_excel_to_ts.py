import pandas as pd
import json
import os

excel_path = 'Base_Datos_Fichas_Tecnicas_DEFINITIVA.xlsx'
output_ts_path = 'lib/technical-specs.ts'

def clean_value(val):
    if pd.isna(val):
        return None
    if isinstance(val, str):
        return val.strip()
    return val

def parse_percentage(val):
    if pd.isna(val):
        return None
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        val = val.strip().replace('%', '')
        if val.upper() == 'NO':
            return 'NO'
        try:
            return float(val) / 100.0 if '.' not in val and float(val) > 1 else float(val) # Handle 8% as 0.08 or 8 depending on format
        except:
            return val
    return val

try:
    print("Reading Excel file...")
    xls = pd.ExcelFile(excel_path)
    
    # 1. Parse PRODUCTOS
    print("Parsing PRODUCTOS...")
    df_prod = pd.read_excel(xls, 'PRODUCTOS')
    products = {}
    for _, row in df_prod.iterrows():
        code = str(row['CODIGO']).zfill(5) # Ensure 5 digits
        products[code] = {
            'description': clean_value(row.get('DESCRIPCION')),
            'client': clean_value(row.get('CLIENTE')),
            'brand': clean_value(row.get('MARCA')),
            'netWeight': clean_value(row.get('PESO_NETO')),
            'netWeightUnit': clean_value(row.get('PESO_NETO_UNIDAD')),
            'grossWeight': clean_value(row.get('PESO_BRUTO_PRODUCCION')),
            'grossWeightUnit': clean_value(row.get('PESO_BRUTO_PRODUCCION_UNIDAD')),
            'overweightPct': clean_value(row.get('SOBREPESO_PORCENTAJE')),
            'productType': clean_value(row.get('TIPO_PRODUCTO')),
            'freezingMethod': clean_value(row.get('METODO_CONGELACION')),
            'destination': clean_value(row.get('DESTINO_PAIS')),
            'version': clean_value(row.get('VERSION')),
            'certification': clean_value(row.get('CERTIFICACION')),
            'color': clean_value(row.get('COLOR')),
            'packing': clean_value(row.get('EMBALAJE')),
            'preservative': clean_value(row.get('CONSERVANTE')),
        }
        
        # Clean packing: remove "Estiba" and everything after
        if products[code]['packing']:
            packing_val = products[code]['packing']
            if 'Estiba' in packing_val:
                products[code]['packing'] = packing_val.split('Estiba')[0].strip()
            elif 'ESTIBA' in packing_val:
                products[code]['packing'] = packing_val.split('ESTIBA')[0].strip()

    # 2. Parse TALLAS
    print("Parsing TALLAS...")
    df_tallas = pd.read_excel(xls, 'TALLAS')
    tallas_by_code = {}
    for _, row in df_tallas.iterrows():
        code = str(row['CODIGO']).zfill(5)
        if code not in tallas_by_code:
            tallas_by_code[code] = []
        
        uniformity_val = row.get('UNIFORMIDAD')
        try:
            if pd.notna(uniformity_val):
                uniformity_val = float(uniformity_val)
            else:
                uniformity_val = None
        except:
            uniformity_val = None

        tallas_by_code[code].append({
            'sizeMp': clean_value(row.get('TALLA_MP')),
            'sizeMarked': clean_value(row.get('TALLA_MARCADA')),
            'uniformity': uniformity_val,
            'countFinal': clean_value(row.get('CONTEO_FINAL'))
        })

    # 3. Parse DEFECTOS
    print("Parsing DEFECTOS...")
    df_defectos = pd.read_excel(xls, 'DEFECTOS')
    defectos_by_code = {}
    for _, row in df_defectos.iterrows():
        code = str(row['CODIGO']).zfill(5)
        if code not in defectos_by_code:
            defectos_by_code[code] = []
            
        val = row.get('VALOR')
        # Clean value logic
        cleaned_val = val
        if isinstance(val, str):
            cleaned_val = val.strip()
            
        defectos_by_code[code].append({
            'defect': clean_value(row.get('DEFECTO')),
            'limit': cleaned_val
        })

    # Combine all data
    full_specs = {}
    for code, prod_data in products.items():
        full_specs[code] = {
            **prod_data,
            'sizes': tallas_by_code.get(code, []),
            'defects': defectos_by_code.get(code, [])
        }

    # Generate TypeScript file
    print("Generating TypeScript file...")
    ts_content = f"""// Auto-generated from {excel_path}
// Do not edit manually.

export interface ProductSpec {{
    description: string;
    client: string;
    brand: string;
    netWeight: number;
    netWeightUnit: string;
    grossWeight: number;
    grossWeightUnit: string;
    overweightPct: string;
    productType: string;
    freezingMethod: string;
    destination: string;
    version: number;
    certification: string;
    color: string;
    packing: string;
    preservative: string;
    sizes: SizeSpec[];
    defects: DefectSpec[];
}}

export interface SizeSpec {{
    sizeMp: string;
    sizeMarked: string;
    uniformity: number;
    countFinal: string;
}}

export interface DefectSpec {{
    defect: string;
    limit: string | number; // "8%", "NO", or number
}}

export const TECHNICAL_SPECS: Record<string, ProductSpec> = {json.dumps(full_specs, indent=4, ensure_ascii=False)};
"""
    
    # Fix JSON output to be valid TS (remove quotes around keys if desired, but JSON is valid TS object)
    # Actually, let's keep it simple. JSON is valid JS/TS object literal.
    
    with open(output_ts_path, 'w', encoding='utf-8') as f:
        f.write(ts_content)

    print(f"Successfully generated {output_ts_path}")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

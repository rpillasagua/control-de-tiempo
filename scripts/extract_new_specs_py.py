import os
import re
import json
from datetime import datetime
from pypdf import PdfReader

# Configuration
PDF_DIR = r"c:\Users\jarroyo\Analisis_Descongelado-main\fichas"
OUTPUT_FILE = r"c:\Users\jarroyo\Analisis_Descongelado-main\new_specs_snippet.ts"

# Standard Sizes Lists (similar to JS)
STANDARD_SIZES = [
    'U-8', 'U-10', 'U-12', 'U-15',
    '16-20', '21-25', '26-30', '31-35', '36-40', '41-50',
    '51-60', '61-70', '71-90', '91-110', '110-130', '130-150',
    '10-20', '20-30', '30-40', '40-50', '50-60', '60-70',
    '70-80', '80-100', '100-120', '120-150',
    '16/20', '21/25', '26/30', '31/35', '36/40', '41/50',
    'U8', 'U10', 'U12', 'U15',
    'VLSMALL', 'VLLARGE', 'BSMALL', 'BMEDIUM', 'BLARGE', 'BJUMBO', 'BVERYSMALL',
    'V.L.SMALL', 'V.L.LARGE', 'B.SMALL', 'B.MEDIUM', 'B.LARGE', 'B.JUMBO', 'B.VERY SMALL',
    'SMALL', 'MEDIUM', 'LARGE', 'JUMBO', 'EXTRA JUMBO', 'VERY SMALL',
    'COLOSSAL', 'SUPER COLOSSAL',
    'V.L. SMALL', 'B. SMALL', 'B. MEDIUM', 'B. LARGE', 'B. JUMBO'
]

# Patterns
PATTERNS = {
    'version': r'VERSIÓN:\s*(\d+)',
    'description': r'DESCRIPCIÓN:\s*(.+?)(?=Cliente)',
    'client': r'Cliente:\s*(.+?)(?=Destino)',
    'destination': r'Destino/País\s*(.+?)(?=Marca)',
    'brand': r'Marca\s+(.+?)(?=Especie)',
    'freezingMethod': r'Metodo de congelación\s+(.+?)(?=Vida)',
    'certification': r'Certificación\s+(.+?)(?=Columna|Color)',
    'color': r'Color\s+(.+?)(?=Pago|Origen)',
    'packing': r'Embalaje\s+(.+?)(?=COMPLEMENTOS)',
    'packingClean': r'(\d+\s*Und\s*\*\s*\d+(?:[.,]\d+)?\s*Kg)',
    'preservative': r'Conservante\s+(.+?)(?=HIDRATANTE|$)',
    'netWeight': r'Peso Neto declarado \((\w+)\):\s*([0-9.]+)',
    'grossWeight': r'Peso Bruto Producción \((\w+)\):\s*([0-9.]+)',
    'grossWeightMasters': r'Peso Bruto masters \((\w+)\)\s*([0-9.]+)',
    'overweightPct': r'Sobrepeso \(%\):\s*([0-9.]+%?)'
}

# Glazing patterns
GLAZING_PATTERNS = [
    (r'AGUA:\s*([0-9]+)\s*ml', 'ml'),
    (r'AGUA:\s*([0-9.]+)%', '%'),
    (r'ML:\s*([0-9]+)\s*ml', 'ml'),
    (r'GLASEO[:\s]*:\s*([0-9]+)%', '%'),
    (r'GLASEO[:\s]*%?:\s*([0-9]+)', '%'),
    (r'%:\s*([0-9]+)%', '%'),
    (r'([0-9.]+)%\s*gl', '%')
]

def clean_text(text):
    return re.sub(r'\s+', ' ', text).strip() if text else ''

def parse_number(val):
    if not val: return None
    try:
        return float(val)
    except:
        return None

def extract_field(text, regex):
    match = re.search(regex, text, re.IGNORECASE | re.DOTALL)
    return match.group(1).strip() if match else None

def detect_product_type(text):
    upper = text.upper()
    if 'VALOR AGREGADO' in upper: return 'VALOR_AGREGADO'
    if 'ENTERO' in upper: return 'ENTERO'
    if 'COLA' in upper: return 'COLA'
    return 'UNKNOWN'

# Size Parsing Logic
def is_valid_range(a, b):
    if a == 0 or b == 0: return False
    if a > 200 or b > 200: return False
    diff = abs(b - a)
    if diff > 30: return False
    return True

def find_best_size_match(text):
    sorted_sizes = sorted(STANDARD_SIZES, key=len, reverse=True)
    text_upper = text.upper()
    
    # 1. Standard Sizes
    for size in sorted_sizes:
        if text_upper.startswith(size.upper()):
            return {'value': size, 'length': len(size)}
    
    # 2. Range N-N or N/N
    range_match = re.match(r'^(\d{1,3})[-/](\d{1,3})', text)
    if range_match:
        a = int(range_match.group(1))
        # Logic to handle N-N followed by something else
        # Just take the full match length for simplicity if valid
        # Actually Python regex match is strict at start
        full_match = range_match.group(0)
        return {'value': full_match, 'length': len(full_match)}
    
    # 3. U-Format
    u_match = re.match(r'^U-?(\d{1,3})', text, re.IGNORECASE)
    if u_match:
        return {'value': u_match.group(0), 'length': len(u_match.group(0))}
    
    # 4. Single number (less reliable, but part of JS logic)
    num_match = re.match(r'^(\d{1,3})', text)
    if num_match:
        val = int(num_match.group(1))
        if 0 < val < 500:
             return {'value': num_match.group(0), 'length': len(num_match.group(0))}

    return None

def parse_merged_line(line, code):
    # Remove N/A trailer
    clean = re.sub(r'(N/A)+$', '', line, flags=re.IGNORECASE).strip()
    
    tokens = []
    remaining = clean
    
    for _ in range(5):
        match = find_best_size_match(remaining)
        if match:
            tokens.append(match['value'])
            remaining = remaining[match['length']:].strip()
        else:
            break
            
    uniformity = None
    uni_match = re.match(r'^(\d+\.\d+)', remaining)
    if uni_match:
        uniformity = float(uni_match.group(1))
        
    if len(tokens) >= 4:
        if len(tokens) == 5:
            return {
                "sizeMp": tokens[0],
                "countMp": tokens[1],
                #"sizeSale": tokens[2],
                "countFinal": tokens[3],
                "sizeMarked": tokens[4],
                "uniformity": uniformity
            }
        if len(tokens) == 4:
            return {
                "sizeMp": tokens[0],
                "countMp": tokens[1],
                "countFinal": tokens[2],
                "sizeMarked": tokens[3],
                "uniformity": uniformity
            }
            
    # Named sizes special case
    if len(tokens) == 2 and re.search(r'[A-Za-z]', tokens[0]):
        return {
            "sizeMp": tokens[0],
            "countMp": tokens[1],
            "countFinal": tokens[1],
            "sizeMarked": tokens[0],
            "uniformity": uniformity
        }
        
    return None

def extract_sizes(text, product_type, code):
    sizes = []
    start_marker = "TALLAS"
    end_marker = "DEFECTOS"
    
    start_idx = text.find(start_marker)
    end_idx = text.find(end_marker)
    
    if start_idx == -1 or end_idx == -1: return sizes
    
    section = text[start_idx + len(start_marker):end_idx]
    lines = section.split('\n')
    
    for line in lines:
        clean_line = line.strip()
        if not clean_line or any(x in clean_line for x in ['TALLA DE MP', 'CONTEO DE MP', 'TALLA MP', 'OBSERVACIÓN']):
            continue
        
        parsed = parse_merged_line(clean_line, code)
        if parsed:
            sizes.append(parsed)
            
    return sizes

def extract_defects(text):
    defects = []
    start_marker = "DEFECTOS"
    end_marker = "REQUISITOS"
    
    start_idx = text.find(start_marker)
    end_idx = text.find(end_marker)
    
    if start_idx == -1 or end_idx == -1: return defects
    
    section = text[start_idx + len(start_marker):end_idx]
    
    KNOWN_DEFECTS = [
        'RESIDUOS_DE_HEPATOPANCREAS', 'BRANQUIAS_AMARILLAS_FUERTES', 'BRANQUIAS_AMARILLAS_LEVES',
        'BRANQUIAS_OSCURAS_FUERTES', 'BRANQUIAS_OSCURAS_LEVES', 'SABOR_GALLINAZA_FUERTE',
        'SABOR_GALLINAZA_LEVE', 'MANCHAS_NEGRAS_FUERTES', 'HONGO_BUCAL_FUERTE',
        'SABOR_TIERRA_FUERTE', 'MANCHAS_NEGRAS_LEVES', 'HONGO_BUCAL_LEVE',
        'SABOR_TIERRA_LEVE', 'RESIDUAL_DE_SULFITO', 'VARIACION_DE_COLOR',
        'CABEZA_DESCOLGADA', 'MAL_DESCABEZADO', 'DEFORMES_FUERTES',
        'HEMOLINFAS_LEVES', 'HEPATO_REVENTADO', 'MATERIAL_EXTRAÑO', 'CASCARA_APARTE',
        'CORTE_IRREGULAR', 'HEMOLINFAS_FUERTES', 'DEFORMES_LEVES', 'DESHIDRATADO',
        'HEPATO_REGADO', 'RESTOS_DE_VENAS', 'CABEZA_FUERTE', 'CABEZA_NARANJA',
        'CORTE_PROFUNDO', 'FALTA_DE_CORTE', 'DEFECTOS_TOTALES', 'CABEZA_FLOJA',
        'CORTE_LARGO', 'MALTRATADO', 'SEMIROSADO', 'SIN_TELSON', 'CABEZA_ROJA',
        'SABOR_CHOCLO', 'SABOR_COMBUSTIBLE', 'QUEBRADO', 'MELANOSIS', 'FLACIDO',
        'MUDADO', 'ROSADO', 'COLOR', 'SABOR', 'CABEZA_ROJA_FUERTE', 'CABEZA_ROJA_LEVE'
    ]
    
    clean_section = re.sub(r'\s+', ' ', section)
    
    for defect in KNOWN_DEFECTS:
        defect_spaces = defect.replace('_', ' ')
        # Regex to find defect followed by value
        regex = rf'{re.escape(defect_spaces)}\s*([\w%\d.,-]+)'
        match = re.search(regex, clean_section, re.IGNORECASE)
        if match:
            defects.append({"defect": defect, "limit": match.group(1).strip()})
            
    return defects

def extract_data_from_pdf(file_path):
    try:
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
            
        clean_content = re.sub(r'\s+', ' ', text).strip()
        filename = os.path.basename(file_path)
        
        # Code from filename
        code = os.path.splitext(filename)[0]
        if code.isdigit():
            code = code.zfill(5)
            
        specs = {
            "code": code,
            "description": extract_field(clean_content, PATTERNS['description']),
            "client": extract_field(clean_content, PATTERNS['client']),
            "brand": extract_field(clean_content, PATTERNS['brand']),
            "destination": extract_field(clean_content, PATTERNS['destination']),
            "version": parse_number(extract_field(clean_content, PATTERNS['version'])),
            "productType": detect_product_type(text),
            "freezingMethod": extract_field(clean_content, PATTERNS['freezingMethod']),
            "certification": extract_field(clean_content, PATTERNS['certification']),
            "color": extract_field(clean_content, PATTERNS['color']),
            "preservative": extract_field(clean_content, PATTERNS['preservative']),
            "overweightPct": extract_field(clean_content, PATTERNS['overweightPct']),
            "glazingRatio": None,
            "glazingUnit": None,
            "sizes": [],
            "defects": []
        }
        
        # Packing
        raw_packing = extract_field(clean_content, PATTERNS['packing'])
        if raw_packing:
            raw_packing = re.split(r'ESTIBA', raw_packing, flags=re.IGNORECASE)[0].strip()
            raw_packing = re.split(r'COMPLEMENTOS', raw_packing, flags=re.IGNORECASE)[0].strip()
        
        clean_packing_match = re.search(PATTERNS['packingClean'], raw_packing) if raw_packing else None
        specs['packing'] = clean_packing_match.group(1) if clean_packing_match else (raw_packing or '')

        # Weights
        net_match = re.search(PATTERNS['netWeight'], clean_content)
        if net_match:
            specs['netWeightUnit'] = net_match.group(1).upper()
            specs['netWeight'] = parse_number(net_match.group(2))
            
        gross_match = re.search(PATTERNS['grossWeight'], clean_content)
        if gross_match:
            specs['grossWeightUnit'] = gross_match.group(1).upper()
            specs['grossWeight'] = parse_number(gross_match.group(2))
            
        master_match = re.search(PATTERNS['grossWeightMasters'], clean_content)
        if master_match:
            specs['grossWeightMastersUnit'] = master_match.group(1).upper()
            specs['grossWeightMasters'] = parse_number(master_match.group(2))
            
        # Glazing
        for regex, unit in GLAZING_PATTERNS:
            match = re.search(regex, clean_content, re.IGNORECASE)
            if match:
                specs['glazingRatio'] = parse_number(match.group(1))
                specs['glazingUnit'] = unit
                break
                
        specs['sizes'] = extract_sizes(text, specs['productType'], code)
        specs['defects'] = extract_defects(text)
        
        return specs
        
    except Exception as e:
        print(f"Error extracting {file_path}: {e}")
        return None

def main():
    print("Starting extraction...")
    specs_by_code = {}
    
    if os.path.exists(PDF_DIR):
        files = [f for f in os.listdir(PDF_DIR) if f.lower().endswith('.pdf')]
        print(f"Found {len(files)} PDFs")
        
        for file in files:
            path = os.path.join(PDF_DIR, file)
            print(f"Processing {file}...")
            data = extract_data_from_pdf(path)
            if data:
                specs_by_code[data['code']] = data
                
        # Generate Output
        json_entries = ""
        for code, spec in specs_by_code.items():
            # Creating pretty JSON string, checking indent to match TS file
            # Manual formatting to match TS style: keys quoted, 8 spaces indent
            json_str = json.dumps(spec, indent=None, ensure_ascii=False)
            # A bit of hacky formatting to look good
            # Re-dump with indent for readability
            pretty_json = json.dumps(spec, indent=8, ensure_ascii=False)
            # Fix indentation for the object itself
            json_entries += f'    "{code}": {pretty_json},\n'
            
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            f.write(json_entries)
            
        print(f"Saved {len(specs_by_code)} specs to {OUTPUT_FILE}")
    else:
        print(f"Directory not found: {PDF_DIR}")

if __name__ == "__main__":
    main()

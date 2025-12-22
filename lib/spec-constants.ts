/**
 * Constantes y Patrones para el Parsing de Fichas Técnicas
 * Fuente única de verdad para Regex, Tallas y Defectos.
 */

// Standard Shrimp Sizes
export const STANDARD_SIZES = [
    // Headless / Cola
    'U-8', 'U-10', 'U-12', 'U-15',
    '16-20', '21-25', '26-30', '31-35', '36-40', '41-50',
    '51-60', '61-70', '71-90', '91-110', '110-130', '130-150',
    // Whole / Entero
    '10-20', '20-30', '30-40', '40-50', '50-60', '60-70',
    '70-80', '80-100', '100-120', '120-150',
    // Variations
    '16/20', '21/25', '26/30', '31/35', '36/40', '41/50',
    'U8', 'U10', 'U12', 'U15',
    // Named Sizes (Value Added / Valor Agregado)
    'VLSMALL', 'VLLARGE', 'BSMALL', 'BMEDIUM', 'BLARGE', 'BJUMBO', 'BVERYSMALL',
    'V.L.SMALL', 'V.L.LARGE', 'B.SMALL', 'B.MEDIUM', 'B.LARGE', 'B.JUMBO', 'B.VERY SMALL',
    'SMALL', 'MEDIUM', 'LARGE', 'JUMBO', 'EXTRA JUMBO', 'VERY SMALL',
    'COLOSSAL', 'SUPER COLOSSAL',
    'V.L. SMALL', 'B. SMALL', 'B. MEDIUM', 'B. LARGE', 'B. JUMBO'
];

// Known defects list
export const KNOWN_DEFECTS = [
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
    'MUDADO', 'ROSADO', 'COLOR', 'SABOR'
];

// Regex Patterns
export const SPEC_PATTERNS = {
    version: /VERSIÓN:\s*(\d+)/i,
    description: /DESCRIPCIÓN:\s*([\s\S]+?)(?=Cliente)/i,
    client: /Cliente:\s*([\s\S]+?)(?=Destino)/i,
    destination: /Destino\/País\s*([\s\S]+?)(?=Marca)/i,
    brand: /Marca\s+([\s\S]+?)(?=Especie)/i,
    freezingMethod: /Metodo de congelación\s+([\s\S]+?)(?=Vida)/i,
    certification: /Certificación\s+([\s\S]+?)(?=Columna|Color)/i,
    color: /Color\s+([\s\S]+?)(?=Pago|Origen)/i,
    packing: /Embalaje\s+([\s\S]+?)(?=COMPLEMENTOS)/i,
    packingClean: /(\d+\s*Und\s*\*\s*\d+(?:[.,]\d+)?\s*(?:Kg|Lb))/i,
    preservative: /Conservante\s+([\s\S]+?)(?=HIDRATANTE|$)/i,
    netWeight: /Peso Neto declarado \((\w+)\):\s*([0-9.]+)/i,
    grossWeight: /Peso Bruto Producción \((\w+)\):\s*([0-9.]+)/i,
    grossWeightMasters: /Peso Bruto masters \((\w+)\)\s*([0-9.]+)/i,
    overweightPct: /Sobrepeso \(%\):\s*([0-9.]+%?)/i,
    glazing: [
        { regex: /AGUA:\s*([0-9]+)\s*ml/i, unit: 'ml' },
        { regex: /AGUA:\s*([0-9.]+)%/i, unit: '%' },
        { regex: /ML:\s*([0-9]+)\s*ml/i, unit: 'ml' },
        { regex: /GLASEO[:\s]*:\s*([0-9]+)%/i, unit: '%' },
        { regex: /GLASEO[:\s]*%?:\s*([0-9]+)/i, unit: '%' },
        { regex: /%:\s*([0-9]+)%/i, unit: '%' },
        { regex: /([0-9.]+)%\s*gl/i, unit: '%' }
    ]
};

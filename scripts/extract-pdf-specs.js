const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

// Configuration
const PDF_DIR = 'c:/Users/ROGER/Downloads/datos/datos';
const OUTPUT_FILE = path.join(__dirname, '../lib/technical-specs.ts');
const LOG_FILE = path.join(__dirname, 'extraction.log');

function log(msg) {
    fs.appendFileSync(LOG_FILE, msg + '\n');
    console.log(msg);
}

// Standard Shrimp Sizes
const STANDARD_SIZES = [
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
    'V.L. SMALL', 'B. SMALL', 'B. MEDIUM', 'B. LARGE', 'B. JUMBO' // Variations with spaces
];

// Regex Patterns
const PATTERNS = {
    version: /VERSIÓN:\s*(\d+)/i,
    description: /DESCRIPCIÓN:\s*(.+?)(?=Cliente)/is,
    client: /Cliente:\s*(.+?)(?=Destino)/is,
    destination: /Destino\/País\s*(.+?)(?=Marca)/is,
    brand: /Marca\s+(.+?)(?=Especie)/is,
    freezingMethod: /Metodo de congelación\s+(.+?)(?=Vida)/is,
    certification: /Certificación\s+(.+?)(?=Columna|Color)/is,
    color: /Color\s+(.+?)(?=Pago|Origen)/is,
    packing: /Embalaje\s+(.+?)(?=COMPLEMENTOS)/is,
    packingClean: /(\d+\s*Und\s*\*\s*\d+(?:[.,]\d+)?\s*Kg)/i,
    preservative: /Conservante\s+(.+?)(?=HIDRATANTE|$)/is,

    // Weights
    netWeight: /Peso Neto declarado \((\w+)\):\s*([0-9.]+)/i,
    grossWeight: /Peso Bruto Producción \((\w+)\):\s*([0-9.]+)/i,
    grossWeightMasters: /Peso Bruto masters \((\w+)\)\s*([0-9.]+)/i,
    overweightPct: /Sobrepeso \(%\):\s*([0-9.]+%?)/i,

    // Glazing Patterns
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

// Helper to clean text
function cleanText(text) {
    return text ? text.replace(/\s+/g, ' ').trim() : '';
}

// Helper to parse number
function parseNumber(val) {
    if (!val) return null;
    if (typeof val === 'number') return val;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
}

async function extractDataFromPdf(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        const text = data.text;
        const cleanContent = text.replace(/\s+/g, ' ');

        // Extract Code
        const filename = path.basename(filePath, '.pdf');
        let code = null;
        const codeMatch = text.match(/CÓDIGO:\s*([A-Z0-9-]+)/i);

        if (codeMatch) {
            let fullCode = codeMatch[1];
            fullCode = fullCode.replace(/VERSI.*/i, '').replace(/VERS.*/i, '');
            if (fullCode.includes('-')) {
                const parts = fullCode.split('-');
                const lastPart = parts[parts.length - 1];
                if (!isNaN(lastPart) && lastPart.length > 0) {
                    code = lastPart;
                } else {
                    const numericMatch = fullCode.match(/(\d+)$/);
                    code = numericMatch ? numericMatch[1] : fullCode;
                }
            } else {
                code = fullCode;
            }
        }

        if (!code) {
            const codeMatchClean = cleanContent.match(/CÓDIGO:\s*([A-Z0-9-]+)/i);
            if (codeMatchClean) {
                let fullCode = codeMatchClean[1];
                fullCode = fullCode.replace(/VERSI.*/i, '').replace(/VERS.*/i, '');
                if (fullCode.includes('-')) {
                    const parts = fullCode.split('-');
                    const lastPart = parts[parts.length - 1];
                    if (!isNaN(lastPart) && lastPart.length > 0) {
                        code = lastPart;
                    }
                } else {
                    code = fullCode;
                }
            }
        }

        if (!code) {
            // log(`[WARNING] Could not extract code for file: ${filename}`);
            return null;
        }
        code = code.padStart(5, '0');

        // Extract Fields
        const specs = {
            code: code,
            description: extractField(cleanContent, PATTERNS.description),
            client: extractField(cleanContent, PATTERNS.client),
            brand: extractField(cleanContent, PATTERNS.brand),
            destination: extractField(cleanContent, PATTERNS.destination),
            version: parseNumber(extractField(cleanContent, PATTERNS.version)),
            productType: detectProductType(text),
            freezingMethod: extractField(cleanContent, PATTERNS.freezingMethod),
            certification: extractField(cleanContent, PATTERNS.certification),
            color: extractField(cleanContent, PATTERNS.color),
            preservative: extractField(cleanContent, PATTERNS.preservative),
            overweightPct: extractField(cleanContent, PATTERNS.overweightPct),
            glazingRatio: null,
            glazingUnit: null,
            sizes: [],
            defects: []
        };

        // Packing
        let rawPacking = extractField(cleanContent, PATTERNS.packing);
        if (rawPacking) {
            rawPacking = rawPacking.split(/ESTIBA/i)[0].trim();
            rawPacking = rawPacking.split(/COMPLEMENTOS/i)[0].trim();
        }
        const cleanPackingMatch = rawPacking ? rawPacking.match(PATTERNS.packingClean) : null;
        specs.packing = cleanPackingMatch ? cleanPackingMatch[1] : (rawPacking || '');

        // Weights
        const netMatch = cleanContent.match(PATTERNS.netWeight);
        if (netMatch) {
            specs.netWeightUnit = netMatch[1].toUpperCase();
            specs.netWeight = parseNumber(netMatch[2]);
        }

        const grossMatch = cleanContent.match(PATTERNS.grossWeight);
        if (grossMatch) {
            specs.grossWeightUnit = grossMatch[1].toUpperCase();
            specs.grossWeight = parseNumber(grossMatch[2]);
        }

        const masterMatch = cleanContent.match(PATTERNS.grossWeightMasters);
        if (masterMatch) {
            specs.grossWeightMastersUnit = masterMatch[1].toUpperCase();
            specs.grossWeightMasters = parseNumber(masterMatch[2]);
        }

        // Glazing
        for (const pattern of PATTERNS.glazing) {
            const match = cleanContent.match(pattern.regex);
            if (match) {
                specs.glazingRatio = parseNumber(match[1]);
                specs.glazingUnit = pattern.unit;
                break;
            }
        }

        // Extract Sizes (Tallas)
        specs.sizes = extractSizes(text, specs.productType, code);

        // Extract Defects
        specs.defects = extractDefects(text);

        return specs;

    } catch (error) {
        log(`Error parsing ${filePath}: ${error.message}`);
        return null;
    }
}

function extractField(text, regex) {
    const match = text.match(regex);
    return match ? match[1].trim() : null;
}

function detectProductType(text) {
    const upper = text.toUpperCase();
    if (upper.includes('VALOR AGREGADO')) return 'VALOR AGREGADO';
    if (upper.includes('ENTERO')) return 'ENTERO';
    if (upper.includes('COLA')) return 'COLA';
    return 'UNKNOWN';
}

// --- SMART SIZE PARSING ---

function extractSizes(text, productType, code) {
    const sizes = [];
    const startMarker = "TALLAS";
    const endMarker = "DEFECTOS";

    const startIndex = text.indexOf(startMarker);
    const endIndex = text.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) return sizes;

    const section = text.substring(startIndex + startMarker.length, endIndex);
    const lines = section.split('\n');

    for (const line of lines) {
        let cleanLine = line.trim();
        if (!cleanLine ||
            cleanLine.includes('TALLA DE MP') ||
            cleanLine.includes('CONTEO DE MP') ||
            cleanLine.includes('TALLA MP') ||
            cleanLine.includes('OBSERVACIÓN')) continue;

        const parsed = parseMergedLine(cleanLine, code);
        if (parsed) {
            sizes.push(parsed);
        }
    }
    return sizes;
}

function parseMergedLine(line, code) {
    // Standard Columns: TALLA MP, CONTEO MP, TALLA VENTA, CONTEO FINAL, TALLA MARCADA, UNIFORMIDAD
    // We want: sizeMp, countMp, sizeMarked, countFinal, uniformity

    // 1. Clean up
    let clean = line.replace(/(N\/A)+$/i, '').trim();

    const tokens = [];
    let remaining = clean;

    // We need to find 5 size tokens
    for (let i = 0; i < 5; i++) {
        const match = findBestSizeMatch(remaining);
        if (match) {
            tokens.push(match.value);
            remaining = remaining.substring(match.length).trim();
        } else {
            break;
        }
    }

    // After 5 tokens, look for uniformity (float)
    let uniformity = null;
    const uniMatch = remaining.match(/^(\d+\.\d+)/);
    if (uniMatch) {
        uniformity = parseFloat(uniMatch[1]);
    }

    if (tokens.length >= 4) {
        if (tokens.length === 5) {
            return {
                sizeMp: tokens[0],
                countMp: tokens[1],
                // sizeSale: tokens[2], 
                countFinal: tokens[3],
                sizeMarked: tokens[4],
                uniformity: uniformity
            };
        }
        if (tokens.length === 4) {
            return {
                sizeMp: tokens[0],
                countMp: tokens[1],
                countFinal: tokens[2],
                sizeMarked: tokens[3],
                uniformity: uniformity
            };
        }
    }

    // Special case for Named Sizes with fewer columns (e.g. BVERYSMALL 91/110)
    if (tokens.length === 2 && /[A-Z]/.test(tokens[0])) {
        return {
            sizeMp: tokens[0],
            countMp: tokens[1],
            countFinal: tokens[1],
            sizeMarked: tokens[0],
            uniformity: uniformity
        };
    }

    return null;
}

function findBestSizeMatch(text) {
    // 1. Check Standard Sizes FIRST (Exact match at start)
    // Sort by length descending to match "EXTRA JUMBO" before "JUMBO"
    const sortedSizes = [...STANDARD_SIZES].sort((a, b) => b.length - a.length);

    for (const size of sortedSizes) {
        // Normalize check (case insensitive for named sizes?)
        // The PDF text is usually uppercase, but let's be safe.
        if (text.toUpperCase().startsWith(size.toUpperCase())) {
            return { value: size, length: size.length };
        }
    }

    // 2. Fallback: Generic Range Format N-N or N/N
    const rangeMatch = text.match(/^(\d{1,3})[-/](\d{1,3})/);
    if (rangeMatch) {
        const a = parseInt(rangeMatch[1]);
        const rawB = rangeMatch[2];

        // Shrink strategy
        for (let len = rawB.length; len > 0; len--) {
            const subB = rawB.substring(0, len);
            const b = parseInt(subB);

            if (isValidRange(a, b)) {
                const matchLen = rangeMatch[1].length + 1 + len;
                return { value: text.substring(0, matchLen), length: matchLen };
            }
        }
    }

    // 3. Try U-Format: U-N or UN
    const uMatch = text.match(/^U-?(\d{1,3})/i);
    if (uMatch) {
        const rawNum = uMatch[1];
        for (let len = rawNum.length; len > 0; len--) {
            const subNum = rawNum.substring(0, len);
            const n = parseInt(subNum);
            if (n > 0 && n <= 20) {
                const matchLen = uMatch[0].length - (rawNum.length - len);
                return { value: text.substring(0, matchLen), length: matchLen };
            }
        }
    }

    // 4. Single Number
    const numMatch = text.match(/^(\d{1,3})/);
    if (numMatch) {
        const rawNum = numMatch[1];
        for (let len = rawNum.length; len > 0; len--) {
            const subNum = rawNum.substring(0, len);
            const n = parseInt(subNum);
            if (n > 0 && n < 500) {
                return { value: subNum, length: len };
            }
        }
    }

    return null;
}

function isValidRange(a, b) {
    if (a === 0 || b === 0) return false;
    if (a > 200 || b > 200) return false;
    const diff = Math.abs(b - a);
    if (diff > 30) return false;
    return true;
}

function extractDefects(text) {
    const defects = [];
    const startMarker = "DEFECTOS";
    const endMarker = "REQUISITOS";

    const startIndex = text.indexOf(startMarker);
    const endIndex = text.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) return defects;

    const section = text.substring(startIndex + startMarker.length, endIndex);

    // Known defects list
    const KNOWN_DEFECTS = [
        'RESIDUOS DE HEPATOPANCREAS', 'BRANQUIAS AMARILLAS FUERTES', 'BRANQUIAS AMARILLAS LEVES',
        'BRANQUIAS OSCURAS FUERTES', 'BRANQUIAS OSCURAS LEVES', 'SABOR GALLINAZA FUERTE',
        'SABOR GALLINAZA LEVE', 'MANCHAS NEGRAS FUERTES', 'HONGO BUCAL FUERTE',
        'SABOR TIERRA FUERTE', 'MANCHAS NEGRAS LEVES', 'HONGO BUCAL LEVE',
        'SABOR TIERRA LEVE', 'RESIDUAL DE SULFITO', 'VARIACION DE COLOR',
        'CABEZA DESCOLGADA', 'MAL DESCABEZADO', 'DEFORMES FUERTES',
        'HEMOLINFAS LEVES', 'HEPATO REVENTADO', 'MATERIAL EXTRAÑO', 'CASCARA APARTE',
        'CORTE IRREGULAR', 'HEMOLINFAS FUERTES', 'DEFORMES LEVES', 'DESHIDRATADO',
        'HEPATO REGADO', 'RESTOS DE VENAS', 'CABEZA FUERTE', 'CABEZA NARANJA',
        'CORTE PROFUNDO', 'FALTA DE CORTE', 'DEFECTOS TOTALES', 'CABEZA FLOJA',
        'CORTE LARGO', 'MALTRATADO', 'SEMIROSADO', 'SIN TELSON', 'CABEZA ROJA',
        'SABOR CHOCLO', 'SABOR COMBUSTIBLE', 'QUEBRADO', 'MELANOSIS', 'FLACIDO',
        'MUDADO', 'ROSADO', 'COLOR', 'SABOR'
    ];

    const cleanSection = section.replace(/\s+/g, ' ');

    for (const defect of KNOWN_DEFECTS) {
        const regex = new RegExp(`${defect}\\s*([\\w%\\d.,-]+)`, 'i');
        const match = cleanSection.match(regex);
        if (match) {
            let limit = match[1].trim();
            defects.push({
                defect: defect,
                limit: limit
            });
        }
    }

    return defects;
}

async function main() {
    fs.writeFileSync(LOG_FILE, 'Starting extraction...\n');
    log('🚀 Starting PDF Extraction...');

    if (!fs.existsSync(PDF_DIR)) {
        log(`❌ Directory not found: ${PDF_DIR}`);
        return;
    }

    const files = fs.readdirSync(PDF_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));
    log(`Found ${files.length} PDF files.`);

    const specsByCode = {};

    for (const file of files) {
        const fullPath = path.join(PDF_DIR, file);
        const data = await extractDataFromPdf(fullPath);

        if (data) {
            if (specsByCode[data.code]) {
                log(`[WARNING] Duplicate code found: ${data.code} in file ${file}`);
                // If existing has sizes and new one doesn't, keep existing
                if (specsByCode[data.code].sizes.length > 0 && data.sizes.length === 0) {
                    log(`[INFO] Keeping existing data for ${data.code} because it has sizes.`);
                    continue;
                }
                // If new one has sizes and existing doesn't, overwrite (default behavior)
                if (specsByCode[data.code].sizes.length === 0 && data.sizes.length > 0) {
                    log(`[INFO] Overwriting existing data for ${data.code} because new one has sizes.`);
                }
            }
            specsByCode[data.code] = data;
            process.stdout.write('.');
        }
    }

    log('\n\n✅ Extraction Complete.');
    log(`Extracted specs for ${Object.keys(specsByCode).length} products.`);

    // Generate TypeScript File
    let tsContent = `// Auto-generated from PDF Technical Sheets
// Generated at: ${new Date().toISOString()}

export interface ProductSpec {
    code: string;
    description: string | null;
    client: string | null;
    brand: string | null;
    netWeight: number | null;
    netWeightUnit: string | null;
    grossWeight: number | null;
    grossWeightUnit: string | null;
    grossWeightMasters: number | null;
    grossWeightMastersUnit: string | null;
    overweightPct: string | null;
    productType: string;
    freezingMethod: string | null;
    destination: string | null;
    version: number | null;
    certification: string | null;
    color: string | null;
    packing: string | null;
    preservative: string | null;
    glazingRatio: number | null;
    glazingUnit: string | null;
    sizes: SizeSpec[];
    defects: DefectSpec[];
}

export interface SizeSpec {
    sizeMp: string;
    countMp: string;
    sizeMarked: string;
    uniformity: number | null;
    countFinal: string;
}

export interface DefectSpec {
    defect: string;
    limit: string | number;
}

export const TECHNICAL_SPECS: Record<string, ProductSpec> = {
`;

    for (const [code, spec] of Object.entries(specsByCode)) {
        tsContent += `    "${code}": ${JSON.stringify(spec, null, 8)},\n`;
    }

    tsContent += `};\n`;

    fs.writeFileSync(OUTPUT_FILE, tsContent);
    log(`\n💾 Saved to ${OUTPUT_FILE}`);
}

main().catch(err => log(`FATAL ERROR: ${err.message}`));

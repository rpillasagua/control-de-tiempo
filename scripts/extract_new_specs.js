const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

// Configuration
const PDF_DIR = 'fichas'; // Relative to CWD
const OUTPUT_FILE = 'new_specs_snippet.txt';
const LOG_FILE = 'extraction_new.log';

function log(msg) {
    fs.appendFileSync(LOG_FILE, msg + '\n');
    console.log(msg);
}

// Reuse patterns and logic from existing script
const STANDARD_SIZES = [
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
];

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

function cleanText(text) {
    return text ? text.replace(/\s+/g, ' ').trim() : '';
}

function parseNumber(val) {
    if (!val) return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
}

function extractField(text, regex) {
    const match = text.match(regex);
    return match ? match[1].trim() : null;
}

function detectProductType(text) {
    const upper = text.toUpperCase();
    if (upper.includes('VALOR AGREGADO')) return 'VALOR_AGREGADO'; // Use correct enum values
    if (upper.includes('ENTERO')) return 'ENTERO';
    if (upper.includes('COLA')) return 'COLA';
    return 'UNKNOWN';
}

function isValidRange(a, b) {
    if (a === 0 || b === 0) return false;
    if (a > 200 || b > 200) return false;
    const diff = Math.abs(b - a);
    if (diff > 30) return false;
    return true;
}

function findBestSizeMatch(text) {
    const sortedSizes = [...STANDARD_SIZES].sort((a, b) => b.length - a.length);
    for (const size of sortedSizes) {
        if (text.toUpperCase().startsWith(size.toUpperCase())) {
            return { value: size, length: size.length };
        }
    }
    const rangeMatch = text.match(/^(\d{1,3})[-/](\d{1,3})/);
    if (rangeMatch) {
        const a = parseInt(rangeMatch[1]);
        const rawB = rangeMatch[2];
        for (let len = rawB.length; len > 0; len--) {
            const subB = rawB.substring(0, len);
            const b = parseInt(subB);
            if (isValidRange(a, b)) {
                const matchLen = rangeMatch[1].length + 1 + len;
                return { value: text.substring(0, matchLen), length: matchLen };
            }
        }
    }
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

function parseMergedLine(line, code) {
    let clean = line.replace(/(N\/A)+$/i, '').trim();
    const tokens = [];
    let remaining = clean;
    for (let i = 0; i < 5; i++) {
        const match = findBestSizeMatch(remaining);
        if (match) {
            tokens.push(match.value);
            remaining = remaining.substring(match.length).trim();
        } else {
            break;
        }
    }
    let uniformity = null;
    const uniMatch = remaining.match(/^(\d+\.\d+)/);
    if (uniMatch) uniformity = parseFloat(uniMatch[1]);

    if (tokens.length >= 4) {
        if (tokens.length === 5) {
            return { sizeMp: tokens[0], countMp: tokens[1], countFinal: tokens[3], sizeMarked: tokens[4], uniformity: uniformity };
        }
        if (tokens.length === 4) {
            return { sizeMp: tokens[0], countMp: tokens[1], countFinal: tokens[2], sizeMarked: tokens[3], uniformity: uniformity };
        }
    }
    if (tokens.length === 2 && /[A-Z]/.test(tokens[0])) {
        return { sizeMp: tokens[0], countMp: tokens[1], countFinal: tokens[1], sizeMarked: tokens[0], uniformity: uniformity };
    }
    return null;
}

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
        if (!cleanLine || cleanLine.includes('TALLA DE MP') || cleanLine.includes('CONTEO DE MP') || cleanLine.includes('TALLA MP') || cleanLine.includes('OBSERVACIÓN')) continue;
        const parsed = parseMergedLine(cleanLine, code);
        if (parsed) sizes.push(parsed);
    }
    return sizes;
}

function extractDefects(text) {
    const defects = [];
    const startMarker = "DEFECTOS";
    const endMarker = "REQUISITOS";
    const startIndex = text.indexOf(startMarker);
    const endIndex = text.indexOf(endMarker);
    if (startIndex === -1 || endIndex === -1) return defects;
    const section = text.substring(startIndex + startMarker.length, endIndex);
    const KNOWN_DEFECTS = [
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
    ];
    const cleanSection = section.replace(/\s+/g, ' ');
    for (const defect of KNOWN_DEFECTS) {
        const defectWithSpaces = defect.replace(/_/g, ' ');
        const regex = new RegExp(`${defectWithSpaces}\\s*([\\w%\\d.,-]+)`, 'i');
        const match = cleanSection.match(regex);
        if (match) {
            defects.push({ defect: defect, limit: match[1].trim() });
        }
    }
    return defects;
}

async function extractDataFromPdf(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        const text = data.text;
        const cleanContent = text.replace(/\s+/g, ' ');

        const filename = path.basename(filePath, '.pdf');
        let code = filename; // Default to filename (e.g., 67 -> 00067)
        if (code.match(/^\d+$/)) {
            code = code.padStart(5, '0');
        }

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

        let rawPacking = extractField(cleanContent, PATTERNS.packing);
        if (rawPacking) {
            rawPacking = rawPacking.split(/ESTIBA/i)[0].trim();
            rawPacking = rawPacking.split(/COMPLEMENTOS/i)[0].trim();
        }
        const cleanPackingMatch = rawPacking ? rawPacking.match(PATTERNS.packingClean) : null;
        specs.packing = cleanPackingMatch ? cleanPackingMatch[1] : (rawPacking || '');

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

        for (const pattern of PATTERNS.glazing) {
            const match = cleanContent.match(pattern.regex);
            if (match) {
                specs.glazingRatio = parseNumber(match[1]);
                specs.glazingUnit = pattern.unit;
                break;
            }
        }

        specs.sizes = extractSizes(text, specs.productType, code);
        specs.defects = extractDefects(text);

        return specs;
    } catch (error) {
        log(`Error parsing ${filePath}: ${error.message}`);
        return null;
    }
}

async function main() {
    fs.writeFileSync(LOG_FILE, 'Starting extraction...\n');
    log('🚀 Starting New PDF Extraction...');

    if (!fs.existsSync(PDF_DIR)) {
        log(`❌ Directory not found: ${PDF_DIR}`);
        return;
    }

    const files = fs.readdirSync(PDF_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));
    log(`Found ${files.length} PDF files in ${PDF_DIR}.`);

    const specsByCode = {};

    for (const file of files) {
        const fullPath = path.join(PDF_DIR, file);
        const data = await extractDataFromPdf(fullPath);
        if (data) {
            specsByCode[data.code] = data;
        }
    }

    log('\n✅ Extraction Complete.');
    log(`Extracted specs for ${Object.keys(specsByCode).length} products.`);

    let jsonEntries = '';
    for (const [code, spec] of Object.entries(specsByCode)) {
        jsonEntries += `    "${code}": ${JSON.stringify(spec, null, 8)},\n`;
    }

    fs.writeFileSync(OUTPUT_FILE, jsonEntries);
    log(`\n💾 Saved snippet to ${OUTPUT_FILE}`);
}

main().catch(err => log(`FATAL ERROR: ${err.message}`));

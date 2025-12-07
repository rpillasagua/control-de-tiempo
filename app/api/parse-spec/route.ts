
import { NextRequest, NextResponse } from 'next/server';

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
    'V.L. SMALL', 'B. SMALL', 'B. MEDIUM', 'B. LARGE', 'B. JUMBO'
];

// Known defects list
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
    'MUDADO', 'ROSADO', 'COLOR', 'SABOR'
];

// Regex Patterns
const PATTERNS = {
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

// Helper functions
function cleanText(text: string): string {
    return text ? text.replace(/\s+/g, ' ').trim() : '';
}

function parseNumber(val: string | number | null): number | null {
    if (!val) return null;
    if (typeof val === 'number') return val;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
}

function extractField(text: string, regex: RegExp): string | null {
    const match = text.match(regex);
    return match ? match[1].trim() : null;
}

function detectProductType(text: string): string {
    const upper = text.toUpperCase();
    if (upper.includes('VALOR AGREGADO')) return 'VALOR_AGREGADO';
    if (upper.includes('ENTERO') || upper.includes('HEAD ON') || upper.includes('HOSO')) return 'ENTERO';
    if (upper.includes('COLA') || upper.includes('HEADLESS') || upper.includes('HLSO')) return 'COLA';
    return 'UNKNOWN';
}

function isValidRange(a: number, b: number): boolean {
    if (a === 0 || b === 0) return false;
    if (a > 200 || b > 200) return false;
    const diff = Math.abs(b - a);
    if (diff > 30) return false;
    return true;
}

function findBestSizeMatch(text: string): { value: string; length: number } | null {
    // 1. Check Standard Sizes FIRST (sorted by length)
    const sortedSizes = [...STANDARD_SIZES].sort((a, b) => b.length - a.length);

    for (const size of sortedSizes) {
        if (text.toUpperCase().startsWith(size.toUpperCase())) {
            return { value: size, length: size.length };
        }
    }

    // 2. Generic Range Format N-N or N/N
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

    // 3. U-Format: U-N or UN
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

function parseMergedLine(line: string): { sizeMp: string; countMp: string; countFinal: string; sizeMarked: string; uniformity: number | null } | null {
    let clean = line.replace(/(N\/A)+$/i, '').trim();
    const tokens: string[] = [];
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

    let uniformity: number | null = null;
    const uniMatch = remaining.match(/^(\d+\.\d+)/);
    if (uniMatch) {
        uniformity = parseFloat(uniMatch[1]);
    }

    if (tokens.length >= 4) {
        if (tokens.length === 5) {
            return {
                sizeMp: tokens[0],
                countMp: tokens[1],
                countFinal: tokens[3],
                sizeMarked: tokens[4],
                uniformity
            };
        }
        if (tokens.length === 4) {
            return {
                sizeMp: tokens[0],
                countMp: tokens[1],
                countFinal: tokens[2],
                sizeMarked: tokens[3],
                uniformity
            };
        }
    }

    // Named Sizes with fewer columns
    if (tokens.length === 2 && /[A-Z]/.test(tokens[0])) {
        return {
            sizeMp: tokens[0],
            countMp: tokens[1],
            countFinal: tokens[1],
            sizeMarked: tokens[0],
            uniformity
        };
    }

    return null;
}

function extractSizes(text: string): any[] {
    const sizes: any[] = [];
    const startMarker = "TALLAS";
    const endMarker = "DEFECTOS";

    const startIndex = text.indexOf(startMarker);
    const endIndex = text.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) return sizes;

    const section = text.substring(startIndex + startMarker.length, endIndex);
    const lines = section.split('\n');

    for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine ||
            cleanLine.includes('TALLA DE MP') ||
            cleanLine.includes('CONTEO DE MP') ||
            cleanLine.includes('TALLA MP') ||
            cleanLine.includes('OBSERVACIÓN')) continue;

        const parsed = parseMergedLine(cleanLine);
        if (parsed) {
            sizes.push(parsed);
        }
    }
    return sizes;
}

function extractDefects(text: string): any[] {
    const defects: any[] = [];
    const startMarker = "DEFECTOS";
    const endMarker = "REQUISITOS";

    const startIndex = text.indexOf(startMarker);
    const endIndex = text.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) return defects;

    const section = text.substring(startIndex + startMarker.length, endIndex);
    const cleanSection = section.replace(/\s+/g, ' ');

    for (const defect of KNOWN_DEFECTS) {
        const defectWithSpaces = defect.replace(/_/g, ' ');
        const regex = new RegExp(`${defectWithSpaces}\\s*([\\w%\\d.,-]+)`, 'i');
        const match = cleanSection.match(regex);
        if (match) {
            defects.push({
                defect: defect,
                limit: match[1].trim()
            });
        }
    }

    return defects;
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Parse PDF
        // @ts-ignore
        const pdfModule = await import('pdf-parse');
        const pdf = pdfModule.default || pdfModule;
        const data = await (pdf as any)(buffer);
        const text = data.text;
        const cleanContent = text.replace(/\s+/g, ' ');

        // Extract Code
        let code: string | null = null;
        const codeMatch = text.match(/CÓDIGO:\s*([A-Z0-9-]+)/i);
        if (codeMatch) {
            let fullCode = codeMatch[1];
            fullCode = fullCode.replace(/VERSI.*/i, '').replace(/VERS.*/i, '');
            if (fullCode.includes('-')) {
                const parts = fullCode.split('-');
                const lastPart = parts[parts.length - 1];
                if (!isNaN(Number(lastPart)) && lastPart.length > 0) {
                    code = lastPart;
                } else {
                    const numericMatch = fullCode.match(/(\d+)$/);
                    code = numericMatch ? numericMatch[1] : fullCode;
                }
            } else {
                code = fullCode;
            }
        }

        if (code) {
            code = code.padStart(5, '0');
        }

        // Extract all fields
        const specs: any = {
            code: code,
            description: extractField(cleanContent, PATTERNS.description),
            client: extractField(cleanContent, PATTERNS.client),
            brand: extractField(cleanContent, PATTERNS.brand),
            destination: extractField(cleanContent, PATTERNS.destination),
            version: parseNumber(extractField(cleanContent, PATTERNS.version) || ''),
            productType: detectProductType(text),
            freezingMethod: extractField(cleanContent, PATTERNS.freezingMethod),
            certification: extractField(cleanContent, PATTERNS.certification),
            color: extractField(cleanContent, PATTERNS.color),
            preservative: extractField(cleanContent, PATTERNS.preservative),
            overweightPct: extractField(cleanContent, PATTERNS.overweightPct),
            glazingRatio: null as number | null,
            glazingUnit: null as string | null,
            netWeight: null as number | null,
            netWeightUnit: null as string | null,
            grossWeight: null as number | null,
            grossWeightUnit: null as string | null,
            grossWeightMasters: null as number | null,
            grossWeightMastersUnit: null as string | null,
            packing: null as string | null,
            sizes: [] as any[],
            defects: [] as any[]
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

        // Extract Sizes
        specs.sizes = extractSizes(text);

        // Extract Defects
        specs.defects = extractDefects(text);

        // Clean up for response (remove null values for cleaner JSON)
        const cleanSpecs = Object.fromEntries(
            Object.entries(specs).filter(([_, v]) => v !== null && v !== '')
        );

        return NextResponse.json({
            ...cleanSpecs,
            success: true,
            // Legacy fields for backwards compatibility
            client: specs.client || '',
            brand: specs.brand || '',
            master: specs.packing || '',
            type: specs.productType || ''
        });

    } catch (error) {
        console.error('PDF Parse Error:', error);
        return NextResponse.json({
            error: 'Failed to parse PDF',
            details: String(error)
        }, { status: 500 });
    }
}

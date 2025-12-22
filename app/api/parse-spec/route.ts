
import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'buffer';

// Standard Shrimp Sizes
import { STANDARD_SIZES, KNOWN_DEFECTS, SPEC_PATTERNS } from '@/lib/spec-constants';

// Re-map to PATTERNS for compatibility with existing code structure
const PATTERNS = SPEC_PATTERNS;

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

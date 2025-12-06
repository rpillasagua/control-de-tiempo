
import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore: No types available for pdf-parse
// import pdf from 'pdf-parse'; // Removed static import to fix build error

// Define simplified interface for pdf-parse result since types might be missing
interface PdfParseData {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    version: string;
    text: string;
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
        // Dynamically import pdf-parse to avoid build-time "No such file" errors
        const pdfModule = await import('pdf-parse');
        const pdf = pdfModule.default || pdfModule;

        // Note: pdf-parse is a CommonJS module, sometimes requires default import behavior handling
        // We cast to any to avoid strict type checks if defs are missing
        const data: PdfParseData = await (pdf as any)(buffer);
        const text = data.text;

        // --- EXTRACTION LOGIC ---

        // 1. Client
        // Patterns: "CLIENTE : value", "CLIENT : value", "IMPORTADOR : value"
        let client = '';
        const clientMatch = text.match(/(?:CLIENTE|CLIENT|IMPORTADOR)\s*[:.]?\s*([^\n]+)/i);
        if (clientMatch) {
            client = clientMatch[1].trim();
            // Cleanup widely used separators if grabbed by greedy match
            client = client.split(/[|\t]/)[0].trim();
        }

        // 2. Brand
        // Patterns: "MARCA : value", "BRAND : value"
        let brand = '';
        const brandMatch = text.match(/(?:MARCA|BRAND)\s*[:.]?\s*([^\n]+)/i);
        if (brandMatch) {
            brand = brandMatch[1].trim();
            brand = brand.split(/[|\t]/)[0].trim();
        }

        // 3. Master / Packing
        // Patterns: "MASTER : value", "PACKING : value", "EMPAQUE : value", "PRESENTACION : value"
        let master = '';
        const masterMatch = text.match(/(?:MASTER|PACKING|EMPAQUE|PRESENTACI[OÓ]N)\s*[:.]?\s*([^\n\r]+)/i);
        if (masterMatch) {
            master = masterMatch[1].trim();
        }

        // 4. Product Type
        // Heuristic based on keywords
        let type = '';
        const typeUpper = text.toUpperCase();
        if (typeUpper.includes('ENTERO') || typeUpper.includes('HEAD ON') || typeUpper.includes('HOSO')) {
            type = 'ENTERO';
        } else if (typeUpper.includes('COLA') || typeUpper.includes('HEADLESS') || typeUpper.includes('HLSO')) {
            type = 'COLA';
        } else if (typeUpper.includes('VALOR AGREGADO') || typeUpper.includes('ADDED VALUE')) {
            type = 'VALOR_AGREGADO';
        } else if (typeUpper.includes('REMUESTREO')) {
            type = 'REMUESTREO';
        }

        // Clean up extracted values (remove extra spaces, weird chars)
        const clean = (s: string) => s.replace(/[:;]/g, '').trim();

        return NextResponse.json({
            client: clean(client),
            brand: clean(brand),
            master: clean(master),
            type,
            success: true
        });

    } catch (error) {
        console.error('PDF Parse Error:', error);
        return NextResponse.json({ error: 'Failed to parse PDF', details: String(error) }, { status: 500 });
    }
}

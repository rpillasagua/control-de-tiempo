const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '../Base_Datos_Fichas_Tecnicas_DEFINITIVA.xlsx');
const OUTPUT_PATH = path.join(__dirname, '../lib/technical-specs.ts');

function cleanValue(val) {
    if (val === undefined || val === null) return null;
    if (typeof val === 'string') return val.trim();
    return val;
}

function parseNumber(val) {
    if (val === undefined || val === null) return null;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        const num = parseFloat(val);
        return isNaN(num) ? null : num;
    }
    return null;
}

function parsePercentage(val) {
    if (val === undefined || val === null) return null;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        const clean = val.trim().replace('%', '');
        if (clean.toUpperCase() === 'NO') return 'NO';
        const num = parseFloat(clean);
        if (isNaN(num)) return val;
        // Handle 8% as 0.08 or 8 depending on context, but here we just return the string or number
        return val;
    }
    return val;
}

try {
    console.log('Reading Excel file...');
    const workbook = XLSX.readFile(EXCEL_PATH);

    // 1. Parse PRODUCTOS
    console.log('Parsing PRODUCTOS...');
    const sheetProductos = workbook.Sheets['PRODUCTOS'];
    const dataProductos = XLSX.utils.sheet_to_json(sheetProductos);

    const products = {};

    dataProductos.forEach(row => {
        const rawCode = row['CODIGO'];
        if (!rawCode) return;
        const code = String(rawCode).padStart(5, '0');

        let packing = cleanValue(row['EMBALAJE']);
        if (packing) {
            if (packing.includes('Estiba')) packing = packing.split('Estiba')[0].trim();
            if (packing.includes('ESTIBA')) packing = packing.split('ESTIBA')[0].trim();
        }

        let preservative = cleanValue(row['CONSERVANTE']);
        if (preservative) {
            if (preservative.includes('EMPAQUES')) preservative = preservative.split('EMPAQUES')[0].trim();
        }

        products[code] = {
            description: cleanValue(row['DESCRIPCION']),
            client: cleanValue(row['CLIENTE']),
            brand: cleanValue(row['MARCA']),
            netWeight: parseNumber(row['PESO_NETO']),
            netWeightUnit: cleanValue(row['PESO_NETO_UNIDAD']),
            grossWeight: parseNumber(row['PESO_BRUTO_PRODUCCION']),
            grossWeightUnit: cleanValue(row['PESO_BRUTO_PRODUCCION_UNIDAD']),
            // ✨ NEW FIELDS
            grossWeightMasters: parseNumber(row['PESO_BRUTO_MASTERS']),
            grossWeightMastersUnit: cleanValue(row['PESO_BRUTO_MASTERS_UNIDAD']),

            overweightPct: cleanValue(row['SOBREPESO_PORCENTAJE']),
            productType: cleanValue(row['TIPO_PRODUCTO']),
            freezingMethod: cleanValue(row['METODO_CONGELACION']),
            destination: cleanValue(row['DESTINO_PAIS']),
            version: parseNumber(row['VERSION']),
            certification: cleanValue(row['CERTIFICACION']),
            color: cleanValue(row['COLOR']),
            packing: packing,
            preservative: preservative,
        };
    });

    // 2. Parse TALLAS
    console.log('Parsing TALLAS...');
    const sheetTallas = workbook.Sheets['TALLAS'];
    const dataTallas = XLSX.utils.sheet_to_json(sheetTallas);
    const tallasByCode = {};

    dataTallas.forEach(row => {
        const rawCode = row['CODIGO'];
        if (!rawCode) return;
        const code = String(rawCode).padStart(5, '0');

        if (!tallasByCode[code]) tallasByCode[code] = [];

        tallasByCode[code].push({
            sizeMp: cleanValue(row['TALLA_MP']),
            sizeMarked: cleanValue(row['TALLA_MARCADA']),
            uniformity: parseNumber(row['UNIFORMIDAD']),
            countFinal: cleanValue(row['CONTEO_FINAL'])
        });
    });

    // 3. Parse DEFECTOS
    console.log('Parsing DEFECTOS...');
    const sheetDefectos = workbook.Sheets['DEFECTOS'];
    const dataDefectos = XLSX.utils.sheet_to_json(sheetDefectos);
    const defectosByCode = {};

    dataDefectos.forEach(row => {
        const rawCode = row['CODIGO'];
        if (!rawCode) return;
        const code = String(rawCode).padStart(5, '0');

        if (!defectosByCode[code]) defectosByCode[code] = [];

        defectosByCode[code].push({
            defect: cleanValue(row['DEFECTO']),
            limit: cleanValue(row['VALOR'])
        });
    });

    // Combine Data
    const fullSpecs = {};
    Object.keys(products).forEach(code => {
        fullSpecs[code] = {
            ...products[code],
            sizes: tallasByCode[code] || [],
            defects: defectosByCode[code] || []
        };
    });

    // Generate TS File
    console.log('Generating TypeScript file...');
    const tsContent = `// Auto-generated from Base_Datos_Fichas_Tecnicas_DEFINITIVA.xlsx
// Do not edit manually.

export interface ProductSpec {
    description: string;
    client: string;
    brand: string;
    netWeight: number;
    netWeightUnit: string;
    grossWeight: number;
    grossWeightUnit: string;
    grossWeightMasters: number | null;
    grossWeightMastersUnit: string | null;
    overweightPct: string | null;
    productType: string;
    freezingMethod: string;
    destination: string;
    version: number;
    certification: string;
    color: string;
    packing: string;
    preservative: string | null;
    sizes: SizeSpec[];
    defects: DefectSpec[];
}

export interface SizeSpec {
    sizeMp: string;
    sizeMarked: string;
    uniformity: number | null;
    countFinal: string;
}

export interface DefectSpec {
    defect: string;
    limit: string | number; // "8%", "NO", or number
}

export const TECHNICAL_SPECS: Record<string, ProductSpec> = ${JSON.stringify(fullSpecs, null, 4)};
`;

    fs.writeFileSync(OUTPUT_PATH, tsContent, 'utf-8');
    console.log(`Successfully generated ${OUTPUT_PATH}`);

} catch (error) {
    console.error('Error:', error);
}

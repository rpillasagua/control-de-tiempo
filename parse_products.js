const fs = require('fs');
const path = require('path');

const rawDataPath = path.join(__dirname, 'temp_product_data.txt');
const rawData = fs.readFileSync(rawDataPath, 'utf8');

const lines = rawData.split('\n').filter(line => line.trim() !== '');
const productData = {};

// Skip header
for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Split by tab or multiple spaces
    const parts = line.split(/\t+/);

    if (parts.length >= 5) {
        const code = parts[0].trim();
        const client = parts[1].trim();
        let type = parts[2].trim();
        const master = parts[3].trim();
        const brand = parts[4].trim();

        if (type === 'VALOR AGREGADO') {
            type = 'VALOR_AGREGADO';
        }

        productData[code] = {
            client,
            type,
            master,
            brand,
            unit: "deriveUnit('" + master + "')" // Placeholder for function call
        };
    }
}

let output = `import { ProductType } from './types';

/**
 * Información de producto
 */
export interface ProductInfo {
    client: string;
    type: ProductType;
    master: string;
    brand: string;
    unit: 'KG' | 'LB';
}

/**
 * Helper para derivar unidad de peso desde el campo Máster
 */
function deriveUnit(master: string): 'KG' | 'LB' {
    const masterLower = master.toLowerCase();
    if (masterLower.includes(' lb') || masterLower.includes('lb ')) {
        return 'LB';
    }
    return 'KG'; // Default a KG
}

/**
 * Diccionario de productos - Códigos 00010-00517
 */
export const PRODUCT_DATA: Record<string, ProductInfo> = {
`;

for (const [code, info] of Object.entries(productData)) {
    output += `    '${code}': { client: '${info.client.replace(/'/g, "\\'")}', type: '${info.type}', master: '${info.master.replace(/'/g, "\\'")}', brand: '${info.brand.replace(/'/g, "\\'")}', unit: ${info.unit} },\n`;
}

output += `};
`;

fs.writeFileSync('new_product_data.ts', output);
console.log('Done writing to new_product_data.ts');


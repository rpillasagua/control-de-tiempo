import { ProductType, ProductInfo } from './types';
import { TECHNICAL_SPECS, ProductSpec } from './technical-specs';

/**
 * Normalizes the product type string from specs to the ProductType enum.
 * Defaults to 'ENTERO' if unknown or invalid.
 */
function normalizeProductType(typeStr: string): ProductType {
    const validTypes: ProductType[] = ['ENTERO', 'COLA', 'VALOR_AGREGADO', 'CONTROL_PESOS', 'REMUESTREO'];
    // Normalize string: uppercase and replace spaces with underscores just in case
    const normalized = typeStr.toUpperCase().replace(/\s+/g, '_') as ProductType;

    if (validTypes.includes(normalized)) {
        return normalized;
    }

    // Fallback/Inference logic if needed, or default
    return 'ENTERO';
}

/**
 * Derives the unit from the spec.
 * Uses explicit unit fields first, falls back to parsing the packing string.
 */
function deriveUnit(spec: ProductSpec): 'KG' | 'LB' {
    // 1. Try explicit Net Weight Unit
    if (spec.netWeightUnit && (spec.netWeightUnit.toUpperCase() === 'LB' || spec.netWeightUnit.toUpperCase() === 'LBS')) {
        return 'LB';
    }
    if (spec.netWeightUnit && (spec.netWeightUnit.toUpperCase() === 'KG' || spec.netWeightUnit.toUpperCase() === 'KGS')) {
        return 'KG';
    }

    // 2. Try explicit Gross Weight Unit
    if (spec.grossWeightUnit && (spec.grossWeightUnit.toUpperCase() === 'LB' || spec.grossWeightUnit.toUpperCase() === 'LBS')) {
        return 'LB';
    }

    // 3. Fallback: Parse 'packing' (formerly 'master') string
    if (spec.packing) {
        const packingLower = spec.packing.toLowerCase();
        if (packingLower.includes(' lb') || packingLower.includes('lb ')) {
            return 'LB';
        }
    }

    // Default
    return 'KG';
}

/**
 * Dynamic Dictionary of Products
 * Derived directly from TECHNICAL_SPECS to ensure a Single Source of Truth available to the application.
 */
export const PRODUCT_DATA: Record<string, ProductInfo> = Object.fromEntries(
    Object.values(TECHNICAL_SPECS).map(spec => {
        return [
            spec.code,
            {
                client: spec.client || 'SIN CLIENTE',
                brand: spec.brand || 'SIN MARCA',
                master: spec.packing || 'SIN EMPAQUE', // 'packing' in specs corresponds to 'master' in product-data
                type: normalizeProductType(spec.productType),
                unit: deriveUnit(spec)
            }
        ];
    })
);

/**
 * Códigos que requieren Doble Análisis
 * Hardcoded business rule, not present in technical specs.
 */
export const DOUBLE_ANALYSIS_CODES = [
    '00046', '00053', '00153', '00154', '00296', '00297', '00298', '00169', '00159', '00162',
    '00222', '00224', '00225', '00226', '00227', '00228', '00238', '00299', '00350', '00352',
    '00056', '00092', '00145', '00372', '00171', '00177', '00082', '00095', '00271', '00117',
    '00122', '00387', '00181', '00182', '00187', '00207', '00220', '00221', '00338', '00339',
    '00199', '00215', '00355'
];

/**
 * Weight Validations Module
 * 
 * Implements the same logic as reporte_descongelado.py for validating:
 * - Peso Bruto (Gross Weight)
 * - Peso Neto (Net Weight)
 * 
 * Based on technical specifications from product-data.ts and technical-specs.ts
 */

import { TECHNICAL_SPECS, ProductSpec } from '../technical-specs';
import { ProductType } from '../types';

interface WeightValidationResult {
    isValid: boolean;
    message?: string;
    limits?: string;
    actual?: number;
}

const EPSILON = 0.001;

/**
 * Extract number of units from packing string
 * Examples:
 *   "10 Und * 4 Lb" -> 10
 *   "1 Und * 12 Kg" -> 1
 *   "6 Und * 2 Kg" -> 6
 *   "10 Units" -> 10
 *   "10 pcs" -> 10
 */
function extractUnitsFromPacking(packing: string): number {
    // Regex matches starts with number, followed by space (optional), then "U", "Und", "Unit", "Pcs" (case insensitive)
    const match = packing.match(/^(\d+)\s*(?:Und|Units|Unit|U|Pcs)/i);
    return match ? parseInt(match[1], 10) : 1;
}

/**
 * Parse overweight percentage string to number
 * Examples: "1%" -> 0.01, "2%" -> 0.02
 */
function parseOverweightPct(overweightPct: string | null): number {
    if (!overweightPct || overweightPct === '' || overweightPct === 'null') return 0;
    const match = overweightPct.match(/([\d.]+)%/);
    return match ? parseFloat(match[1]) / 100 : 0;
}

/**
 * Convert weight to grams
 */
function toGrams(value: number, unit: string): number {
    const upperUnit = unit.toUpperCase();
    if (upperUnit.includes('LB')) {
        return value * 453.592; // 1 lb = 453.592 g
    }
    if (upperUnit.includes('KG')) {
        return value * 1000; // 1 kg = 1000 g
    }
    return value; // Assume already in grams
}

/**
 * Validate Gross Weight (Peso Bruto)
 * 
 * Logic from Python:
 * - If numUnidades >= 3: use grossWeight (PESO_BRUTO_PRODUCCION)
 * - If numUnidades < 3: use PESO_BRUTO_MASTERS (NOT AVAILABLE YET)
 * - Calculate glaseo ONLY if numUnidades >= 3
 * - Lower limit = grossWeight + glaseo
 * - Upper limit = lowerLimit + (grossWeight * overweightPct)
 */
export function validateGrossWeight(
    codigo: string,
    pesoBrutoGrams: number,
    productType: ProductType,
    displayUnit: 'KG' | 'LB' = 'KG'
): WeightValidationResult {
    if (!codigo || !pesoBrutoGrams) {
        return { isValid: true };
    }

    // Get specs
    const normalizedCode = codigo.padStart(5, '0');
    const specs = TECHNICAL_SPECS[normalizedCode];

    if (!specs) {
        return { isValid: true }; // No specs = no validation
    }

    // Extract units from packing
    const numUnidades = extractUnitsFromPacking(specs.packing || '');

    // Get base gross weight
    let baseWeightValue = specs.grossWeight || 0;
    let grossWeightUnit = specs.grossWeightUnit || 'KG';

    // Logic for small packaging (< 3 units)
    if (numUnidades < 3) {
        if (specs.grossWeightMasters) {
            baseWeightValue = specs.grossWeightMasters || 0;
            grossWeightUnit = specs.grossWeightMastersUnit || 'KG';
        } else {
            // Fallback if masters weight is missing (shouldn't happen with updated specs)
            console.warn(`⚠️ Code ${codigo}: Missing PESO_BRUTO_MASTERS for packing < 3 units. Using standard gross weight.`);
        }
    }

    // Convert base weight to grams
    const baseWeightGrams = toGrams(baseWeightValue, grossWeightUnit);

    // Calculate glaseo (only if numUnidades >= 3)
    let glaseoGrams = 0;
    if (numUnidades >= 3) {
        const glazingRatio = specs.glazingRatio || 0;
        const glazingUnit = specs.glazingUnit || '';

        if (glazingRatio > 0) {
            if (glazingUnit === '%') {
                // Percentage of Net Weight
                // Need to get Net Weight in grams first
                const netWeightValue = specs.netWeight || 0;
                const netWeightUnit = specs.netWeightUnit || 'KG';
                const netWeightGrams = toGrams(netWeightValue, netWeightUnit);
                glaseoGrams = netWeightGrams * (glazingRatio / 100);
            } else {
                // Absolute value (usually ml which is approx g for water)
                glaseoGrams = glazingRatio;
            }
        }
    }

    // Calculate limits
    const overweightPct = parseOverweightPct(specs.overweightPct);
    const lowerLimitGrams = baseWeightGrams + glaseoGrams;
    const upperLimitGrams = lowerLimitGrams + (baseWeightGrams * overweightPct);

    // Validate
    const actualKg = pesoBrutoGrams / 1000;
    const lowerLimitKg = lowerLimitGrams / 1000;
    const upperLimitKg = upperLimitGrams / 1000;

    // Use EPSILON for loose checks
    if (pesoBrutoGrams > (upperLimitGrams + EPSILON)) {
        return {
            isValid: false,
            message: `PESO BRUTO alto (${formatWeight(actualKg, displayUnit)} ${displayUnit === 'LB' ? 'Lb' : 'Kg'}) (Límite: ${formatWeight(lowerLimitKg, displayUnit)}-${formatWeight(upperLimitKg, displayUnit)} ${displayUnit === 'LB' ? 'LB' : 'KG'})`,
            limits: `${formatWeight(lowerLimitKg, displayUnit)}-${formatWeight(upperLimitKg, displayUnit)} ${displayUnit === 'LB' ? 'LB' : 'KG'}`,
            actual: actualKg
        };
    }


    if (pesoBrutoGrams < (lowerLimitGrams - EPSILON)) {
        return {
            isValid: false,
            message: `PESO BRUTO bajo (${formatWeight(actualKg, displayUnit)} ${displayUnit === 'LB' ? 'Lb' : 'Kg'}) (Límite: ${formatWeight(lowerLimitKg, displayUnit)}-${formatWeight(upperLimitKg, displayUnit)} ${displayUnit === 'LB' ? 'LB' : 'KG'})`,
            limits: `${formatWeight(lowerLimitKg, displayUnit)}-${formatWeight(upperLimitKg, displayUnit)} ${displayUnit === 'LB' ? 'LB' : 'KG'}`,
            actual: actualKg
        };
    }

    return {
        isValid: true,
        limits: `${formatWeight(lowerLimitKg, displayUnit)}-${formatWeight(upperLimitKg, displayUnit)} ${displayUnit === 'LB' ? 'LB' : 'KG'}`,
        actual: actualKg
    };
}

/**
 * Validate Net Weight (Peso Neto)
 * 
 * Logic from Python:
 * - Get net weight from specs
 * - Lower limit = netWeight (no lower tolerance)
 * - Upper limit = netWeight * (1 + overweightPct)
 */
export function validateNetWeight(
    codigo: string,
    pesoNetoGrams: number,
    productType: ProductType,
    displayUnit: 'KG' | 'LB' = 'KG'
): WeightValidationResult {
    if (!codigo || !pesoNetoGrams) {
        return { isValid: true };
    }

    // Get specs
    const normalizedCode = codigo.padStart(5, '0');
    const specs = TECHNICAL_SPECS[normalizedCode];

    if (!specs) {
        return { isValid: true }; // No specs = no validation
    }

    // Get base net weight
    const baseNetWeightValue = specs.netWeight || 0;
    const netWeightUnit = specs.netWeightUnit || 'KG';

    // Convert to grams
    const baseNetWeightGrams = toGrams(baseNetWeightValue, netWeightUnit);

    // Calculate upper limit
    const overweightPct = parseOverweightPct(specs.overweightPct);
    const upperLimitGrams = baseNetWeightGrams * (1 + overweightPct);

    // Validate
    const actualKg = pesoNetoGrams / 1000;
    const lowerLimitKg = baseNetWeightGrams / 1000;
    const upperLimitKg = upperLimitGrams / 1000;

    // Use EPSILON
    if (pesoNetoGrams > (upperLimitGrams + EPSILON)) {
        return {
            isValid: false,
            message: `PESO NETO alto (${formatWeight(actualKg, displayUnit)} ${displayUnit === 'LB' ? 'Lb' : 'Kg'}) (Límite: ${formatWeight(lowerLimitKg, displayUnit)}-${formatWeight(upperLimitKg, displayUnit)} ${displayUnit === 'LB' ? 'LB' : 'KG'})`,
            limits: `${formatWeight(lowerLimitKg, displayUnit)}-${formatWeight(upperLimitKg, displayUnit)} ${displayUnit === 'LB' ? 'LB' : 'KG'}`,
            actual: actualKg
        };
    }

    if (pesoNetoGrams < (baseNetWeightGrams - EPSILON)) {
        return {
            isValid: false,
            message: `PESO NETO bajo (${formatWeight(actualKg, displayUnit)} ${displayUnit === 'LB' ? 'Lb' : 'Kg'}) (Límite: ${formatWeight(lowerLimitKg, displayUnit)}-${formatWeight(upperLimitKg, displayUnit)} ${displayUnit === 'LB' ? 'LB' : 'KG'})`,
            limits: `${formatWeight(lowerLimitKg, displayUnit)}-${formatWeight(upperLimitKg, displayUnit)} ${displayUnit === 'LB' ? 'LB' : 'KG'}`,
            actual: actualKg
        };
    }

    return {
        isValid: true,
        limits: `${formatWeight(lowerLimitKg, displayUnit)}-${formatWeight(upperLimitKg, displayUnit)} ${displayUnit === 'LB' ? 'LB' : 'KG'}`,
        actual: actualKg
    };
}

/**
 * Helper to format weight based on display Unit
 * Takes value in KG, converts to LB if needed
 */
function formatWeight(valueInKg: number, unit: 'KG' | 'LB'): string {
    if (unit === 'LB') {
        return (valueInKg * 2.20462).toFixed(2);
    }
    return valueInKg.toFixed(2);
}

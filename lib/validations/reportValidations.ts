import { TECHNICAL_SPECS } from '../technical-specs';
import { DEFECTO_LABELS, ProductType } from '../types';
import { getNormalizedDefectKey } from '../defect-normalization';

export interface ValidationResult {
    isValid: boolean;
    message?: string;
}

export interface DefectValidationResult {
    individual: string[];
    total: string;
    hasIssues: boolean;
}

/**
 * Valida si la talla existe en la ficha técnica
 */
export const validateSize = (
    codigo: string,
    talla: string | undefined
): ValidationResult => {
    if (!talla) return { isValid: true, message: '✓ OK' };

    const normalizedCode = codigo.padStart(5, '0');
    const specs = TECHNICAL_SPECS[normalizedCode];

    if (!specs) return { isValid: true, message: '✓ OK' };

    const sizeSpec = specs.sizes.find(s =>
        (s.sizeMp && s.sizeMp.toLowerCase() === talla.toLowerCase()) ||
        (s.sizeMarked && s.sizeMarked.toLowerCase() === talla.toLowerCase())
    );

    if (!sizeSpec) {
        return { isValid: false, message: `⚠️ TALLA NO EXISTE EN FT` };
    }

    return { isValid: true, message: '✓ OK' };
};

/**
 * Valida el conteo contra las especificaciones técnicas
 */
export const validateCount = (
    codigo: string,
    talla: string | undefined,
    conteo: number | undefined
): ValidationResult => {
    if (!conteo || !talla) return { isValid: true, message: '✓ OK' };

    const normalizedCode = codigo.padStart(5, '0');
    const specs = TECHNICAL_SPECS[normalizedCode];

    if (!specs) return { isValid: true, message: '✓ OK' };

    const sizeSpec = specs.sizes.find(s =>
        (s.sizeMp && s.sizeMp.toLowerCase() === talla.toLowerCase()) ||
        (s.sizeMarked && s.sizeMarked.toLowerCase() === talla.toLowerCase())
    );

    if (sizeSpec && sizeSpec.countFinal) {
        const parts = sizeSpec.countFinal.split('-').map(p => parseFloat(p.trim()));
        if (parts.length === 2) {
            const [min, max] = parts;
            if (conteo > max) {
                return { isValid: false, message: `⚠️ CONTEO alto (${conteo})` };
            } else if (conteo < min) {
                return { isValid: false, message: `⚠️ CONTEO bajo (${conteo})` };
            }
        }
    }

    return { isValid: true, message: '✓ OK' };
};

/**
 * Valida la uniformidad contra las especificaciones técnicas
 */
export const validateUniformity = (
    codigo: string,
    talla: string | undefined,
    grandes: number | undefined,
    pequenos: number | undefined
): ValidationResult => {
    if (!grandes || !pequenos || pequenos === 0 || !talla) return { isValid: true, message: '✓ OK' };

    const normalizedCode = codigo.padStart(5, '0');
    const specs = TECHNICAL_SPECS[normalizedCode];

    if (!specs) return { isValid: true, message: '✓ OK' };

    const sizeSpec = specs.sizes.find(s =>
        (s.sizeMp && s.sizeMp.toLowerCase() === talla.toLowerCase()) ||
        (s.sizeMarked && s.sizeMarked.toLowerCase() === talla.toLowerCase())
    );

    const ratio = Number((grandes / pequenos).toFixed(2));

    if (sizeSpec && sizeSpec.uniformity && ratio > sizeSpec.uniformity) {
        return { isValid: false, message: `⚠️ UNIFORMIDAD alta (${ratio})` };
    }

    return { isValid: true, message: '✓ OK' };
};

/**
 * Valida defectos individuales y totales
 */
export const validateDefects = (
    codigo: string,
    productType: ProductType,
    pesoNeto: number | undefined,
    conteo: number | undefined,
    defectos: { [key: string]: number }
): DefectValidationResult => {
    const result: DefectValidationResult = {
        individual: [],
        total: '✓ OK',
        hasIssues: false
    };

    if (!pesoNeto || !conteo || !defectos) return result;

    const normalizedCode = codigo.padStart(5, '0');
    const specs = TECHNICAL_SPECS[normalizedCode];

    if (!specs || !specs.defects) return result;

    // Calculate total pieces
    let convertedWeight = pesoNeto;
    // If weight is > 50, assume it's in grams and convert to kg first
    if (convertedWeight > 50) {
        convertedWeight = convertedWeight / 1000;
    }

    // Unit conversion based on product type
    if (productType === 'COLA' && specs.netWeightUnit === 'KG') {
        convertedWeight = convertedWeight * 2.20462; // KG to LB
    } else if (productType === 'ENTERO' && specs.netWeightUnit === 'LB') {
        convertedWeight = convertedWeight / 2.20462; // LB to KG
    }

    const totalPieces = Math.round(conteo * convertedWeight);

    if (totalPieces <= 0) return result;

    let totalDefectsPercentage = 0;

    // Validate each defect
    Object.entries(defectos).forEach(([defectKey, quantity]) => {
        if (!quantity || quantity === 0) return;

        const percentage = (quantity / totalPieces) * 100;
        const normalizedKey = getNormalizedDefectKey(defectKey);
        const defectSpec = specs.defects.find(d => d.defect === normalizedKey);

        if (defectSpec) {
            const limitStr = defectSpec.limit.toString().toUpperCase();

            if (limitStr === 'SI') {
                // Allowed, skip
                return;
            } else if (limitStr === 'NO') {
                // Forbidden
                const defectLabel = DEFECTO_LABELS[defectKey] || defectKey;
                result.individual.push(`⚠️ ${defectLabel} alto (${percentage.toFixed(2)}%)`);
                result.hasIssues = true;
                totalDefectsPercentage += percentage;
            } else if (limitStr.includes('%')) {
                // Percentage limit
                const limitVal = parseFloat(limitStr.replace('%', ''));
                if (!isNaN(limitVal) && percentage > limitVal) {
                    const defectLabel = DEFECTO_LABELS[defectKey] || defectKey;
                    result.individual.push(`⚠️ ${defectLabel} alto (${percentage.toFixed(2)}%)`);
                    result.hasIssues = true;
                }
                totalDefectsPercentage += percentage;
            }
        }
    });

    // Validate total defects
    const totalDefectsSpec = specs.defects.find(d => d.defect === 'DEFECTOS_TOTALES');
    if (totalDefectsSpec) {
        const limitStr = totalDefectsSpec.limit.toString();
        if (limitStr.includes('%')) {
            const limitVal = parseFloat(limitStr.replace('%', ''));
            if (!isNaN(limitVal) && totalDefectsPercentage > limitVal) {
                result.total = `⚠️ TOTAL DEFECTOS alto (${totalDefectsPercentage.toFixed(2)}%)`;
                result.hasIssues = true;
            }
        }
    }

    return result;
};

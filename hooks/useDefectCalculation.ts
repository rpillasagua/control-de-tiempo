import { useMemo } from 'react';
import { useTechnicalSpecs } from './useTechnicalSpecs';
import { ProductType } from '@/lib/types';
import { getNormalizedDefectKey } from '@/lib/defect-normalization';

export interface DefectValidationResult {
    isValid: boolean;
    percentage: number;
    message: string;
    isAllowed: boolean; // True if limit is "SI" (100% allowed)
    isForbidden: boolean; // True if limit is "NO" (0% allowed)
    limitDisplay: string;
}

export interface DefectCalculationResult {
    totalPieces: number;
    defectResults: Record<string, DefectValidationResult>;
    totalDefectsPercentage: number;
    totalDefectsValidation: {
        isValid: boolean;
        message: string;
        limit: number;
    };
    isApplicable: boolean; // True only for BLOCK FROZEN or BRINE
}

export function useDefectCalculation(
    productCode: string,
    productType: ProductType | null,
    netWeight: number | undefined,
    count: number | undefined,
    defects: Record<string, number>
): DefectCalculationResult {
    const { getSpecs } = useTechnicalSpecs();
    const specs = getSpecs(productCode);

    return useMemo(() => {
        // 1. Check Applicability (BLOCK FROZEN, BRINE, or IQF)
        if (!specs || (specs.freezingMethod !== 'BLOCK FROZEN' && specs.freezingMethod !== 'BRINE' && specs.freezingMethod !== 'IQF') || !netWeight || !count || !productType) {
            return {
                totalPieces: 0,
                defectResults: {},
                totalDefectsPercentage: 0,
                totalDefectsValidation: { isValid: true, message: '', limit: 0 },
                isApplicable: false
            };
        }

        // Helper to detect if product should be treated as Cola (using lbs) based on sizes
        // User Rule:
        // Cola: 16-20, 21-25, 26-30, 31-35... (Start is NOT multiple of 10)
        // Entero: 10-20, 20-30, 30-40... (Start IS multiple of 10)
        const isColaBased = (s: any, pType: ProductType | null) => {
            if (pType === 'COLA') return true;
            if (pType === 'VALOR_AGREGADO' && s?.sizes?.length > 0) {
                const firstSize = s.sizes[0].sizeMarked || s.sizes[0].sizeMp || '';
                const match = firstSize.match(/^(\d+)-/);
                if (match) {
                    const startVal = parseInt(match[1]);
                    // If start value is multiple of 10 (10, 20, 30...), it's likely Entero
                    if (startVal % 10 === 0) return false;
                    return true;
                }
            }
            return false;
        };

        const treatAsCola = isColaBased(specs, productType);

        // 2. Unit Conversion & Total Pieces Calculation
        let convertedWeight = netWeight;

        // Handle potential input in grams or large integers (e.g., 1835 -> 1.835)
        // Assumption: Single box weight rarely exceeds 50 units (KG or LB).
        if (convertedWeight > 50) {
            convertedWeight = convertedWeight / 1000;
        }

        if (treatAsCola) {
            // Target: LB
            if (specs.netWeightUnit === 'KG') {
                convertedWeight = convertedWeight * 2.20462; // KG to LB
            }
        } else if (productType === 'ENTERO' || (productType === 'VALOR_AGREGADO' && !treatAsCola)) {
            // Target: KG
            if (specs.netWeightUnit === 'LB') {
                convertedWeight = convertedWeight / 2.20462; // LB to KG
            }
        }

        // BRINE LOGIC & SPECIAL PACKING HANDLING
        // Logic:
        // 1. Identify Brine: Explicit 'BRINE' label OR ('KG' unit + 'Und' packing).
        //    (We exclude LB from auto-detection to avoid Block Frozen false positives like "2 Und * 20 Lb").
        // 2. Efficiency Rule:
        //    - Calculate Unit Weight = NetWeight / Units.
        //    - If Unit Weight < 3kg (or 7lb): Use NetWeight (Input).
        //    - If Unit Weight >= 3kg (or 7lb): Force Base Weight to 3kg.

        const packing = specs.packing || '';
        const packingMatch = /^(\d+)\s*Und/i.exec(packing);
        const units = packingMatch ? parseInt(packingMatch[1], 10) : 1;

        const isKg = specs.netWeightUnit === 'KG';
        // Auto-detect Brine for KG products with "Und" packing (fixes "1 Und * 12 Kg" labeled as Block Frozen)
        const isHiddenBrine = isKg && packingMatch !== null;

        const isBrine = specs.freezingMethod === 'BRINE' || specs.freezingMethod === 'IQF' || isHiddenBrine;

        if (isBrine) {
            // Calculate Unit Weight
            // Note: netWeight here is the total weight from input (or specs).
            // We use the input `netWeight` if available, otherwise specs.

            // We need to use the raw input weight for threshold check, but convertedWeight for calculation.
            // Let's approximate unit weight using convertedWeight (normalized to KG/LB).
            // If productType is COLA, convertedWeight is LB. If ENTERO, it's KG.

            const currentTotalWeight = convertedWeight;
            const unitWeight = currentTotalWeight / units;

            // Thresholds: 3 KG or 7 LB
            // If convertedWeight is KG, threshold is 3. If LB, threshold is 7.
            // We can infer the unit of convertedWeight from productType logic above.
            let threshold = 3; // Default KG
            if (treatAsCola) {
                threshold = 7; // LB
            } else if (productType === 'ENTERO' || !treatAsCola) {
                threshold = 3; // KG
            }

            if (unitWeight >= threshold) {
                // Force base weight to 3 KG
                let baseWeightKg = 3;

                // Convert to appropriate unit if necessary
                if (treatAsCola) {
                    convertedWeight = baseWeightKg * 2.20462; // KG to LB
                } else {
                    convertedWeight = baseWeightKg; // KG
                }
            }
            // Else: unitWeight < threshold -> Keep convertedWeight (which is based on NetWeight)
        }

        // Calculate total pieces: count * weight
        // Example: 37 * 1.835 = 67.895 -> Round to 68
        const totalPieces = Math.round(count * convertedWeight);

        if (totalPieces === 0) {
            return {
                totalPieces: 0,
                defectResults: {},
                totalDefectsPercentage: 0,
                totalDefectsValidation: { isValid: true, message: '', limit: 0 },
                isApplicable: true
            };
        }

        // 3. Calculate Percentages & Validate
        const defectResults: Record<string, DefectValidationResult> = {};
        let totalDefectsSum = 0;

        Object.entries(defects).forEach(([defectKey, quantity]) => {
            if (!quantity) return;

            const percentage = (quantity / totalPieces) * 100;

            // Find spec for this defect using NORMALIZED key
            const normalizedKey = getNormalizedDefectKey(defectKey);
            const defectSpec = specs.defects.find(d => d.defect === normalizedKey);

            let isValid = true;
            let message = '';
            let isAllowed = false;
            let isForbidden = false;
            let limitDisplay = '';

            if (defectSpec) {
                limitDisplay = defectSpec.limit.toString();

                if (defectSpec.limit === 'SI') {
                    isAllowed = true;
                    isValid = true;
                    message = 'Permitido';
                } else if (defectSpec.limit === 'NO') {
                    isForbidden = true;
                    isValid = false; // Always fail if present
                    message = 'No permitido';
                    totalDefectsSum += percentage;
                } else {
                    // Numeric limit (e.g., "8%")
                    const limitVal = typeof defectSpec.limit === 'string'
                        ? parseFloat(defectSpec.limit.replace('%', ''))
                        : defectSpec.limit;

                    if (!isNaN(limitVal)) {
                        isValid = percentage <= limitVal;
                        message = isValid ? `OK (Max ${limitVal}%)` : `Excede ${limitVal}%`;
                        totalDefectsSum += percentage;
                    }
                }
            } else {
                // Defect not in specs -> Allowed (doesn't count to total)
                isAllowed = true;
                message = 'No especificado (Permitido)';
            }

            defectResults[defectKey] = {
                isValid,
                percentage,
                message,
                isAllowed,
                isForbidden,
                limitDisplay
            };
        });

        // 4. Validate Total Defects
        const totalDefectsSpec = specs.defects.find(d => d.defect === 'DEFECTOS_TOTALES');
        let totalLimit = 0;
        let totalValid = true;
        let totalMessage = '';

        if (totalDefectsSpec) {
            totalLimit = typeof totalDefectsSpec.limit === 'string'
                ? parseFloat(totalDefectsSpec.limit.replace('%', ''))
                : totalDefectsSpec.limit as number;

            if (!isNaN(totalLimit)) {
                totalValid = totalDefectsSum <= totalLimit;
                totalMessage = totalValid ? `Dentro del límite (${totalLimit}%)` : `Excede el límite (${totalLimit}%)`;
            }
        }

        return {
            totalPieces,
            defectResults,
            totalDefectsPercentage: totalDefectsSum,
            totalDefectsValidation: {
                isValid: totalValid,
                message: totalMessage,
                limit: totalLimit
            },
            isApplicable: true
        };

    }, [productCode, productType, netWeight, count, defects, specs]);
}

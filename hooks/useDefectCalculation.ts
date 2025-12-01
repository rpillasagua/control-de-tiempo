import { useMemo } from 'react';
import { useTechnicalSpecs } from './useTechnicalSpecs';
import { ProductType } from '@/lib/types';

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
        // 1. Check Applicability (BLOCK FROZEN or BRINE)
        if (!specs || (specs.freezingMethod !== 'BLOCK FROZEN' && specs.freezingMethod !== 'BRINE') || !netWeight || !count || !productType) {
            return {
                totalPieces: 0,
                defectResults: {},
                totalDefectsPercentage: 0,
                totalDefectsValidation: { isValid: true, message: '', limit: 0 },
                isApplicable: false
            };
        }

        // 2. Unit Conversion & Total Pieces Calculation
        let convertedWeight = netWeight;

        // Handle potential input in grams or large integers (e.g., 1835 -> 1.835)
        // Assumption: Single box weight rarely exceeds 50 units (KG or LB).
        if (convertedWeight > 50) {
            convertedWeight = convertedWeight / 1000;
        }

        if (productType === 'COLA') {
            // Target: LB
            if (specs.netWeightUnit === 'KG') {
                convertedWeight = convertedWeight * 2.20462; // KG to LB
            }
        } else if (productType === 'ENTERO') {
            // Target: KG
            if (specs.netWeightUnit === 'LB') {
                convertedWeight = convertedWeight / 2.20462; // LB to KG
            }
        }

        // BRINE LOGIC & SPECIAL PACKING HANDLING
        // Apply 3kg rule if packing starts with 1 Und, 2 Und, or 3 Und, regardless of freezing method label
        // (Some products might be labeled BLOCK FROZEN but still have this packing)
        const packing = specs.packing || '';
        const isOneTwoOrThreeUnits = /^(1|2|3)\s*Und/i.test(packing);

        if (specs.freezingMethod === 'BRINE' || isOneTwoOrThreeUnits) {
            if (isOneTwoOrThreeUnits) {
                // Force base weight to 3 KG for these packing types
                let baseWeightKg = 3;

                // Convert to appropriate unit if necessary
                if (productType === 'COLA') {
                    convertedWeight = baseWeightKg * 2.20462; // KG to LB
                } else {
                    convertedWeight = baseWeightKg; // KG
                }
            }
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

            // Find spec for this defect
            // The defect keys in `types.ts` (e.g., 'MUDADO') might match `defect` in specs.
            // We need to normalize or ensure exact match.
            const defectSpec = specs.defects.find(d => d.defect === defectKey);

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

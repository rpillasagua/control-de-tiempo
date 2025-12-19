/**
 * Hook for real-time weight validation
 * Validates gross weight and net weight against technical specifications
 */

import { useMemo } from 'react';
import { validateGrossWeight, validateNetWeight } from '../lib/validations/weightValidations';
import { ProductType } from '../lib/types';

interface WeightValidationResult {
    pesoBruto: {
        isValid: boolean;
        message: string;
        limits?: string;
    };
    pesoNeto: {
        isValid: boolean;
        message: string;
        limits?: string;
    };
}

export function useWeightValidation(
    codigo: string,
    pesoBrutoValue: number | undefined,
    pesoNetoValue: number | undefined,
    productType: ProductType | null,
    weightUnit: 'KG' | 'LB' = 'KG'
): WeightValidationResult {
    return useMemo(() => {
        const result: WeightValidationResult = {
            pesoBruto: { isValid: true, message: '' },
            pesoNeto: { isValid: true, message: '' }
        };

        // Skip validation if no product type or codigo
        if (!productType || !codigo) {
            return result;
        }

        // Helper to convert input to grams
        const toGrams = (val: number) => {
            if (weightUnit === 'LB') return val * 453.592;
            return val * 1000; // Assume KG if not LB
        };

        // Validate Peso Bruto
        if (pesoBrutoValue && pesoBrutoValue > 0) {
            const pesoBrutoGrams = toGrams(pesoBrutoValue);
            const validationResult = validateGrossWeight(codigo, pesoBrutoGrams, productType, weightUnit);

            if (validationResult.isValid) {
                result.pesoBruto = {
                    isValid: true,
                    message: validationResult.limits
                        ? `✓ Dentro del rango (${validationResult.limits})`
                        : '✓ Válido',
                    limits: validationResult.limits
                };
            } else {
                result.pesoBruto = {
                    isValid: false,
                    message: validationResult.message || 'Fuera de rango',
                    limits: validationResult.limits
                };
            }
        }

        // Validate Peso Neto
        if (pesoNetoValue && pesoNetoValue > 0) {
            const pesoNetoGrams = toGrams(pesoNetoValue);
            const validationResult = validateNetWeight(codigo, pesoNetoGrams, productType, weightUnit);

            if (validationResult.isValid) {
                result.pesoNeto = {
                    isValid: true,
                    message: validationResult.limits
                        ? `✓ Dentro del rango (${validationResult.limits})`
                        : '✓ Válido',
                    limits: validationResult.limits
                };
            } else {
                result.pesoNeto = {
                    isValid: false,
                    message: validationResult.message || 'Fuera de rango',
                    limits: validationResult.limits
                };
            }
        }

        return result;
    }, [codigo, pesoBrutoValue, pesoNetoValue, productType, weightUnit]);
}

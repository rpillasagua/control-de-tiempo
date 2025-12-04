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
    pesoBrutoKg: number | undefined,
    pesoNetoKg: number | undefined,
    productType: ProductType | null
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

        // Validate Peso Bruto
        // NOTE: Input values are already in GRAMS, no conversion needed
        if (pesoBrutoKg && pesoBrutoKg > 0) {
            const pesoBrutoGrams = pesoBrutoKg; // Already in grams
            const validationResult = validateGrossWeight(codigo, pesoBrutoGrams, productType);

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
        // NOTE: Input values are already in GRAMS, no conversion needed
        if (pesoNetoKg && pesoNetoKg > 0) {
            const pesoNetoGrams = pesoNetoKg; // Already in grams
            const validationResult = validateNetWeight(codigo, pesoNetoGrams, productType);

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
    }, [codigo, pesoBrutoKg, pesoNetoKg, productType]);
}

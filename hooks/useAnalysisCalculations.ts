import React, { useMemo } from 'react';
import { Analysis } from '@/lib/types';

export const useAnalysisCalculations = (
    currentAnalysis: Analysis | undefined,
    sizeSpec: any
) => {
    const EPSILON = 0.001;

    // Calcular ratio de uniformidad
    const uniformityRatio = useMemo(() => {
        if (!currentAnalysis) return null;
        const grandes = currentAnalysis.uniformidad?.grandes?.valor;
        const pequenos = currentAnalysis.uniformidad?.pequenos?.valor;
        if (!grandes || !pequenos || pequenos === 0) return null;
        return grandes / pequenos;
    }, [currentAnalysis]);

    // Validar uniformidad
    const uniformityValidation = useMemo(() => {
        if (!uniformityRatio || !sizeSpec?.uniformity) {
            return { isValid: true, message: '' };
        }
        // Use EPSILON for float comparison
        const isValid = uniformityRatio <= (sizeSpec.uniformity + EPSILON);
        return {
            isValid,
            message: isValid
                ? `✓ Dentro (≤ ${sizeSpec.uniformity.toFixed(2)})`
                : `⚠️ Fuera (límite: ${sizeSpec.uniformity.toFixed(2)})`
        };
    }, [uniformityRatio, sizeSpec]);

    // Validar conteo
    const conteoValidation = useMemo(() => {
        if (!currentAnalysis) return { isValid: true, message: '' };
        const conteo = currentAnalysis.conteo;

        if (!conteo || !sizeSpec?.countFinal) return { isValid: true, message: '' };

        // More robust regex: allows "10-20", "10/20", "10 to 20", "10 20"
        const match = sizeSpec.countFinal.toString().match(/(\d+)[\s\-\/a-zA-Z]+(\d+)/);

        if (!match) return { isValid: true, message: '' };
        const [, min, max] = [null, parseInt(match[1]), parseInt(match[2])];
        const isValid = conteo >= min && conteo <= max;
        return {
            isValid,
            message: isValid ? `✓ Rango OK (${sizeSpec.countFinal})` : `⚠️ Fuera (${sizeSpec.countFinal})`
        };
    }, [currentAnalysis, sizeSpec]);

    // Calcular Glaseo ((Congelado - Neto) / Neto * 100)
    const calculatedGlazing = useMemo(() => {
        if (!currentAnalysis) return null;
        const net = currentAnalysis.pesoNeto?.valor;
        const frozen = currentAnalysis.pesoCongelado?.valor;
        if (!net || !frozen || net === 0) return null;
        return ((frozen - net) / net) * 100;
    }, [currentAnalysis]);

    return {
        uniformityRatio,
        uniformityValidation,
        conteoValidation,
        calculatedGlazing
    };
};

import React, { useMemo } from 'react';
import { Analysis } from '@/lib/types';

export const useAnalysisCalculations = (
    currentAnalysis: Analysis | undefined,
    sizeSpec: any
) => {
    // Calcular ratio de uniformidad
    const uniformityRatio = useMemo(() => {
        if (!currentAnalysis) return null;
        const analysis = currentAnalysis as any;
        const grandes = analysis.uniformidad?.grandes?.valor;
        const pequenos = analysis.uniformidad?.pequenos?.valor;
        if (!grandes || !pequenos || pequenos === 0) return null;
        return grandes / pequenos;
    }, [currentAnalysis]);

    // Validar uniformidad
    const uniformityValidation = useMemo(() => {
        if (!uniformityRatio || !sizeSpec?.uniformity) {
            return { isValid: true, message: '' };
        }
        const isValid = uniformityRatio <= sizeSpec.uniformity;
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
        const analysis = currentAnalysis as any;
        const conteo = analysis.conteo;
        if (!conteo || !sizeSpec?.countFinal) return { isValid: true, message: '' };
        const match = sizeSpec.countFinal.match(/(\d+)-(\d+)/);
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
        const analysis = currentAnalysis as any;
        const net = analysis.pesoNeto?.valor;
        const frozen = analysis.pesoCongelado?.valor;
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

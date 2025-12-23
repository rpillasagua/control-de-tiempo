import { useState, useEffect } from 'react';
import { TECHNICAL_SPECS, ProductSpec } from '../lib/technical-specs';
import { getAllCustomProductSpecs, CustomProductSpec } from '../lib/customProductService';

export function useTechnicalSpecs() {
    // Initialize with static specs
    const [combinedSpecs, setCombinedSpecs] = useState<Record<string, ProductSpec>>(TECHNICAL_SPECS);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch custom specs on mount
    useEffect(() => {
        const fetchCustomSpecs = async () => {
            try {
                const customSpecsList = await getAllCustomProductSpecs();

                if (customSpecsList && customSpecsList.length > 0) {
                    const customSpecsMap: Record<string, ProductSpec> = {};

                    customSpecsList.forEach((custom: CustomProductSpec) => {
                        // FORCE FIX: Ignore custom spec for 00554 to use static definition
                        if (custom.code === '00554') return;

                        // Map CustomProductSpec (Firebase) to ProductSpec (App Type)
                        // Ensure all required fields for ProductSpec are present or defaulted
                        customSpecsMap[custom.code] = {
                            code: custom.code,
                            description: custom.description || `Ficha Manual - ${custom.code}`,
                            client: custom.client,
                            brand: custom.brand,
                            netWeight: custom.netWeight || null,
                            netWeightUnit: custom.netWeightUnit || null,
                            grossWeight: custom.grossWeight || null,
                            grossWeightUnit: custom.grossWeightUnit || null,
                            grossWeightMasters: custom.grossWeightMasters || null, // Not always present in custom
                            grossWeightMastersUnit: custom.grossWeightMastersUnit || null,
                            overweightPct: custom.overweightPct || null,
                            productType: custom.type,
                            freezingMethod: custom.freezingMethod || null,
                            destination: custom.destination || null,
                            version: custom.version || 1,
                            certification: custom.certification || null,
                            color: custom.color || null,
                            packing: custom.packing || custom.master, // Fallback to master if packing missing
                            preservative: custom.preservative || null,
                            glazingRatio: custom.glazingRatio || null,
                            glazingUnit: custom.glazingUnit || null,
                            sizes: custom.sizes?.map(s => ({
                                sizeMp: s.sizeMp,
                                countMp: s.countMp,
                                sizeMarked: s.sizeMarked,
                                uniformity: s.uniformity || null,
                                countFinal: s.countFinal
                            })) || [],
                            defects: custom.defects?.map(d => ({
                                defect: d.defect,
                                limit: d.limit
                            })) || []
                        };
                    });

                    // Merge static and custom specs
                    // Custom specs overwrite static ones if code exists in both (though usually they shouldn't overlap)
                    setCombinedSpecs(prev => ({
                        ...prev,
                        ...customSpecsMap
                    }));
                }
            } catch (error) {
                console.error("Error loading custom specs:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCustomSpecs();
    }, []);

    const getSpecs = (code: string): ProductSpec | null => {
        if (!code) return null;
        const normalizedCode = code.padStart(5, '0');
        return combinedSpecs[normalizedCode] || null;
    };

    const validateSize = (code: string, size: string, productType: string): { isValid: boolean; message?: string } => {
        if (!code || !size) return { isValid: true };

        if (productType === 'VALOR_AGREGADO') {
            return { isValid: true };
        }

        const specs = getSpecs(code);
        if (!specs) return { isValid: true };

        const validSize = specs.sizes?.find(s =>
            (s.sizeMp && s.sizeMp.toLowerCase() === size.toLowerCase()) ||
            (s.sizeMarked && s.sizeMarked.toLowerCase() === size.toLowerCase())
        );

        if (!validSize) {
            const validSizesList = specs.sizes ?
                .map(s => s.sizeMarked || s.sizeMp)
                    .filter(Boolean)
                    .join(', ') || '';

            return {
                isValid: false,
                message: `Talla "${size}" no coincide. Esperadas: ${validSizesList}`
            };
        }

        return { isValid: true };
    };

    const validateCount = (code: string, size: string, countValue: number): { isValid: boolean; message?: string; expected?: string } => {
        if (!code || !size || !countValue) return { isValid: true };

        const specs = getSpecs(code);
        if (!specs) return { isValid: true };

        const sizeSpec = specs.sizes?.find(s =>
            (s.sizeMp && s.sizeMp.toLowerCase() === size.toLowerCase()) ||
            (s.sizeMarked && s.sizeMarked.toLowerCase() === size.toLowerCase())
        );

        if (!sizeSpec || !sizeSpec.countFinal) return { isValid: true };

        const parts = sizeSpec.countFinal.split('-').map(p => parseFloat(p.trim()));
        if (parts.length === 2) {
            const [min, max] = parts;
            if (countValue < min || countValue > max) {
                return {
                    isValid: false,
                    message: `Fuera de rango (${sizeSpec.countFinal})`,
                    expected: sizeSpec.countFinal
                };
            }
        }

        return { isValid: true, expected: sizeSpec.countFinal };
    };

    const validateUniformity = (code: string, size: string, uniformityValue: number): { isValid: boolean; message?: string; limit?: number } => {
        if (!code || !size || !uniformityValue) return { isValid: true };

        const specs = getSpecs(code);
        if (!specs) return { isValid: true };

        const sizeSpec = specs.sizes?.find(s =>
            (s.sizeMp && s.sizeMp.toLowerCase() === size.toLowerCase()) ||
            (s.sizeMarked && s.sizeMarked.toLowerCase() === size.toLowerCase())
        );

        if (!sizeSpec || !sizeSpec.uniformity) return { isValid: true };

        if (uniformityValue > sizeSpec.uniformity) {
            return {
                isValid: false,
                message: `Fuera de parámetro (Max: ${sizeSpec.uniformity})`,
                limit: sizeSpec.uniformity
            };
        }

        return { isValid: true, limit: sizeSpec.uniformity };
    };

    return {
        getSpecs,
        validateSize,
        validateCount,
        validateUniformity,
        isLoading
    };
}

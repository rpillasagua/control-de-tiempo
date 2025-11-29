import { TECHNICAL_SPECS, ProductSpec } from '../lib/technical-specs';

export function useTechnicalSpecs() {

    const getSpecs = (code: string): ProductSpec | null => {
        if (!code) return null;
        // Handle potential leading zeros if input doesn't have them, or vice versa
        // The keys in TECHNICAL_SPECS are 5 digits (e.g. "00038")
        const normalizedCode = code.padStart(5, '0');
        return TECHNICAL_SPECS[normalizedCode] || null;
    };

    const validateSize = (code: string, size: string, productType: string): { isValid: boolean; message?: string } => {
        if (!code || !size) return { isValid: true };

        // Skip validation for VALOR_AGREGADO as requested
        if (productType === 'VALOR_AGREGADO') {
            return { isValid: true };
        }

        const specs = getSpecs(code);
        if (!specs) return { isValid: true };

        // Check against both sizeMp and sizeMarked
        const validSize = specs.sizes.find(s =>
            (s.sizeMp && s.sizeMp.toLowerCase() === size.toLowerCase()) ||
            (s.sizeMarked && s.sizeMarked.toLowerCase() === size.toLowerCase())
        );

        if (!validSize) {
            const validSizesList = specs.sizes
                .map(s => s.sizeMarked || s.sizeMp) // Prefer marked for display
                .filter(Boolean)
                .join(', ');

            return {
                isValid: false,
                message: `Talla "${size}" no coincide con la ficha técnica. Tallas esperadas: ${validSizesList}`
            };
        }

        return { isValid: true };
    };

    const validateCount = (code: string, size: string, countValue: number): { isValid: boolean; message?: string; expected?: string } => {
        if (!code || !size || !countValue) return { isValid: true };

        const specs = getSpecs(code);
        if (!specs) return { isValid: true };

        const sizeSpec = specs.sizes.find(s =>
            (s.sizeMp && s.sizeMp.toLowerCase() === size.toLowerCase()) ||
            (s.sizeMarked && s.sizeMarked.toLowerCase() === size.toLowerCase())
        );

        if (!sizeSpec || !sizeSpec.countFinal) return { isValid: true };

        // Parse count range "17-19"
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

        const sizeSpec = specs.sizes.find(s =>
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
        validateUniformity
    };
}

import { Analysis } from './types';

/**
 * Actualiza un campo específico de un análisis dentro de un array de análisis.
 * Maneja correctamente la inmutabilidad y campos anidados complejos.
 * 
 * @param analyses Array actual de análisis
 * @param index Índice del análisis a actualizar
 * @param field Campo a actualizar (soporta notación de puntos para anidación simple o claves especiales)
 * @param value Nuevo valor
 * @returns Nuevo array de análisis con la actualización aplicada
 */
export const updateAnalysisField = (
    analyses: Analysis[],
    index: number,
    field: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any
): Analysis[] => {
    return analyses.map((analysis, i) => {
        if (i !== index) return analysis;

        // Caso 1: Campos de Uniformidad (ej. 'uniformidad_grandes', 'uniformidad_pequenos')
        if (field.startsWith('uniformidad_')) {
            const tipo = field.split('_')[1] as 'grandes' | 'pequenos';
            const currentUniformidad = analysis.uniformidad || {};
            const currentTipo = currentUniformidad[tipo] || {};


            // Si el valor es un objeto (ej. actualización parcial), hacemos merge
            // Si es un string (ej. URL de foto), actualizamos solo fotoUrl
            // Dependiendo de cómo se use, aquí asumimos que si pasamos un valor directo a 'uniformidad_grandes',
            // estamos actualizando todo el objeto o una propiedad específica.
            // Para simplificar y mantener compatibilidad con el código existente de PageContent:

            // Si value tiene 'fotoUrl', es una actualización de foto
            if (value && typeof value === 'object' && 'fotoUrl' in value) {
                return {
                    ...analysis,
                    uniformidad: {
                        ...currentUniformidad,
                        [tipo]: {
                            ...currentTipo,
                            ...value
                        }
                    }
                };
            }

            // Si value es string, asumimos que es la URL de la foto (caso común en handlePhotoCapture)
            if (typeof value === 'string') {
                return {
                    ...analysis,
                    uniformidad: {
                        ...currentUniformidad,
                        [tipo]: {
                            ...currentTipo,
                            fotoUrl: value
                        }
                    }
                };
                return updated;
            }

            return analysis;
        }

        // Caso 2: Campos de Peso (pesoBruto, pesoCongelado, pesoNeto)
        if (['pesoBruto', 'pesoCongelado', 'pesoNeto', 'pesoConGlaseo', 'pesoSinGlaseo'].includes(field)) {
            const currentFieldValue = analysis[field as keyof Analysis] as any || {};

            // Si value es string, es URL de foto
            if (typeof value === 'string') {
                return {
                    ...analysis,
                    [field]: {
                        ...currentFieldValue,
                        fotoUrl: value
                    }
                };
            }

            // Si value es objeto, hacemos merge
            if (typeof value === 'object' && value !== null) {
                return {
                    ...analysis,
                    [field]: {
                        ...currentFieldValue,
                        ...value
                    }
                };
            }
        }

        // Caso 3: Actualización directa de propiedad raíz
        return {
            ...analysis,
            [field]: value
        };
    });
};

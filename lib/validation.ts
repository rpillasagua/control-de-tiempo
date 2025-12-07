import { z } from 'zod';

/**
 * Esquemas de validación con Zod para datos de análisis
 */

// Esquema para un peso individual
export const PesoSchema = z.object({
    valor: z.number()
        .min(0, 'El peso no puede ser negativo')
        .optional(),
    fotoUrl: z.string().url().optional().or(z.literal(''))
});

// Esquema para registro de peso bruto
export const PesoBrutoRegistroSchema = z.object({
    id: z.string(),
    talla: z.string().optional(),
    peso: z.number().min(0),
    timestamp: z.string(),
    fotoUrl: z.string().url().optional().or(z.literal(''))
});

// Esquema para conteo de uniformidad
export const UniformidadSchema = z.object({
    grandes: PesoSchema.optional(),
    pequenos: PesoSchema.optional()
});

// Esquema para defectos
export const DefectosSchema = z.record(
    z.string(),
    z.number().int().min(0)
);

// Esquema para un análisis individual (Analysis)
export const AnalysisItemSchema = z.object({
    numero: z.number().int(),
    pesoBruto: PesoSchema.optional(),
    pesoNeto: PesoSchema.optional(),
    pesoCongelado: PesoSchema.optional(),
    pesosBrutos: z.array(PesoBrutoRegistroSchema).optional(),
    conteo: z.number().optional(),
    uniformidad: UniformidadSchema.optional(),
    defectos: DefectosSchema.optional(),
    fotoCalidad: z.union([
        z.string().url(),
        z.literal(''),
        z.null(),
        z.undefined()
    ]).optional(),
    observations: z.string().optional()
}).refine(
    (data) => {
        // Validación cruzada: peso neto no puede ser mayor que peso bruto
        if (data.pesoNeto?.valor && data.pesoBruto?.valor) {
            return data.pesoNeto.valor <= data.pesoBruto.valor;
        }
        return true;
    },
    {
        message: 'El peso neto no puede ser mayor que el peso bruto',
        path: ['pesoNeto']
    }
);

// Esquema completo de análisis de calidad (QualityAnalysis)
export const QualityAnalysisSchema = z.object({
    id: z.string(),
    productType: z.enum(['ENTERO', 'COLA', 'VALOR_AGREGADO', 'CONTROL_PESOS', 'REMUESTREO']),
    lote: z.string().min(1, 'El lote es obligatorio'),
    codigo: z.string().min(1, 'El código es obligatorio'),
    talla: z.string().optional(),
    analystColor: z.enum(['red', 'blue', 'green', 'yellow']).optional(),
    analyses: z.array(AnalysisItemSchema).min(1, 'Debe haber al menos un análisis'),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
    createdBy: z.string(),
    shift: z.enum(['DIA', 'NOCHE']),
    date: z.string(),
    status: z.enum(['EN_PROGRESO', 'COMPLETADO']).optional(),
    completedAt: z.string().optional(),
    observations: z.string().optional(),
    // Campos adicionales para REMUESTREO y otros
    sections: z.object({
        weights: z.boolean(),
        uniformity: z.boolean(),
        defects: z.boolean()
    }).optional(),
    globalPesoBruto: PesoSchema.optional(),
    customProductInfo: z.object({
        client: z.string(),
        brand: z.string(),
        master: z.string(),
        type: z.enum(['ENTERO', 'COLA', 'VALOR_AGREGADO', 'CONTROL_PESOS', 'REMUESTREO']),
        unit: z.enum(['KG', 'LB'])
    }).optional(),
    // Configuración avanzada para REMUESTREO
    remuestreoConfig: z.object({
        reason: z.string().optional(),
        linkedAnalysisId: z.string().optional(),
        activeFields: z.object({
            pesoBruto: z.boolean().optional(),
            pesoNeto: z.boolean().optional(),
            pesoCongelado: z.boolean().optional(),
            pesoSubmuestra: z.boolean().optional(),
            pesoGlaseo: z.boolean().optional(),
            conteo: z.boolean().optional(),
            uniformidad: z.boolean().optional(),
            defectos: z.boolean().optional()
        })
    }).nullable().optional()
});

/**
 * Helper para validar datos antes de guardar
 */
export function validateAnalysisData(data: unknown) {
    return QualityAnalysisSchema.safeParse(data);
}

/**
 * Helper para obtener errores de validación en formato legible
 */
export function getValidationErrors(errors: z.ZodError) {
    return errors.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
    }));
}

/**
 * Type helpers derivados de los schemas
 */
export type ValidatedPeso = z.infer<typeof PesoSchema>;
export type ValidatedAnalysisItem = z.infer<typeof AnalysisItemSchema>;
export type ValidatedQualityAnalysis = z.infer<typeof QualityAnalysisSchema>;

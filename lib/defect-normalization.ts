
// Map System Defect Keys (from types.ts) to Technical Specs Defect Strings (from technical-specs.ts)
export const DEFECT_NORMALIZATION_MAP: Record<string, string> = {
    // Cabeza
    'CABEZA_ROJA_FUERTE': 'CABEZA_ROJA',
    'CABEZA_NARANJA': 'CABEZA_NARANJA', // Match
    'CABEZA_FLOJA': 'CABEZA_FLOJA', // Match
    'CABEZA_DESCOLGADA': 'CABEZA_DESCOLGADA', // Match

    // Branquias (Matches found in specs list)
    'BRANQUIAS_OSCURAS_LEVES': 'BRANQUIAS_OSCURAS_LEVES',
    'BRANQUIAS_OSCURAS_FUERTES': 'BRANQUIAS_OSCURAS_FUERTES',
    'BRANQUIAS_AMARILLAS_LEVES': 'BRANQUIAS_AMARILLAS_LEVES',
    'BRANQUIAS_AMARILLAS_FUERTES': 'BRANQUIAS_AMARILLAS_FUERTES',

    // Hongo Bucal (Matches found)
    'HONGO_BUCAL_LEVE': 'HONGO_BUCAL_LEVE',
    'HONGO_BUCAL_FUERTE': 'HONGO_BUCAL_FUERTE',

    // Hepatopancreas (Mismatches)
    'HEPATOPANCREAS_REVENTADO': 'HEPATO_REVENTADO',
    'HEPATOPANCREAS_REGADO': 'HEPATO_REGADO',
    'RESIDUOS_DE_HEPATOPANCREAS': 'RESIDUOS_DE_HEPATOPANCREAS', // Match

    // Estado Físico
    'FLACIDO': 'FLACIDO', // Match
    'MUDADO': 'MUDADO', // Match
    'MALTRATADO': 'MALTRATADO', // Match
    'DESHIDRATADO': 'DESHIDRATADO', // Match
    'QUEBRADOS': 'QUEBRADO', // Plural mismatch
    'DEFORMES_LEVES': 'DEFORMES_LEVES', // Match
    'DEFORMES_FUERTES': 'DEFORMES_FUERTES', // Match

    // Color / Manchas
    'MELANOSIS': 'MELANOSIS', // Match
    'MANCHAS_NEGRAS_LEVES': 'MANCHAS_NEGRAS_LEVES', // Match
    'MANCHAS_NEGRAS_FUERTES': 'MANCHAS_NEGRAS_FUERTES', // Match
    'SEMI_ROSADO': 'SEMIROSADO', // Underscore mismatch
    'ROSADOS': 'ROSADO', // Plural mismatch
    'ROJOS': 'ROJOS', // Not found in specs list? Assuming match or missing.

    // Hemolinfas
    'HEMOLINFAS_LEVE': 'HEMOLINFAS_LEVES', // Singular/Plural mismatch
    'HEMOLINFAS_FUERTES': 'HEMOLINFAS_FUERTES', // Match

    // Otros
    'MATERIAL_EXTRANO': 'MATERIAL_EXTRAÑO', // Encoding mismatch
    'PEQUENOS_JUVENILES': 'PEQUENOS_JUVENILES', // Not found in specs list? Keeping as is.
    'MAL_DESCABEZADO': 'MAL_DESCABEZADO', // Match
    'MAL_DESCABEZADOS': 'MAL_DESCABEZADO', // Plural mismatch (Valor Agregado)

    // Valor Agregado Specific
    'CORBATA': 'CORBATA', // Not found in specs list?
    'PATAS': 'PATAS', // Not found
    'SIN_TELSON': 'SIN_TELSON', // Match
    'RESTO_DE_VENAS': 'RESTOS_DE_VENAS', // Singular/Plural mismatch
    'CASCARA_APARTE': 'CASCARA_APARTE', // Match
    'CORTE_IRREGULAR': 'CORTE_IRREGULAR', // Match
    'CORTE_PROFUNDO': 'CORTE_PROFUNDO', // Match
    'CORTE_LARGO': 'CORTE_LARGO', // Match
    'FALTA_DE_CORTE': 'FALTA_DE_CORTE', // Match
    'OJAL': 'OJAL', // Not found
    'LOMO_DANADO': 'LOMO_DANADO', // Not found
    'PEGADOS_Y_AGRUPADOS': 'PEGADOS_Y_AGRUPADOS', // Not found
};

export function getNormalizedDefectKey(systemKey: string): string {
    return DEFECT_NORMALIZATION_MAP[systemKey] || systemKey;
}

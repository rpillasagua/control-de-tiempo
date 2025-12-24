// ============================================
// TIPOS DEL SISTEMA DE RESISTENCIAS (Legacy) - REMOVED
// ============================================
// (Deleted unused legacy types: TestType, Sample, ResistanceTest)

// ============================================
// TIPOS DE PRODUCTO (Nuevo Sistema Análisis)
// ============================================

/**
 * Información detallada del producto (Ficha Técnica)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface ProductInfo {
  client: string;
  type: ProductType;
  master: string;
  brand: string;
  unit: 'KG' | 'LB';
}

/**
 * Tipo de producto a analizar
 */
export type ProductType = 'ENTERO' | 'COLA' | 'VALOR_AGREGADO' | 'CONTROL_PESOS' | 'REMUESTREO';

/**
 * Etiquetas para mostrar en UI
 */
export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  ENTERO: '🦐 Entero',
  COLA: '🍤 Cola',
  VALOR_AGREGADO: '🥘 Valor Agregado',
  CONTROL_PESOS: '⚖️ Control de Pesos',
  REMUESTREO: '🔄 Remuestreo'
};

/**
 * Turnos de trabajo
 */
export type WorkShift = 'DIA' | 'NOCHE';

export const SHIFT_LABELS: Record<WorkShift, string> = {
  DIA: 'Turno Día (7:10 AM - 7:10 PM)',
  NOCHE: 'Turno Noche (7:10 PM - 7:10 AM)'
};

/**
 * Modos de visualización
 */
export type ViewMode = 'SUELTA' | 'COMPACTA';

// ============================================
// DEFECTOS POR TIPO DE PRODUCTO
// ============================================

export const DEFECTOS_ENTERO = [
  'CABEZA_ROJA_FUERTE',
  'CABEZA_NARANJA',
  'CABEZA_FLOJA',
  'CABEZA_DESCOLGADA',
  'BRANQUIAS_OSCURAS_LEVES',
  'BRANQUIAS_OSCURAS_FUERTES',
  'BRANQUIAS_AMARILLAS_LEVES',
  'BRANQUIAS_AMARILLAS_FUERTES',
  'HONGO_BUCAL_LEVE',
  'HONGO_BUCAL_FUERTE',
  'HEPATOPANCREAS_REVENTADO',
  'HEPATOPANCREAS_REGADO',
  'FLACIDO',
  'MUDADO',
  'MELANOSIS',
  'MANCHAS_NEGRAS_LEVES',
  'MANCHAS_NEGRAS_FUERTES',
  'HEMOLINFAS_LEVE',
  'HEMOLINFAS_FUERTES',
  'PEQUENOS_JUVENILES',
  'QUEBRADOS',
  'MATERIAL_EXTRANO',
  'MALTRATADO',
  'PLEOPODOS'
] as const;

export const DEFECTOS_COLA = [
  'MELANOSIS',
  'HEPATOPANCREAS_REGADO',
  'FLACIDO',
  'MUDADO',
  'MANCHAS_NEGRAS_LEVES',
  'MANCHAS_NEGRAS_FUERTES',
  'SEMI_ROSADO',
  'ROSADOS',
  'ROJOS',
  'DEFORMES_LEVES',
  'DEFORMES_FUERTES',
  'QUEBRADOS',
  'PEQUENOS_JUVENILES',
  'MATERIAL_EXTRANO',
  'MAL_DESCABEZADO',
  'MALTRATADO',
  'DESHIDRATADO',
  'RESIDUOS_DE_HEPATOPANCREAS',
  'PLEOPODOS'
] as const;

export const DEFECTOS_VALOR_AGREGADO = [
  'MELANOSIS',
  'MATERIAL_EXTRANO',
  'MAL_DESCABEZADOS',
  'RESIDUOS_DE_HEPATOPANCREAS',
  'CORBATA',
  'PATAS',
  'SIN_TELSON',
  'RESTO_DE_VENAS',
  'CASCARA_APARTE',
  'CORTE_IRREGULAR',
  'CORTE_PROFUNDO',
  'CORTE_LARGO',
  'FALTA_DE_CORTE',
  'OJAL',
  'LOMO_DANADO',
  'PEGADOS_Y_AGRUPADOS',
  'SEMI_ROSADO',
  'ROSADOS',
  'ROJOS',
  'MALTRATADO',
  'QUEBRADOS',
  'DESHIDRATADO',
  'FLACIDO',
  'MUDADO',
  'MANCHAS_NEGRAS_LEVES',
  'MANCHAS_NEGRAS_FUERTES',
  'CURVATURA'
] as const;

export const DEFECTO_LABELS: Record<string, string> = {
  CABEZA_ROJA_FUERTE: 'Cabeza Roja Fuerte',
  CABEZA_NARANJA: 'Cabeza Naranja',
  CABEZA_FLOJA: 'Cabeza Floja',
  CABEZA_DESCOLGADA: 'Cabeza Descolgada',
  BRANQUIAS_OSCURAS_LEVES: 'Branquias Oscuras Leves',
  BRANQUIAS_OSCURAS_FUERTES: 'Branquias Oscuras Fuertes',
  BRANQUIAS_AMARILLAS_LEVES: 'Branquias Amarillas Leves',
  BRANQUIAS_AMARILLAS_FUERTES: 'Branquias Amarillas Fuertes',
  HONGO_BUCAL_LEVE: 'Hongo Bucal Leve',
  HONGO_BUCAL_FUERTE: 'Hongo Bucal Fuerte',
  HEPATOPANCREAS_REVENTADO: 'Hepatopáncreas Reventado',
  HEPATOPANCREAS_REGADO: 'Hepatopáncreas Regado',
  FLACIDO: 'Flácido',
  MUDADO: 'Mudado',
  MELANOSIS: 'Melanosis',
  MANCHAS_NEGRAS_LEVES: 'Manchas Negras Leves',
  MANCHAS_NEGRAS_FUERTES: 'Manchas Negras Fuertes',
  HEMOLINFAS_LEVE: 'Hemolinfas Leve',
  HEMOLINFAS_FUERTES: 'Hemolinfas Fuertes',
  PEQUENOS_JUVENILES: 'Pequeños/Juveniles',
  QUEBRADOS: 'Quebrados',
  MATERIAL_EXTRANO: 'Material Extraño',
  MAL_DESCABEZADO: 'Mal Descabezado',
  SEMI_ROSADO: 'Semi Rosado',
  ROSADOS: 'Rosados',
  ROJOS: 'Rojos',
  DEFORMES_LEVES: 'Deformes Leves',
  DEFORMES_FUERTES: 'Deformes Fuertes',
  MAL_DESCABEZADOS: 'Mal Descabezados',
  RESIDUOS_DE_HEPATOPANCREAS: 'Residuos de Hepatopáncreas',
  CORBATA: 'Corbata',
  PATAS: 'Patas',
  SIN_TELSON: 'Sin Telson',
  RESTO_DE_VENAS: 'Resto de Venas',
  CASCARA_APARTE: 'Cáscara Aparte',
  CORTE_IRREGULAR: 'Corte Irregular',
  CORTE_PROFUNDO: 'Corte Profundo',
  CORTE_LARGO: 'Corte Largo',
  FALTA_DE_CORTE: 'Falta de Corte',
  OJAL: 'Ojal',
  LOMO_DANADO: 'Lomo Dañado',
  PEGADOS_Y_AGRUPADOS: 'Pegados y Agrupados',
  MALTRATADO: 'Maltratado',
  DESHIDRATADO: 'Deshidratado',
  CURVATURA: 'Curvatura',
  PLEOPODOS: 'Pleópodos'
};

// ============================================
// ESTRUCTURA DE DATOS DEL ANÁLISIS
// ============================================

export interface PesoConFoto {
  valor?: number;
  fotoUrl?: string;
}

export interface Uniformidad {
  grandes?: PesoConFoto;
  pequenos?: PesoConFoto;
}

export type KnownDefect =
  | typeof DEFECTOS_ENTERO[number]
  | typeof DEFECTOS_COLA[number]
  | typeof DEFECTOS_VALOR_AGREGADO[number];

export type Defectos = {
  [key in KnownDefect]?: number;
} & { [key: string]: number }; // Allow string for backward compatibility but prioritize known keys

/**
 * Registro individual de peso bruto
 */
export interface PesoBrutoRegistro {
  id: string;
  talla?: string;
  peso: number;
  fotoUrl?: string;
  timestamp: string;
}

// ============================================
// COLORES DEL ANALISTA
// ============================================

/**
 * Colores disponibles para identificar análisis por analista
 * Máximo 4 analistas por turno
 */
export type AnalystColor = 'red' | 'blue' | 'green' | 'yellow' | 'pink';

export const ANALYST_COLOR_LABELS: Record<AnalystColor, string> = {
  red: 'Rojo',
  blue: 'Azul',
  green: 'Verde',
  yellow: 'Amarillo',
  pink: 'Rosado'
};

export const ANALYST_COLOR_HEX: Record<AnalystColor, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  pink: '#ec4899'
};

// ============================================
// ANÁLISIS INDIVIDUAL (SUB-ANÁLISIS)
// ============================================

/**
 * Un análisis individual dentro de un documento de análisis de calidad
 * Permite múltiples análisis para el mismo lote/código/talla
 */
export interface Analysis {
  id: string; // Unique identifier for multi-device safety
  numero: number; // 1, 2, 3, etc.

  // Pesos con fotos opcionales
  pesoBruto?: PesoConFoto;
  pesoCongelado?: PesoConFoto;
  pesoSinGlaseo?: PesoConFoto;
  pesoSubmuestra?: PesoConFoto;
  pesoNeto?: PesoConFoto;
  pesoConGlaseo?: PesoConFoto;
  glazingPercentage?: number; // Calculated (Net / Frozen * 100)

  // Control de pesos brutos (múltiples registros)
  pesosBrutos?: PesoBrutoRegistro[];

  // Conteo
  conteo?: number;

  // Uniformidad con fotos
  uniformidad?: Uniformidad;

  // Defectos según tipo de producto
  defectos?: Defectos;

  // Foto de calidad general
  fotoCalidad?: string;

  // Observaciones específicas de este análisis
  observations?: string;
}

/**
 * Documento principal que contiene múltiples análisis
 * para el mismo lote/código/talla
 */
export interface QualityAnalysis {
  id: string;
  productType: ProductType;

  // Secciones habilitadas (para REMUESTREO)
  // @deprecated Use remuestreoConfig instead for granular control
  sections?: {
    weights: boolean;
    uniformity: boolean;
    defects: boolean;
  };

  // Configuración avanzada para REMUESTREO
  remuestreoConfig?: {
    reason?: string;                    // Motivo del remuestreo
    linkedAnalysisId?: string;          // ID del análisis original vinculado
    activeFields: {
      pesoBruto?: boolean;
      pesoNeto?: boolean;
      pesoCongelado?: boolean;
      pesoSubmuestra?: boolean;
      pesoGlaseo?: boolean;
      conteo?: boolean;
      uniformidad?: boolean;
      defectos?: boolean;
    };
  };

  // CAMPOS OBLIGATORIOS (se llenan primero)
  lote: string;         // REQUIRED
  codigo: string;       // REQUIRED
  talla?: string;       // Optional but recommended

  // Color del analista que creó este análisis
  analystColor: AnalystColor;  // REQUIRED

  // Array de análisis individuales (tabs)
  analyses: Analysis[];  // Mínimo 1 análisis

  // Metadata
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  shift: WorkShift;
  date: string; // YYYY-MM-DD

  // Estado del análisis
  status?: 'EN_PROGRESO' | 'COMPLETADO';
  completedAt?: string;

  // Peso Bruto Global (para todo el documento/lote)
  globalPesoBruto?: PesoConFoto;

  // Observaciones generales (Legacy support)
  observations?: string;

  // Información personalizada para productos no registrados
  customProductInfo?: ProductInfo;
}

// ============================================
// LEGACY: Old QualityAnalysis structure
// ============================================

/**
 * @deprecated Use QualityAnalysis with analyses array instead
 * This interface is kept for backward compatibility with existing data
 */
export interface LegacyQualityAnalysis {
  id: string;
  uniformidad?: Uniformidad;

  // Defectos según tipo de producto
  defectos?: Defectos;

  // Foto de calidad general
  fotoCalidad?: string;

  // Metadata
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  shift: WorkShift;
  date: string; // YYYY-MM-DD

  // Estado del análisis
  status?: 'EN_PROGRESO' | 'COMPLETADO';
  completedAt?: string;

  // Observaciones
  observations?: string;
}

export interface DailyReport {
  date: string;
  turno: WorkShift;
  analyses: QualityAnalysis[];
  totalAnalyses: number;
}
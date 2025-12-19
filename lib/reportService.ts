import ExcelJS from 'exceljs';
import { QualityAnalysis, WorkShift, PRODUCT_TYPE_LABELS, ProductType, DEFECTOS_ENTERO, DEFECTOS_COLA, DEFECTOS_VALOR_AGREGADO, DEFECTO_LABELS, ANALYST_COLOR_LABELS, Analysis } from '@/lib/types';
import { validateGrossWeight, validateNetWeight } from './validations/weightValidations';
import { validateCount, validateUniformity, validateDefects, validateSize } from './validations/reportValidations';
import { PRODUCT_DATA } from '@/lib/product-data';

// Tipos auxiliares
type ReportShift = 'ALL' | WorkShift;

// Interfaz para datos aplanados
interface FlattenedAnalysis {
    // Metadata del documento padre
    docId: string;
    createdAt: string;
    shift: WorkShift;
    productType: ProductType;
    lote: string;
    codigo: string;
    talla: string;
    analystColor: string;
    observations: string;
    status?: 'EN_PROGRESO' | 'COMPLETADO';

    // Datos del análisis individual
    numero: number;
    pesoBruto?: number;
    pesoCongelado?: number;
    pesoSubmuestra?: number;
    pesoSinGlaseo?: number;
    pesoNeto?: number;
    conteo?: number;
    uniformidadGrandes?: number;
    uniformidadPequenos?: number;
    defectos: { [key: string]: number };
    totalDefectos: number;
    pesosBrutos: number[];

    // Validaciones (added for validation report)
    validationTalla?: string;
    validationPesoBruto?: string;
    validationPesoNeto?: string;
    validationConteo?: string;
    validationUniformidad?: string;
    validationDefectosIndividuales?: string[];
    validationDefectosTotales?: string;
    hasValidationIssues?: boolean;
}

const STYLES = {
    headerFill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
    } as ExcelJS.Fill,

    subHeaderFill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' }
    } as ExcelJS.Fill,

    dayFill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF2CC' }
    } as ExcelJS.Fill,

    nightFill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2EFDA' }
    } as ExcelJS.Fill,

    whiteFont: {
        color: { argb: 'FFFFFFFF' },
        bold: true,
        size: 16
    } as Partial<ExcelJS.Font>,

    centerAlign: {
        horizontal: 'center',
        vertical: 'middle'
    } as Partial<ExcelJS.Alignment>,

    border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    } as Partial<ExcelJS.Borders>,

    defectHighlight: {
        font: {
            color: { argb: 'FFFF0000' }, // Red text
            bold: true
        }
    } as Partial<ExcelJS.Style>
};

// ============================================
// HELPER: APLANAR DATOS
// ============================================

const flattenAnalyses = (analyses: QualityAnalysis[]): FlattenedAnalysis[] => {
    const flattened: FlattenedAnalysis[] = [];

    analyses.forEach(doc => {
        // Si tiene array de análisis (nueva estructura)
        if (doc.analyses && doc.analyses.length > 0) {
            doc.analyses.forEach(analysis => {
                const weightUnit = PRODUCT_DATA[doc.codigo]?.unit || 'KG';
                const toGrams = (val: number) => weightUnit === 'LB' ? val * 453.592 : val * 1000;

                // Validaciones
                const pesoBrutoGrams = toGrams(analysis.pesoBruto?.valor || 0);
                const pesoNetoGrams = toGrams(analysis.pesoNeto?.valor || 0);

                const pesoBrutoVal = validateGrossWeight(doc.codigo, pesoBrutoGrams, doc.productType, weightUnit);
                const pesoNetoVal = validateNetWeight(doc.codigo, pesoNetoGrams, doc.productType, weightUnit);
                const tallaVal = validateSize(doc.codigo, doc.talla);
                const conteoVal = validateCount(doc.codigo, doc.talla, analysis.conteo);
                const uniformidadVal = validateUniformity(doc.codigo, doc.talla, analysis.uniformidad?.grandes?.valor, analysis.uniformidad?.pequenos?.valor);
                const defectosVal = validateDefects(doc.codigo, doc.productType, analysis.pesoNeto?.valor, analysis.conteo, analysis.defectos || {});

                flattened.push({
                    docId: doc.id,
                    createdAt: doc.createdAt,
                    shift: doc.shift,
                    productType: doc.productType,
                    lote: doc.lote,
                    codigo: doc.codigo,
                    talla: doc.talla || '-',
                    analystColor: ANALYST_COLOR_LABELS[doc.analystColor] || doc.analystColor,
                    observations: analysis.observations || doc.observations || '-',
                    status: doc.status,

                    numero: analysis.numero,
                    pesoBruto: analysis.pesoBruto?.valor,
                    pesoCongelado: analysis.pesoCongelado?.valor,
                    pesoSubmuestra: analysis.pesoSubmuestra?.valor,
                    pesoSinGlaseo: analysis.pesoSinGlaseo?.valor,
                    pesoNeto: analysis.pesoNeto?.valor,
                    conteo: analysis.conteo,
                    uniformidadGrandes: analysis.uniformidad?.grandes?.valor,
                    uniformidadPequenos: analysis.uniformidad?.pequenos?.valor,
                    defectos: analysis.defectos || {},
                    totalDefectos: Object.values(analysis.defectos || {}).reduce<number>((sum, val: any) => sum + (Number(val) || 0), 0),
                    pesosBrutos: analysis.pesosBrutos?.map(p => p.peso) || [],

                    // Validation results
                    validationTalla: tallaVal.isValid ? '✓ OK' : tallaVal.message,
                    validationPesoBruto: pesoBrutoVal.isValid ? '✓ OK' : pesoBrutoVal.message,
                    validationPesoNeto: pesoNetoVal.isValid ? '✓ OK' : pesoNetoVal.message,
                    validationConteo: conteoVal.isValid ? '✓ OK' : conteoVal.message,
                    validationUniformidad: uniformidadVal.isValid ? '✓ OK' : uniformidadVal.message,
                    validationDefectosIndividuales: defectosVal.individual,
                    validationDefectosTotales: defectosVal.total,
                    hasValidationIssues: !tallaVal.isValid || !pesoBrutoVal.isValid || !pesoNetoVal.isValid ||
                        !conteoVal.isValid || !uniformidadVal.isValid ||
                        defectosVal.hasIssues
                });
            });
        } else {
            // Soporte Legacy (estructura plana antigua)
            const legacy = doc as any;
            const weightUnit = PRODUCT_DATA[doc.codigo]?.unit || 'KG';
            const toGrams = (val: number) => weightUnit === 'LB' ? val * 453.592 : val * 1000;

            // Validaciones Legacy
            const pesoBrutoGrams = toGrams(legacy.pesoBruto?.valor || 0);
            const pesoNetoGrams = toGrams(legacy.pesoNeto?.valor || 0);

            const pesoBrutoVal = validateGrossWeight(doc.codigo, pesoBrutoGrams, doc.productType, weightUnit);
            const pesoNetoVal = validateNetWeight(doc.codigo, pesoNetoGrams, doc.productType, weightUnit);
            const tallaVal = validateSize(doc.codigo, doc.talla);
            const conteoVal = validateCount(doc.codigo, doc.talla, legacy.conteo);
            const uniformidadVal = validateUniformity(doc.codigo, doc.talla, legacy.uniformidad?.grandes?.valor, legacy.uniformidad?.pequenos?.valor);
            const defectosVal = validateDefects(doc.codigo, doc.productType, legacy.pesoNeto?.valor, legacy.conteo, legacy.defectos || {});

            flattened.push({
                docId: doc.id,
                createdAt: doc.createdAt,
                shift: doc.shift,
                productType: doc.productType,
                lote: doc.lote,
                codigo: doc.codigo,
                talla: doc.talla || '-',
                analystColor: ANALYST_COLOR_LABELS[doc.analystColor] || doc.analystColor,
                observations: doc.observations || '-',
                status: doc.status,

                numero: 1,
                pesoBruto: legacy.pesoBruto?.valor,
                pesoCongelado: legacy.pesoCongelado?.valor,
                pesoNeto: legacy.pesoNeto?.valor,
                conteo: legacy.conteo,
                uniformidadGrandes: legacy.uniformidad?.grandes?.valor,
                uniformidadPequenos: legacy.uniformidad?.pequenos?.valor,
                defectos: legacy.defectos || {},
                totalDefectos: Object.values(legacy.defectos || {}).reduce<number>((sum, val: any) => sum + (Number(val) || 0), 0),
                pesosBrutos: legacy.pesosBrutos?.map((p: any) => p.peso) || [],

                // Validation results
                validationTalla: tallaVal.isValid ? '✓ OK' : tallaVal.message,
                validationPesoBruto: pesoBrutoVal.isValid ? '✓ OK' : pesoBrutoVal.message,
                validationPesoNeto: pesoNetoVal.isValid ? '✓ OK' : pesoNetoVal.message,
                validationConteo: conteoVal.isValid ? '✓ OK' : conteoVal.message,
                validationUniformidad: uniformidadVal.isValid ? '✓ OK' : uniformidadVal.message,
                validationDefectosIndividuales: defectosVal.individual,
                validationDefectosTotales: defectosVal.total,
                hasValidationIssues: !tallaVal.isValid || !pesoBrutoVal.isValid || !pesoNetoVal.isValid ||
                    !conteoVal.isValid || !uniformidadVal.isValid ||
                    defectosVal.hasIssues
            });
        }
    });

    return flattened;
};

// ============================================
// CREAR HOJA DE CONSOLIDADO
// ============================================

const createConsolidatedSheet = (workbook: ExcelJS.Workbook, analyses: FlattenedAnalysis[], date: string, shift: ReportShift) => {
    const worksheet = workbook.addWorksheet('Consolidado');

    // Título
    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `Reporte Consolidado - ${date}`;
    titleCell.font = STYLES.whiteFont;
    titleCell.fill = STYLES.headerFill;
    titleCell.alignment = STYLES.centerAlign;

    // Subtítulo
    worksheet.mergeCells('A2:G2');
    const subtitleCell = worksheet.getCell('A2');
    const shiftText = shift === 'ALL'
        ? 'Todos los turnos'
        : shift === 'DIA' ? 'Turno Día (7:10 AM - 7:10 PM)' : 'Turno Noche (7:10 PM - 7:10 AM)';
    subtitleCell.value = shiftText;
    subtitleCell.font = { size: 12, bold: true };
    subtitleCell.alignment = STYLES.centerAlign;

    worksheet.addRow([]);

    // Encabezados
    const headerRow = worksheet.addRow([
        'Tipo Producto',
        'Turno',
        'Cantidad',
        'Peso Bruto Prom',
        'Peso Neto Prom',
        'Total Defectos',
        '% del Total'
    ]);
    headerRow.font = { bold: true };
    headerRow.fill = STYLES.subHeaderFill;
    headerRow.alignment = STYLES.centerAlign;

    // Agrupar análisis por tipo de producto y turno
    const groupedAnalyses: Record<string, FlattenedAnalysis[]> = {};

    analyses.forEach(analysis => {
        const key = `${analysis.productType}-${analysis.shift}`;
        if (!groupedAnalyses[key]) {
            groupedAnalyses[key] = [];
        }
        groupedAnalyses[key].push(analysis);
    });

    let totalGeneral = 0;
    const summaryData: any[] = [];

    // Calcular totales
    Object.keys(groupedAnalyses).forEach(key => {
        const [productType, shiftType] = key.split('-');
        const group = groupedAnalyses[key];

        const totalPesoBruto = group.reduce((sum, a) => sum + (a.pesoBruto || 0), 0);
        const totalPesoNeto = group.reduce((sum, a) => sum + (a.pesoNeto || 0), 0);
        const totalDefectos = group.reduce((sum, a) => sum + a.totalDefectos, 0);

        const cantidad = group.length;
        totalGeneral += cantidad;

        summaryData.push({
            producto: PRODUCT_TYPE_LABELS[productType as ProductType],
            turno: shiftType === 'DIA' ? 'Día' : 'Noche',
            cantidad,
            promPesoBruto: totalPesoBruto > 0 ? Number((totalPesoBruto / cantidad).toFixed(2)) : '-',
            promPesoNeto: totalPesoNeto > 0 ? Number((totalPesoNeto / cantidad).toFixed(2)) : '-',
            totalDefectos,
            percentage: 0 // Se calculará después
        });
    });

    // Calcular porcentajes y agregar filas
    summaryData.forEach(data => {
        data.percentage = ((data.cantidad / totalGeneral) * 100).toFixed(1) + '%';

        const row = worksheet.addRow([
            data.producto,
            data.turno,
            data.cantidad,
            data.promPesoBruto,
            data.promPesoNeto,
            data.totalDefectos,
            data.percentage
        ]);
        row.alignment = { vertical: 'middle' };
    });

    // Fila de totales
    worksheet.addRow([]);
    const totalRow = worksheet.addRow([
        'TOTAL',
        '',
        totalGeneral,
        '',
        '',
        summaryData.reduce((sum, d) => sum + d.totalDefectos, 0),
        '100%'
    ]);
    totalRow.font = { bold: true, size: 12 };
    totalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFBDD7EE' }
    };

    // Ajustar ancho de columnas
    worksheet.columns = [
        { width: 20 },
        { width: 12 },
        { width: 12 },
        { width: 18 },
        { width: 18 },
        { width: 15 },
        { width: 12 }
    ];

    return worksheet;
};

// ============================================
// CREAR HOJA PARA ENTERO, COLA, VALOR AGREGADO
// ============================================

const createStandardProductSheet = (
    workbook: ExcelJS.Workbook,
    analyses: FlattenedAnalysis[],
    productType: ProductType,
    date: string
) => {
    // Regex to remove common emojis and symbols (including variants)
    const emojiRegex = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;
    const worksheet = workbook.addWorksheet(PRODUCT_TYPE_LABELS[productType].replace(emojiRegex, '').trim());

    // Obtener defectos según tipo de producto
    let defectosList: readonly string[] = [];
    if (productType === 'ENTERO') {
        defectosList = DEFECTOS_ENTERO;
    } else if (productType === 'COLA') {
        defectosList = DEFECTOS_COLA;
    } else if (productType === 'VALOR_AGREGADO') {
        defectosList = DEFECTOS_VALOR_AGREGADO;
    } else if (productType === 'REMUESTREO') {
        // Combinar defectos de Entero y Cola para Remuestreo
        const combinedDefects = Array.from(new Set([...DEFECTOS_ENTERO, ...DEFECTOS_COLA]));
        defectosList = combinedDefects;
    }

    // Título
    const headerColSpan = 14 + defectosList.length; // +1 por columna #
    worksheet.mergeCells(1, 1, 1, headerColSpan);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = `Análisis de ${PRODUCT_TYPE_LABELS[productType]} - ${date}`;
    titleCell.font = STYLES.whiteFont;
    titleCell.fill = STYLES.headerFill;
    titleCell.alignment = STYLES.centerAlign;

    worksheet.addRow([]);

    // Encabezados
    const headers = [
        'Hora',
        'Turno',
        'Estado',
        'Lote',
        'Código',
        'Talla',
        'Color Analista',
        '#', // Número de análisis
        'Peso Bruto',
        'Peso Congelado',
        ...(productType === 'VALOR_AGREGADO' ? ['Peso Submuestra', 'Peso sin Glaseo'] : []),
        'Peso Neto',
        'Conteo',
        'Uniformidad Grandes (Kg)',
        'Uniformidad Pequeños (Kg)',
        'Total Defectos',
        ...defectosList.map(d => DEFECTO_LABELS[d] || d),
        'Observaciones'
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = STYLES.subHeaderFill;
    headerRow.alignment = STYLES.centerAlign;

    // Agrupar por turno
    const shiftsToProcess: WorkShift[] = ['DIA', 'NOCHE'];

    shiftsToProcess.forEach(currentShift => {
        const shiftAnalyses = analyses.filter(a => a.shift === currentShift);

        if (shiftAnalyses.length > 0) {
            // Separador de turno
            const sepRow = worksheet.addRow([
                currentShift === 'DIA' ? 'TURNO DÍA' : 'TURNO NOCHE'
            ]);
            worksheet.mergeCells(sepRow.number, 1, sepRow.number, headerColSpan);
            sepRow.font = { bold: true, size: 12 };
            sepRow.fill = currentShift === 'DIA' ? STYLES.dayFill : STYLES.nightFill;

            // Filas de datos
            shiftAnalyses.forEach(d => {
                // Valores de defectos específicos
                const defectosValues = defectosList.map(defecto => d.defectos[defecto] || 0);

                const row = worksheet.addRow([
                    new Date(d.createdAt).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
                    d.shift === 'DIA' ? 'Día' : 'Noche',
                    d.status === 'COMPLETADO' ? '✓ Completado' : 'En Progreso',
                    d.lote,
                    d.codigo,
                    d.talla,
                    d.analystColor,
                    d.numero, // Número de análisis
                    d.pesoBruto || '-',
                    d.pesoCongelado || '-',
                    ...(productType === 'VALOR_AGREGADO' ? [d.pesoSubmuestra || '-', d.pesoSinGlaseo || '-'] : []),
                    d.pesoNeto || '-',
                    d.conteo || '-',
                    d.uniformidadGrandes || '-',
                    d.uniformidadPequenos || '-',
                    d.totalDefectos,
                    ...defectosValues,
                    d.observations
                ]);
                row.alignment = { vertical: 'middle' };

                // 🔴 Highlight defects > 0 (NO marcar ceros)
                // Calculate start column for defects dynamically
                // Find index of 'Total Defectos' in headers array
                // headers is 0-indexed, getCell is 1-indexed.
                // 'Total Defectos' is at index X. Column is X+1.
                // First defect is at X+2.
                const totalDefectosIndex = headers.indexOf('Total Defectos');
                const baseColumnsCount = totalDefectosIndex >= 0 ? totalDefectosIndex + 2 : (productType === 'VALOR_AGREGADO' ? 18 : 16);

                defectosValues.forEach((value, index) => {
                    // ✅ SOLO resaltar si el valor es mayor a 0
                    if (value && Number(value) > 0) {
                        const cell = row.getCell(baseColumnsCount + index);
                        if (STYLES.defectHighlight?.font) cell.font = STYLES.defectHighlight.font;
                        if (STYLES.defectHighlight?.fill) cell.fill = STYLES.defectHighlight.fill;
                    }
                });
            });

            worksheet.addRow([]);
        }
    });

    // Ajustar ancho de columnas
    const baseWidths = [
        { width: 10 },  // Hora
        { width: 10 },  // Turno
        { width: 14 },  // Estado
        { width: 15 },  // Lote
        { width: 12 },  // Código
        { width: 10 },  // Talla
        { width: 15 },  // Color Analista
        { width: 5 },   // #
        { width: 12 },  // Peso Bruto
        { width: 14 },  // Peso Congelado
        ...(productType === 'VALOR_AGREGADO' ? [{ width: 14 }, { width: 14 }] : []), // Pesos Glaseo
        { width: 12 },  // Peso Neto
        { width: 10 },  // Conteo
        { width: 15 },  // Uniformidad Grandes
        { width: 15 },  // Uniformidad Pequeños
        { width: 12 },  // Total Defectos
    ];

    // Agregar anchos para columnas de defectos
    const defectosWidths = defectosList.map(() => ({ width: 12 }));

    worksheet.columns = [
        ...baseWidths,
        ...defectosWidths,
        { width: 30 }  // Observaciones
    ];

    return worksheet;
};

// ============================================
// CREAR HOJA PARA CONTROL DE PESOS BRUTOS
// ============================================

const createControlPesosSheet = (
    workbook: ExcelJS.Workbook,
    analyses: FlattenedAnalysis[],
    date: string
) => {
    const worksheet = workbook.addWorksheet('Control de Pesos Brutos');

    const maxPesos = 20; // Hasta 20 pesos brutos
    const headerColSpan = 10 + maxPesos; // +1 por columna #

    // Título
    worksheet.mergeCells(1, 1, 1, headerColSpan);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = `Control de Pesos Brutos - ${date}`;
    titleCell.font = STYLES.whiteFont;
    titleCell.fill = STYLES.headerFill;
    titleCell.alignment = STYLES.centerAlign;

    worksheet.addRow([]);

    // Encabezados
    const headers = [
        'Hora',
        'Turno',
        'Estado',
        'Lote',
        'Código',
        'Talla',
        'Color Analista',
        '#',
        ...Array.from({ length: maxPesos }, (_, i) => `Peso ${i + 1}`),
        'Promedio',
        'Observaciones'
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = STYLES.subHeaderFill;
    headerRow.alignment = STYLES.centerAlign;

    // Agrupar por turno
    const shiftsToProcess: WorkShift[] = ['DIA', 'NOCHE'];

    shiftsToProcess.forEach(currentShift => {
        const shiftAnalyses = analyses.filter(a => a.shift === currentShift);

        if (shiftAnalyses.length > 0) {
            // Separador de turno
            const sepRow = worksheet.addRow([
                currentShift === 'DIA' ? 'TURNO DÍA' : 'TURNO NOCHE'
            ]);
            worksheet.mergeCells(sepRow.number, 1, sepRow.number, headerColSpan);
            sepRow.font = { bold: true, size: 12 };
            sepRow.fill = currentShift === 'DIA' ? STYLES.dayFill : STYLES.nightFill;

            // Filas de datos
            shiftAnalyses.forEach(d => {
                // Obtener todos los pesos brutos
                const pesos = d.pesosBrutos;
                const promedio = pesos.length > 0
                    ? Number((pesos.reduce((sum, p) => sum + p, 0) / pesos.length).toFixed(2))
                    : '-';

                // Rellenar array de pesos hasta maxPesos
                const pesosArray = Array.from({ length: maxPesos }, (_, i) =>
                    pesos[i] !== undefined ? pesos[i] : '-'
                );

                const row = worksheet.addRow([
                    new Date(d.createdAt).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
                    d.shift === 'DIA' ? 'Día' : 'Noche',
                    d.status === 'COMPLETADO' ? '✓ Completado' : 'En Progreso',
                    d.lote,
                    d.codigo,
                    d.talla,
                    d.analystColor,
                    d.numero,
                    ...pesosArray,
                    promedio,
                    d.observations
                ]);
                row.alignment = { vertical: 'middle' };
            });

            worksheet.addRow([]);
        }
    });

    // Ajustar ancho de columnas
    const baseWidths = [
        { width: 10 },  // Hora
        { width: 10 },  // Turno
        { width: 14 },  // Estado
        { width: 15 },  // Lote
        { width: 12 },  // Código
        { width: 10 },  // Talla
        { width: 15 },  // Color Analista
        { width: 5 },   // #
    ];

    const pesosWidths = Array.from({ length: maxPesos }, () => ({ width: 10 }));

    worksheet.columns = [
        ...baseWidths,
        ...pesosWidths,
        { width: 12 },  // Promedio
        { width: 30 }   // Observaciones
    ];

    return worksheet;
};

// ============================================
// FUNCIÓN PRINCIPAL: GENERAR REPORTE DIARIO
// ============================================

export const generateDailyReport = async (
    analyses: QualityAnalysis[],
    date: string,
    shift: ReportShift
): Promise<Blob> => {
    const workbook = new ExcelJS.Workbook();

    // 1. Aplanar análisis (convertir documentos en filas individuales)
    const flattenedAnalyses = flattenAnalyses(analyses);

    // 2. Crear hoja de consolidado
    createConsolidatedSheet(workbook, flattenedAnalyses, date, shift);

    // 3. Agrupar análisis por tipo de producto
    const analysesByType: Record<ProductType, FlattenedAnalysis[]> = {
        ENTERO: [],
        COLA: [],
        VALOR_AGREGADO: [],
        CONTROL_PESOS: [],
        REMUESTREO: []
    };

    flattenedAnalyses.forEach(analysis => {
        if (analysesByType[analysis.productType]) {
            analysesByType[analysis.productType].push(analysis);
        }
    });

    // 4. Crear hojas para cada tipo de producto que tenga datos
    if (analysesByType.ENTERO.length > 0) {
        createStandardProductSheet(workbook, analysesByType.ENTERO, 'ENTERO', date);
    }

    if (analysesByType.COLA.length > 0) {
        createStandardProductSheet(workbook, analysesByType.COLA, 'COLA', date);
    }

    if (analysesByType.VALOR_AGREGADO.length > 0) {
        createStandardProductSheet(workbook, analysesByType.VALOR_AGREGADO, 'VALOR_AGREGADO', date);
    }

    if (analysesByType.CONTROL_PESOS.length > 0) {
        createControlPesosSheet(workbook, analysesByType.CONTROL_PESOS, date);
    }

    if (analysesByType.REMUESTREO.length > 0) {
        createStandardProductSheet(workbook, analysesByType.REMUESTREO, 'REMUESTREO', date);
    }

    // Validations sheet (only created if there are validation issues)
    // Validations are now calculated in flattenAnalyses(), no need for separate step
    createValidationsSheet(workbook, flattenedAnalyses, date);

    // 5. Generar buffer y blob
    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
};

// ============================================
// NUEVA FUNCIÓN: AGREGAR VALIDACIONES
// ============================================

/**
 * Enriquece los análisis aplanados con validaciones de peso bruto, neto y conteo
 * NO modifica los datos originales, solo agrega campos de validación
 */
const addValidationsToAnalyses = (analyses: FlattenedAnalysis[]): FlattenedAnalysis[] => {
    return analyses.map(analysis => {
        // Convert kg to grams (peso bruto and neto are stored in kg)
        const pesoBrutoGrams = (analysis.pesoBruto || 0) * 1000;
        const pesoNetoGrams = (analysis.pesoNeto || 0) * 1000;

        // Run validations
        const validPesoBruto = validateGrossWeight(analysis.codigo, pesoBrutoGrams, analysis.productType);
        const validPesoNeto = validateNetWeight(analysis.codigo, pesoNetoGrams, analysis.productType);

        // Build validation strings
        const validationPesoBruto = validPesoBruto.isValid
            ? '✓ OK'
            : `⚠️ ${validPesoBruto.message || 'Error'}`;

        const validationPesoNeto = validPesoNeto.isValid
            ? '✓ OK'
            : `⚠️ ${validPesoNeto.message || 'Error'}`;

        // TODO: Add count validation when useTechnicalSpecs is available in server-side context
        const validationConteo = '✓ OK';

        const hasValidationIssues = !validPesoBruto.isValid || !validPesoNeto.isValid;

        return {
            ...analysis,
            validationPesoBruto,
            validationPesoNeto,
            validationConteo,
            hasValidationIssues
        };
    });
};

// ============================================
// NUEVA FUNCIÓN: CREAR HOJA DE VALIDACIONES
// ============================================

/**
 * Crea una hoja de "Validaciones" que muestra SOLO los lotes con problemas
 * Similar al reporte de Python: "Lotes con Novedades en Descongelado"
 */
const createValidationsSheet = (
    workbook: ExcelJS.Workbook,
    analyses: FlattenedAnalysis[],
    date: string
) => {
    // Filtrar solo análisis con problemas
    const analysesWithIssues = analyses.filter(a => a.hasValidationIssues);

    if (analysesWithIssues.length === 0) {
        // No hay problemas, no crear la hoja
        return;
    }

    const worksheet = workbook.addWorksheet('Validaciones');

    // Título
    worksheet.mergeCells('A1:J1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `Lotes con Novedades en Validación - ${date}`;
    titleCell.font = { ...STYLES.whiteFont, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDC143C' } // Rojo carmesí para alertas
    };
    titleCell.alignment = STYLES.centerAlign;

    worksheet.addRow([]);

    // Encabezados
    const headers = [
        'Hora',
        'Turno',
        'Lote',
        'Código',
        'Talla',
        'Validación Talla',
        'Tipo Producto',
        'Peso Bruto (Kg)',
        'Validación P. Bruto',
        'Peso Neto (Kg)',
        'Validación P. Neto',
        'Conteo',
        'Validación Conteo',
        'Uniformidad',
        'Validación Uniformidad',
        'Defectos Individuales',
        'Total Defectos %',
        'Validación Total'
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = STYLES.subHeaderFill;
    headerRow.alignment = STYLES.centerAlign;

    // Datos
    analysesWithIssues.forEach(d => {
        // Formatear defectos individuales como texto multilínea
        const defectosText = d.validationDefectosIndividuales && d.validationDefectosIndividuales.length > 0
            ? d.validationDefectosIndividuales.join('\n')
            : '-';

        const row = worksheet.addRow([
            new Date(d.createdAt).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
            d.shift === 'DIA' ? 'Día' : 'Noche',
            d.lote,
            d.codigo,
            d.talla,
            d.validationTalla || '-',
            PRODUCT_TYPE_LABELS[d.productType],
            d.pesoBruto || '-',
            d.validationPesoBruto || '-',
            d.pesoNeto || '-',
            d.validationPesoNeto || '-',
            d.conteo || '-',
            d.validationConteo || '-',
            d.uniformidadGrandes || d.uniformidadPequenos || '-',
            d.validationUniformidad || '-',
            defectosText,
            d.totalDefectos ? `${d.totalDefectos.toFixed(2)}%` : '-',
            d.validationDefectosTotales || '-'
        ]);
        row.alignment = { vertical: 'middle', wrapText: true };

        // Resaltar celdas con problemas en rojo
        if (d.validationTalla && d.validationTalla.includes('⚠️')) {
            row.getCell(6).font = { color: { argb: 'FFFF0000' }, bold: true };
        }
        if (d.validationPesoBruto && d.validationPesoBruto.includes('⚠️')) {
            row.getCell(9).font = { color: { argb: 'FFFF0000' }, bold: true };
        }
        if (d.validationPesoNeto && d.validationPesoNeto.includes('⚠️')) {
            row.getCell(11).font = { color: { argb: 'FFFF0000' }, bold: true };
        }
        if (d.validationConteo && d.validationConteo.includes('⚠️')) {
            row.getCell(13).font = { color: { argb: 'FFFF0000' }, bold: true };
        }
        if (d.validationUniformidad && d.validationUniformidad.includes('⚠️')) {
            row.getCell(15).font = { color: { argb: 'FFFF0000' }, bold: true };
        }
        if (d.validationDefectosIndividuales && d.validationDefectosIndividuales.length > 0) {
            row.getCell(16).font = { color: { argb: 'FFFF0000' }, bold: true };
        }
        if (d.validationDefectosTotales && d.validationDefectosTotales.includes('⚠️')) {
            row.getCell(18).font = { color: { argb: 'FFFF0000' }, bold: true };
        }
    });

    // Ajustar anchos
    worksheet.columns = [
        { width: 10 },  // Hora
        { width: 10 },  // Turno
        { width: 15 },  // Lote
        { width: 12 },  // Código
        { width: 10 },  // Talla
        { width: 25 },  // Validación Talla
        { width: 18 },  // Tipo Producto
        { width: 14 },  // Peso Bruto
        { width: 35 },  // Validación P. Bruto
        { width: 14 },  // Peso Neto
        { width: 35 },  // Validación P. Neto
        { width: 10 },  // Conteo
        { width: 30 },  // Validación Conteo
        { width: 12 },  // Uniformidad
        { width: 30 },  // Validación Uniformidad
        { width: 40 },  // Defectos Individuales
        { width: 15 },  // Total Defectos
        { width: 30 }   // Validación Total
    ];

    // Congelar primera fila
    worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 3 }];

    return worksheet;
};


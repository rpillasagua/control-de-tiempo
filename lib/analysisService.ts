import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  DocumentReference,
  QueryDocumentSnapshot,
  runTransaction,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import { QualityAnalysis } from './types';
import { logger } from './logger';

const ANALYSES_COLLECTION = 'quality_analyses';
const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

/**
 * Valida y obtiene la referencia al documento
 * Previene path traversal / "SQL Injection"
 */
const getAnalysisRef = (analysisId: string): DocumentReference => {
  if (!VALID_ID_REGEX.test(analysisId)) {
    throw new Error(`Invalid analysis ID format: ${analysisId}`);
  }
  return doc(db, ANALYSES_COLLECTION, analysisId);
};

/**
 * Limpia los datos para Firestore (convierte undefined a null)
 */
const cleanDataForFirestore = <T>(data: T): T | null => {
  if (data === undefined) {
    return null;
  }

  // Prevenir guardar URLs de blob (locales) en Firestore
  if (typeof data === 'string' && data.startsWith('blob:')) {
    logger.error('❌ INTENTO DE GUARDAR BLOB URL:', data);
    throw new Error('No se puede guardar el análisis porque hay fotos que aún no se han subido a Google Drive (URL blob detectada). Por favor espera a que terminen de subir.');
  }

  if (Array.isArray(data)) {
    return data.map(cleanDataForFirestore) as unknown as T;
  }

  if (data !== null && typeof data === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cleaned: any = {};
    for (const [key, value] of Object.entries(data)) {
      cleaned[key] = cleanDataForFirestore(value);
    }
    return cleaned as T;
  }

  return data;
};

/**
 * Helper para obtener timestamp de forma segura (string o Firestore Timestamp)
 */
const getTimestampMillis = (val: string | Timestamp | undefined | unknown): number => {
  if (!val) return 0;
  if (typeof val === 'string') return new Date(val).getTime();
  if (typeof val === 'object' && 'toMillis' in val && typeof (val as Timestamp).toMillis === 'function') {
    return (val as Timestamp).toMillis();
  }
  return 0;
};

/**
 * Guarda un nuevo análisis en Firestore con protección contra sobrescritura multi-dispositivo
 * Usa transacciones para verificar que la versión local sea más nueva antes de sobrescribir
 */
export const saveAnalysis = async (analysis: QualityAnalysis): Promise<void> => {
  if (!db) {
    throw new Error('Firestore no está configurado');
  }

  try {
    const analysisRef = getAnalysisRef(analysis.id);
    const newTimestamp = Timestamp.now();

    const cleanedAnalysis = cleanDataForFirestore({
      ...analysis,
      updatedAt: newTimestamp
    });

    // Usar transacción para verificar timestamp antes de guardar
    await runTransaction(db, async (transaction) => {
      const doc = await transaction.get(analysisRef);

      if (doc.exists()) {
        // Documento existe - verificar timestamp
        const existingData = doc.data();
        const existingTimestamp = existingData?.updatedAt;

        // Convertir timestamp del análisis a Firestore Timestamp para comparación
        const analysisTimestamp = analysis.updatedAt
          ? (typeof analysis.updatedAt === 'string'
            ? Timestamp.fromDate(new Date(analysis.updatedAt))
            : analysis.updatedAt)
          : newTimestamp;

        // Solo sobrescribir si la versión local es más nueva o igual
        // (igual permite actualizaciones del mismo dispositivo)
        const serverTimeMs = getTimestampMillis(existingTimestamp);
        const localTimeMs = getTimestampMillis(analysis.updatedAt || newTimestamp);

        if (serverTimeMs > 0 && serverTimeMs > localTimeMs) {
          logger.warn('⚠️ Servidor tiene versión más nueva, abortando guardado para evitar sobrescritura:', {
            local: localTimeMs,
            server: serverTimeMs,
            diff: serverTimeMs - localTimeMs
          });
          throw new Error('STALE_DATA: El servidor tiene una versión más reciente');
        }

        logger.log('✅ Timestamp verificado, procediendo con actualización');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transaction.set(analysisRef, cleanedAnalysis as any);
    });

    logger.log('✅ Análisis guardado:', analysis.codigo);
  } catch (error) {
    // Si el error es STALE_DATA, no es realmente un error - solo evitamos sobrescribir
    if (error instanceof Error && error.message.includes('STALE_DATA')) {
      logger.log('📌 Guardado omitido: servidor tiene datos más nuevos');
      return; // Salir silenciosamente
    }

    logger.error('❌ Error guardando análisis:', error);
    throw error;
  }
};

/**
 * Actualiza un análisis existente
 */
export const updateAnalysis = async (
  analysisId: string,
  updates: Partial<QualityAnalysis>
): Promise<void> => {
  if (!db) {
    throw new Error('Firestore no está configurado');
  }

  try {
    const analysisRef = getAnalysisRef(analysisId);
    const cleanedUpdates = cleanDataForFirestore({
      ...updates,
      updatedAt: Timestamp.now()
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateDoc(analysisRef, cleanedUpdates as any);
    logger.log('✅ Análisis actualizado:', analysisId);
  } catch (error) {
    logger.error('❌ Error actualizando análisis:', error);
    throw error;
  }
};

/**
 * Obtiene un análisis por ID
 */
export const getAnalysisById = async (analysisId: string): Promise<QualityAnalysis | null> => {
  if (!db) {
    throw new Error('Firestore no está configurado');
  }

  try {
    const analysisRef = getAnalysisRef(analysisId);
    const docSnap = await getDoc(analysisRef);

    if (docSnap.exists()) {
      return docSnap.data() as QualityAnalysis;
    }

    return null;
  } catch (error) {
    logger.error('❌ Error obteniendo análisis:', error);
    throw error;
  }
};

/**
 * Obtiene todos los análisis de una fecha específica
 */
export const getAnalysesByDate = async (date: string): Promise<QualityAnalysis[]> => {
  if (!db) {
    throw new Error('Firestore no está configurado');
  }

  try {
    const q = query(
      collection(db, ANALYSES_COLLECTION),
      where('date', '==', date)
    );

    const querySnapshot = await getDocs(q);
    const analyses: QualityAnalysis[] = [];

    querySnapshot.forEach((doc) => {
      analyses.push(doc.data() as QualityAnalysis);
    });

    // Ordenar en memoria por createdAt (más recientes primero)
    analyses.sort((a, b) => {
      return getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt);
    });

    return analyses;
  } catch (error) {
    logger.error('❌ Error obteniendo análisis por fecha:', error);
    throw error;
  }
};

/**
 * Obtiene análisis por rango de fechas
 */
export const getAnalysesByDateRange = async (
  startDate: string,
  endDate: string
): Promise<QualityAnalysis[]> => {
  if (!db) {
    throw new Error('Firestore no está configurado');
  }

  try {
    const q = query(
      collection(db, ANALYSES_COLLECTION),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc'),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const analyses: QualityAnalysis[] = [];

    querySnapshot.forEach((doc) => {
      analyses.push(doc.data() as QualityAnalysis);
    });

    return analyses;
  } catch (error) {
    logger.error('❌ Error obteniendo análisis por rango:', error);
    throw error;
  }
};

/**
 * Obtiene los análisis más recientes (sin filtrar por fecha)
 */
export const getRecentAnalyses = async (limitCount: number = 100): Promise<QualityAnalysis[]> => {
  if (!db) {
    throw new Error('Firestore no está configurado');
  }

  try {
    const q = query(
      collection(db, ANALYSES_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const analyses: QualityAnalysis[] = [];

    querySnapshot.forEach((doc) => {
      analyses.push(doc.data() as QualityAnalysis);
    });

    return analyses;
  } catch (error) {
    logger.error('❌ Error obteniendo análisis recientes:', error);
    throw error;
  }
};

/**
 * Obtiene análisis paginados para infinite scroll
 */
export const getPaginatedAnalyses = async (
  limitCount: number = 20,
  lastDoc: QueryDocumentSnapshot | null = null
): Promise<{ analyses: QualityAnalysis[]; lastDoc: QueryDocumentSnapshot | null }> => {
  if (!db) {
    throw new Error('Firestore no está configurado');
  }

  try {
    let q = query(
      collection(db, ANALYSES_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const querySnapshot = await getDocs(q);
    const analyses: QualityAnalysis[] = [];

    querySnapshot.forEach((doc) => {
      analyses.push(doc.data() as QualityAnalysis);
    });

    return {
      analyses,
      lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1] || null
    };
  } catch (error) {
    logger.error('❌ Error obteniendo análisis paginados:', error);
    throw error;
  }
};

/**
 * Obtiene análisis por turno
 */
export const getAnalysesByProductionDay = async (date: string): Promise<QualityAnalysis[]> => {
  if (!db) {
    throw new Error('Firestore no está configurado');
  }

  try {
    // ESTRATEGIA DUAL PARA DÍA DE PRODUCCIÓN (Todos los turnos):
    // 1. Rango de Tiempo: 7:10 AM (Día X) a 7:10 AM (Día X+1)
    // 2. Coincidencia Explícita: date == X (para capturar manuales)

    // --- QUERY 1: Rango de Tiempo ---
    const [year, month, day] = date.split('-').map(Number);
    const start = new Date(year, month - 1, day);
    const end = new Date(year, month - 1, day);

    // Inicio: 7:10 AM del día seleccionado
    start.setHours(7, 10, 0, 0);
    // Fin: 7:10 AM del día siguiente
    end.setDate(end.getDate() + 1);
    end.setHours(7, 10, 0, 0);

    const startIso = start.toISOString();
    const endIso = end.toISOString();

    const qRange = query(
      collection(db, ANALYSES_COLLECTION),
      where('createdAt', '>=', startIso),
      where('createdAt', '<', endIso)
    );

    // --- QUERY 2: Coincidencia Explícita ---
    // TEMPORAL: Sin filtro de tiempo para evitar error de índice Firebase
    const qExplicit = query(
      collection(db, ANALYSES_COLLECTION),
      where('date', '==', date)
    );

    // Ejecutar ambas consultas
    const [snapshotRange, snapshotExplicit] = await Promise.all([
      getDocs(qRange),
      getDocs(qExplicit)
    ]);

    // Combinar y deduplicar
    const analysesMap = new Map<string, QualityAnalysis>();

    snapshotRange.forEach((doc) => {
      const data = doc.data() as QualityAnalysis;
      analysesMap.set(data.id, data);
    });

    snapshotExplicit.forEach((doc) => {
      const data = doc.data() as QualityAnalysis;
      if (!analysesMap.has(data.id)) {
        analysesMap.set(data.id, data);
      }
    });

    const analyses = Array.from(analysesMap.values());

    // Ordenar por createdAt
    analyses.sort((a, b) => {
      return getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt);
    });

    console.log(`📊 Reporte Producción ${date}: ${analyses.length} análisis encontrados`);

    return analyses;
  } catch (error) {
    logger.error('❌ Error obteniendo análisis por día de producción:', error);
    throw error;
  }
};

export const getAnalysesByShift = async (
  date: string,
  shift: 'DIA' | 'NOCHE'
): Promise<QualityAnalysis[]> => {
  if (!db) {
    throw new Error('Firestore no está configurado');
  }

  try {
    // ESTRATEGIA DUAL:
    // 1. Buscar por Rango de Tiempo (createdAt) - Para capturar análisis de madrugada con fecha del día siguiente
    // 2. Buscar por Coincidencia Explícita (date + shift) - Para capturar análisis asignados manualmente

    // --- QUERY 1: Rango de Tiempo ---
    // Usamos 7:10 y 19:10 para coincidir con la lógica de getWorkShift en utils.ts
    const [year, month, day] = date.split('-').map(Number);
    const start = new Date(year, month - 1, day);
    const end = new Date(year, month - 1, day);

    if (shift === 'DIA') {
      // Turno Día: 07:10 - 19:10
      start.setHours(7, 10, 0, 0);
      end.setHours(19, 10, 0, 0);
    } else {
      // Turno Noche: 19:10 del día actual - 07:10 del día siguiente
      start.setHours(19, 10, 0, 0);
      end.setDate(end.getDate() + 1);
      end.setHours(7, 10, 0, 0);
    }

    const startIso = start.toISOString();
    const endIso = end.toISOString();

    const qRange = query(
      collection(db, ANALYSES_COLLECTION),
      where('createdAt', '>=', startIso),
      where('createdAt', '<', endIso)
    );

    // --- QUERY 2: Coincidencia Explícita ---
    // TEMPORAL: Sin filtro de tiempo para evitar error de índice Firebase
    const qExplicit = query(
      collection(db, ANALYSES_COLLECTION),
      where('date', '==', date),
      where('shift', '==', shift)
    );

    // Ejecutar ambas consultas en paralelo
    const [snapshotRange, snapshotExplicit] = await Promise.all([
      getDocs(qRange),
      getDocs(qExplicit)
    ]);

    // Combinar y deduplicar resultados
    const analysesMap = new Map<string, QualityAnalysis>();

    snapshotRange.forEach((doc) => {
      const data = doc.data() as QualityAnalysis;
      analysesMap.set(data.id, data);
    });

    snapshotExplicit.forEach((doc) => {
      const data = doc.data() as QualityAnalysis;
      // Solo agregar si no existe ya (aunque el Map lo maneja, es bueno ser explícito)
      if (!analysesMap.has(data.id)) {
        analysesMap.set(data.id, data);
      }
    });

    console.log(`🔍 Filtering by shift: '${shift}'`);
    const analyses = Array.from(analysesMap.values()).filter(a => {
      const match = a.shift === shift;
      if (!match) {
        console.log(`⚠️ Excluding analysis ${a.codigo} (Shift: ${a.shift})`);
      }
      return match;
    });

    console.log(`📊 Reporte ${date} ${shift}: ${analyses.length} análisis encontrados (Rango: ${snapshotRange.size}, Explícito: ${snapshotExplicit.size})`);

    return analyses;
  } catch (error) {
    logger.error('❌ Error obteniendo análisis por turno:', error);
    throw error;
  }
};

/**
 * Elimina un análisis
 */
export const deleteAnalysis = async (analysisId: string): Promise<void> => {
  if (!db) {
    throw new Error('Firestore no está configurado');
  }

  console.log(`🗑️ Service: deleteAnalysis called for ID: ${analysisId}`);

  try {
    // 1. Obtener datos del análisis para saber qué carpeta borrar
    const analysis = await getAnalysisById(analysisId);
    console.log('📄 Analysis data retrieved:', analysis ? 'Found' : 'Not found');

    if (analysis && analysis.codigo && analysis.lote) {
      // Intentar borrar carpeta de Drive (no bloqueante - se ejecuta en background)
      console.log(`🔄 Attempting to delete Drive folder for: ${analysis.codigo}/${analysis.lote}`);

      // Ejecutar en background sin bloquear la eliminación de Firestore
      (async () => {
        try {
          const { googleDriveService } = await import('./googleDriveService');
          await googleDriveService.initialize();
          await googleDriveService.deleteAnalysisFolder(analysis.codigo, analysis.lote);
          console.log('✅ Drive folder deleted successfully');
        } catch (driveError) {
          console.warn('⚠️ Drive deletion failed (non-critical):', driveError);
        }
      })();
    } else {
      console.warn('⚠️ No se pudo obtener datos del análisis para borrar fotos (o faltan codigo/lote)');
    }

    // 2. Borrar documento de Firestore (SIEMPRE ejecutar inmediatamente)
    const analysisRef = getAnalysisRef(analysisId);
    console.log(`🔥 Deleting Firestore document at path: ${analysisRef.path}`);
    await deleteDoc(analysisRef);

    logger.log('✅ Análisis eliminado de Firestore:', analysisId);
    console.log(`✅ Service: deleteAnalysis completed successfully for ID: ${analysisId}`);
  } catch (error) {
    logger.error('❌ Error eliminando análisis:', error);
    console.error(`❌ Service: deleteAnalysis FAILED for ID: ${analysisId}`, error);

    // Re-throw para que el UI pueda manejarlo
    throw new Error(`Error al eliminar análisis: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
};

/**
 * Busca análisis por código o lote
 */
export const searchAnalyses = async (searchTerm: string): Promise<QualityAnalysis[]> => {
  if (!db) {
    throw new Error('Firestore no está configurado');
  }

  try {
    // Buscar por código
    const qCodigo = query(
      collection(db, ANALYSES_COLLECTION),
      where('codigo', '>=', searchTerm),
      where('codigo', '<=', searchTerm + '\uf8ff')
    );

    // Buscar por lote
    const qLote = query(
      collection(db, ANALYSES_COLLECTION),
      where('lote', '>=', searchTerm),
      where('lote', '<=', searchTerm + '\uf8ff')
    );

    const [codigoSnapshot, loteSnapshot] = await Promise.all([
      getDocs(qCodigo),
      getDocs(qLote)
    ]);

    const analyses: QualityAnalysis[] = [];
    const seenIds = new Set<string>();

    codigoSnapshot.forEach((doc) => {
      const data = doc.data() as QualityAnalysis;
      if (!seenIds.has(data.id)) {
        analyses.push(data);
        seenIds.add(data.id);
      }
    });

    loteSnapshot.forEach((doc) => {
      const data = doc.data() as QualityAnalysis;
      if (!seenIds.has(data.id)) {
        analyses.push(data);
        seenIds.add(data.id);
      }
    });

    return analyses;
  } catch (error) {
    logger.error('❌ Error buscando análisis:', error);
    throw error;
  }
};

/**
 * Renueva permisos de fotos en un análisis existente
 * Útil para arreglar problemas de permisos expirados
 */
/**
 * Guarda la URL de una foto de forma transaccional para evitar race conditions
 * Actualiza SOLO el campo específico de la foto sin sobrescribir el resto del documento
 */
export const saveAnalysisPhotoUrl = async (
  analysisId: string,
  analysisItemId: string,
  analysisIndexHint: number,
  fieldPath: string,
  photoUrl: string
): Promise<void> => {
  if (!db) throw new Error('Firestore no está configurado');

  const analysisRef = getAnalysisRef(analysisId);

  try {
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(analysisRef);
      if (!docSnap.exists()) {
        throw new Error(`Documento ${analysisId} no existe`);
      }

      const data = docSnap.data() as QualityAnalysis;
      const analyses = [...(data.analyses || [])];
      let needsArrayUpdate = false;

      // 1. Try to find by ID
      let analysisIndex = analyses.findIndex(a => a.id === analysisItemId);

      // 2. If not found, check if it's a legacy item (no ID) at the hint index
      if (analysisIndex === -1) {
        const hintItem = analyses[analysisIndexHint];
        if (hintItem && !hintItem.id) {
          // Found legacy item! Migrate it.
          console.log(`⚠️ Migrating legacy analysis item at index ${analysisIndexHint} with new ID ${analysisItemId}`);
          analyses[analysisIndexHint].id = analysisItemId;
          analysisIndex = analysisIndexHint;
          needsArrayUpdate = true;
        } else {
          throw new Error(`Análisis con ID ${analysisItemId} no encontrado (y no se pudo recuperar por índice)`);
        }
      }

      // Helper para actualizar campo anidado
      const updateNestedField = (obj: any, path: string, value: any) => {
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
          const key = keys[i];

          // Si no existe, crear objeto vacío
          if (current[key] === undefined || current[key] === null) {
            current[key] = {};
          }
          // Si existe pero NO es un objeto (ej: es un número o string corrupto)
          else if (typeof current[key] !== 'object') {
            // Si es un número, preservarlo como 'valor' (migración automática)
            if (typeof current[key] === 'number') {
              current[key] = { valor: current[key] };
            } else {
              // Si es string u otro, resetear a objeto vacío para corregir estructura
              current[key] = {};
            }
          }

          current = current[key];
        }
        current[keys[keys.length - 1]] = value;
      };

      // Actualizar el campo específico en el objeto de análisis correcto
      updateNestedField(analyses[analysisIndex], fieldPath, photoUrl);

      // Siempre actualizamos todo el array 'analyses' para persistir cambios (incluyendo ID backfill)
      transaction.update(analysisRef, {
        analyses: analyses,
        updatedAt: Timestamp.now()
      });
    });

    logger.log(`✅ Foto guardada transaccionalmente: ${fieldPath}`);
  } catch (error) {
    logger.error('❌ Error guardando foto transaccionalmente:', error);
    throw error;
  }
};

/**
 * Elimina una foto de forma transaccional
 */
export const deleteAnalysisPhoto = async (
  analysisId: string,
  analysisItemId: string,
  fieldPath: string
): Promise<void> => {
  if (!db) throw new Error('Firestore no está configurado');

  const analysisRef = getAnalysisRef(analysisId);

  try {
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(analysisRef);
      if (!docSnap.exists()) {
        throw new Error(`Documento ${analysisId} no existe`);
      }

      const data = docSnap.data() as QualityAnalysis;
      const analyses = [...(data.analyses || [])];

      // Find index by ID
      const analysisIndex = analyses.findIndex(a => a.id === analysisItemId);

      if (analysisIndex === -1) {
        throw new Error(`Análisis con ID ${analysisItemId} no encontrado`);
      }

      // Helper para eliminar campo anidado (set to null/undefined)
      const deleteNestedField = (obj: any, path: string) => {
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) return; // Path no existe
          current = current[keys[i]];
        }
        // Borrar la propiedad o ponerla en null
        const lastKey = keys[keys.length - 1];
        if (current[lastKey]) {
          delete current[lastKey];
        }
      };

      deleteNestedField(analyses[analysisIndex], fieldPath);

      transaction.update(analysisRef, {
        analyses: analyses,
        updatedAt: Timestamp.now()
      });
    });

    logger.log(`✅ Foto eliminada transaccionalmente: ${fieldPath}`);
  } catch (error) {
    logger.error('❌ Error eliminando foto transaccionalmente:', error);
    throw error;
  }
};

/**
 * Guarda la URL de una foto GLOBAL (peso bruto global) de forma transaccional
 */
export const saveGlobalPhotoUrl = async (
  analysisId: string,
  photoUrl: string
): Promise<void> => {
  if (!db) throw new Error('Firestore no está configurado');

  const analysisRef = getAnalysisRef(analysisId);

  try {
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(analysisRef);
      if (!docSnap.exists()) {
        throw new Error(`Documento ${analysisId} no existe`);
      }

      const data = docSnap.data() as QualityAnalysis;
      const globalPesoBruto = { ...(data.globalPesoBruto || {}), fotoUrl: photoUrl };

      transaction.update(analysisRef, {
        globalPesoBruto: globalPesoBruto,
        updatedAt: Timestamp.now()
      });
    });

    logger.log(`✅ Foto global guardada transaccionalmente`);
  } catch (error) {
    logger.error('❌ Error guardando foto global transaccionalmente:', error);
    throw error;
  }
};

/**
 * Renueva permisos de fotos en un análisis existente
 * Útil para arreglar problemas de permisos expirados
 */
export const renewAnalysisPhotoPermissions = async (analysisId: string): Promise<void> => {
  try {
    logger.log(`🔄 Renovando permisos de fotos para análisis: ${analysisId}`);

    // Obtener el análisis
    const analysis = await getAnalysisById(analysisId);
    if (!analysis) {
      throw new Error(`Análisis ${analysisId} no encontrado`);
    }

    // Extraer todas las URLs de fotos
    const photoUrls: string[] = [];

    // Fotos principales - acceder desde analyses[0] (nueva estructura)
    const firstAnalysis = analysis.analyses?.[0];
    if (firstAnalysis?.fotoCalidad) photoUrls.push(firstAnalysis.fotoCalidad);
    if (firstAnalysis?.pesoBruto?.fotoUrl) photoUrls.push(firstAnalysis.pesoBruto.fotoUrl);
    if (firstAnalysis?.pesoCongelado?.fotoUrl) photoUrls.push(firstAnalysis.pesoCongelado.fotoUrl);
    if (firstAnalysis?.pesoNeto?.fotoUrl) photoUrls.push(firstAnalysis.pesoNeto.fotoUrl);

    // Fotos de uniformidad
    if (firstAnalysis?.uniformidad?.grandes?.fotoUrl) photoUrls.push(firstAnalysis.uniformidad.grandes.fotoUrl);
    if (firstAnalysis?.uniformidad?.pequenos?.fotoUrl) photoUrls.push(firstAnalysis.uniformidad.pequenos.fotoUrl);

    // Fotos de pesos brutos
    if (firstAnalysis?.pesosBrutos) {
      firstAnalysis.pesosBrutos.forEach(peso => {
        if (peso.fotoUrl) photoUrls.push(peso.fotoUrl);
      });
    }

    // Filtrar solo URLs de Google Drive
    const driveUrls = photoUrls.filter(url => url && url.includes('drive.google.com'));

    if (driveUrls.length === 0) {
      logger.info('ℹ️ No se encontraron URLs de Google Drive en este análisis');
      return;
    }

    logger.log(`📸 Encontradas ${driveUrls.length} URLs de Google Drive`);

    // Importar servicio de Google Drive
    const { googleDriveService } = await import('./googleDriveService');

    // Extraer IDs de archivos
    const fileIds = googleDriveService.extractFileIdsFromUrls(driveUrls);
    logger.log(`🆔 Extraídos ${fileIds.length} IDs únicos de archivos`);

    // Renovar permisos
    await googleDriveService.renewPublicPermissions(fileIds);

    logger.log('✅ Permisos de fotos renovados exitosamente');
  } catch (error) {
    logger.error('❌ Error renovando permisos de fotos:', error);
    throw error;
  }
};

/**
 * Suscribe a los análisis más recientes
 * Usa onSnapshot para actualizaciones en tiempo real y soporte offline
 */
export const subscribeToRecentAnalyses = (
  callback: (analyses: QualityAnalysis[], lastDoc: any) => void,
  limitCount: number = 30
): Unsubscribe => {
  if (!db) throw new Error('Firestore no está configurado');

  const q = query(
    collection(db, ANALYSES_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(q, (snapshot) => {
    const analyses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as QualityAnalysis));

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];

    callback(analyses, lastDoc);
  }, (error) => {
    logger.error('❌ Error en suscripción de análisis:', error);
  });
};

/**
 * Suscribe a un análisis específico por ID
 */
export const subscribeToAnalysis = (
  analysisId: string,
  callback: (analysis: QualityAnalysis | null) => void
): Unsubscribe => {
  if (!db) throw new Error('Firestore no está configurado');

  const analysisRef = getAnalysisRef(analysisId);

  return onSnapshot(analysisRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() } as QualityAnalysis);
    } else {
      callback(null);
    }
  }, (error) => {
    logger.error(`❌ Error en suscripción del análisis ${analysisId}:`, error);
  });
};

export default {
  saveAnalysis,
  updateAnalysis,
  getAnalysisById,
  getAnalysesByDate,
  getAnalysesByDateRange,
  getRecentAnalyses,
  getPaginatedAnalyses,
  getAnalysesByShift,
  deleteAnalysis,
  searchAnalyses,
  renewAnalysisPhotoPermissions,
  saveAnalysisPhotoUrl,
  deleteAnalysisPhoto,
  saveGlobalPhotoUrl,
  subscribeToRecentAnalyses,
  subscribeToAnalysis
};

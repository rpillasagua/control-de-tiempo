// ============================================
// TIPOS DEL SISTEMA — BITÁCORA TÉCNICA
// ============================================

export type WorkShift = 'DIA' | 'NOCHE' | 'MIXTO';

// ============================================
// GEOLOCALIZACIÓN
// ============================================
export interface GeoPoint {
  lat: number;
  lng: number;
  accuracy?: number; // metros
  address?: string;  // dirección geocodificada (opcional)
}

// ============================================
// REGISTRO DE LLEGADA / SALIDA
// ============================================
export interface TimeStamp {
  localTime: string;     // "2026-03-17T08:35:00" — grabado en el cliente
  serverTime?: string;   // Firestore serverTimestamp()
  location?: GeoPoint;
  photoUrl?: string;     // foto de evidencia en Google Drive
}

// ============================================
// ACTIVIDAD TÉCNICA
// ============================================
export interface Activity {
  id: string;
  description: string;    // "Cambié 8 IPs de cámaras Dahua de 192.168.1.x → 10.0.1.x"
  photoUrls: string[];    // URLs de Google Drive
  timestamp: string;      // cuándo se registró
  durationMin?: number;   // duración estimada en minutos (opcional)
}

// ============================================
// VISITA TÉCNICA (documento principal)
// ============================================
export type VisitStatus = 'EN_PROGRESO' | 'FINALIZADA' | 'BORRADOR';

export interface Visit {
  id: string;
  technicianId: string;   // email del técnico
  technicianName: string;

  // Cliente
  clientId?: string;
  clientName: string;
  clientAddress?: string;

  // Evidencia
  arrival: TimeStamp;
  departure?: TimeStamp;

  // Trabajo realizado
  activities: Activity[];
  summary?: string;       // resumen general

  // Calculados
  totalDurationMin?: number;  // departure - arrival en minutos
  status: VisitStatus;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================
// CLIENTE
// ============================================
export interface Client {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  notes?: string;
  createdBy: string;   // email del técnico
  createdAt: string;
}

// ============================================
// PERFIL DEL TÉCNICO (extendido desde Firebase Auth)
// ============================================
export interface TechnicianProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
}


export const SHIFT_LABELS: Record<WorkShift, string> = {
  DIA: 'Turno Día (0H00 - 12H00)',
  NOCHE: 'Turno Noche (12H00 - 0H00)',
  MIXTO: 'Turno Mixto'
};

/**
 * Registro de Entrada/Salida
 */
export interface TimeLog {
  id: string;
  userId: string;
  type: 'ENTRADA' | 'SALIDA' | 'INICIO_ALMUERZO' | 'FIN_ALMUERZO';
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  photoUrl?: string; // Para validación facial
}

/**
 * Perfil de usuario en el sistema de tiempo
 */
export interface WorkerProfile {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'WORKER';
  department: string;
  defaultShift: WorkShift;
}
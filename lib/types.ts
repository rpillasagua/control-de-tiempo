// ============================================
// TIPOS DEL SISTEMA — BITÁCORA TÉCNICA
// ============================================

export interface Company {
  id: string; // Auto-generated ID (used for the public portal URL)
  name: string;
  adminEmail: string; // Dueño / Administrador principal
  technicianEmails: string[]; // Lista de correos autorizados como técnicos
  ruc?: string;
  phone?: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type TicketPriority = 'ALTA' | 'NORMAL' | 'BAJA';
export type TicketStatus = 'PENDIENTE' | 'REVISADO' | 'ASIGNADO' | 'CERRADO';

export interface Ticket {
  id: string;
  companyId: string; // A qué empresa va dirigido
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  issueDescription: string;
  photoUrl?: string;         // Evidencia subida por el cliente o admin
  priority?: TicketPriority; // Nueva: prioridad del ticket
  location?: GeoPoint;       // GPS del lugar del problema
  locationUrl?: string;      // Enlace manual de Google Maps
  notes?: string;            // Nueva: notas internas del admin
  createdByAdmin?: boolean;  // Nueva: si fue creado manualmente por admin
  status: TicketStatus;
  assignedTo?: string;       // email del técnico asignado
  visitId?: string;          // ID de la visita técnica generada
  createdAt: string;
  updatedAt: string;
}


// ============================================
// INVITACIONES (códigos para unirse a empresa)
// ============================================
export type InviteRole = 'TECHNICIAN';

export interface Invite {
  code: string;       // 6 chars, también es el ID del documento
  companyId: string;
  companyName: string;
  createdBy: string;  // email del admin
  role: InviteRole;
  expiresAt: string;  // ISO — válido 48 h
  usedAt?: string;
  usedBy?: string;    // email del técnico que lo usó
}

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
export type VisitStatus = 'EN_PROGRESO' | 'FINALIZADA' | 'PAUSADA' | 'BORRADOR';

// ============================================
// PAUSA DE VISITA
// ============================================
export interface VisitPause {
  startTime: string;   // ISO — cuando el técnico pausó
  endTime?: string;    // ISO — cuando reanudó (undefined si sigue pausada)
  reason: string;      // motivo de la pausa
}

export interface Visit {
  id: string;
  technicianId: string;   // email del técnico
  technicianName: string;

  // Empresa & Origen
  companyId?: string;     // si pertenece a una empresa registrada
  ticketId?: string;      // si fue generada a partir de un ticket de cliente

  // Cliente
  clientId?: string;
  clientName: string;
  clientPhone?: string;
  clientAddress?: string;

  // Evidencia
  arrival: TimeStamp;
  departure?: TimeStamp;

  // Trabajo realizado
  activities: Activity[];
  summary?: string;       // resumen general

  // Calculados
  totalDurationMin?: number;  // neto: departure - arrival - pauses en minutos
  status: VisitStatus;

  // Pausa de visita
  pauses?: VisitPause[];

  // Firma digital del cliente
  clientSignature?: string;   // Base64 PNG

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
  companyId?: string;  // Nueva: vinculación al tenant de la empresa
  createdBy: string;   // email del técnico o marcador de sistema
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

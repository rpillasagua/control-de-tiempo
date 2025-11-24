import { WorkShift } from './types';

/**
 * Determina el turno basado en la hora
 * Turno Día: 7:10 AM - 7:10 PM
 * Turno Noche: 7:10 PM - 7:10 AM
 */
export function getWorkShift(date: Date = new Date()): WorkShift {
  const hours = date.getHours();
  const minutes = date.getMinutes();

  // Convertir a minutos desde medianoche
  const totalMinutes = hours * 60 + minutes;

  // 7:10 AM = 430 minutos
  // 7:10 PM = 1150 minutos
  const dayShiftStart = 7 * 60 + 10; // 430
  const dayShiftEnd = 19 * 60 + 10; // 1150

  if (totalMinutes >= dayShiftStart && totalMinutes < dayShiftEnd) {
    return 'DIA';
  } else {
    return 'NOCHE';
  }
}

/**
 * Formatea la fecha en formato YYYY-MM-DD
 */
export function formatDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Obtiene la fecha de producción basada en el turno
 * Si es antes de las 7:10 AM, pertenece al día anterior (Turno Noche)
 */
export function getProductionDate(date: Date = new Date()): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // 7:10 AM = 430 minutos
  const dayShiftStart = 7 * 60 + 10;

  // Si es antes del inicio del turno día (madrugada), restamos un día
  if (totalMinutes < dayShiftStart) {
    const previousDay = new Date(date);
    previousDay.setDate(date.getDate() - 1);
    return formatDate(previousDay);
  }

  return formatDate(date);
}

/**
 * Formatea la hora en formato HH:mm
 */
export function formatTime(date: Date = new Date()): string {
  return date.toTimeString().slice(0, 5);
}

/**
 * Genera un ID único
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Obtiene el nombre del archivo de una URL
 */
export function getFileNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    return pathname.split('/').pop() || 'file';
  } catch {
    return 'file';
  }
}

/**
 * Convierte File a base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

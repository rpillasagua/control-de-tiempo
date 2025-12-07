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

/**
 * Comprime una imagen antes de guardarla localmente
 * @param file - Archivo de imagen original
 * @param maxWidth - Ancho máximo (default: 1920px)
 * @param maxHeight - Alto máximo (default: 1920px)
 * @param quality - Calidad de compresión 0-1 (default: 0.8)
 * @returns Promise con el Blob comprimido
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;

          if (width > height) {
            width = maxWidth;
            height = width / aspectRatio;
          } else {
            height = maxHeight;
            width = height * aspectRatio;
          }
        }

        // Crear canvas y comprimir
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener contexto del canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a Blob con compresión
        canvas.toBlob(
          (blob) => {
            if (blob) {
              console.log(`📸 Imagen comprimida: ${(file.size / 1024).toFixed(1)}KB → ${(blob.size / 1024).toFixed(1)}KB (${((1 - blob.size / file.size) * 100).toFixed(1)}% reducción)`);
              resolve(blob);
            } else {
              reject(new Error('Error al comprimir imagen'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Error al cargar imagen'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Error al leer archivo'));
    reader.readAsDataURL(file);
  });
}

/**
 * Helper para reintentar subidas
 */
export const uploadWithRetry = async (uploadFn: () => Promise<string>, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await uploadFn();
    } catch (error) {
      if (i === retries - 1) throw error;
      const delay = Math.min(1000 * Math.pow(2, i), 5000); // Exponential backoff
      console.log(`⚠️ Error subiendo foto, reintentando en ${delay}ms... (Intento ${i + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries reached');
};

/**
 * Debounce function - delays execution until after wait milliseconds have elapsed
 * since the last time the debounced function was invoked.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: unknown, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}

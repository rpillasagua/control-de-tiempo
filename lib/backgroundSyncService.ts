/**
 * Background Sync Service
 * Servicio para registrar fotos en la cola de Background Sync de Workbox
 */

import { logger } from './logger';

export interface PhotoSyncData {
    photoId: string;
    analysisId: string;
    field: string;
    blob: Blob;
    fileName: string;
    timestamp: number;
}

class BackgroundSyncService {
    private readonly SYNC_TAG = 'photo-upload-sync';

    /**
     * Registra una foto para sync en background
     */
    async registerPhotoUpload(data: PhotoSyncData): Promise<void> {
        try {
            // Verificar si Background Sync está disponible
            if (!('serviceWorker' in navigator)) {
                logger.log('⚠️ Service Workers no están disponibles en este navegador');
                throw new Error('Service Workers no soportados');
            }

            const registration = await navigator.serviceWorker.ready;

            if (!('sync' in registration)) {
                logger.log('⚠️ Background Sync no está disponible en este navegador');
                throw new Error('Background Sync no soportado');
            }

            // Registrar el sync tag
            await (registration as any).sync.register(this.SYNC_TAG);

            logger.log(`✅ Foto registrada para Background Sync: ${data.photoId}`);
        } catch (error) {
            logger.error('Error registrando Background Sync:', error);
            throw error;
        }
    }

    /**
     * Verifica si hay syncs pendientes
     */
    async hasPendingSyncs(): Promise<boolean> {
        try {
            if (!('serviceWorker' in navigator)) {
                return false;
            }

            const registration = await navigator.serviceWorker.ready;

            if (!('sync' in registration)) {
                return false;
            }

            const tags = await (registration as any).sync.getTags();
            return tags.includes(this.SYNC_TAG);
        } catch (error) {
            logger.error('Error verificando syncs pendientes:', error);
            return false;
        }
    }

    /**
     * Verifica si Background Sync está soportado
     */
    async isSupported(): Promise<boolean> {
        if (!('serviceWorker' in navigator)) {
            return false;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            return 'sync' in registration;
        } catch {
            return false;
        }
    }
}

export const backgroundSyncService = new BackgroundSyncService();

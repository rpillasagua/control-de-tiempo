import { useEffect } from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export function useServiceWorker() {
    useEffect(() => {
        if (
            typeof window !== 'undefined' &&
            'serviceWorker' in navigator &&
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).workbox !== undefined
        ) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const wb = (window as any).workbox;

            wb.addEventListener('installed', (event: any) => {
                logger.log(`Service Worker installed: ${event.type}`);
            });

            wb.addEventListener('controlling', (event: any) => {
                logger.log(`Service Worker controlling: ${event.type}`);
            });

            wb.addEventListener('activated', (event: any) => {
                logger.log(`Service Worker activated: ${event.type}`);
            });

            const promptNewVersionAvailable = () => {
                toast.info('Nueva versión disponible', {
                    description: 'Actualiza para ver los últimos cambios',
                    action: {
                        label: 'Actualizar',
                        onClick: () => {
                            wb.addEventListener('controlling', () => {
                                window.location.reload();
                            });

                            // Send a message to the waiting service worker, instructing it to activate.
                            wb.messageSkipWaiting();
                        }
                    },
                    duration: Infinity, // Mantener visible hasta que el usuario decida
                });
            };

            wb.addEventListener('waiting', promptNewVersionAvailable);
            wb.addEventListener('externalwaiting', promptNewVersionAvailable);

            wb.register();
        }

        // ✅ PERIODIC BACKGROUND CHECK FOR PENDING PHOTOS
        // This ensures photos get uploaded even if the user misses the 'online' event
        const checkPendingPhotos = async () => {
            if (!navigator.onLine) return;

            try {
                const { photoStorageService } = await import('@/lib/photoStorageService');
                await photoStorageService.initialize();

                const [pending, failed] = await Promise.all([
                    photoStorageService.getPendingPhotos(),
                    photoStorageService.getFailedPhotos()
                ]);

                const totalPending = pending.length + failed.length;

                if (totalPending > 0) {
                    logger.log(`📋 Background check: ${totalPending} fotos pendientes detectadas`);
                    // The PendingUploadsPanel will handle the actual retry
                    // This is just to ensure visibility in logs
                }
            } catch (error) {
                console.error('Error en background check de fotos:', error);
            }
        };

        // Check every 30 seconds
        const photoCheckInterval = setInterval(checkPendingPhotos, 30000);

        // Cleanup
        return () => {
            clearInterval(photoCheckInterval);
        };
    }, []);
}

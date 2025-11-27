'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { googleAuthService } from '@/lib/googleAuthService';

/**
 * Hook para manejar notificaciones de expiración de token de Google
 * Escucha el evento 'google-token-expiring' y muestra notificación al usuario
 */
export function useTokenExpiryNotification() {
    useEffect(() => {
        const handleTokenExpiring = (event: Event) => {
            const customEvent = event as CustomEvent<{ expiresIn: number; message: string }>;
            const { expiresIn } = customEvent.detail;

            // Calcular minutos restantes
            const minutesLeft = Math.floor(expiresIn / 60);

            // Mostrar notificación PROMINENTE que no se auto-cierra
            const warningToastId = toast.warning('⏰ Tu sesión está por expirar', {
                description: `Quedan ${minutesLeft} minutos. Haz clic en "Renovar Sesión" para continuar sin interrupciones.`,
                action: {
                    label: '🔄 Renovar Sesión',
                    onClick: async () => {
                        let loadingToast: string | number | undefined;

                        try {
                            // Mostrar loading toast
                            loadingToast = toast.loading('Renovando sesión...');

                            await googleAuthService.login();

                            // Cerrar loading toast primero
                            if (loadingToast) {
                                toast.dismiss(loadingToast);
                            }

                            // Cerrar warning original
                            toast.dismiss(warningToastId);

                            // Mostrar éxito
                            toast.success('✅ Sesión renovada exitosamente', {
                                description: 'Puedes continuar trabajando sin problemas',
                                duration: 3000
                            });
                        } catch (error) {
                            console.error('Error renovando sesión:', error);

                            // ✅ CRÍTICO: Cerrar loading toast en caso de error
                            if (loadingToast) {
                                toast.dismiss(loadingToast);
                            }

                            toast.dismiss(warningToastId);

                            toast.error('❌ Error al renovar sesión', {
                                description: 'Intenta recargar la página (F5) para continuar',
                                duration: 10000
                            });
                        }
                    }
                },
                duration: Infinity, // NO se auto-cierra - usuario debe actuar
            });
        };

        // Escuchar evento global
        window.addEventListener('google-token-expiring', handleTokenExpiring);

        return () => {
            window.removeEventListener('google-token-expiring', handleTokenExpiring);
        };
    }, []);
}

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
                    onClick: () => {
                        toast.promise(googleAuthService.login(), {
                            loading: 'Renovando sesión...',
                            success: () => {
                                toast.dismiss(warningToastId);
                                return '✅ Sesión renovada exitosamente';
                            },
                            error: (err) => {
                                toast.dismiss(warningToastId);
                                console.error('Error renovando sesión:', err);
                                return '❌ Error al renovar sesión. Intenta recargar (F5).';
                            },
                        });
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

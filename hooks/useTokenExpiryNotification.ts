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
            const { message } = customEvent.detail;

            // Mostrar notificación persistente con acción para renovar
            toast.warning(message, {
                description: 'Haz clic en "Renovar" para continuar sin interrupciones',
                action: {
                    label: 'Renovar Ahora',
                    onClick: async () => {
                        try {
                            await googleAuthService.login();
                            toast.success('Sesión renovada exitosamente');
                        } catch (error) {
                            console.error('Error renovando sesión:', error);
                            toast.error('Error al renovar sesión. Por favor, recarga la página.');
                        }
                    }
                },
                duration: 300000, // 5 minutos - hasta que expire
            });
        };

        // Escuchar evento global
        window.addEventListener('google-token-expiring', handleTokenExpiring);

        return () => {
            window.removeEventListener('google-token-expiring', handleTokenExpiring);
        };
    }, []);
}

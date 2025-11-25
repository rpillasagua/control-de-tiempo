'use client';

import { useTokenExpiryNotification } from '@/hooks/useTokenExpiryNotification';

/**
 * Componente para integrar notificaciones de expiración de token
 * Este componente se monta en el layout principal para funcionar globalmente
 */
export default function TokenExpiryNotifier() {
    useTokenExpiryNotification();
    return null; // No renderiza nada, solo maneja el evento
}

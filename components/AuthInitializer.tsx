'use client';

import { useEffect } from 'react';
import { googleAuthService } from '@/lib/googleAuthService';
import { logger } from '@/lib/logger';

export default function AuthInitializer() {
    useEffect(() => {
        const init = async () => {
            try {
                // Initialize checks for existing session and restores it
                await googleAuthService.initialize();
            } catch (error) {
                logger.error('Global Auth Initializer failed:', error);
            }
        };
        init();
    }, []);

    return null;
}

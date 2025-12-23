import { useState, useEffect } from 'react';

export function useNetworkStatus() {
    // Default to true to avoid hydration mismatch, update in effect
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        // Set initial state
        if (typeof window !== 'undefined') {
            setIsOnline(navigator.onLine);
        }

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}

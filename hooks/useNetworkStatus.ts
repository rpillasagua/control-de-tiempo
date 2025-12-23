import { useState, useEffect } from 'react';

export function useNetworkStatus() {
    // Default to true to avoid hydration mismatch, update in effect
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        // Set initial state
        if (typeof window !== 'undefined') {
            setIsOnline(navigator.onLine);
        }

        const updateOnlineStatus = () => {
            const newStatus = navigator.onLine;
            setIsOnline(newStatus);

            // Additional verification: if navigator says online, double-check with a ping
            if (newStatus) {
                // Try to fetch a small resource to verify actual connectivity
                fetch('https://www.google.com/favicon.ico', {
                    mode: 'no-cors',
                    cache: 'no-cache'
                })
                    .then(() => setIsOnline(true))
                    .catch(() => setIsOnline(false));
            }
        };

        const handleOnline = () => updateOnlineStatus();
        const handleOffline = () => setIsOnline(false);
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                updateOnlineStatus();
            }
        };

        // Initial check
        updateOnlineStatus();

        // Event listeners
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Periodic check every 30 seconds to catch edge cases
        const intervalId = setInterval(updateOnlineStatus, 30000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(intervalId);
        };
    }, []);

    return isOnline;
}

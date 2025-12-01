/**
 * Retry Utilities for Firestore Operations
 * 
 * Provides automatic retry logic for transient Firestore failures
 * to improve reliability on unstable connections.
 */

interface RetryOptions {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffMultiplier: 2
};

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Determines if an error is transient and worth retrying
 */
function isTransientError(error: any): boolean {
    if (!error) return false;

    const code = error?.code || '';
    const message = String(error?.message || error).toLowerCase();

    // Firestore transient error codes
    const transientCodes = [
        'unavailable',
        'deadline-exceeded',
        'resource-exhausted',
        'aborted',
        'internal',
        'unknown'
    ];

    // Network-related errors
    const networkErrors = [
        'network',
        'connection',
        'timeout',
        'failed to fetch',
        'load failed'
    ];

    return (
        transientCodes.includes(code) ||
        networkErrors.some(term => message.includes(term))
    );
}

/**
 * Executes a function with exponential backoff retry logic
 * 
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => saveAnalysis(data),
 *   { maxRetries: 3, initialDelay: 1000 }
 * );
 * ```
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: any;
    let delay = opts.initialDelay;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Don't retry if this is the last attempt
            if (attempt === opts.maxRetries) {
                break;
            }

            // Don't retry non-transient errors
            if (!isTransientError(error)) {
                throw error;
            }

            console.warn(
                `⚠️ Retry attempt ${attempt + 1}/${opts.maxRetries} after ${delay}ms`,
                error
            );

            // Wait before retrying
            await sleep(delay);

            // Exponential backoff with cap
            delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
        }
    }

    // All retries exhausted
    throw lastError;
}

/**
 * Wrapper for Firestore transaction operations with retry
 * 
 * @example
 * ```typescript
 * await withFirestoreRetry(() => 
 *   runTransaction(db, async (transaction) => {
 *     // transaction logic
 *   })
 * );
 * ```
 */
export async function withFirestoreRetry<T>(
    fn: () => Promise<T>,
    options?: RetryOptions
): Promise<T> {
    return withRetry(fn, {
        maxRetries: 3,
        initialDelay: 1000,
        ...options
    });
}

import { logger } from './logger';

interface CompressionOptions {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    quality?: number;
    useWebWorker?: boolean;
    addWatermark?: boolean;
}

/**
 * Draws a watermark with current date and time on the image canvas
 */
async function applyWatermark(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return resolve(file); // fallback to original
            }

            canvas.width = img.width;
            canvas.height = img.height;

            // Draw original image
            ctx.drawImage(img, 0, 0);

            // Configure text style
            const fontSize = Math.max(14, Math.floor(canvas.width * 0.03));
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.lineWidth = Math.max(1, Math.floor(fontSize / 10));

            // Create timestamp
            const now = new Date();
            const dateStr = now.toLocaleDateString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit' });
            const timeStr = now.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const text = `Bitácora - ${dateStr} ${timeStr}`;

            const padding = fontSize;
            const x = canvas.width - padding;
            const y = canvas.height - padding;

            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';

            // Draw text with outline for visibility on any background
            ctx.strokeText(text, x, y);
            ctx.fillText(text, x, y);

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                    } else {
                        resolve(file); // fallback
                    }
                },
                'image/jpeg',
                0.95 // Keep high quality here, let compression handle size reduction
            );
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(file); // return original if error
        };
        img.src = objectUrl;
    });
}

/**
 * Compresses an image file to reduce its size while maintaining good quality
 * @param file - The image file to compress
 * @param options - Optional compression settings
 * @returns Compressed image file
 */
export async function compressImage(
    file: File,
    options?: CompressionOptions
): Promise<File> {
    const defaultOptions = {
        maxSizeMB: 0.8, // 800KB max
        maxWidthOrHeight: 1920, // Max dimension
        quality: 0.85, // 85% quality
        useWebWorker: true, // Use web worker for better performance
        fileType: 'image/jpeg', // Force JPEG for compatibility (fixes HEIC issues)
        addWatermark: true, // Auto watermark enabled by default
    };

    const compressionOptions = { ...defaultOptions, ...options };

    try {
        logger.log(`📦 Compressing image: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

        let processedFile = file;
        
        // Ensure browser environment before doing canvas ops
        if (typeof window !== 'undefined' && compressionOptions.addWatermark) {
            processedFile = await applyWatermark(processedFile);
        }

        // Dynamically import the browser-only library to prevent SSR crashes in Next.js
        const imageCompression = (await import('browser-image-compression')).default;

        // Create a promise that rejects after a timeout (e.g., 10 seconds)
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Compression timed out')), 10000);
        });

        // Race between compression and timeout
        const compressedFile = await Promise.race([
            imageCompression(processedFile, compressionOptions),
            timeoutPromise
        ]);

        logger.log(
            `✅ Compression complete: ${compressedFile.name} (${(compressedFile.size / 1024 / 1024).toFixed(2)} MB) - ${((1 - compressedFile.size / file.size) * 100).toFixed(1)}% reduction`
        );

        return compressedFile;
    } catch (error) {
        logger.error('❌ Error compressing image:', error);

        if (compressionOptions.useWebWorker) {
            logger.warn('⚠️ Retrying compression without WebWorker...');
            try {
                const imageCompression = (await import('browser-image-compression')).default;
                const fallbackOptions = { ...compressionOptions, useWebWorker: false };
                let fallbackFile = file;
                if (typeof window !== 'undefined' && fallbackOptions.addWatermark) {
                    fallbackFile = await applyWatermark(fallbackFile);
                }
                const compressedFile = await imageCompression(fallbackFile, fallbackOptions);
                return compressedFile;
            } catch (retryError) {
                logger.error('❌ Error in fallback compression:', retryError);
            }
        }

        logger.warn('⚠️ Returning original file due to compression error');
        return file;
    }
}

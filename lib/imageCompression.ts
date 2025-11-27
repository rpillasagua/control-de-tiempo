import imageCompression from 'browser-image-compression';

interface CompressionOptions {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    quality?: number;
    useWebWorker?: boolean;
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
    };

    const compressionOptions = { ...defaultOptions, ...options };

    try {
        console.log(`📦 Compressing image: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

        // Create a promise that rejects after a timeout (e.g., 10 seconds)
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Compression timed out')), 10000);
        });

        // Race between compression and timeout
        const compressedFile = await Promise.race([
            imageCompression(file, compressionOptions),
            timeoutPromise
        ]);

        console.log(
            `✅ Compression complete: ${compressedFile.name} (${(compressedFile.size / 1024 / 1024).toFixed(2)} MB) - ${((1 - compressedFile.size / file.size) * 100).toFixed(1)}% reduction`
        );

        return compressedFile;
    } catch (error) {
        console.error('❌ Error compressing image:', error);

        // If it failed with WebWorker, try without it (fallback for some mobile devices)
        if (compressionOptions.useWebWorker) {
            console.warn('⚠️ Retrying compression without WebWorker...');
            try {
                const fallbackOptions = { ...compressionOptions, useWebWorker: false };
                const compressedFile = await imageCompression(file, fallbackOptions);
                return compressedFile;
            } catch (retryError) {
                console.error('❌ Error in fallback compression:', retryError);
            }
        }

        // If all fails, return the original file
        console.warn('⚠️ Returning original file due to compression error');
        return file;
    }
}

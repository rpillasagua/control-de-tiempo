/**
 * Photo Storage Service
 * Manages local storage of photos using IndexedDB before uploading to Firebase/Drive
 */

interface PendingPhoto {
    id: string;
    analysisId: string;
    field: string;
    file: Blob;
    fileName: string;
    timestamp: number;
    status: 'pending' | 'uploading' | 'success' | 'error';
    uploadUrl?: string;
    retryCount: number;
    lastError?: string;
    metadata: {
        codigo: string;
        lote: string;
        batchCode: string;      // Unique identifier: "codigo-lote-analysis#"
        analysisIndex?: number; // Optional only for global photos
    };
}

class PhotoStorageService {
    private dbName = 'AnalysisPhotosDB';
    private storeName = 'pendingPhotos';
    private version = 1;
    private db: IDBDatabase | null = null;

    /**
     * Initialize the IndexedDB database
     */
    async initialize(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('❌ Error opening IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ IndexedDB initialized successfully');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id' });

                    // Create indexes for efficient querying
                    objectStore.createIndex('analysisId', 'analysisId', { unique: false });
                    objectStore.createIndex('status', 'status', { unique: false });
                    objectStore.createIndex('timestamp', 'timestamp', { unique: false });

                    console.log('✅ Object store created');
                }
            };
        });
    }

    /**
     * Ensure DB is initialized
     */
    private async ensureDB(): Promise<IDBDatabase> {
        if (!this.db) {
            await this.initialize();
        }
        if (!this.db) {
            throw new Error('Failed to initialize database');
        }
        return this.db;
    }

    /**
     * Validate photo metadata to ensure all required fields are present
     */
    private validateMetadata(metadata: PendingPhoto['metadata']): void {
        if (!metadata.codigo || !metadata.lote || !metadata.batchCode) {
            throw new Error('Invalid photo metadata: codigo, lote, and batchCode are required');
        }

        // For non-global photos, analysisIndex should be a valid number
        if (!metadata.batchCode.includes('-global') && metadata.analysisIndex === undefined) {
            throw new Error('Invalid photo metadata: analysisIndex is required for non-global photos');
        }
    }

    /**
     * Save a photo locally before uploading
     */
    async savePhoto(photo: Omit<PendingPhoto, 'timestamp' | 'retryCount'>): Promise<string> {
        const db = await this.ensureDB();

        // ✅ VALIDATE METADATA BEFORE SAVING
        this.validateMetadata(photo.metadata);

        const pendingPhoto: PendingPhoto = {
            ...photo,
            timestamp: Date.now(),
            retryCount: 0,
        };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.put(pendingPhoto);

            request.onsuccess = () => {
                console.log('📁 Photo saved locally:', photo.id);
                resolve(pendingPhoto.id);
            };

            request.onerror = () => {
                console.error('❌ Error saving photo locally:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Update photo status
     */
    async updatePhotoStatus(
        id: string,
        status: PendingPhoto['status'],
        uploadUrl?: string,
        error?: string
    ): Promise<void> {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const getRequest = objectStore.get(id);

            getRequest.onsuccess = () => {
                const photo = getRequest.result as PendingPhoto | undefined;

                if (!photo) {
                    reject(new Error(`Photo not found: ${id}`));
                    return;
                }

                const updatedPhoto: PendingPhoto = {
                    ...photo,
                    status,
                    uploadUrl: uploadUrl || photo.uploadUrl,
                    lastError: error,
                    retryCount: status === 'error' ? photo.retryCount + 1 : photo.retryCount,
                };

                const putRequest = objectStore.put(updatedPhoto);

                putRequest.onsuccess = () => {
                    console.log(`📝 Photo status updated: ${id} -> ${status}`);
                    resolve();
                };

                putRequest.onerror = () => {
                    reject(putRequest.error);
                };
            };

            getRequest.onerror = () => {
                reject(getRequest.error);
            };
        });
    }

    /**
     * Get a specific photo by ID
     */
    async getPhoto(id: string): Promise<PendingPhoto | null> {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.get(id);

            request.onsuccess = () => {
                resolve(request.result || null);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Get all pending photos
     */
    async getPendingPhotos(): Promise<PendingPhoto[]> {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const index = objectStore.index('status');
            const request = index.getAll('pending');

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Get all photos with error status
     */
    async getFailedPhotos(): Promise<PendingPhoto[]> {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const index = objectStore.index('status');
            const request = index.getAll('error');

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Get all photos for a specific analysis
     */
    async getPhotosByAnalysis(analysisId: string): Promise<PendingPhoto[]> {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const index = objectStore.index('analysisId');
            const request = index.getAll(analysisId);

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Delete a photo from local storage
     */
    async deletePhoto(id: string): Promise<void> {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.delete(id);

            request.onsuccess = () => {
                console.log('🗑️ Photo deleted from local storage:', id);
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Clean up old successfully uploaded photos (older than 7 days)
     */
    async cleanupOldPhotos(): Promise<number> {
        const db = await this.ensureDB();
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        let deletedCount = 0;

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.openCursor();

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

                if (cursor) {
                    const photo = cursor.value as PendingPhoto;

                    // Delete if successfully uploaded and older than 7 days
                    if (photo.status === 'success' && photo.timestamp < sevenDaysAgo) {
                        cursor.delete();
                        deletedCount++;
                    }

                    cursor.continue();
                } else {
                    console.log(`🧹 Cleaned up ${deletedCount} old photos`);
                    resolve(deletedCount);
                }
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Get storage usage statistics
     */
    async getStorageStats(): Promise<{ total: number; pending: number; uploading: number; success: number; error: number }> {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.getAll();

            request.onsuccess = () => {
                const photos = request.result as PendingPhoto[];
                const stats = {
                    total: photos.length,
                    pending: photos.filter(p => p.status === 'pending').length,
                    uploading: photos.filter(p => p.status === 'uploading').length,
                    success: photos.filter(p => p.status === 'success').length,
                    error: photos.filter(p => p.status === 'error').length,
                };
                resolve(stats);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }
    /**
     * Get a specific photo by analysisId and field
     * Useful for rehydrating UI from local storage
     * NOW SUPPORTS OPTIONAL analysisIndex for stricter filtering
     */
    async getPhotoByContext(analysisId: string, field: string, analysisIndex?: number): Promise<PendingPhoto | null> {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const index = objectStore.index('analysisId');
            const request = index.getAll(analysisId);

            request.onsuccess = () => {
                const photos = request.result as PendingPhoto[];
                // Find the specific photo for this field that is not successful (pending, uploading, error)
                // We prioritize the most recent one if duplicates exist (though they shouldn't)
                const match = photos
                    .filter(p => {
                        // 1. Must match field
                        if (p.field !== field) return false;

                        // 2. Must not be successful (we only care about pending/offline stuff here)
                        if (p.status === 'success') return false;

                        // 3. ✅ STRICT INDEX CHECK
                        // If analysisIndex is provided, the photo MUST match it
                        if (analysisIndex !== undefined) {
                            // Local variable for clarity
                            const photoIndex = p.metadata?.analysisIndex;
                            // Check equality (comparing numbers)
                            return photoIndex === analysisIndex;
                        }

                        // If no analysisIndex provided (legacy behavior or global fields),
                        // we loosely match (or ideally, global fields should explicitly be index-less)
                        // For safety: if context has NO index (global), match photos with NO index.
                        // If context IS global field, ignore index.
                        if (field === 'global-pesoBruto' || field === 'peso_bruto_global') return true;

                        return true;
                    })
                    .sort((a, b) => b.timestamp - a.timestamp)[0];

                resolve(match || null);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Delete all photos for a specific context (analysisId + field)
     * Used to cleanup old failed attempts before starting a new one
     * NOW SUPPORTS OPTIONAL analysisIndex for stricter cleanup
     */
    async deletePhotosByContext(analysisId: string, field: string, analysisIndex?: number): Promise<void> {
        const db = await this.ensureDB();
        const photos = await this.getPhotosByAnalysis(analysisId);

        // Filter for the specific field AND index
        const photosToDelete = photos.filter(p => {
            if (p.field !== field) return false;

            // ✅ STRICT INDEX CHECK
            if (analysisIndex !== undefined) {
                return p.metadata?.analysisIndex === analysisIndex;
            }

            return true;
        });

        if (photosToDelete.length === 0) return;

        console.log(`🧹 Cleaning up ${photosToDelete.length} old photos for ${field} (Index: ${analysisIndex})`);

        const transaction = db.transaction([this.storeName], 'readwrite');
        const objectStore = transaction.objectStore(this.storeName);

        photosToDelete.forEach(photo => {
            objectStore.delete(photo.id);
        });

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * Scan for duplicates (same context) and keep only the most recent one
     * This fixes the issue where retries might create ghost duplicates
     */
    async cleanupDuplicates(): Promise<number> {
        const db = await this.ensureDB();
        const photos = await this.getStorageStats().then(async () => {
            // We need all photos, so we use getAll via a transaction
            return new Promise<PendingPhoto[]>((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        });

        // Group by context key: analysisId + field
        const groups = new Map<string, PendingPhoto[]>();
        photos.forEach(p => {
            const key = `${p.analysisId}-${p.field}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(p);
        });

        let deletedCount = 0;
        const idsToDelete: string[] = [];

        groups.forEach((group) => {
            if (group.length > 1) {
                // Sort by timestamp descending (newest first)
                group.sort((a, b) => b.timestamp - a.timestamp);

                // Keep the first one (newest), delete the rest
                // Exception: If one is 'uploading', prefer that one? 
                // Actually, newest is usually the best bet.

                const toDelete = group.slice(1);
                toDelete.forEach(p => idsToDelete.push(p.id));
            }
        });

        if (idsToDelete.length > 0) {
            console.log(`🧹 Found ${idsToDelete.length} duplicates to clean up`);
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            idsToDelete.forEach(id => store.delete(id));

            await new Promise<void>((resolve, reject) => {
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
            deletedCount = idsToDelete.length;
        }

        return deletedCount;
    }

    /**
     * Reset photos that were stuck in 'uploading' state (e.g. due to page reload)
     */
    async resetStuckUploads(): Promise<number> {
        const db = await this.ensureDB();
        let count = 0;

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const index = objectStore.index('status');
            const request = index.getAll('uploading');

            request.onsuccess = () => {
                const photos = request.result as PendingPhoto[];
                if (photos.length === 0) {
                    resolve(0);
                    return;
                }

                photos.forEach(photo => {
                    const updatedPhoto: PendingPhoto = {
                        ...photo,
                        status: 'error',
                        lastError: 'Subida interrumpida (recarga de página)',
                        retryCount: photo.retryCount + 1
                    };
                    objectStore.put(updatedPhoto);
                    count++;
                });
            };

            transaction.oncomplete = () => {
                if (count > 0) console.log(`🔄 Reset ${count} stuck uploads to error status`);
                resolve(count);
            };

            transaction.onerror = () => {
                console.error('❌ Error resetting stuck uploads:', transaction.error);
                reject(transaction.error);
            };
        });
    }
}

// Export singleton instance
export const photoStorageService = new PhotoStorageService();
export type { PendingPhoto };

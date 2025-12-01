import { toast } from 'sonner';
import { PendingPhoto, photoStorageService } from '@/lib/photoStorageService';
import { uploadWithRetry, generateId } from '@/lib/utils';

/**
 * Retries a photo upload without updating local React state (for use in Dashboard)
 */
export const retryPhotoUploadStandalone = async (photo: PendingPhoto) => {
    console.log(`🔄 STANDALONE RETRY - ID: ${photo.id}, Field: ${photo.field}`);

    try {
        // Update status to uploading
        await photoStorageService.updatePhotoStatus(photo.id, 'uploading');

        // Initialize services
        const { googleDriveService } = await import('@/lib/googleDriveService');
        await googleDriveService.initialize();
        const { googleAuthService } = await import('@/lib/googleAuthService');
        const user = googleAuthService.getUser();
        const { saveAnalysisPhotoUrl, saveGlobalPhotoUrl, getAnalysisById } = await import('@/lib/analysisService');

        // Extract metadata
        const { codigo, lote, analysisIndex } = photo.metadata || {};
        const analysisId = photo.analysisId;

        if (!codigo || !lote || !analysisId) {
            throw new Error('Missing metadata for retry');
        }

        // Determine filename
        let driveFileName = '';
        if (photo.field.startsWith('pesobruto-')) {
            const registroId = photo.field.replace('pesobruto-', '');
            driveFileName = `peso_bruto_${registroId}_analysis${(analysisIndex ?? 0) + 1}`;
        } else if (photo.field === 'global-pesoBruto') {
            driveFileName = 'peso_bruto_global';
        } else {
            driveFileName = `${photo.field}_analysis${(analysisIndex ?? 0) + 1}`;
        }

        console.log(`🚀 Uploading to Drive: ${driveFileName}`);

        // Convert Blob to File
        const fileToUpload = new File([photo.file], photo.fileName || driveFileName, { type: photo.file.type });

        // Upload
        const url = await uploadWithRetry(() => googleDriveService.uploadAnalysisPhoto(
            fileToUpload,
            codigo,
            lote,
            analysisId,
            driveFileName,
            undefined, // We don't have the old URL here, but that's okay for retry
            user?.email
        ));

        console.log('✅ Upload successful:', url);

        // Update Firestore
        if (photo.field === 'global-pesoBruto') {
            await saveGlobalPhotoUrl(analysisId, url);
        } else {
            // We need to fetch the document to get the ID and ensure existence
            const analysisDoc = await getAnalysisById(analysisId);
            if (!analysisDoc) throw new Error('Analysis document not found');

            const targetIndex = analysisIndex ?? 0;
            const targetAnalysis = analysisDoc.analyses?.[targetIndex];

            if (!targetAnalysis) {
                throw new Error(`Analysis item #${targetIndex} not found`);
            }

            // Use ID for safety - generate if missing (legacy data)
            const analysisItemId = targetAnalysis.id || generateId();

            let fieldPath = photo.field;
            if (photo.field.startsWith('pesobruto-')) {
                const pbIndex = targetAnalysis.pesosBrutos?.findIndex((r: any) => r.id === photo.field.replace('pesobruto-', ''));

                if (pbIndex !== undefined && pbIndex !== -1) {
                    fieldPath = `pesosBrutos.${pbIndex}.fotoUrl`;
                    await saveAnalysisPhotoUrl(analysisId, analysisItemId, targetIndex, fieldPath, url);
                } else {
                    console.warn('Could not find peso bruto record index');
                }

            } else {
                if (photo.field.startsWith('uniformidad_')) {
                    const tipo = photo.field.split('_')[1];
                    fieldPath = `uniformidad.${tipo}.fotoUrl`;
                } else if (['pesoBruto', 'pesoCongelado', 'pesoNeto', 'pesoConGlaseo', 'pesoSinGlaseo', 'glaseo'].includes(photo.field)) {
                    fieldPath = `${photo.field}.fotoUrl`;
                }
                await saveAnalysisPhotoUrl(analysisId, analysisItemId, targetIndex, fieldPath, url);
            }
        }

        // Cleanup
        await photoStorageService.deletePhoto(photo.id);
        toast.success('Foto subida exitosamente');

    } catch (error) {
        console.error('Error retrying photo:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        await photoStorageService.updatePhotoStatus(photo.id, 'error', undefined, errorMessage);
        toast.error('Falló el reintento de subida');
    }
};

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DefectSelector from '@/components/DefectSelector';
import PhotoCapture from '@/components/PhotoCapture';
import { ProductType, Analysis, Defectos } from '@/lib/types';

interface DefectsCardProps {
    showDefects: boolean;
    productType: ProductType | null;
    currentAnalysis: Analysis;
    onDefectsChange: (defects: Defectos) => void;
    validationResults: any;
    handlePhotoCapture: (field: string, file: File) => void;
    isFieldUploading: (field: string) => boolean;
    analysisId: string;
    activeAnalysisIndex: number;
    isGalleryMode: boolean;
}

export const DefectsCard = React.memo<DefectsCardProps>(({
    showDefects,
    productType,
    currentAnalysis,
    onDefectsChange,
    validationResults,
    handlePhotoCapture,
    isFieldUploading,
    analysisId,
    activeAnalysisIndex,
    isGalleryMode
}) => {
    if (!showDefects) return null;

    return (
        <>
            <Card>
                <CardContent className="pt-6">
                    <DefectSelector
                        productType={productType}
                        selectedDefects={currentAnalysis.defectos || {}}
                        onDefectsChange={onDefectsChange}
                        validationResults={validationResults}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>📸 Foto de Calidad General</CardTitle>
                </CardHeader>
                <CardContent>
                    <div>
                        <div className="w-full">
                            <PhotoCapture
                                key={`fotoCalidad-${activeAnalysisIndex}`}
                                label="Foto General"
                                photoUrl={currentAnalysis.fotoCalidad}
                                onPhotoCapture={(file) => handlePhotoCapture('fotoCalidad', file)}
                                isUploading={isFieldUploading('fotoCalidad')}
                                context={{ analysisId: analysisId || '', field: 'fotoCalidad', analysisIndex: activeAnalysisIndex }}
                                forceGalleryMode={isGalleryMode}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    );
});

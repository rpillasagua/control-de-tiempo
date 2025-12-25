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
    isCompleted?: boolean;
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
    isGalleryMode,
    isCompleted = false
}) => {
    const [isEditMode, setIsEditMode] = React.useState(false);

    if (!showDefects) return null;

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle>⚠️ Registro de Defectos</CardTitle>
                    {(!isCompleted && currentAnalysis.defectos && Object.keys(currentAnalysis.defectos).length > 0) && (
                        <button
                            type="button"
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={`
                                px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all active:scale-95
                                ${isEditMode
                                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/20'
                                    : 'bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/20'
                                }
                            `}
                        >
                            {isEditMode ? 'Listo' : 'Editar'}
                        </button>
                    )}
                </CardHeader>
                <CardContent className="pt-6">
                    <DefectSelector
                        productType={productType}
                        selectedDefects={currentAnalysis.defectos || {}}
                        onDefectsChange={onDefectsChange}
                        validationResults={validationResults}
                        readOnly={isCompleted}
                        isEditModeExternal={isEditMode}
                        onToggleEditMode={() => setIsEditMode(!isEditMode)}
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
                                readOnly={isCompleted}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    );
});

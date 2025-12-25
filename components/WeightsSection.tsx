import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CheckCircle2 } from 'lucide-react';
import PhotoCapture from '@/components/PhotoCapture';
import { ViewMode } from '@/lib/types';
import { useAnalysisContext } from '@/context/AnalysisContext';
import { PRODUCT_DATA } from '@/lib/product-data';

interface WeightsSectionProps {
    handleWeightChange: (field: string, value: number) => void;
    handlePhotoCapture: (field: string, file: File) => void;
    isFieldUploading: (field: string) => boolean;
    weightValidationResults: any;
    calculatedGlazing: number | null;
    viewMode: ViewMode;
    isGalleryMode: boolean;
    isCompleted: boolean;
}

export const WeightsSection = React.memo<WeightsSectionProps>(({
    handleWeightChange,
    handlePhotoCapture,
    isFieldUploading,
    weightValidationResults,
    calculatedGlazing,
    viewMode,
    isGalleryMode,
    isCompleted
}) => {
    const {
        currentAnalysis,
        activeAnalysisIndex,
        analysisId,
        productType,
        isRemuestreo,
        remuestreoConfig,
        codigo
    } = useAnalysisContext();

    // Derived Logic
    // Derived Logic
    const productInfo = PRODUCT_DATA[codigo];
    const weightUnit = productInfo?.unit || 'LB';
    const isDualBag = false; // logic placeholder
    const isBlockFrozen = productInfo?.freezingMethod?.toUpperCase().includes('BLOCK');

    // Visibility Logic (Replicated from Parent or Moved here)
    const showWeights = !isRemuestreo || (
        remuestreoConfig?.activeFields?.pesoBruto ||
        remuestreoConfig?.activeFields?.pesoNeto ||
        remuestreoConfig?.activeFields?.pesoCongelado ||
        remuestreoConfig?.activeFields?.pesoSubmuestra ||
        remuestreoConfig?.activeFields?.pesoGlaseo
    );

    if (!((productType === 'ENTERO' || productType === 'COLA' || productType === 'VALOR_AGREGADO') || (isRemuestreo && showWeights))) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>⚖️ Control de Pesos</CardTitle>
            </CardHeader>
            <CardContent className={viewMode === 'COMPACTA' ? 'p-4 space-y-4' : 'p-6 space-y-6 md:p-4 md:space-y-4'}>
                <div className={`w-full ${viewMode === 'COMPACTA' ? (isBlockFrozen ? 'grid grid-cols-2 gap-5' : 'grid grid-cols-3 gap-5') : 'space-y-6 md:space-y-4'}`}>
                    {/* Peso Bruto */}
                    {(!isRemuestreo || remuestreoConfig?.activeFields?.pesoBruto) && !isDualBag && (
                        <div className="space-y-2 min-w-0 overflow-hidden max-w-full border border-slate-200 rounded-xl p-3 bg-slate-50/50 shadow-md">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">
                                    {viewMode === 'COMPACTA' ? `⚖️ P. Bruto` : `⚖️ P. Bruto (${weightUnit})`}
                                </Label>
                                {currentAnalysis.pesoBruto?.valor && (
                                    <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-center">
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={currentAnalysis.pesoBruto?.valor || ''}
                                    onChange={(e) => handleWeightChange('pesoBruto', parseFloat(e.target.value))}
                                    className="text-center text-lg font-bold rounded-lg w-[90%]"
                                    disabled={isCompleted}
                                />
                            </div>
                            <PhotoCapture
                                key={`pesoBruto-${activeAnalysisIndex}`}
                                label={viewMode === 'COMPACTA' ? "Cámara" : "Foto Peso Bruto"}
                                modalTitle="Peso Bruto"
                                photoUrl={currentAnalysis.pesoBruto?.fotoUrl}
                                onPhotoCapture={(file) => handlePhotoCapture('pesoBruto', file)}
                                isUploading={isFieldUploading('pesoBruto')}
                                context={{ analysisId: analysisId || '', field: 'pesoBruto', analysisIndex: activeAnalysisIndex }}
                                forceGalleryMode={isGalleryMode}
                                readOnly={isCompleted}
                                compact={viewMode === 'COMPACTA'}
                            />
                            {/* Validation Message */}
                            {weightValidationResults.pesoBruto.message && currentAnalysis.pesoBruto?.valor && (
                                <div className={`text-center text-xs mt-2 italic ${weightValidationResults.pesoBruto.isValid
                                    ? 'text-green-600'
                                    : 'text-slate-500'
                                    }`}>
                                    {weightValidationResults.pesoBruto.message}
                                </div>
                            )}
                        </div>
                    )}


                    {/* Peso Congelado - Hidden for BLOCK FROZEN */}
                    {(!isRemuestreo || remuestreoConfig?.activeFields?.pesoCongelado) &&
                        !isBlockFrozen && (
                            <div className="space-y-2 min-w-0 border border-slate-200 rounded-xl p-3 bg-slate-50/50 shadow-md">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">
                                        {viewMode === 'COMPACTA' ? `⚖️ P. Congelado` : `⚖️ P. Congelado (${weightUnit})`}
                                    </Label>
                                    {currentAnalysis.pesoCongelado?.valor && (
                                        <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                                            <CheckCircle2 className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-center">
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={currentAnalysis.pesoCongelado?.valor || ''}
                                        onChange={(e) => handleWeightChange('pesoCongelado', parseFloat(e.target.value))}
                                        className="text-center text-lg font-bold rounded-lg w-[90%]"
                                        disabled={isCompleted}
                                    />
                                </div>
                                <PhotoCapture
                                    key={`pesoCongelado-${activeAnalysisIndex}`}
                                    label={viewMode === 'COMPACTA' ? "Cámara" : "Foto Peso Congelado"}
                                    modalTitle="Peso Congelado"
                                    photoUrl={currentAnalysis.pesoCongelado?.fotoUrl}
                                    onPhotoCapture={(file) => handlePhotoCapture('pesoCongelado', file)}
                                    isUploading={isFieldUploading('pesoCongelado')}
                                    context={{ analysisId: analysisId || '', field: 'pesoCongelado', analysisIndex: activeAnalysisIndex }}
                                    forceGalleryMode={isGalleryMode}
                                    readOnly={isCompleted}
                                    compact={viewMode === 'COMPACTA'}
                                />
                            </div>
                        )}

                    {/* Campos específicos para VALOR_AGREGADO */}
                    {productType === 'VALOR_AGREGADO' && (
                        <>
                            {/* Peso Submuestra - Normal Grid Item */}
                            <div className="space-y-3 border border-slate-200 rounded-xl p-3 bg-slate-50/50 shadow-md">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm">
                                        {viewMode === 'COMPACTA' ? `⚖️ P. Submuestra` : `⚖️ P. Submuestra (${weightUnit})`}
                                    </Label>
                                    {currentAnalysis.pesoSubmuestra?.valor && (
                                        <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                                            <CheckCircle2 className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-center">
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={currentAnalysis.pesoSubmuestra?.valor || ''}
                                        onChange={(e) => handleWeightChange('pesoSubmuestra', parseFloat(e.target.value))}
                                        className="text-center text-lg font-bold rounded-lg w-[90%]"
                                        disabled={isCompleted}
                                    />
                                </div>
                                <PhotoCapture
                                    key={`pesoSubmuestra-${activeAnalysisIndex}`}
                                    label="Foto Peso Submuestra"
                                    modalTitle="Peso Submuestra"
                                    photoUrl={currentAnalysis.pesoSubmuestra?.fotoUrl}
                                    onPhotoCapture={(file) => handlePhotoCapture('pesoSubmuestra', file)}
                                    isUploading={isFieldUploading('pesoSubmuestra')}
                                    context={{ analysisId: analysisId || '', field: 'pesoSubmuestra', analysisIndex: activeAnalysisIndex }}
                                    forceGalleryMode={isGalleryMode}
                                    readOnly={isCompleted}
                                    compact={viewMode === 'COMPACTA'}
                                />
                            </div>

                            {/* Centered Row Wrapper for Last 2 Items */}
                            <div className={`col-span-3 flex justify-center gap-4 ${viewMode !== 'COMPACTA' ? 'flex-col md:flex-row' : ''}`}>
                                {/* Peso Sin Glaseo */}
                                <div
                                    className="space-y-3 min-w-0 flex-none border border-slate-200 rounded-xl p-3 bg-slate-50/50 shadow-md"
                                    style={viewMode === 'COMPACTA' ? { width: 'calc((100% - 2rem) / 3)' } : { width: '100%' }}
                                >
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm">
                                            {viewMode === 'COMPACTA' ? `⚖️ P. Sin Glaseo` : `⚖️ P. Sin Glaseo (${weightUnit})`}
                                        </Label>
                                        {currentAnalysis.pesoSinGlaseo?.valor && (
                                            <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                                                <CheckCircle2 className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-center">
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            value={currentAnalysis.pesoSinGlaseo?.valor || ''}
                                            onChange={(e) => handleWeightChange('pesoSinGlaseo', parseFloat(e.target.value))}
                                            className="text-center text-lg font-bold rounded-lg w-[90%]"
                                            disabled={isCompleted}
                                        />
                                    </div>
                                    <PhotoCapture
                                        key={`pesoSinGlaseo-${activeAnalysisIndex}`}
                                        label="Foto Peso Sin Glaseo"
                                        modalTitle="Peso Sin Glaseo"
                                        photoUrl={currentAnalysis.pesoSinGlaseo?.fotoUrl}
                                        onPhotoCapture={(file) => handlePhotoCapture('pesoSinGlaseo', file)}
                                        isUploading={isFieldUploading('pesoSinGlaseo')}
                                        context={{ analysisId: analysisId || '', field: 'pesoSinGlaseo', analysisIndex: activeAnalysisIndex }}
                                        forceGalleryMode={isGalleryMode}
                                        readOnly={isCompleted}
                                        compact={viewMode === 'COMPACTA'}
                                    />
                                </div>

                                {/* Peso Neto (Moved here for VA) */}
                                <div
                                    className="space-y-2 min-w-0 flex-none border border-slate-200 rounded-xl p-3 bg-slate-50/50 shadow-md"
                                    style={viewMode === 'COMPACTA' ? { width: 'calc((100% - 2rem) / 3)' } : { width: '100%' }}
                                >
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-medium">
                                            {viewMode === 'COMPACTA' ? `⚖️ P. Neto` : `⚖️ P. Neto (${weightUnit})`}
                                        </Label>
                                        {currentAnalysis.pesoNeto?.valor && (
                                            <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                                                <CheckCircle2 className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-center">
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            value={currentAnalysis.pesoNeto?.valor || ''}
                                            onChange={(e) => handleWeightChange('pesoNeto', parseFloat(e.target.value))}
                                            className="text-center text-lg font-bold rounded-lg w-[90%]"
                                            disabled={isCompleted}
                                        />
                                    </div>
                                    <PhotoCapture
                                        key={`pesoNeto-${activeAnalysisIndex}`}
                                        label={viewMode === 'COMPACTA' ? "Cámara" : "Foto Peso Neto"}
                                        modalTitle="Peso Neto"
                                        photoUrl={currentAnalysis.pesoNeto?.fotoUrl}
                                        onPhotoCapture={(file) => handlePhotoCapture('pesoNeto', file)}
                                        isUploading={isFieldUploading('pesoNeto')}
                                        context={{ analysisId: analysisId || '', field: 'pesoNeto', analysisIndex: activeAnalysisIndex }}
                                        forceGalleryMode={isGalleryMode}
                                        readOnly={isCompleted}
                                        compact={viewMode === 'COMPACTA'}
                                    />
                                    {/* Validation Message */}
                                    {weightValidationResults.pesoNeto.message && currentAnalysis.pesoNeto?.valor && (
                                        <div className={`text-center text-xs mt-2 italic ${weightValidationResults.pesoNeto.isValid
                                            ? 'text-green-600'
                                            : 'text-slate-500'
                                            }`}>
                                            {weightValidationResults.pesoNeto.message}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Peso Neto - Normal Render for Non-VA */}
                    {productType !== 'VALOR_AGREGADO' && (!isRemuestreo || remuestreoConfig?.activeFields?.pesoNeto) && (
                        <div className="space-y-2 min-w-0 overflow-hidden max-w-full border border-slate-200 rounded-xl p-3 bg-slate-50/50 shadow-md">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">
                                    {viewMode === 'COMPACTA' ? `⚖️ P. Neto` : `⚖️ P. Neto (${weightUnit})`}
                                </Label>
                                {currentAnalysis.pesoNeto?.valor && (
                                    <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-center">
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={currentAnalysis.pesoNeto?.valor || ''}
                                    onChange={(e) => handleWeightChange('pesoNeto', parseFloat(e.target.value))}
                                    className="text-center text-lg font-bold rounded-lg w-[90%]"
                                    disabled={isCompleted}
                                />
                            </div>
                            <PhotoCapture
                                key={`pesoNeto-${activeAnalysisIndex}`}
                                label={viewMode === 'COMPACTA' ? "Cámara" : "Foto Peso Neto"}
                                modalTitle="Peso Neto"
                                photoUrl={currentAnalysis.pesoNeto?.fotoUrl}
                                onPhotoCapture={(file) => handlePhotoCapture('pesoNeto', file)}
                                isUploading={isFieldUploading('pesoNeto')}
                                context={{ analysisId: analysisId || '', field: 'pesoNeto', analysisIndex: activeAnalysisIndex }}
                                forceGalleryMode={isGalleryMode}
                                readOnly={isCompleted}
                                compact={viewMode === 'COMPACTA'}
                            />
                            {/* Validation Message */}
                            {weightValidationResults.pesoNeto.message && currentAnalysis.pesoNeto?.valor && (
                                <div className={`text-center text-xs mt-2 italic ${weightValidationResults.pesoNeto.isValid
                                    ? 'text-green-600'
                                    : 'text-slate-500'
                                    }`}>
                                    {weightValidationResults.pesoNeto.message}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Calculated Glazing Display */}
                    {calculatedGlazing !== null && (
                        <div className="col-span-full bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center justify-between">
                            <span className="text-sm font-medium text-blue-800">% de glaseo</span>
                            <span className="text-lg font-bold text-blue-700">
                                {calculatedGlazing.toFixed(2)}%
                            </span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
});

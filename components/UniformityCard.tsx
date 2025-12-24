import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CheckCircle2 } from 'lucide-react';
import PhotoCapture from '@/components/PhotoCapture';
import { Uniformidad } from '@/lib/types';

interface UniformityCardProps {
    showUniformity: boolean;
    uniformidad: Uniformidad | undefined;
    onUniformityChange: (field: 'grandes' | 'pequenos', value: number | undefined) => void;
    handlePhotoCapture: (field: string, file: File) => void;
    isFieldUploading: (field: string) => boolean;
    analysisId: string;
    activeAnalysisIndex: number;
    isGalleryMode: boolean;
    uniformityRatio: number | null;
    validation: {
        isValid: boolean;
        message: string;
    };
    isCompleted?: boolean;
}

export const UniformityCard = React.memo<UniformityCardProps>(({
    showUniformity,
    uniformidad,
    onUniformityChange,
    handlePhotoCapture,
    isFieldUploading,
    analysisId,
    activeAnalysisIndex,
    isGalleryMode,
    uniformityRatio,
    validation,
    isCompleted = false
}) => {
    if (!showUniformity) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>📏 Uniformidad</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Grandes */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Grandes (kg)</Label>
                            {uniformidad?.grandes?.valor && (
                                <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                </div>
                            )}
                        </div>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={uniformidad?.grandes?.valor || ''}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                onUniformityChange('grandes', isNaN(val) ? undefined : val);
                            }}
                            disabled={isCompleted}
                        />
                        <PhotoCapture
                            label="Foto Grandes"
                            modalTitle="Uniformidad Grandes"
                            photoUrl={uniformidad?.grandes?.fotoUrl}
                            onPhotoCapture={(file) => handlePhotoCapture('uniformidad_grandes', file)}
                            isUploading={isFieldUploading('uniformidad_grandes')}
                            context={{ analysisId: analysisId || '', field: 'uniformidad_grandes', analysisIndex: activeAnalysisIndex }}
                            forceGalleryMode={isGalleryMode}
                            readOnly={isCompleted}
                        />
                    </div>

                    {/* Pequeños */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Pequeños (kg)</Label>
                            {uniformidad?.pequenos?.valor && (
                                <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                </div>
                            )}
                        </div>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={uniformidad?.pequenos?.valor || ''}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                onUniformityChange('pequenos', isNaN(val) ? undefined : val);
                            }}
                            disabled={isCompleted}
                        />
                        <PhotoCapture
                            label="Foto Pequeños"
                            modalTitle="Uniformidad Pequeños"
                            photoUrl={uniformidad?.pequenos?.fotoUrl}
                            onPhotoCapture={(file) => handlePhotoCapture('uniformidad_pequenos', file)}
                            isUploading={isFieldUploading('uniformidad_pequenos')}
                            context={{ analysisId: analysisId || '', field: 'uniformidad_pequenos', analysisIndex: activeAnalysisIndex }}
                            forceGalleryMode={isGalleryMode}
                            readOnly={isCompleted}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-100">
                    <Label className="flex-1 font-semibold text-slate-900">Ratio de Uniformidad</Label>
                    <div className="flex items-center gap-3">
                        {uniformityRatio && (
                            <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                                <CheckCircle2 className="w-3 h-3 text-white" />
                            </div>
                        )}
                        <div className="text-2xl font-bold text-slate-700">
                            {typeof uniformityRatio === 'number' ? uniformityRatio.toFixed(2) : '0.00'}
                        </div>
                    </div>
                </div>
                {!validation.isValid && (
                    <span className="text-xs text-red-500 font-medium mt-1 text-center max-w-[150px] block ml-auto">
                        {validation.message}
                    </span>
                )}
            </CardContent>
        </Card>
    );
});

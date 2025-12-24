import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CheckCircle2 } from 'lucide-react';
import PhotoCapture from '@/components/PhotoCapture';
import { ProductType, PesoConFoto } from '@/lib/types';

interface GlobalWeightCardProps {
    isDualBag: boolean;
    productType: ProductType | null;
    weightUnit: string;
    globalPesoBruto: PesoConFoto;
    onGlobalWeightChange: (value: number | undefined) => void;
    handleGlobalPesoBrutoPhoto: (file: File) => void;
    isUploading: boolean;
    analysisId: string;
    isGalleryMode: boolean;
    isCompleted?: boolean;
}

export const GlobalWeightCard: React.FC<GlobalWeightCardProps> = ({
    isDualBag,
    productType,
    weightUnit,
    globalPesoBruto,
    onGlobalWeightChange,
    handleGlobalPesoBrutoPhoto,
    isUploading,
    analysisId,
    isGalleryMode,
    isCompleted = false
}) => {
    if (!isDualBag || !(productType === 'ENTERO' || productType === 'COLA' || productType === 'VALOR_AGREGADO')) {
        return null;
    }

    return (
        <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                    ⚖️ Peso Bruto Global (Cartón)
                    <span className="text-xs font-normal bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                        Aplica a todos los análisis
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-blue-900">Peso Bruto Cartón ({weightUnit.toLowerCase()})</Label>
                            {globalPesoBruto.valor && (
                                <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                </div>
                            )}
                        </div>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={globalPesoBruto.valor || ''}
                            onChange={(e) => onGlobalWeightChange(parseFloat(e.target.value) || undefined)}
                            className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20"
                            disabled={isCompleted}
                        />
                    </div>
                    <div className="space-y-3">
                        <PhotoCapture
                            label="Foto Peso Bruto Global"
                            photoUrl={globalPesoBruto.fotoUrl}
                            onPhotoCapture={handleGlobalPesoBrutoPhoto}
                            isUploading={isUploading}
                            context={{ analysisId: analysisId || '', field: 'global-pesoBruto', analysisIndex: undefined }}
                            forceGalleryMode={isGalleryMode}
                            readOnly={isCompleted}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

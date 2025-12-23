import React from 'react';
import { Hash, Package, Ruler, Building2, Tag, Box } from 'lucide-react';

interface AnalysisInfoCardProps {
    codigo: string;
    lote: string;
    talla: string;
    clientName: string;
    brandName: string;
    masterInfo: string;
}

export const AnalysisInfoCard: React.FC<AnalysisInfoCardProps> = ({
    codigo,
    lote,
    talla,
    clientName,
    brandName,
    masterInfo
}) => {
    // Si no hay datos, no mostrar nada
    if (!clientName && !brandName && !masterInfo && !codigo && !lote && !talla) {
        return null;
    }

    return (
        <div
            className="bg-white p-5"
            style={{
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                borderRadius: '14px'
            }}
        >
            {/* Grid de toda la información */}
            <div className="grid grid-cols-3 gap-4">
                {/* Código */}
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                        <Hash className="w-4 h-4 text-blue-600" />
                        <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">Código</div>
                    </div>
                    <div className="text-sm font-bold text-slate-900 ml-5">{codigo}</div>
                </div>

                {/* Lote */}
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-indigo-600" />
                        <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">Lote</div>
                    </div>
                    <div className="text-sm font-bold text-slate-900 ml-5">{lote}</div>
                </div>

                {/* Talla */}
                {talla && (
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                            <Ruler className="w-4 h-4 text-purple-600" />
                            <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">Talla</div>
                        </div>
                        <div className="text-sm font-bold text-slate-900 ml-5">{talla}</div>
                    </div>
                )}

                {/* Cliente */}
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-slate-600" />
                        <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">Cliente</div>
                    </div>
                    <div className="text-sm font-medium text-slate-900 ml-5">{clientName}</div>
                </div>

                {/* Marca */}
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-slate-600" />
                        <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">Marca</div>
                    </div>
                    <div className="text-sm font-medium text-slate-900 ml-5">{brandName}</div>
                </div>

                {/* Presentación */}
                {masterInfo && (
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                            <Box className="w-4 h-4 text-slate-600" />
                            <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">Presentación</div>
                        </div>
                        <div className="text-sm font-medium text-slate-900 ml-5">{masterInfo}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

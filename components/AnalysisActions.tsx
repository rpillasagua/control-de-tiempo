import React from 'react';
import { Camera, Edit, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import ViewModeSelector, { ViewMode } from '@/components/ViewModeSelector';

interface AnalysisActionsProps {
    isGalleryMode: boolean;
    setIsGalleryMode: (mode: boolean) => void;
    onEditInfo: () => void;
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
}

export const AnalysisActions: React.FC<AnalysisActionsProps> = ({
    isGalleryMode,
    setIsGalleryMode,
    onEditInfo,
    viewMode,
    onViewModeChange
}) => {
    return (
        <div className="flex justify-end gap-2">
            <button
                onClick={() => {
                    const newMode = !isGalleryMode;
                    setIsGalleryMode(newMode);
                    toast.info(newMode ? 'Modo Galería activado: Selecciona fotos de tu archivo' : 'Modo Cámara activado: Toma fotos nuevas');
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 border shadow-sm ${isGalleryMode
                    ? 'bg-purple-600 text-white border-purple-700 ring-2 ring-purple-200'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                title={isGalleryMode ? "Modo Galería Activo" : "Activar Modo Galería"}
            >
                {isGalleryMode ? (
                    <ImageIcon size={18} className="animate-pulse" />
                ) : (
                    <Camera size={18} />
                )}
                <span className="hidden sm:inline font-bold">{isGalleryMode ? 'Galería ACTIVA' : 'Usar Cámara'}</span>
                {/* Mobile indicator text */}
                <span className="sm:hidden text-xs font-bold">{isGalleryMode ? 'GALERÍA' : 'CÁMARA'}</span>
            </button>

            <button
                onClick={onEditInfo}
                className="flex items-center gap-2 px-3 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium transition-all"
            >
                <Edit size={16} />
                <span className="hidden sm:inline">Editar Info</span>
            </button>

            <ViewModeSelector viewMode={viewMode} onModeChange={onViewModeChange} />
        </div>
    );
};

import React from 'react';
import { Camera, AlertCircle, X } from 'lucide-react';

interface WeightInputProps {
    label: string;
    value: number | undefined;
    onChange: (val: string) => void;
    photoUrl?: string;
    onPhotoClick: () => void;
    onDeletePhoto?: () => void;
    error?: boolean; // Si hubo error al subir
    isUploading?: boolean;
    viewMode?: 'SUELTA' | 'COMPACTA';
}

export const WeightInputRow = ({
    label,
    value,
    onChange,
    photoUrl,
    onPhotoClick,
    onDeletePhoto,
    error,
    isUploading,
    viewMode = 'SUELTA'
}: WeightInputProps) => {
    const isCompact = viewMode === 'COMPACTA';

    return (
        <div className={`bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 group ${isCompact ? 'p-2' : 'p-4'}`} style={{ borderRadius: '14px' }}>
            <div className={`flex items-center justify-between ${isCompact ? 'mb-1' : 'mb-2'}`}>
                <label className={`${isCompact ? 'text-xs' : 'text-sm'} font-semibold text-slate-700 flex items-center gap-2`}>
                    {label}
                    {/* Indicador visual si ya hay foto */}
                    {photoUrl && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                </label>
                {error && <span className="text-xs text-red-500 font-medium flex items-center gap-1"><AlertCircle size={12} /> Error foto</span>}
            </div>

            <div className="flex gap-2">
                {/* Input Numérico Estilizado */}
                <div className="relative flex-1">
                    <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        style={{
                            height: isCompact ? '40px' : '56px',
                            borderRadius: '12px',
                            backgroundColor: '#F3F4F6'
                        }}
                        className={`w-full pl-4 ${isCompact ? '!h-10 text-base' : '!h-14 text-lg'} border-2 border-transparent text-slate-900 font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-center`}
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                    />
                </div>

                {/* Botón de Cámara / Preview */}
                <div className="flex-shrink-0">
                    {photoUrl ? (
                        <div className={`relative group/preview ${isCompact ? 'w-10 h-10' : 'w-11 h-11'}`}>
                            {/* Miniatura de la imagen */}
                            <img
                                src={photoUrl}
                                alt="Evidencia"
                                style={{ borderRadius: '12px' }}
                                className="w-full h-full object-cover border border-slate-200 cursor-pointer"
                                onClick={onPhotoClick} // Podría abrir un modal
                            />
                            {/* Botón borrar pequeño */}
                            {onDeletePhoto && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeletePhoto(); }}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-sm hover:bg-red-600 opacity-0 group-hover/preview:opacity-100 transition-opacity"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={onPhotoClick}
                            disabled={isUploading}
                            style={{ borderRadius: '12px' }}
                            className={`${isCompact ? 'w-10 h-10' : 'w-11 h-11'} flex items-center justify-center border transition-all
                ${error
                                    ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100'
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600'
                                }
              `}
                            title="Tomar foto"
                        >
                            {isUploading ? (
                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Camera size={isCompact ? 16 : 20} />
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

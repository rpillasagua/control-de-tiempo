import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ImageOff, Camera, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { compressImage } from '@/lib/imageCompression';

interface PhotoCaptureProps {
  label: string;
  modalTitle?: string;
  photoUrl?: string;
  onPhotoCapture: (file: File) => void;
  onPhotoRemove?: () => void;
  isUploading?: boolean;
  context?: {
    analysisId: string;
    field: string;
    analysisIndex?: number;
  };
  compact?: boolean;
  forceGalleryMode?: boolean;
  readOnly?: boolean;
}

export default function PhotoCapture({ label, modalTitle, photoUrl, onPhotoCapture, onPhotoRemove, isUploading = false, compact = false, context, forceGalleryMode = false, readOnly = false }: PhotoCaptureProps) {
  const [showModal, setShowModal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [transformOrigin, setTransformOrigin] = useState('center center');
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCloseModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowModal(false);
    setZoomLevel(1);
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (imageError || !photoUrl) return;
    setShowModal(true);
  };

  const handleZoomTap = (e: React.MouseEvent<HTMLImageElement>) => {
    e.stopPropagation();
    if (zoomLevel === 1) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setTransformOrigin(`${x}% ${y}%`);
      setZoomLevel(2.5);
    } else {
      setZoomLevel(1);
      setTimeout(() => setTransformOrigin('center center'), 300);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        onPhotoCapture(compressed);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Error handling file:', error);
        // Fallback to original file
        onPhotoCapture(file);
      }
    }
  };

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal]);

  useEffect(() => {
    if (photoUrl) {
      setImageError(false);
    }
  }, [photoUrl]);

  const handleCameraClick = () => {
    if (readOnly) return;
    fileInputRef.current?.click();
  };

  const hasImage = !!photoUrl;

  return (
    <>
      {hasImage ? (
        <div className="flex flex-col gap-2 w-full">
          <div
            className={`relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm group ${compact ? 'h-24' : 'h-48'} w-full transition-all hover:shadow-md cursor-pointer`}
            onClick={handleImageClick}
          >
            <img
              src={photoUrl}
              alt={label}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />

            {/* Overlay al pasar el mouse */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <ZoomIn className="w-8 h-8 text-white drop-shadow-lg transform scale-90 group-hover:scale-100 transition-transform" />
            </div>

            {/* Check de éxito */}
            <div className={`absolute top-2 right-2 bg-green-500 text-white rounded-full p-1 shadow-lg transition-all duration-500 ${isUploading ? 'scale-0' : 'scale-100 animate-in zoom-in spin-in-12'}`}>
              <CheckCircle2 className="w-4 h-4" />
            </div>

            {/* Loading Indicator */}
            {isUploading && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center text-white z-10">
                <Loader2 className="w-8 h-8 animate-spin mb-1" />
                <span className="text-xs font-medium">Subiendo...</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto flex-1">
            {!readOnly && (
              <button
                type="button"
                onClick={handleCameraClick}
                className={`${compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'} font-[600] bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-2 border-blue-400/50 hover:from-blue-600 hover:to-indigo-700 hover:border-blue-300 rounded-[14px] transition-all active:scale-[0.98] flex-1 sm:flex-none shadow-lg hover:shadow-xl`}
                style={{
                  boxShadow: '0 6px 15px -3px rgba(59, 130, 246, 0.3)'
                }}
              >
                Cambiar
              </button>
            )}
            {onPhotoRemove && !readOnly && (
              <button
                type="button"
                onClick={onPhotoRemove}
                className={`${compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'} font-[600] bg-red-50 text-red-600 border-2 border-red-100 hover:bg-red-100 hover:border-red-200 rounded-[14px] transition-all active:scale-[0.98] flex-1 sm:flex-none hover:shadow-md`}
              >
                Eliminar
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 w-full">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture={forceGalleryMode ? undefined : "environment"}
            onChange={handleFileChange}
            className="hidden"
          />

          {!imageError && !readOnly && (
            <button
              type="button"
              onClick={handleCameraClick}
              className={`flex items-center justify-center gap-3 px-4 ${compact ? 'py-3' : 'py-4'} bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-300 border-2 border-blue-500/30 hover:from-blue-500/20 hover:to-indigo-500/20 hover:border-blue-400/50 rounded-[14px] transition-all active:scale-[0.98] w-full group shadow-lg hover:shadow-xl font-[600]`}
              style={{
                boxShadow: '0 6px 15px -3px rgba(59, 130, 246, 0.2)'
              }}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center group-hover:shadow-lg transition-all">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm">Tomar foto de {label}</span>
            </button>
          )}

          {readOnly && !photoUrl && (
            <div className="w-full text-center p-4 border border-slate-700/50 rounded-lg bg-slate-800/20 text-slate-500 text-sm italic">
              Sin foto (Bloqueado)
            </div>
          )}

          {imageError && (
            <div className="w-full text-center p-4 border border-red-500/30 rounded-lg bg-red-500/10 text-red-400 text-sm">
              Error al cargar imagen.
              <button onClick={() => setImageError(false)} className="underline ml-2">Reintentar</button>
            </div>
          )}
        </div>
      )}

      {/* Modal para ver imagen en grande - Usando Portal para evitar clipping */}
      {showModal && photoUrl && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/95 backdrop-blur-xl p-4 animate-fade-in"
          onClick={handleCloseModal}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="relative w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl">
            <button
              onClick={handleCloseModal}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors z-10 bg-white/10 rounded-full hover:bg-white/20 backdrop-blur-md"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <div
                className="overflow-hidden w-full h-auto max-h-[80vh] bg-black/90 flex items-center justify-center cursor-zoom-in"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <img
                  src={photoUrl}
                  alt={label}
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: transformOrigin,
                    transition: 'transform 0.3s ease-in-out',
                    cursor: zoomLevel === 1 ? 'zoom-in' : 'zoom-out'
                  }}
                  className="w-full h-full object-contain"
                  onClick={handleZoomTap}
                  onError={(e) => {
                    console.warn(`⚠️ Error cargando imagen en modal ${label}:`, photoUrl);
                    console.warn('Modal error details:', e);
                  }}
                  onLoad={() => {
                    console.log(`✅ Imagen del modal cargada correctamente: ${label}`);
                  }}
                />
              </div>

              <div className="bg-black text-white p-4 border-t border-white/20 relative z-20">
                <p className="text-center font-bold text-lg tracking-wide text-white drop-shadow-md">
                  {modalTitle || label}
                </p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

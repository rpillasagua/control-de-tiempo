'use client';

import { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ImageOff, Camera, CheckCircle2 } from 'lucide-react';
import { compressImage } from '@/lib/imageCompression';

interface PhotoCaptureProps {
  label: string;
  photoUrl?: string;
  onPhotoCapture: (file: File) => void;
  onPhotoRemove?: () => void;
  isUploading?: boolean;
  compact?: boolean;
}

export default function PhotoCapture({ label, photoUrl, onPhotoCapture, onPhotoRemove, isUploading = false, compact = false }: PhotoCaptureProps) {
  const [showModal, setShowModal] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [errorType, setErrorType] = useState<'blob' | 'drive_auth' | 'drive_permissions' | 'unknown'>('unknown');
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [cacheBuster, setCacheBuster] = useState('');
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Función para generar URLs alternativas de Google Drive
  const getAlternativeDriveUrl = (currentUrl: string): string | null => {
    const fileIdMatch = currentUrl.match(/[?&]id=([^&]+)/);
    if (!fileIdMatch) return null;

    const fileId = fileIdMatch[1];

    // Siempre usar URL de descarga directa (más estable y menos rate limiting)
    return `https://drive.google.com/uc?id=${fileId}&export=download`;
  };

  useEffect(() => {
    setImageError(false);
    setErrorType('unknown');
    setIsLoading(!!photoUrl); // Mostrar loading si hay URL
    setIsRetrying(false);
    setRetryCount(0); // Reset retry count

    // Si llega una URL del servidor, limpiar la preview local
    if (photoUrl && localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
    }

    // Actualizar cache buster solo en el cliente para evitar hydration error
    if (photoUrl) {
      const separator = photoUrl.includes('?') ? '&' : '?';
      setCacheBuster(`${separator}t=${Date.now()}`);
    }
  }, [photoUrl]);

  // Cleanup de blob URLs cuando el componente se desmonta
  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  // Timeout de seguridad para prevenir loading infinito
  useEffect(() => {
    if (isLoading && photoUrl) {
      const timeout = setTimeout(() => {
        console.warn(`⏰ Timeout de carga excedido para ${label}, forzando fin de loading`);
        setIsLoading(false);
        setIsRetrying(false);
        // Si aún no hay error, marcar como error desconocido
        if (!imageError) {
          setImageError(true);
          setErrorType('unknown');
        }
      }, 20000); // 20 segundos máximo (7s propagación + margen)

      return () => clearTimeout(timeout);
    }
  }, [isLoading, photoUrl, label, imageError]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log(`📸 PhotoCapture: Archivo seleccionado para ${label}:`, file.name);

      if (file.type === 'image/heic' || file.type === 'image/heif') {
        alert('⚠️ Las fotos en formato HEIC (iPhone) pueden no visualizarse correctamente en Windows. Por favor intenta cambiar la configuración de tu cámara a "Más compatible" (JPEG) o usa otra foto.');
      }

      // Limpiar URL blob anterior si existe
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }

      // Crear URL blob para vista previa local inmediata
      const previewUrl = URL.createObjectURL(file);
      setLocalPreviewUrl(previewUrl);
      setImageError(false);
      setUploadSuccess(false);

      // Compress image before uploading
      setIsCompressing(true);
      try {
        const compressedFile = await compressImage(file);
        onPhotoCapture(compressedFile);
      } catch (error) {
        console.error('Error compressing image:', error);
        // If compression fails, upload original
        onPhotoCapture(file);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageClick = () => {
    if (!imageError) {
      setShowModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <>
      <div className={`flex flex-col sm:flex-row sm:items-center gap-4 ${compact ? 'py-1' : ''}`}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        {(photoUrl || localPreviewUrl) && !imageError ? (
          <div className={`flex flex-col sm:flex-row sm:items-center gap-4 w-full ${compact ? 'p-1.5' : 'p-3'} bg-black/20 rounded-xl border border-white/5`}>
            <div className={`relative group self-center sm:self-auto ${compact ? 'w-8 h-8' : 'w-12 h-12 sm:w-10 sm:h-10'} flex-shrink-0`}>
              {(isLoading || isRetrying || isUploading || isCompressing) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg z-10 backdrop-blur-sm transition-all duration-300">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500/30 border-t-blue-500 mb-2"></div>
                  <span className="text-[10px] font-bold text-white tracking-wide uppercase">
                    {isCompressing ? 'Comprimiendo...' : isUploading ? 'Subiendo...' : isRetrying ? 'Reconectando...' : 'Cargando...'}
                  </span>
                </div>
              )}
              <img
                src={localPreviewUrl || photoUrl}
                alt={label}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-lg border border-white/10 cursor-pointer hover:border-blue-500 transition-all shadow-lg"
                onClick={handleImageClick}
                onError={async (e) => {
                  // Solo manejar errores para URLs del servidor, no para previews locales
                  if (localPreviewUrl) {
                    console.warn(`⚠️ Error en preview local, ignorando...`);
                    return;
                  }

                  console.warn(`⚠️ No se pudo cargar la imagen ${label}:`, photoUrl);
                  console.warn('Error details:', e);

                  // Determinar el tipo de URL y manejar el error apropiadamente
                  if (photoUrl && photoUrl.startsWith('blob:')) {
                    // URLs blob son temporales y expiran, no se pueden recuperar
                    console.warn('URL blob expirada, no se puede recuperar');
                    setErrorType('blob');
                    setImageError(true);
                    setIsLoading(false);
                    setIsRetrying(false);
                    return;
                  }

                  // Si es una URL de Google Drive, intentar diferentes estrategias de recuperación
                  if (photoUrl && photoUrl.includes('drive.google.com') && retryCount < 2) {
                    setRetryCount(prev => prev + 1);
                    console.log(`🔄 Intento ${retryCount + 1} de recuperación para Google Drive`);

                    // Primero intentar con URL alternativa sin autenticación
                    const altUrl = photoUrl ? getAlternativeDriveUrl(photoUrl) : null;
                    if (altUrl) {
                      console.log('🔄 Intentando con URL alternativa:', altUrl);
                      setTimeout(() => {
                        const img = e.target as HTMLImageElement;
                        setCacheBuster(`?t=${Date.now()}`);
                        img.src = altUrl + cacheBuster;
                      }, 2000 + Math.random() * 1000); // 2-3s con jitter para evitar rate limiting
                      // NO HACEMOS RETURN AQUÍ - dejamos que continue la lógica
                    }

                    // Si no hay URL alternativa, intentar refrescar permisos
                    try {
                      setIsRetrying(true);
                      const { googleDriveService } = await import('@/lib/googleDriveService');
                      const { googleAuthService } = await import('@/lib/googleAuthService');

                      // Verificar si el usuario está autenticado
                      if (!googleAuthService.isAuthenticated()) {
                        console.warn('Usuario no autenticado, no se pueden refrescar permisos');
                        setErrorType('drive_auth');
                        setImageError(true);
                        setIsLoading(false);
                        setIsRetrying(false);
                        return;
                      }

                      // Intentar refrescar permisos
                      const fileIdMatch = photoUrl ? photoUrl.match(/[?&]id=([^&]+)/) : null;
                      if (fileIdMatch) {
                        console.warn('Intentando refrescar permisos para archivo:', fileIdMatch[1]);
                        try {
                          await googleDriveService.makeFilePublic(fileIdMatch[1]);
                          console.log('✅ Permisos refrescados exitosamente');

                          // Reintentar con la URL original después de refrescar permisos
                          setTimeout(() => {
                            const img = e.target as HTMLImageElement;
                            const separator = photoUrl && photoUrl.includes('?') ? '&' : '?';
                            const newCacheBuster = `${separator}t=${Date.now()}`;
                            setCacheBuster(newCacheBuster);
                            img.src = photoUrl + newCacheBuster;
                            setIsRetrying(false);
                          }, 3000 + Math.random() * 1000); // 3-4s con jitter para evitar rate limiting
                          // NO HACEMOS RETURN AQUÍ - dejamos que continue la lógica
                        } catch (permissionError: any) {
                          console.warn('⚠️ No se pudieron refrescar los permisos:', permissionError.message);

                          // Mostrar error de permisos
                          setErrorType('drive_permissions');
                          setImageError(true);
                          setIsLoading(false);
                          setIsRetrying(false);
                          return;
                        }
                      }

                      setIsRetrying(false);
                    } catch (error) {
                      console.error('Error en recuperación de Google Drive:', error);
                      setErrorType('drive_permissions');
                      setImageError(true);
                      setIsLoading(false);
                      setIsRetrying(false);
                    }
                  } else if (photoUrl && photoUrl.includes('drive.google.com') && retryCount >= 2) {
                    // Máximo de reintentos alcanzado
                    console.warn('⚠️ Máximo de reintentos alcanzado para Google Drive');
                    setErrorType('drive_permissions');
                    setImageError(true);
                    setIsLoading(false);
                    setIsRetrying(false);
                  }

                  // Para otros tipos de URLs o errores no manejados
                  setErrorType('unknown');
                  setImageError(true);
                  setIsLoading(false);
                  setIsRetrying(false);
                }}
                onLoad={() => {
                  console.log(`✅ Imagen cargada correctamente: ${label}`);
                  setImageError(false); // Reset error state on successful load
                  setErrorType('unknown'); // Reset error type
                  setIsLoading(false);
                  setIsRetrying(false);
                  setRetryCount(0); // Reset retry count
                  // Solo mostrar check si es una URL de Drive (no blob local)
                  if (photoUrl && !photoUrl.startsWith('blob:')) {
                    setUploadSuccess(true);
                    // Ocultar el check después de 3 segundos
                    setTimeout(() => setUploadSuccess(false), 3000);
                  }
                }}
              />
              {/* Indicador de éxito en carga */}
              {uploadSuccess && !isLoading && !isUploading && (
                <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 shadow-lg animate-in zoom-in duration-200">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-lg transition-all flex items-center justify-center cursor-pointer backdrop-blur-[2px]"
                onClick={handleImageClick}
              >
                <ZoomIn className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto flex-1">
              <button
                type="button"
                onClick={handleCameraClick}
                className={`px-4 ${compact ? 'py-1.5 text-xs' : 'py-2.5 text-sm'} font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex-1 sm:flex-none shadow-lg shadow-blue-500/20`}
              >
                Cambiar
              </button>
              {onPhotoRemove && (
                <button
                  type="button"
                  onClick={onPhotoRemove}
                  className={`px-4 ${compact ? 'py-1.5 text-xs' : 'py-2.5 text-sm'} font-medium bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-colors flex-1 sm:flex-none`}
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full">
            {imageError ? (
              <div className="flex flex-col items-center gap-3 w-full p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <div className="flex items-center gap-2 text-red-400">
                  <ImageOff className="w-5 h-5" />
                  <span className="text-sm font-bold">
                    {errorType === 'blob'
                      ? 'Imagen temporal expirada'
                      : errorType === 'drive_auth'
                        ? 'Error de autenticación'
                        : errorType === 'drive_permissions'
                          ? 'Error de permisos'
                          : 'Error al cargar imagen'}
                  </span>
                </div>
                <div className="text-xs text-gray-400 text-center max-w-xs">
                  {errorType === 'blob'
                    ? 'Esta imagen temporal ha expirado. Necesitas volver a tomar la foto.'
                    : errorType === 'drive_auth'
                      ? 'Tu sesión de Google ha expirado. Inicia sesión nuevamente para ver las fotos.'
                      : errorType === 'drive_permissions'
                        ? 'La imagen no se puede cargar. Puede que haya un problema con los permisos o la imagen haya sido eliminada.'
                        : 'La imagen puede estar dañada o no disponible'}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  {errorType === 'blob' ? (
                    <button
                      type="button"
                      onClick={handleCameraClick}
                      className="text-xs font-bold bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-lg text-white flex-1 transition-colors shadow-lg"
                    >
                      Tomar nueva foto
                    </button>
                  ) : errorType === 'drive_auth' ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log(`🔄 Reintentando cargar imagen: ${label}`);
                        setImageError(false); // Reset error state
                        setErrorType('unknown'); // Reset error type
                        setIsLoading(true); // Show loading
                        // Force reload by updating the src
                        setTimeout(() => {
                          const img = document.querySelector(`img[alt="${label}"]`) as HTMLImageElement;
                          if (img && photoUrl) {
                            const separator = photoUrl.includes('?') ? '&' : '?';
                            const newCacheBuster = `${separator}t=${Date.now()}`;
                            setCacheBuster(newCacheBuster);
                            img.src = photoUrl + newCacheBuster;
                          }
                        }, 100);
                      }}
                      className="text-xs font-bold bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-lg text-white flex-1 transition-colors shadow-lg"
                    >
                      Reintentar carga
                    </button>
                  ) : (
                    <div className="text-xs text-center py-2 text-gray-500 italic">
                      No se puede recuperar automáticamente
                    </div>
                  )}
                  {photoUrl && photoUrl.includes('drive.google.com') && (
                    <a
                      href={photoUrl.replace('export=download', 'view').replace('thumbnail', 'view')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-lg text-white flex-1 transition-colors shadow-lg text-center flex items-center justify-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>Ver en Drive</span>
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCameraClick}
                className={`flex items-center justify-center gap-3 px-4 ${compact ? 'py-2' : 'py-4'} bg-white/5 text-gray-300 border border-white/10 rounded-xl hover:bg-white/10 transition-all hover:scale-[1.01] active:scale-[0.99] w-full group`}
              >
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                  <Camera className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-sm font-medium">Tomar foto de {label}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal para ver imagen en grande */}
      {showModal && photoUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-fade-in"
          onClick={handleCloseModal}
        >
          <div className="relative w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl">
            <button
              onClick={handleCloseModal}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors z-10 bg-white/10 rounded-full hover:bg-white/20 backdrop-blur-md"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <img
                src={photoUrl}
                alt={label}
                className="w-full h-auto max-h-[60vh] sm:max-h-[70vh] object-contain bg-black/50"
                onClick={(e) => e.stopPropagation()}
                onError={(e) => {
                  console.warn(`⚠️ Error cargando imagen en modal ${label}:`, photoUrl);
                  console.warn('Modal error details:', e);
                }}
                onLoad={() => {
                  console.log(`✅ Imagen del modal cargada correctamente: ${label}`);
                }}
              />
              <div className="bg-black/80 text-white p-4 backdrop-blur-md border-t border-white/10">
                <p className="text-center font-bold text-sm tracking-wide">{label}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

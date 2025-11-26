'use client';

import { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ImageOff, Camera, CheckCircle2, Loader2 } from 'lucide-react';
import { compressImage } from '@/lib/imageCompression';

interface PhotoCaptureProps {
  label: string;
  photoUrl?: string;
  onPhotoCapture: (file: File) => void;
  onPhotoRemove?: () => void;
  isUploading?: boolean;
  context?: {
    analysisId: string;
    field: string;
  };
  compact?: boolean;
}

export default function PhotoCapture({ label, photoUrl, onPhotoCapture, onPhotoRemove, isUploading = false, compact = false, context }: PhotoCaptureProps) {
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
  const [offlinePhotoStatus, setOfflinePhotoStatus] = useState<'pending' | 'error' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Función para generar URLs alternativas de Google Drive
  const getAlternativeDriveUrl = (currentUrl: string): string | null => {
    // 1. Check for custom x-file-id parameter
    const customMatch = currentUrl.match(/[?&]x-file-id=([^&]+)/);
    if (customMatch) return `https://drive.google.com/uc?id=${customMatch[1]}&export=download`;

    // 2. Check for standard id parameter
    const fileIdMatch = currentUrl.match(/[?&]id=([^&]+)/);
    if (!fileIdMatch) return null;

    const fileId = fileIdMatch[1];

    // Siempre usar URL de descarga directa (más estable y menos rate limiting)
    return `https://drive.google.com/uc?id=${fileId}&export=download`;
  };

  // Effect for offline recovery
  useEffect(() => {
    const checkOfflinePhoto = async () => {
      // Only check if we don't have a server URL and we have context
      if (!photoUrl && !localPreviewUrl && context) {
        try {
          const { photoStorageService } = await import('@/lib/photoStorageService');
          const pendingPhoto = await photoStorageService.getPhotoByContext(context.analysisId, context.field);

          if (pendingPhoto && pendingPhoto.file) {
            console.log(`📦 Found offline photo for ${label}:`, pendingPhoto.status);
            const url = URL.createObjectURL(pendingPhoto.file);
            setLocalPreviewUrl(url);
            setOfflinePhotoStatus(pendingPhoto.status === 'error' ? 'error' : 'pending');
          }
        } catch (error) {
          console.error('Error checking offline photo:', error);
        }
      }
    };

    checkOfflinePhoto();
  }, [photoUrl, context, label]);

  useEffect(() => {
    console.log(`🔍 PhotoCapture "${label}" - photoUrl changed:`, photoUrl ? `✅ ${photoUrl.substring(0, 80)}...` : '❌ Sin URL');

    setImageError(false);
    setErrorType('unknown');
    setIsLoading(!!photoUrl); // Mostrar loading si hay URL
    setIsRetrying(false);
    setRetryCount(0); // Reset retry count

    // Si llega una URL del servidor, limpiar la preview local
    if (photoUrl) {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
        setLocalPreviewUrl(null);
      }
      setOfflinePhotoStatus(null);
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
      // Timeout adaptativo según conexión
      let timeoutDuration = 30000; // 30s por defecto

      // Detectar conexión lenta si es posible
      if (typeof navigator !== 'undefined' && 'connection' in navigator) {
        const conn = (navigator as any).connection;
        if (conn) {
          if (conn.effectiveType === '2g') timeoutDuration = 60000; // 60s para 2G
          else if (conn.effectiveType === '3g') timeoutDuration = 45000; // 45s para 3G
          console.log(`📡 Conexión detectada: ${conn.effectiveType}, timeout ajustado a ${timeoutDuration}ms`);
        }
      }

      const timeout = setTimeout(() => {
        console.warn(`⏰ Timeout de carga excedido para ${label} (${timeoutDuration}ms), forzando fin de loading`);
        setIsLoading(false);
        setIsRetrying(false);
        // Si aún no hay error, marcar como error desconocido
        if (!imageError) {
          setImageError(true);
          setErrorType('unknown');
        }
      }, timeoutDuration);

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
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {(photoUrl || localPreviewUrl) && !imageError ? (
        <div className={`flex flex-col sm:flex-row sm:items-center gap-4 ${compact ? 'py-1' : ''}`}>
          <div className={`relative ${compact ? 'w-20 h-20' : 'w-full sm:w-32 h-48 sm:h-24'} flex-shrink-0 group`}>
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
                // Detectar si es una URL de Drive (dominio o parámetro x-file-id)
                const isDriveUrl = photoUrl && (photoUrl.includes('drive.google.com') || photoUrl.includes('x-file-id'));

                if (isDriveUrl && retryCount < 2) {
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
                    let fileId = null;
                    const customMatch = photoUrl ? photoUrl.match(/[?&]x-file-id=([^&]+)/) : null;
                    const idMatch = photoUrl ? photoUrl.match(/[?&]id=([^&]+)/) : null;

                    if (customMatch) fileId = customMatch[1];
                    else if (idMatch) fileId = idMatch[1];

                    if (fileId) {
                      console.warn('Intentando refrescar permisos para archivo:', fileId);
                      try {
                        await googleDriveService.makeFilePublic(fileId);
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
                } else if (isDriveUrl && retryCount >= 2) {
                  // Máximo de reintentos alcanzado
                  console.warn('⚠️ Máximo de reintentos alcanzado para Google Drive');
                  setErrorType('drive_permissions');
                  setImageError(true);
                  setIsLoading(false);
                  setIsRetrying(false);
                  return;
                }

                // Para otros tipos de URLs o errores no manejados (solo si no se manejó antes)
                if (!imageError) {
                  setErrorType('unknown');
                  setImageError(true);
                  setIsLoading(false);
                  setIsRetrying(false);
                }
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
              <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 shadow-lg animate-in zoom-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
            )}

            {/* Indicador de carga/compresión */}
            {(isLoading || isUploading || isCompressing) && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  backdropFilter: 'blur(1px)',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 50,
                }}
                className="animate-in fade-in duration-200"
              >
                <Loader2 className="w-8 h-8 text-green-500 animate-spin mb-2" style={{ color: '#22c55e' }} />
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#4ade80',
                    textAlign: 'center',
                    paddingLeft: '0.5rem',
                    paddingRight: '0.5rem',
                  }}
                >
                  {isCompressing ? 'Comprimiendo...' : 'Subiendo...'}
                </span>
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
              className={`${compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'} font-[600] bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-2 border-blue-400/50 hover:from-blue-600 hover:to-indigo-700 hover:border-blue-300 rounded-[14px] transition-all active:scale-[0.98] flex-1 sm:flex-none shadow-lg hover:shadow-xl`}
              style={{
                boxShadow: '0 6px 15px -3px rgba(59, 130, 246, 0.3)'
              }}
            >
              Cambiar
            </button>
            {onPhotoRemove && (
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
          {imageError ? (
            <div className="flex items-center gap-3 w-full p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <div className="flex items-center gap-2 text-amber-400 flex-1">
                <ImageOff className="w-4 h-4 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold">
                    ✅ Foto guardada en Drive
                  </span>
                  <span className="text-[10px] text-amber-300/80">
                    {errorType === 'blob'
                      ? 'Preview expiró (recarga la página)'
                      : errorType === 'drive_auth'
                        ? 'Requiere re-autenticación'
                        : errorType === 'drive_permissions'
                          ? 'Error temporal de permisos'
                          : 'Error temporal de carga'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {errorType === 'blob' ? (
                  <button
                    type="button"
                    onClick={handleCameraClick}
                    className="text-xs font-medium bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-white transition-colors"
                  >
                    Retomar
                  </button>
                ) : errorType === 'drive_auth' ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log(`🔄 Reintentando cargar imagen: ${label}`);
                      setImageError(false);
                      setErrorType('unknown');
                      setIsLoading(true);
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
                    className="text-xs font-medium bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-white transition-colors"
                  >
                    Reintentar
                  </button>
                ) : null}
                {photoUrl && (
                  <a
                    href={photoUrl.includes('drive.google.com') ? photoUrl.replace('export=download', 'view').replace('thumbnail', 'view') : photoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium bg-gray-600 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-white transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Ver en Drive
                  </a>
                )}
              </div>
            </div>
          ) : (
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
        </div>
      )}

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

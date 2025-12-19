'use client';

import { useState } from 'react';
import { Eye, X, ZoomIn } from 'lucide-react';

interface PhotoThumbnailProps {
    photoUrl: string;
    alt?: string;
    onDelete?: () => void;
    size?: 'sm' | 'md' | 'lg';
}

export default function PhotoThumbnail({
    photoUrl,
    alt = 'Photo',
    onDelete,
    size = 'md'
}: PhotoThumbnailProps) {
    const [showPreview, setShowPreview] = useState(false);
    const [isFlashing, setIsFlashing] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);

    const sizeClasses = {
        sm: 'w-10 h-10',
        md: 'w-12 h-12',
        lg: 'w-16 h-16'
    };

    const handleClick = () => {
        setShowPreview(true);
    };

    return (
        <>
            {/* Thumbnail with hover effects */}
            <div className="relative group inline-block">
                <button
                    type="button"
                    onClick={handleClick}
                    className={`
            ${sizeClasses[size]} 
            rounded-lg overflow-hidden border-2 border-gray-300 
            hover:border-blue-500 transition-all hover:scale-110 
            ${isFlashing ? 'animate-flash' : ''}
            shadow-sm hover:shadow-md
          `}
                >
                    <img
                        src={photoUrl}
                        alt={alt}
                        className="w-full h-full object-cover"
                    />

                    {/* Hover overlay con icono de zoom */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-all">
                        <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </button>

                {/* Delete button */}
                {onDelete && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="
              absolute -top-2 -right-2 
              bg-red-500 text-white rounded-full p-1 
              opacity-0 group-hover:opacity-100 
              transition-opacity shadow-lg
              hover:bg-red-600 active:scale-90
            "
                        title="Eliminar foto"
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>

            {/* Fullscreen preview modal */}
            {showPreview && (
                <div
                    className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => {
                        setShowPreview(false);
                        setZoomLevel(1); // Reset zoom on close
                    }}
                >
                    <div className="relative max-w-6xl max-h-[95vh] w-full flex flex-col items-center">
                        {/* Title Bar - More visible */}
                        <div className="absolute top-0 left-0 right-0 z-10 bg-black/80 text-white p-4 text-center backdrop-blur-md rounded-t-lg">
                            <h3 className="text-xl font-bold">{alt}</h3>
                            <p className="text-xs text-gray-300 mt-1">Doble click/tap para hacer zoom</p>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={() => {
                                setShowPreview(false);
                                setZoomLevel(1);
                            }}
                            className="absolute z-20 top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                        >
                            <X className="w-8 h-8" />
                        </button>

                        {/* Image Container with Zoom */}
                        <div
                            className="relative w-full h-full flex items-center justify-center overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img
                                src={photoUrl}
                                alt={alt}
                                className="max-w-full max-h-[80vh] object-contain transition-transform duration-200 cursor-zoom-in"
                                style={{ transform: `scale(${zoomLevel})` }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Simple toggle zoom on single click if user prefers, 
                                    // but user asked for double tap. 
                                    // Let's support double click explicitly for 'desktop' feel
                                    // and maybe a simple tap-to-zoom if mobile has issues, but stick to requested double tap/click.
                                }}
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    setZoomLevel(prev => prev === 1 ? 2.5 : 1);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Helper state for zoom (add this inside the component)
// You need to update the component function body to include this state.


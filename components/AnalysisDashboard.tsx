'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, CheckCircle, Plus, Ruler, QrCode, Loader2, Calendar } from 'lucide-react';
import { QualityAnalysis, PRODUCT_TYPE_LABELS, ANALYST_COLOR_HEX } from '@/lib/types';
import DailyReportCard from './DailyReportCard';
import FailedUploadsBanner from './FailedUploadsBanner';
import { logger } from '@/lib/logger';
import { PendingUploadsPanel } from './PendingUploadsPanel';
import { retryPhotoUploadStandalone } from '@/lib/retryUploadService';
import { PendingPhoto, photoStorageService } from '@/lib/photoStorageService';
import dynamic from 'next/dynamic';

const TechnicalSpecsModal = dynamic(() => import('./TechnicalSpecsModal'), { loading: () => null });

interface AnalysisDashboardProps {
  initialAnalyses: QualityAnalysis[];
  initialLastDoc?: any;
}

export default function AnalysisDashboard({ initialAnalyses, initialLastDoc }: AnalysisDashboardProps) {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<QualityAnalysis[]>(initialAnalyses);
  const [searchTerm, setSearchTerm] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'completados' | 'en_progreso'>('en_progreso');
  const [showPendingUploads, setShowPendingUploads] = useState(false);

  const [showSpecsModal, setShowSpecsModal] = useState(false);

  // History management for Native Back Navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If the back button is pressed and the modal is open, close it
      if (showSpecsModal) {
        setShowSpecsModal(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showSpecsModal]);

  const handleOpenSpecsModal = () => {
    setShowSpecsModal(true);
    // Push state so back button works
    window.history.pushState({ modal: 'specs' }, '', window.location.pathname);
  };

  const handleCloseSpecsModal = () => {
    // If we are closing via UI, go back in history to remove the state
    // This will trigger popstate, which sets showSpecsModal(false)
    window.history.back();
  };

  // Pagination state
  const [lastDoc, setLastDoc] = useState<any>(initialLastDoc);
  const [hasMore, setHasMore] = useState(!!initialLastDoc);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAnalyses(initialAnalyses);
    setLastDoc(initialLastDoc);
    // Solo mostrar "Cargar más" si hay al menos 30 análisis iniciales
    setHasMore(!!initialLastDoc && initialAnalyses.length >= 30);
  }, [initialAnalyses, initialLastDoc]);

  const handleRetryPhoto = async (photo: PendingPhoto) => {
    await retryPhotoUploadStandalone(photo);
  };

  const handleRetryAll = async () => {
    const failed = await photoStorageService.getFailedPhotos();
    for (const photo of failed) {
      await retryPhotoUploadStandalone(photo);
    }
  };

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || searchTerm) return;

    setIsLoadingMore(true);
    try {
      const { getPaginatedAnalyses } = await import('@/lib/analysisService');
      const { analyses: newAnalyses, lastDoc: newLastDoc } = await getPaginatedAnalyses(10, lastDoc);

      if (newAnalyses.length === 0) {
        setHasMore(false);
      } else {
        setAnalyses((prev: any[]) => [...prev, ...newAnalyses]);
        setLastDoc(newLastDoc);
        if (newAnalyses.length < 10) {
          setHasMore(false);
        }
      }
    } catch (error) {
      logger.error('Error loading more analyses:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, lastDoc, searchTerm]);

  // IntersectionObserver removed in favor of manual "Load More" button

  const filteredAnalyses = analyses.filter(analysis => {
    const matchesSearch =
      analysis.lote.toLowerCase().includes(searchTerm.toLowerCase()) ||
      analysis.codigo.toLowerCase().includes(searchTerm.toLowerCase());

    // "Completados" muestra solo los análisis completados
    if (activeTab === 'completados') return matchesSearch && analysis.status === 'COMPLETADO';

    // "En Progreso" muestra solo los que NO están completados
    if (activeTab === 'en_progreso') return matchesSearch && analysis.status !== 'COMPLETADO';

    return matchesSearch;
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f3f4f6' }}>
      <FailedUploadsBanner onClick={() => setShowPendingUploads(true)} />
      <PendingUploadsPanel
        isOpen={showPendingUploads}
        onClose={() => setShowPendingUploads(false)}
        onRetryPhoto={handleRetryPhoto}
        onRetryAll={handleRetryAll}
      />

      {/* Controls Section - Sticky con glassmorphism */}
      <div className="sticky top-0 z-30 glass backdrop-blur-xl px-3 py-3 sm:px-4 sm:py-4 shadow-lg" style={{ borderBottom: 'none', borderTop: 'none' }}>
        <div className="max-w-7xl mx-auto space-y-3">
          {/* Actions Row - Mobile optimized */}
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={() => router.push('/dashboard/tests/new')}
              className="flex-1 text-white px-4 py-3 text-base font-[600] transition-all flex items-center justify-center gap-2 min-w-0"
              style={{
                backgroundColor: '#2563EB',
                borderRadius: '14px',
                border: 'none',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1D4ED8';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#2563EB';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Plus className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">Nuevo</span>
            </button>
            <button
              onClick={() => setShowReportModal(!showReportModal)}
              className="flex-1 px-4 py-3 text-base font-[600] transition-all flex items-center justify-center gap-2 min-w-0"
              style={{
                backgroundColor: 'white',
                color: '#2563EB',
                border: '2px solid #2563EB',
                borderRadius: '14px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#EFF6FF';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <FileText className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">Reporte</span>
            </button>
            <button
              onClick={handleOpenSpecsModal}
              className="px-4 py-3 text-base font-[600] transition-all flex items-center justify-center gap-2 min-w-0"
              style={{
                backgroundColor: '#F3F4F6',
                color: '#374151',
                border: '2px solid #E5E7EB',
                borderRadius: '14px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E5E7EB';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              title="Fichas Técnicas"
            >
              <FileText className="h-5 w-5 flex-shrink-0" />
              <span className="hidden sm:inline">Fichas</span>
            </button>
          </div>

          {/* Search Bar moderno */}
          <div className="relative" style={{ marginTop: '16px' }}>
            <div className="flex items-center rounded-[12px] px-[16px] py-[12px] border-2 border-transparent transition-all"
              style={{
                backgroundColor: '#F3F4F6',
              }}
            >
              <span className="mr-[10px] text-[18px]">🔍</span>
              <input
                type="text"
                placeholder="Buscar por lote o código..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="border-none bg-transparent w-full text-[15px] outline-none font-[500]"
                style={{
                  color: '#1F2937'
                }}
              />
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex justify-center" style={{ marginTop: '12px', marginBottom: '16px' }}>
            <div className="flex items-center gap-1 glass p-1 rounded-full shadow-md">
              <button
                onClick={() => setActiveTab('en_progreso')}
                className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${activeTab === 'en_progreso'
                  ? 'gradient-blue text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                  }`}
                style={{ border: 'none' }}
              >
                En Progreso
              </button>
              <button
                onClick={() => setActiveTab('completados')}
                className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${activeTab === 'completados'
                  ? 'gradient-blue text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                  }`}
                style={{ border: 'none' }}
              >
                Completados
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 pb-6">
        {/* Report Card */}
        {showReportModal && (
          <div className="mb-3 animate-slide-up">
            <DailyReportCard onClose={() => setShowReportModal(false)} />
          </div>
        )}

        {/* Grid de Análisis - Compacto y optimizado para móvil */}
        <div className="grid grid-cols-1 min-[550px]:grid-cols-2 gap-5" style={{ gap: '20px' }}>
          {filteredAnalyses.map((analysis, index) => (
            <div
              key={`${analysis.id}-${index}`}
              onClick={() => router.push(`/dashboard/tests/edit?id=${analysis.id}`)}
              className="cursor-pointer relative group transition-all duration-300 hover:-translate-y-1"
              style={{
                borderRadius: '14px',
                background: 'white',
                border: 'none',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
              }}
            >
              {/* Franja de color del analista */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '8px',
                  backgroundColor: (() => {
                    // Fallback a azul si no hay color
                    if (!analysis.analystColor) {
                      return '#3b82f6'; // Azul por defecto
                    }
                    const color = ANALYST_COLOR_HEX[analysis.analystColor as keyof typeof ANALYST_COLOR_HEX];
                    if (!color) {
                      return '#3b82f6';
                    }
                    return color;
                  })(),
                  borderTopLeftRadius: '14px',
                  borderBottomLeftRadius: '14px',
                  zIndex: 10
                }}
              />

              <div className="p-3 pl-5" style={{ paddingLeft: '24px', paddingRight: '20px' }}>
                {/* Header ultra compacto */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-0.5 min-w-0 flex-1">
                    <h3 className="text-base font-bold text-gray-900 truncate" style={{ margin: 0, padding: 0, lineHeight: 1 }}>
                      {analysis.lote}
                    </h3>
                    {analysis.status === 'COMPLETADO' && (
                      <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400 flex-shrink-0 ml-1">
                    <span>{new Date(analysis.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(analysis.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Flexbox ultra compacto 2x2 */}
                <div className="flex flex-wrap gap-x-1.5" style={{ margin: 0, padding: 0, rowGap: 0 }}>
                  {/* Producto */}
                  <div style={{ margin: 0, padding: 0, width: 'calc(50% - 0.375rem)' }}>
                    <div className="text-xs font-medium text-gray-500" style={{ margin: 0, padding: 0, lineHeight: 1 }}>Producto</div>
                    <div className="text-sm font-bold text-gray-900 truncate" style={{ margin: 0, padding: 0, lineHeight: 1 }}>
                      {PRODUCT_TYPE_LABELS[analysis.productType as keyof typeof PRODUCT_TYPE_LABELS]}
                    </div>
                  </div>

                  {/* Código */}
                  <div style={{ margin: 0, padding: 0, width: 'calc(50% - 0.375rem)' }}>
                    <div className="text-xs font-medium text-gray-500 flex items-center gap-0.5" style={{ margin: 0, padding: 0, lineHeight: 1 }}>
                      <QrCode className="w-2 h-2" /> Código
                    </div>
                    <div className="text-sm font-bold text-gray-800 truncate" style={{ margin: 0, padding: 0, lineHeight: 1 }}>
                      {analysis.codigo}
                    </div>
                  </div>

                  {/* Talla */}
                  <div style={{ margin: 0, padding: 0, width: 'calc(50% - 0.375rem)' }}>
                    <div className="text-xs font-medium text-gray-500 flex items-center gap-0.5" style={{ margin: 0, padding: 0, lineHeight: 1 }}>
                      <Ruler className="w-2 h-2" /> Talla
                    </div>
                    <div className="text-sm font-bold text-gray-900 truncate" style={{ margin: 0, padding: 0, lineHeight: 1 }}>
                      {analysis.talla || '-'}
                    </div>
                  </div>

                  {/* Turno */}
                  <div style={{ margin: 0, padding: 0, width: 'calc(50% - 0.375rem)' }}>
                    <div className="text-xs font-medium text-gray-500" style={{ margin: 0, padding: 0, lineHeight: 1 }}>Turno</div>
                    <span className={`inline-flex items-center px-1 py-0.5 rounded text-xs font-bold tracking-wide uppercase shadow-sm ${analysis.shift === 'NOCHE'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-amber-100 text-amber-700'
                      }`} style={{ lineHeight: 1 }}>
                      {analysis.shift}
                    </span>
                  </div>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-600/0 group-hover:from-blue-500/5 group-hover:to-purple-600/5 transition-all pointer-events-none" />
              </div>
            </div>
          ))}
        </div>

        {/* Load More Button - Minimalist & Compact */}
        {hasMore && !searchTerm && filteredAnalyses.length > 0 && (
          <div className="flex justify-center py-2">
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="text-xs font-medium text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Cargando...</span>
                </>
              ) : (
                <>
                  <span>Cargar anteriores</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        )}

        {/* Empty state */}
        {filteredAnalyses.length === 0 && (
          <div className="text-center py-12 sm:py-16 animate-fade-in">
            <div className="w-16 h-16 sm:w-20 sm:h-20 glass rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Search className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">No se encontraron análisis</h3>
            backgroundColor: '#F3F4F6',
              }}
            >
            <span className="mr-[10px] text-[18px]">🔍</span>
            <input
              type="text"
              placeholder="Buscar por lote o código..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="border-none bg-transparent w-full text-[15px] outline-none font-[500]"
              style={{
                color: '#1F2937'
              }}
            />
          </div>
          </div>

      {/* Tabs Navigation */}
      <div className="flex justify-center" style={{ marginTop: '12px', marginBottom: '16px' }}>
        <div className="flex items-center gap-1 glass p-1 rounded-full shadow-md">
          <button
            onClick={() => setActiveTab('en_progreso')}
            className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${activeTab === 'en_progreso'
              ? 'gradient-blue text-white shadow-md'
              : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
              }`}
            style={{ border: 'none' }}
          >
            En Progreso
          </button>
          <button
            onClick={() => setActiveTab('completados')}
            className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${activeTab === 'completados'
              ? 'gradient-blue text-white shadow-md'
              : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
              }`}
            style={{ border: 'none' }}
          >
            Completados
          </button>
        </div>
      </div>
    </div>
      </div >

    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 pb-6">
      {/* Report Card */}
      {showReportModal && (
        <div className="mb-3 animate-slide-up">
          <DailyReportCard onClose={() => setShowReportModal(false)} />
        </div>
      )}

      {/* Grid de Análisis - Compacto y optimizado para móvil */}
      <div className="grid grid-cols-1 min-[550px]:grid-cols-2 gap-5" style={{ gap: '20px' }}>
        {filteredAnalyses.map((analysis, index) => (
          <div
            key={`${analysis.id}-${index}`}
            onClick={() => router.push(`/dashboard/tests/edit?id=${analysis.id}`)}
            className="cursor-pointer relative group transition-all duration-300 hover:-translate-y-1"
            style={{
              borderRadius: '14px',
              background: 'white',
              border: 'none',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
            }}
          >
            {/* Franja de color del analista */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '8px',
                backgroundColor: (() => {
                  // Fallback a azul si no hay color
                  if (!analysis.analystColor) {
                    return '#3b82f6'; // Azul por defecto
                  }
                  const color = ANALYST_COLOR_HEX[analysis.analystColor as keyof typeof ANALYST_COLOR_HEX];
                  if (!color) {
                    return '#3b82f6';
                  }
                  return color;
                })(),
                borderTopLeftRadius: '14px',
                borderBottomLeftRadius: '14px',
                zIndex: 10
              }}
            />

            <div className="p-3 pl-5" style={{ paddingLeft: '24px', paddingRight: '20px' }}>
              {/* Header ultra compacto */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-0.5 min-w-0 flex-1">
                  <h3 className="text-base font-bold text-gray-900 truncate" style={{ margin: 0, padding: 0, lineHeight: 1 }}>
                    {analysis.lote}
                  </h3>
                  {analysis.status === 'COMPLETADO' && (
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  )}
                </div>
                <div className="text-[10px] text-gray-400 flex-shrink-0 ml-1">
                  <span>{new Date(analysis.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(analysis.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {/* Flexbox ultra compacto 2x2 */}
              <div className="flex flex-wrap gap-x-1.5" style={{ margin: 0, padding: 0, rowGap: 0 }}>
                {/* Producto */}
                <div style={{ margin: 0, padding: 0, width: 'calc(50% - 0.375rem)' }}>
                  <div className="text-xs font-medium text-gray-500" style={{ margin: 0, padding: 0, lineHeight: 1 }}>Producto</div>
                  <div className="text-sm font-bold text-gray-900 truncate" style={{ margin: 0, padding: 0, lineHeight: 1 }}>
                    {PRODUCT_TYPE_LABELS[analysis.productType as keyof typeof PRODUCT_TYPE_LABELS]}
                  </div>
                </div>

                {/* Código */}
                <div style={{ margin: 0, padding: 0, width: 'calc(50% - 0.375rem)' }}>
                  <div className="text-xs font-medium text-gray-500 flex items-center gap-0.5" style={{ margin: 0, padding: 0, lineHeight: 1 }}>
                    <QrCode className="w-2 h-2" /> Código
                  </div>
                  <div className="text-sm font-bold text-gray-800 truncate" style={{ margin: 0, padding: 0, lineHeight: 1 }}>
                    {analysis.codigo}
                  </div>
                </div>

                {/* Talla */}
                <div style={{ margin: 0, padding: 0, width: 'calc(50% - 0.375rem)' }}>
                  <div className="text-xs font-medium text-gray-500 flex items-center gap-0.5" style={{ margin: 0, padding: 0, lineHeight: 1 }}>
                    <Ruler className="w-2 h-2" /> Talla
                  </div>
                  <div className="text-sm font-bold text-gray-900 truncate" style={{ margin: 0, padding: 0, lineHeight: 1 }}>
                    {analysis.talla || '-'}
                  </div>
                </div>

                {/* Turno */}
                <div style={{ margin: 0, padding: 0, width: 'calc(50% - 0.375rem)' }}>
                  <div className="text-xs font-medium text-gray-500" style={{ margin: 0, padding: 0, lineHeight: 1 }}>Turno</div>
                  <span className={`inline-flex items-center px-1 py-0.5 rounded text-xs font-bold tracking-wide uppercase shadow-sm ${analysis.shift === 'NOCHE'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-amber-100 text-amber-700'
                    }`} style={{ lineHeight: 1 }}>
                    {analysis.shift}
                  </span>
                </div>
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-600/0 group-hover:from-blue-500/5 group-hover:to-purple-600/5 transition-all pointer-events-none" />
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button - Minimalist & Compact */}
      {hasMore && !searchTerm && filteredAnalyses.length > 0 && (
        <div className="flex justify-center py-2">
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="text-xs font-medium text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Cargando...</span>
              </>
            ) : (
              <>
                <span>Cargar anteriores</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}

      {/* Empty state */}
      {filteredAnalyses.length === 0 && (
        <div className="text-center py-12 sm:py-16 animate-fade-in">
          <div className="w-16 h-16 sm:w-20 sm:h-20 glass rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Search className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">No se encontraron análisis</h3>
          <p className="text-sm sm:text-base text-gray-500">Intenta ajustar tu búsqueda o crea un nuevo análisis.</p>
        </div>
      )}
    </div>

  {/* Technical Specs Modal */ }
  <TechnicalSpecsModal
    isOpen={showSpecsModal}
    onClose={handleCloseSpecsModal}
    code=""
  />
    </div >
  );
}

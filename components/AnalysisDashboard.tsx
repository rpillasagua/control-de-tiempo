'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, CheckCircle, Plus, Ruler, QrCode, Loader2, Calendar } from 'lucide-react';
import { QualityAnalysis, PRODUCT_TYPE_LABELS, ANALYST_COLOR_HEX } from '@/lib/types';
import DailyReportCard from './DailyReportCard';
import { logger } from '@/lib/logger';

interface AnalysisDashboardProps {
  initialAnalyses: QualityAnalysis[];
  initialLastDoc?: any;
}

export default function AnalysisDashboard({ initialAnalyses, initialLastDoc }: AnalysisDashboardProps) {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<QualityAnalysis[]>(initialAnalyses);
  const [searchTerm, setSearchTerm] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'completados' | 'en_progreso'>('completados');

  // Pagination state
  const [lastDoc, setLastDoc] = useState<any>(initialLastDoc);
  const [hasMore, setHasMore] = useState(!!initialLastDoc);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAnalyses(initialAnalyses);
    setLastDoc(initialLastDoc);
    setHasMore(!!initialLastDoc);
  }, [initialAnalyses, initialLastDoc]);

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

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !searchTerm) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [loadMore, hasMore, isLoadingMore, searchTerm]);

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
      {/* Controls Section - Sticky con glassmorphism */}
      <div className="sticky top-0 z-30 glass backdrop-blur-xl px-3 py-3 sm:px-4 sm:py-4 shadow-lg" style={{ borderBottom: 'none', borderTop: 'none' }}>
        <div className="max-w-7xl mx-auto space-y-3">
          {/* Actions Row - Mobile optimized */}
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={() => router.push('/dashboard/tests/new')}
              className="flex-1 text-white px-4 py-3 text-base font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 min-w-0"
              style={{
                backgroundColor: '#2563EB',
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1d4ed8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#2563EB';
              }}
            >
              <Plus className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">Nuevo</span>
            </button>
            <button
              onClick={() => setShowReportModal(!showReportModal)}
              className="flex-1 px-4 py-3 text-base font-semibold transition-all flex items-center justify-center gap-2 min-w-0"
              style={{
                backgroundColor: 'transparent',
                color: '#2563EB',
                border: '2px solid #2563EB',
                borderRadius: '12px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#eff6ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <FileText className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">Reporte</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-3 text-base font-semibold transition-all flex items-center justify-center gap-2 min-w-0"
              style={{
                backgroundColor: 'transparent',
                color: '#4B5563',
                border: '2px solid #E5E7EB',
                borderRadius: '12px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
                e.currentTarget.style.borderColor = '#D1D5DB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = '#E5E7EB';
              }}
              title="Actualizar lista"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
            </button>
          </div>

          {/* Search Bar moderno */}
          <div className="relative" style={{ marginTop: '16px' }}>
            <input
              type="text"
              placeholder="Buscar por lote o código..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full px-4 text-base transition-all outline-none text-center"
              style={{
                backgroundColor: '#F3F4F6',
                border: '2px solid transparent',
                borderRadius: '12px',
                color: '#1F2937',
                paddingTop: '12px',
                paddingBottom: '12px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', // Sombra más fuerte para efecto flotante
                position: 'relative',
                zIndex: 1
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#2563EB';
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(37, 99, 235, 0.25)'; // Sombra azul intensa al enfocar
                e.currentTarget.style.transform = 'translateY(-4px)'; // Elevación más notable
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.backgroundColor = '#F3F4F6';
                e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            />
          </div>

          {/* Tabs Navigation */}
          <div className="flex justify-center" style={{ marginTop: '12px', marginBottom: '16px' }}>
            <div className="flex items-center gap-1 glass p-1 rounded-full shadow-md">
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
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-4 pb-6">
        {/* Report Card */}
        {showReportModal && (
          <div className="mb-3 animate-slide-up">
            <DailyReportCard onClose={() => setShowReportModal(false)} />
          </div>
        )}

        {/* Grid de Análisis - Compacto y optimizado para móvil */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4" style={{ rowGap: '20px', columnGap: '20px' }}>
          {filteredAnalyses.map((analysis) => (
            <div
              key={analysis.id}
              onClick={() => router.push(`/dashboard/tests/edit?id=${analysis.id}`)}
              className="cursor-pointer relative group transition-all duration-300 hover:-translate-y-1"
              style={{
                borderRadius: '24px',
                background: 'white',
                border: 'none',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
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
                  borderTopLeftRadius: '24px',
                  borderBottomLeftRadius: '24px',
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

        {/* Loading Spinner */}
        {hasMore && !searchTerm && (
          <div ref={observerTarget} className="flex justify-center py-6 sm:py-8">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 animate-spin" />
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
    </div>
  );
}

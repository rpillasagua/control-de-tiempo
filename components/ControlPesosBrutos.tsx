'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Plus, Camera, Edit2, Check } from 'lucide-react';
import { PesoBrutoRegistro } from '@/lib/types';
import { PesoItem } from './PesoItem';

interface ControlPesosBrutosProps {
  registros: PesoBrutoRegistro[];
  onChange: (registros: PesoBrutoRegistro[]) => void;
  onPhotoCapture: (registroId: string, file: File) => void;
  // Nueva prop para manejar el borrado externamente (limpieza de Drive)
  onDeleteRequest: (registro: PesoBrutoRegistro) => Promise<void> | void;
  isPhotoUploading?: (registroId: string) => boolean;
  viewMode?: 'SUELTA' | 'COMPACTA';
  unit?: 'KG' | 'LB';
  analysisId: string;
  forceGalleryMode?: boolean;
  isCompleted?: boolean;
}

// using default export allows cleaner memo usage in React Fast Refresh dev environments but wrapping it works too
// We need to name the component inside memo for better devtools debugging
const ControlPesosBrutos = React.memo<ControlPesosBrutosProps>(({
  registros,
  onChange,
  onPhotoCapture,
  onDeleteRequest,
  isPhotoUploading = () => false,
  viewMode = 'COMPACTA',
  unit = 'KG',
  analysisId,
  forceGalleryMode = false,
  isCompleted = false
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const isCompact = viewMode === 'COMPACTA';

  const agregarRegistro = useCallback(() => {
    if (isCompleted) return;
    const nuevoRegistro: PesoBrutoRegistro = {
      id: crypto.randomUUID(), // Mejor que Date.now()
      peso: 0,
      timestamp: new Date().toISOString()
    };
    onChange([...registros, nuevoRegistro]);
  }, [registros, onChange, isCompleted]);

  const actualizarPeso = useCallback((id: string, valor: number) => {
    if (isCompleted) return;
    onChange(registros.map(r =>
      r.id === id ? { ...r, peso: valor } : r
    ));
  }, [registros, onChange, isCompleted]);

  const manejarEliminacion = useCallback(async (registroId: string) => {
    if (isCompleted) return;
    const registro = registros.find(r => r.id === registroId);
    if (!registro) return;

    setDeletingIds(prev => new Set(prev).add(registroId));
    try {
      await onDeleteRequest(registro);
    } catch (error) {
      console.error("Error al eliminar registro:", error);
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(registroId);
        return next;
      });
    }
  }, [registros, onDeleteRequest, isCompleted]);

  const totalPeso = useMemo(() => registros.reduce((acc, curr) => acc + (Number(curr.peso) || 0), 0), [registros]);

  return (
    <div className={`${isCompact ? 'space-y-3' : 'space-y-4'} ${isCompact ? 'p-3' : 'p-6'} glass-panel rounded-2xl`}>
      {/* Header Section */}
      <div className="flex items-center justify-between mb-2">
        <h3 className={`font-bold ${isCompact ? 'text-base' : 'text-xl'} text-white tracking-tight`}>
          Control de Pesos Brutos
        </h3>
        <div className="flex items-center gap-2">
          {registros.length > 0 && !isCompleted && (
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`p-2 rounded-xl transition-all ${isEditMode ? 'bg-red-500/20 text-red-300' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
              title={isEditMode ? "Terminar edición" : "Editar lista"}
            >
              {isEditMode ? <Check className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
            </button>
          )}
          {!isCompleted && (
            <button
              type="button"
              onClick={agregarRegistro}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 text-sm font-semibold hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Agregar Peso
            </button>
          )}
        </div>
      </div>

      {/* List Section */}
      {registros.length === 0 ? (
        <div className="text-center py-10 text-gray-400 border-2 border-dashed border-white/10 rounded-xl bg-white/5">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
            <Plus className="w-6 h-6 text-gray-500" />
          </div>
          <p className="font-medium">No hay registros</p>
          {!isCompleted && <p className="text-xs mt-1 text-gray-500">Haz clic en "Agregar Peso" para comenzar</p>}
        </div>
      ) : (
        <div className={isCompact ? 'grid grid-cols-2 md:grid-cols-3 gap-3' : 'space-y-4'}>
          {registros.map((registro, index) => (
            <PesoItem
              key={registro.id}
              index={index}
              registro={registro}
              isEditMode={!isCompleted && isEditMode}
              isCompact={isCompact}
              isUploading={isPhotoUploading(registro.id)}
              isDeleting={deletingIds.has(registro.id)}
              onUpdate={actualizarPeso}
              onDelete={manejarEliminacion}
              onPhotoCapture={onPhotoCapture}
              analysisId={analysisId}
              forceGalleryMode={forceGalleryMode}
              disabled={isCompleted}
            />
          ))}
        </div>
      )}

      {registros.length > 0 && (
        <div className="pt-4 border-t border-white/10 mt-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Total de registros:</span>
            <span className="font-bold text-white">{registros.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-gray-400">Peso total:</span>
            <span className="font-bold text-blue-400 text-lg">
              {totalPeso.toFixed(2)} {unit.toLowerCase()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

export default ControlPesosBrutos;

'use client';

import { useState, useCallback, useMemo } from 'react';
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
}

export default function ControlPesosBrutos({
  registros,
  onChange,
  onPhotoCapture,
  onDeleteRequest,
  isPhotoUploading = () => false,
  viewMode = 'COMPACTA',
  unit = 'KG',
  analysisId,
  forceGalleryMode = false
}: ControlPesosBrutosProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Uso de useCallback para estabilizar funciones
  const agregarRegistro = useCallback(() => {
    const nuevoRegistro: PesoBrutoRegistro = {
      id: crypto.randomUUID(), // Mejor que Date.now()
      peso: 0,
      timestamp: new Date().toISOString()
    };
    onChange([...registros, nuevoRegistro]);
  }, [registros, onChange]);

  const manejarEliminacion = async (id: string) => {
    const registro = registros.find(r => r.id === id);
    if (!registro) return;

    // UX: Confirmación simple
    if (!window.confirm('¿Estás seguro de eliminar este peso y su foto?')) return;

    try {
      setDeletingIds(prev => new Set(prev).add(id));

      // Delegamos la lógica "sucia" (borrar de Drive) al padre mediante prop
      await onDeleteRequest(registro);

      // Actualizamos el estado local
      onChange(registros.filter(r => r.id !== id));
    } catch (error) {
      console.error("Error al eliminar", error);
      alert("Hubo un error al eliminar el registro");
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const actualizarPeso = useCallback((id: string, valor: number) => {
    onChange(registros.map(r =>
      r.id === id ? { ...r, peso: valor } : r
    ));
  }, [registros, onChange]);

  // Memoizamos el cálculo total
  const totalPeso = useMemo(() =>
    registros.reduce((sum, r) => sum + (r.peso || 0), 0),
    [registros]);

  const isCompact = viewMode === 'COMPACTA';

  return (
    <div className={`${isCompact ? 'space-y-3' : 'space-y-4'} ${isCompact ? 'p-3' : 'p-6'} glass-panel rounded-2xl`}>
      {/* Header Section */}
      <div className="flex items-center justify-between mb-2">
        <h3 className={`font-bold ${isCompact ? 'text-base' : 'text-xl'} text-white tracking-tight`}>
          Control de Pesos Brutos
        </h3>
        <div className="flex items-center gap-2">
          {registros.length > 0 && (
            <button
              type="button"
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isEditMode
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
            >
              {isEditMode ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Finalizar</span>
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4" />
                  <span>Editar</span>
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={agregarRegistro}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 text-sm font-semibold hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Agregar Peso
          </button>
        </div>
      </div>

      {/* List Section */}
      {registros.length === 0 ? (
        <div className="text-center py-10 text-gray-400 border-2 border-dashed border-white/10 rounded-xl bg-white/5">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
            <Camera className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-sm font-medium text-gray-300">No hay registros de peso bruto</p>
          <p className="text-xs mt-1 text-gray-500">Haz clic en "Agregar Peso" para comenzar</p>
        </div>
      ) : (
        <div className={isCompact ? 'grid grid-cols-2 md:grid-cols-3 gap-3' : 'space-y-4'}>
          {registros.map((registro, index) => (
            <PesoItem
              key={registro.id}
              index={index}
              registro={registro}
              isEditMode={isEditMode}
              isCompact={isCompact}
              isUploading={isPhotoUploading(registro.id)}
              isDeleting={deletingIds.has(registro.id)}
              onUpdate={actualizarPeso}
              onDelete={manejarEliminacion}
              onPhotoCapture={onPhotoCapture}
              analysisId={analysisId}
              forceGalleryMode={forceGalleryMode}
            />
          ))}
        </div>
      )}

      {/* Footer/Totals Section */}
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
}

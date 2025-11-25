'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Edit2, Check } from 'lucide-react';
import {
  DEFECTOS_ENTERO,
  DEFECTOS_COLA,
  DEFECTOS_VALOR_AGREGADO,
  DEFECTO_LABELS,
  ProductType
} from '@/lib/types';

interface DefectItem {
  key: string;
  label: string;
  quantity: number | '';
}

interface DefectSelectorProps {
  productType: ProductType;
  selectedDefects: { [key: string]: number };
  onDefectsChange: (defects: { [key: string]: number }) => void;
}

export default function DefectSelector({
  productType,
  selectedDefects,
  onDefectsChange
}: DefectSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedItems, setSelectedItems] = useState<DefectItem[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Obtener la lista de defectos según el tipo de producto
  const getDefectosForProductType = () => {
    switch (productType) {
      case 'ENTERO': return DEFECTOS_ENTERO;
      case 'COLA': return DEFECTOS_COLA;
      case 'VALOR_AGREGADO': return DEFECTOS_VALOR_AGREGADO;
      default: return [];
    }
  };

  // Helper para normalizar texto (quitar tildes y convertir a minúsculas)
  const normalizeText = (text: string) => {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  // Filtrar defectos disponibles (no seleccionados aún)
  const availableDefects = getDefectosForProductType().filter(
    defecto => !selectedItems.some(item => item.key === defecto)
  );

  // Filtrar sugerencias basadas en el término de búsqueda (ignorando tildes)
  const filteredSuggestions = availableDefects.filter(defecto => {
    const label = DEFECTO_LABELS[defecto] || '';
    const normalizedLabel = normalizeText(label);
    const normalizedSearch = normalizeText(searchTerm);
    return normalizedLabel.includes(normalizedSearch);
  });

  // Sincronizar con el estado externo solo cuando hay cambios reales
  useEffect(() => {
    const newSelectedDefects: { [key: string]: number } = {};
    selectedItems.forEach(item => {
      // Incluir TODOS los defectos, incluso con cantidad 0 o vacía
      // Convertir vacío ('') a 0
      const quantity = item.quantity === '' ? 0 : item.quantity;
      newSelectedDefects[item.key] = quantity;
    });

    // Comparar con el estado actual para evitar bucles
    const currentDefects = selectedDefects || {};
    const hasChanges =
      Object.keys(newSelectedDefects).length !== Object.keys(currentDefects).length ||
      Object.keys(newSelectedDefects).some(key => newSelectedDefects[key] !== currentDefects[key]);

    if (hasChanges) {
      onDefectsChange(newSelectedDefects);
    }
  }, [selectedItems, onDefectsChange, selectedDefects]);

  // Cargar defectos existentes SOLO al montar el componente
  // No incluir selectedDefects en dependencias para evitar loop infinito
  useEffect(() => {
    const existingItems: DefectItem[] = Object.entries(selectedDefects).map(([key, quantity]) => ({
      key,
      label: DEFECTO_LABELS[key] || key,
      quantity
    }));
    setSelectedItems(existingItems);
  }, []); // Solo ejecutar al montar

  // Manejadores de eventos
  const handleAddDefect = (key: string) => {
    const label = DEFECTO_LABELS[key] || key;
    const newItem: DefectItem = { key, label, quantity: '' };
    setSelectedItems([...selectedItems, newItem]);
    setSearchTerm('');
    setShowSuggestions(false);
  };

  const handleRemoveDefect = (key: string) => {
    setSelectedItems(selectedItems.filter(item => item.key !== key));
  };

  const handleQuantityChange = (key: string, value: string) => {
    const numValue = value === '' ? '' : parseInt(value);
    if (value !== '' && isNaN(numValue as number)) return;

    setSelectedItems(selectedItems.map(item =>
      item.key === key ? { ...item, quantity: numValue as number | '' } : item
    ));
  };

  return (
    <div className="space-y-4">
      {/* Buscador de Defectos */}
      <div className="relative" ref={searchInputRef as any}>
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Buscar defecto..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Plus className="w-4 h-4" />
          </div>
        </div>

        {/* Lista de Sugerencias */}
        {showSuggestions && (searchTerm || availableDefects.length > 0) && (
          <div className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto">
            {filteredSuggestions.length > 0 ? (
              <div className="p-1.5">
                {filteredSuggestions.map((defecto) => (
                  <button
                    key={defecto}
                    onClick={() => handleAddDefect(defecto)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 text-sm text-slate-700 transition-colors flex items-center justify-between group"
                  >
                    <span>{DEFECTO_LABELS[defecto] || defecto}</span>
                    <Plus className="w-4 h-4 text-slate-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-slate-400">
                No se encontraron defectos
              </div>
            )}
          </div>
        )}

        {/* Overlay para cerrar sugerencias al hacer click fuera */}
        {showSuggestions && (
          <div
            className="fixed inset-0 z-0"
            onClick={() => setShowSuggestions(false)}
          />
        )}
      </div>

      {/* Lista de defectos seleccionados */}
      <div className="space-y-3">
        {selectedItems.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm group hover:border-blue-300 transition-all"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-700 truncate" title={item.label}>
                {item.label}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                <span className="text-xs font-medium text-slate-500 uppercase">Cant:</span>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleQuantityChange(item.key, e.target.value)}
                  placeholder="0"
                  className="w-12 bg-transparent text-sm font-semibold text-slate-900 text-right focus:outline-none"
                  min="0"
                />
              </div>

              <button
                onClick={() => handleRemoveDefect(item.key)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="Eliminar defecto"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {/* Mensaje cuando no hay defectos */}
        {selectedItems.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <div className="text-sm font-medium text-slate-500">No hay defectos agregados</div>
            <div className="text-xs text-slate-400 mt-1">Usa el buscador para agregar defectos</div>
          </div>
        )}
      </div>
    </div>
  );
}
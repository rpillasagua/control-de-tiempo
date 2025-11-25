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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo cargar al montar

  const handleAddDefect = (defectoKey: string) => {
    const label = DEFECTO_LABELS[defectoKey] || defectoKey;
    const newItem: DefectItem = {
      key: defectoKey,
      label,
      quantity: '' // Empezar con campo vacío en lugar de 0
    };

    setSelectedItems(prev => [...prev, newItem]);
    setSearchTerm('');
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  };

  const handleRemoveDefect = (defectoKey: string) => {
    setSelectedItems(prev => prev.filter(item => item.key !== defectoKey));
  };

  const handleQuantityChange = (defectoKey: string, value: string) => {
    setSelectedItems(prev =>
      prev.map(item => {
        if (item.key === defectoKey) {
          // Si está vacío, permitir campo vacío
          if (value === '') {
            return { ...item, quantity: '' };
          }
          // Convertir a número y asegurar que no sea negativo
          const numValue = parseInt(value);
          return { ...item, quantity: isNaN(numValue) ? 0 : Math.max(0, numValue) };
        }
        return item;
      })
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredSuggestions.length > 0) {
      e.preventDefault();
      handleAddDefect(filteredSuggestions[0]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda - MODERNIZADA */}
      <div className="relative">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar defecto para agregar..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={handleKeyDown}
            className="w-full px-5 py-4 rounded-[14px] text-base font-[500] border-2 transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
              borderColor: '#CBD5E1',
              color: '#1E293B'
            }}
          />
        </div>

        {/* Sugerencias de autocompletado - MODERNIZADAS */}
        {showSuggestions && searchTerm && (
          <div
            className="absolute z-10 w-full mt-2 rounded-[14px] shadow-lg max-h-48 overflow-y-auto border-2 border-blue-200"
            style={{
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
              boxShadow: '0 8px 16px -4px rgba(59, 130, 246, 0.2)'
            }}
          >
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((defecto) => (
                <button
                  key={defecto}
                  type="button"
                  onClick={() => handleAddDefect(defecto)}
                  className="w-full px-4 py-3 text-left font-[500] hover:bg-blue-50 flex items-center gap-2 first:rounded-t-[14px] last:rounded-b-[14px] transition-colors"
                  style={{ color: '#1E293B' }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
                    }}
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                  <span>{DEFECTO_LABELS[defecto]}</span>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-slate-500 text-sm">
                No se encontraron defectos
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lista de defectos seleccionados */}
      {selectedItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-700">Defectos Agregados:</h4>
            <button
              type="button"
              onClick={() => setIsEditMode(!isEditMode)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-sm font-[600] transition-all duration-300 hover:scale-105"
              style={
                isEditMode
                  ? {
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    boxShadow: '0 6px 12px -3px rgba(16, 185, 129, 0.4)',
                    color: 'white'
                  }
                  : {
                    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                    boxShadow: '0 6px 12px -3px rgba(59, 130, 246, 0.4)',
                    color: 'white'
                  }
              }
              title={isEditMode ? 'Finalizar edición' : 'Editar defectos'}
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
          </div>
          <div className="space-y-3">
            {selectedItems.map((item) => (
              <div
                key={item.key}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-[14px] border-2"
                style={{
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
                  borderColor: '#E2E8F0',
                  boxShadow: '0 2px 6px -1px rgba(0, 0, 0, 0.08)'
                }}
              >
                <div className="flex-1 min-w-0">
                  <span className="text-slate-900 font-[600] block truncate">{item.label}</span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <label className="text-sm text-slate-600 font-[500] whitespace-nowrap">Cantidad:</label>
                  <input
                    type="number"
                    min="0"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(item.key, e.target.value)}
                    placeholder="0"
                    className="w-20 sm:w-24 px-4 py-2.5 rounded-[10px] text-center font-[600] border-2 focus:outline-none transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)',
                      borderColor: '#CBD5E1',
                      color: '#1E293B'
                    }}
                  />
                </div>

                {isEditMode && (
                  <button
                    type="button"
                    onClick={() => handleRemoveDefect(item.key)}
                    className="p-2.5 rounded-[10px] transition-all duration-300 hover:scale-110"
                    style={{
                      background: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
                      color: '#DC2626'
                    }}
                    title="Eliminar defecto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensaje cuando no hay defectos */}
      {selectedItems.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <div className="text-sm font-[500]">No hay defectos agregados</div>
          <div className="text-xs mt-1">Busca y selecciona defectos para agregarlos</div>
        </div>
      )}
    </div>
  );
}
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

  // Filtrar defectos disponibles (no seleccionados aún)
  const availableDefects = getDefectosForProductType().filter(
    defecto => !selectedItems.some(item => item.key === defecto)
  );

  // Filtrar sugerencias basadas en el término de búsqueda
  const filteredSuggestions = availableDefects.filter(defecto =>
    DEFECTO_LABELS[defecto]?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      {/* Barra de búsqueda */}
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
            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Sugerencias de autocompletado */}
        {showSuggestions && searchTerm && (
          <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((defecto) => (
                <button
                  key={defecto}
                  type="button"
                  onClick={() => handleAddDefect(defecto)}
                  className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center gap-2 first:rounded-t-lg last:rounded-b-lg"
                >
                  <Plus className="w-4 h-4 text-blue-400" />
                  <span>{DEFECTO_LABELS[defecto]}</span>
                </button>
              ))
            ) : (
              <div className="px-4 py-2 text-gray-400 text-sm">
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
            <h4 className="text-sm font-medium text-gray-300">Defectos Agregados:</h4>
            <button
              type="button"
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isEditMode
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
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
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-gray-800 border border-gray-600 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-white font-medium block truncate">{item.label}</span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <label className="text-sm text-gray-300 whitespace-nowrap">Cantidad:</label>
                  <input
                    type="number"
                    min="0"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(item.key, e.target.value)}
                    placeholder="0"
                    className="w-20 sm:w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {isEditMode && (
                  <button
                    type="button"
                    onClick={() => handleRemoveDefect(item.key)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
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
        <div className="text-center py-8 text-gray-400">
          <div className="text-sm">No hay defectos agregados</div>
          <div className="text-xs mt-1">Busca y selecciona defectos para agregarlos</div>
        </div>
      )}
    </div>
  );
}
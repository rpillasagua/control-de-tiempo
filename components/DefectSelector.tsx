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

  const getDefectosForProductType = () => {
    switch (productType) {
      case 'ENTERO': return DEFECTOS_ENTERO;
      case 'COLA': return DEFECTOS_COLA;
      case 'VALOR_AGREGADO': return DEFECTOS_VALOR_AGREGADO;
      default: return [];
    }
  };

  const normalizeText = (text: string) => {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  const availableDefects = getDefectosForProductType().filter(
    defecto => !selectedItems.some(item => item.key === defecto)
  );

  const filteredSuggestions = availableDefects.filter(defecto => {
    const label = DEFECTO_LABELS[defecto] || '';
    const normalizedLabel = normalizeText(label);
    const normalizedSearch = normalizeText(searchTerm);
    return normalizedLabel.includes(normalizedSearch);
  });

  useEffect(() => {
    const newSelectedDefects: { [key: string]: number } = {};
    selectedItems.forEach(item => {
      const quantity = item.quantity === '' ? 0 : item.quantity;
      newSelectedDefects[item.key] = quantity;
    });

    const currentDefects = selectedDefects || {};
    const hasChanges =
      Object.keys(newSelectedDefects).length !== Object.keys(currentDefects).length ||
      Object.keys(newSelectedDefects).some(key => newSelectedDefects[key] !== currentDefects[key]);

    if (hasChanges) {
      onDefectsChange(newSelectedDefects);
    }
  }, [selectedItems, onDefectsChange, selectedDefects]);

  useEffect(() => {
    if (Object.keys(selectedDefects).length > 0 && selectedItems.length === 0) {
      const existingItems: DefectItem[] = Object.entries(selectedDefects).map(([key, quantity]) => ({
        key,
        label: DEFECTO_LABELS[key] || key,
        quantity
      }));
      setSelectedItems(existingItems);
    }
  }, []);

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
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <span className="text-2xl">🐛</span>
          Defectos de Calidad
        </h3>
        {selectedItems.length > 0 && (
          <button
            type="button"
            onClick={() => setIsEditMode(!isEditMode)}
            className={`
              px-4 py-2 rounded-xl text-sm font-bold cursor-pointer flex justify-center items-center gap-2 
              transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md
              ${isEditMode
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-2 border-green-400 hover:from-green-600 hover:to-emerald-700'
                : 'bg-gradient-to-r from-red-500 to-rose-600 text-white border-2 border-red-400 hover:from-red-600 hover:to-rose-700'
              }
            `}
          >
            {isEditMode ? (
              <>
                <Check className="w-4 h-4" />
                Listo
              </>
            ) : (
              <>
                <Edit2 className="w-4 h-4" />
                Editar
              </>
            )}
          </button>
        )}
      </div>

      <div className="relative" ref={searchInputRef as any}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Buscar defecto para agregar..."
          className="w-full bg-white border border-slate-200 rounded-xl px-4 h-12 text-slate-900 placeholder-slate-400 transition-all duration-200 outline-none text-base shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300"
        />

        {showSuggestions && searchTerm.trim() !== '' && (
          <div className="relative z-20 w-full mt-2 bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
            {filteredSuggestions.length > 0 ? (
              <div className="p-1.5 space-y-0.5">
                {filteredSuggestions.slice(0, 5).map((defecto) => (
                  <button
                    key={defecto}
                    onClick={() => handleAddDefect(defecto)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-blue-50 text-sm text-slate-700 hover:text-blue-700 transition-all flex items-center justify-between group"
                  >
                    <span className="font-medium">{DEFECTO_LABELS[defecto] || defecto}</span>
                    <Plus className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-all" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-sm text-slate-500 font-medium">No se encontraron defectos</p>
                <p className="text-xs text-slate-400 mt-1">Intenta con otro término</p>
              </div>
            )}
          </div>
        )}

        {showSuggestions && (
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowSuggestions(false)}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 mt-6">
        {selectedItems.map((item) => (
          <div
            key={item.key}
            className={`
              relative flex items-center gap-4 p-4 bg-white rounded-xl border shadow-sm transition-all duration-300
              ${isEditMode ? 'border-red-300 bg-red-50/50 shadow-red-100/50 pr-12' : 'border-slate-200 hover:border-blue-400 hover:shadow-md'}
            `}
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800 truncate" title={item.label}>
                {item.label}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-2 rounded-xl border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-sm">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Cant</span>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleQuantityChange(item.key, e.target.value)}
                  placeholder="0"
                  className="w-14 bg-transparent text-base font-bold text-slate-900 text-right focus:outline-none"
                  min="0"
                  disabled={isEditMode}
                />
              </div>
            </div>

            {isEditMode && (
              <button
                onClick={() => handleRemoveDefect(item.key)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md border border-red-400 rounded-full hover:from-red-600 hover:to-red-700 hover:shadow-lg transition-all animate-in fade-in zoom-in duration-200"
                title="Eliminar defecto"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        {selectedItems.length === 0 && (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Plus className="w-6 h-6 text-slate-400" />
            </div>
            <div className="text-sm font-medium text-slate-600">No hay defectos registrados</div>
            <div className="text-xs text-slate-400 mt-1">Usa el buscador para agregar defectos encontrados</div>
          </div>
        )}
      </div>
    </div>
  );
}
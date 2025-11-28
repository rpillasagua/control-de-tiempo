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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[22px] font-[800] text-[#111827] flex items-center gap-2">
          <span className="text-2xl">🐛</span>
          Defectos de Calidad
        </h3>
        {selectedItems.length > 0 && (
          <button
            type="button"
            onClick={() => setIsEditMode(!isEditMode)}
            className={`
              px-4 py-3 rounded-[12px] text-[14px] font-[600] cursor-pointer flex justify-center items-center gap-2 
              transition-all active:scale-[0.98] border-none
              ${isEditMode
                ? 'bg-[#10B981] text-white hover:bg-[#059669]'
                : 'bg-[#EF4444] text-white hover:bg-[#DC2626]'
              }
            `}
            style={{ boxShadow: isEditMode ? '0 4px 12px rgba(16, 185, 129, 0.3)' : '0 4px 12px rgba(239, 68, 68, 0.3)' }}
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
        <div className="flex items-center bg-[#F3F4F6] rounded-[12px] px-[16px] py-[12px] border-2 border-transparent transition-all focus-within:bg-white focus-within:border-[#2563EB] focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]">
          <span className="mr-[10px] text-[18px]">🔍</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Buscar defecto para agregar..."
            className="border-none bg-transparent w-full text-[15px] text-[#1F2937] outline-none font-[500] placeholder-[#9CA3AF]"
          />
        </div>

        {showSuggestions && searchTerm.trim() !== '' && (
          <div className="relative z-20 w-full mt-2 bg-white rounded-[12px] border border-gray-100 max-h-60 overflow-y-auto" style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
            {filteredSuggestions.length > 0 ? (
              <div className="p-2 space-y-1">
                {filteredSuggestions.slice(0, 5).map((defecto) => (
                  <button
                    key={defecto}
                    onClick={() => handleAddDefect(defecto)}
                    className="w-full text-left px-3 py-2.5 rounded-[8px] hover:bg-blue-50 text-[14px] text-[#374151] hover:text-[#2563EB] transition-all flex items-center justify-between group font-[500]"
                  >
                    <span>{DEFECTO_LABELS[defecto] || defecto}</span>
                    <Plus className="w-4 h-4 text-gray-300 group-hover:text-[#2563EB] transition-all" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-[14px] text-[#6B7280] font-[500]">No se encontraron defectos</p>
                <p className="text-[12px] text-[#9CA3AF] mt-1">Intenta con otro término</p>
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

      <div className="grid grid-cols-1 gap-3 mt-4">
        {selectedItems.map((item) => (
          <div
            key={item.key}
            className={`
              relative flex items-center gap-4 p-4 rounded-[12px] border transition-all
              ${isEditMode ? 'border-red-200 bg-red-50 pr-12' : 'border-gray-100 bg-white hover:border-blue-200'}
            `}
          >
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-[600] text-[#374151] truncate" title={item.label}>
                {item.label}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-[#F3F4F6] px-4 py-2 rounded-[10px] border-2 border-transparent focus-within:bg-white focus-within:border-[#2563EB] focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] transition-all">
                <span className="text-[11px] font-[600] text-[#6B7280] uppercase tracking-wide">Cant</span>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleQuantityChange(item.key, e.target.value)}
                  placeholder="0"
                  className="w-14 bg-transparent text-[15px] font-[600] text-[#1F2937] text-right focus:outline-none"
                  min="0"
                  disabled={isEditMode}
                />
              </div>
            </div>

            {isEditMode && (
              <button
                onClick={() => handleRemoveDefect(item.key)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-[#EF4444] text-white border-none rounded-full hover:bg-[#DC2626] transition-all"
                style={{ boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}
                title="Eliminar defecto"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        {selectedItems.length === 0 && (
          <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-[12px] bg-gray-50">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Plus className="w-6 h-6 text-gray-400" />
            </div>
            <div className="text-[14px] font-[600] text-[#6B7280]">No hay defectos registrados</div>
            <div className="text-[12px] text-[#9CA3AF] mt-1">Usa el buscador para agregar defectos encontrados</div>
          </div>
        )}
      </div>
    </div>
  );
}
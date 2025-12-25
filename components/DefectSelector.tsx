import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Edit2, Check } from 'lucide-react';
import {
  ProductType,
  DEFECTOS_ENTERO,
  DEFECTOS_COLA,
  DEFECTOS_VALOR_AGREGADO,
  DEFECTO_LABELS
} from '@/lib/types';
import { DefectCalculationResult } from '@/hooks/useDefectCalculation';

interface DefectItem {
  key: string;
  label: string;
  quantity: number | '';
}

interface DefectSelectorProps {
  productType: ProductType;
  selectedDefects: { [key: string]: number };
  onDefectsChange: (defects: { [key: string]: number }) => void;
  validationResults?: DefectCalculationResult;
  readOnly?: boolean;
}

export default function DefectSelector({
  productType,
  selectedDefects,
  onDefectsChange,
  validationResults,
  readOnly = false
}: DefectSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedItems, setSelectedItems] = useState<DefectItem[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load selected defects into local state
  useEffect(() => {
    const items: DefectItem[] = Object.entries(selectedDefects).map(([key, value]) => ({
      key,
      label: DEFECTO_LABELS[key as keyof typeof DEFECTO_LABELS] || key,
      quantity: value
    }));
    setSelectedItems(items);
  }, [selectedDefects]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDefectOptions = () => {
    let options: readonly string[] = [];
    if (productType === 'ENTERO') options = DEFECTOS_ENTERO;
    else if (productType === 'COLA') options = DEFECTOS_COLA;
    else if (productType === 'VALOR_AGREGADO') options = DEFECTOS_VALOR_AGREGADO;

    return options.filter(key =>
      !selectedItems.some(item => item.key === key) &&
      (DEFECTO_LABELS[key as keyof typeof DEFECTO_LABELS] || key).toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleAddDefect = (key: string) => {
    if (readOnly) return;
    const newDefects = { ...selectedDefects, [key]: 0 };
    onDefectsChange(newDefects);
    setSearchTerm('');
    setShowSuggestions(false);
  };

  const handleRemoveDefect = (key: string) => {
    if (readOnly) return;
    const { [key]: _, ...rest } = selectedDefects;
    onDefectsChange(rest);
    if (Object.keys(rest).length === 0) setIsEditMode(false);
  };

  const handleQuantityChange = (key: string, value: string) => {
    if (readOnly) return;
    const numValue = value === '' ? 0 : parseInt(value, 10);
    if (!isNaN(numValue)) {
      onDefectsChange({ ...selectedDefects, [key]: numValue });
    }
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex items-center justify-between mb-4">
          {/* Placeholder for future header if needed */}
          <div />

          {selectedItems.length > 0 && (
            <button
              type="button"
              onClick={() => setIsEditMode(!isEditMode)}
              className={`p-2 rounded-xl transition-all ${isEditMode ? 'bg-red-500/20 text-red-300' : 'bg-white/5 text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
              title={isEditMode ? "Terminar edición" : "Editar lista"}
            >
              {isEditMode ? <Check className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      )}

      {!readOnly && (
        <div className="relative" ref={searchInputRef}>
          <div className="flex items-center border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Buscar defecto..."
              className="w-full px-4 py-3 outline-none text-gray-700 placeholder-gray-400"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setShowSuggestions(false);
                }}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {showSuggestions && searchTerm && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
              {getDefectOptions().map(key => (
                <button
                  key={key}
                  onClick={() => handleAddDefect(key)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center justify-between group"
                >
                  <span className="text-gray-700 group-hover:text-blue-700 font-medium">
                    {DEFECTO_LABELS[key as keyof typeof DEFECTO_LABELS] || key}
                  </span>
                  <Plus className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                </button>
              ))}
              {getDefectOptions().length === 0 && (
                <div className="px-4 py-3 text-gray-400 text-sm text-center italic">
                  No se encontraron defectos
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 mt-4">
        {selectedItems.map((item) => {
          // Check if this specific defect is forbidden based on validation results
          const itemResult = validationResults?.defectResults?.[item.key];
          const isForbidden = itemResult?.isForbidden;

          return (
            <div
              key={item.key}
              className={`
                relative flex items-center justify-between gap-3 p-3 rounded-[12px] border transition-all
                ${isEditMode
                  ? 'border-red-200 bg-red-50 pr-10'
                  : isForbidden
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-100 bg-white hover:border-blue-200'}
              `}
            >
              <div className="flex-1 min-w-0 mr-2">
                <span className={`block text-[14px] font-[600] leading-tight ${isForbidden ? 'text-red-700' : 'text-[#374151]'}`}>
                  {item.label}
                </span>
                {isForbidden && (
                  <span className="text-[10px] text-red-500 font-medium mt-1 block">
                    ⛔ Defecto no permitido
                  </span>
                )}

                {/* Defect Percentage and Validation */}
                {itemResult && !isForbidden && (
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px]">
                    <span className="font-bold text-slate-700 bg-slate-100 px-1.5 rounded">
                      {itemResult.percentage.toFixed(2)}%
                    </span>
                    <span className={`font-medium ${itemResult.isValid ? 'text-green-600' : 'text-red-500'}`}>
                      {itemResult.message}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-shrink-0">
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleQuantityChange(item.key, e.target.value)}
                  placeholder="0"
                  className="w-[50px] bg-transparent text-[16px] font-[700] text-[#1F2937] text-center focus:outline-none border-b-2 border-gray-100 focus:border-[#2563EB] transition-all placeholder-gray-300 py-1"
                  min="0"
                  disabled={isEditMode || readOnly}
                />
              </div>

              {isEditMode && !readOnly && (
                <button
                  onClick={() => handleRemoveDefect(item.key)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-[#EF4444] text-white border-none rounded-full hover:bg-[#DC2626] transition-all"
                  style={{ boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}
                  title="Eliminar defecto"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}

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

      {validationResults?.isApplicable && (
        <div className={`
              mt-4 p-3 rounded-[12px] border flex justify-between items-center
              ${validationResults.totalDefectsValidation.isValid
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'}
            `}>
          <div className="flex flex-col">
            <span className="text-[14px] font-[600] text-gray-700">Defectos Totales</span>
            <span className="text-[11px] text-gray-500">
              Base: {validationResults.totalPieces} pzs | Límite: {validationResults.totalDefectsValidation.limit}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[18px] font-[800] ${validationResults.totalDefectsValidation.isValid ? 'text-green-700' : 'text-red-700'
              }`}>
              {validationResults.totalDefectsPercentage.toFixed(2)}%
            </span>
            {validationResults.totalDefectsValidation.isValid ? (
              <Check className="w-5 h-5 text-green-600" />
            ) : (
              <X className="w-5 h-5 text-red-600" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Check } from 'lucide-react';
import { Search } from 'lucide-react';
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
  isEditModeExternal?: boolean;
  onToggleEditMode?: () => void;
}

export default function DefectSelector({
  productType,
  selectedDefects,
  onDefectsChange,
  validationResults,
  readOnly = false,
  isEditModeExternal,
  onToggleEditMode
}: DefectSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedItems, setSelectedItems] = useState<DefectItem[]>([]);
  const [internalEditMode, setInternalEditMode] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = isEditModeExternal !== undefined ? isEditModeExternal : internalEditMode;
  const setIsEditMode = (val: boolean) => {
    if (onToggleEditMode) onToggleEditMode();
    else setInternalEditMode(val);
  };

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
        <div className="relative" ref={searchInputRef}>
          <div className="flex items-center bg-[#F3F4F6] rounded-[12px] px-[16px] py-[12px] border-2 border-transparent transition-all focus-within:bg-white focus-within:border-[#2563EB] focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]">
            <Search className="mr-[10px] w-[18px] h-[18px] text-gray-500" />
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

          {showSuggestions && searchTerm && (
            <div className="relative z-20 w-full mt-2 bg-white rounded-[12px] border border-gray-100 max-h-60 overflow-y-auto" style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
              {getDefectOptions().length > 0 ? (
                <div className="p-2 space-y-1">
                  {getDefectOptions().map(key => (
                    <button
                      key={key}
                      onClick={() => handleAddDefect(key)}
                      className="w-full text-left px-3 py-2.5 rounded-[8px] hover:bg-blue-50 text-[14px] text-[#374151] hover:text-[#2563EB] transition-all flex items-center justify-between group font-[500]"
                    >
                      <span className="text-gray-700 group-hover:text-blue-700 font-medium">
                        {DEFECTO_LABELS[key as keyof typeof DEFECTO_LABELS] || key}
                      </span>
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
      )}

      <div className="grid grid-cols-1 gap-3 mt-4">
        {selectedItems.map((item) => {
          // Validation Logic
          const itemResult = validationResults?.defectResults?.[item.key];
          const isForbidden = itemResult?.isForbidden;
          const isValid = itemResult?.isValid ?? true;

          return (
            <div
              key={item.key}
              className={`
                relative flex items-center justify-between gap-3 p-3 rounded-xl border transition-all
                ${isEditMode ? 'border-red-200 bg-red-50 pr-10' : ''}
                ${!isEditMode && (!isValid || isForbidden) ? 'border-red-600 bg-red-100' : ''}
                ${!isEditMode && isValid && !isForbidden ? 'border-gray-100 bg-white hover:border-blue-200' : ''}
              `}
            >


              <div className="flex-1 min-w-0 mr-2">
                <div
                  className="text-[14px] font-[600] break-words leading-tight transition-colors duration-200"
                  title={item.label}
                  style={{ color: (!isValid || isForbidden) ? '#dc2626' : '#374151' }}
                >
                  {item.label}
                  {isForbidden && (
                    <span className="text-[10px] text-red-500 font-medium mt-1 block">
                      ⛔ Defecto no permitido
                    </span>
                  )}
                  {itemResult && !isForbidden && (
                    <div className="text-[11px] font-normal mt-0.5 flex items-center gap-1">
                      <span className={isValid ? 'text-green-600' : 'text-red-600'}>
                        {itemResult.percentage.toFixed(2)}%
                      </span>
                      {isValid ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <X className="w-3 h-3 text-red-500" />
                      )}
                      <span className="text-gray-400 text-[10px]">
                        {itemResult.message.includes('OK') || itemResult.message.includes('Excede')
                          ? `(${itemResult.limitDisplay})`
                          : itemResult.message}
                      </span>
                    </div>
                  )}
                </div>
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

              {
                isEditMode && !readOnly && (
                  <button
                    onClick={() => handleRemoveDefect(item.key)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-[#EF4444] text-white border-none rounded-full hover:bg-[#DC2626] transition-all"
                    style={{ boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}
                    title="Eliminar defecto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )
              }
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

      {
        validationResults?.isApplicable && (
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
        )
      }
    </div >
  );
}
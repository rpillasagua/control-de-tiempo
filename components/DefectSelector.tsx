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
}

export default function DefectSelector({
  productType,
  selectedDefects,
  onDefectsChange,
  validationResults
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
    (defecto: string) => !selectedItems.some(item => item.key === defecto)
  );

  const filteredSuggestions = availableDefects.filter((defecto: string) => {
    const label = DEFECTO_LABELS[defecto] || '';
    const normalizedLabel = normalizeText(label);
    const normalizedSearch = normalizeText(searchTerm);
    return normalizedLabel.includes(normalizedSearch);
  });

  // Sincronizar cambios del padre hacia local (ej. cambiar de análisis)
  useEffect(() => {
    // Obtener el orden canónico de los defectos
    const canonicalDefects = getDefectosForProductType();

    // Crear un mapa de los defectos seleccionados para acceso rápido
    const selectedMap = new Map(Object.entries(selectedDefects));

    const newItems: DefectItem[] = [];

    // 1. Agregar defectos en el orden canónico
    canonicalDefects.forEach(key => {
      if (selectedMap.has(key)) {
        const quantity = selectedMap.get(key);
        newItems.push({
          key,
          label: DEFECTO_LABELS[key] || key,
          quantity: quantity || ''
        });
        selectedMap.delete(key); // Remover para saber cuáles sobran
      }
    });

    // 2. Agregar cualquier defecto extra que no esté en la lista canónica (legacy/custom)
    selectedMap.forEach((quantity, key) => {
      newItems.push({
        key,
        label: DEFECTO_LABELS[key] || key,
        quantity: quantity === 0 ? '' : quantity
      });
    });

    // Verificar si hay cambios reales para evitar re-renders infinitos
    const isDifferent =
      newItems.length !== selectedItems.length ||
      newItems.some((item, index) => {
        const current = selectedItems[index];
        return !current || item.key !== current.key || (item.quantity !== current.quantity && item.quantity !== '' && current.quantity !== 0);
      });

    if (isDifferent) {
      setSelectedItems(newItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDefects]);

  const notifyParent = (items: DefectItem[]) => {
    const newSelectedDefects: { [key: string]: number } = {};
    items.forEach(item => {
      const quantity = item.quantity === '' ? 0 : item.quantity;
      newSelectedDefects[item.key] = quantity;
    });
    onDefectsChange(newSelectedDefects);
  };

  const handleAddDefect = (key: string) => {
    const label = DEFECTO_LABELS[key] || key;
    const newItem: DefectItem = { key, label, quantity: '' };
    const newItems = [...selectedItems, newItem];
    setSelectedItems(newItems);
    setSearchTerm('');
    setShowSuggestions(false);
    notifyParent(newItems);
  };

  const handleRemoveDefect = (key: string) => {
    const newItems = selectedItems.filter(item => item.key !== key);
    setSelectedItems(newItems);
    notifyParent(newItems);
  };

  const handleQuantityChange = (key: string, value: string) => {
    const numValue = value === '' ? '' : parseInt(value);
    if (value !== '' && isNaN(numValue as number)) return;

    const newItems = selectedItems.map(item =>
      item.key === key ? { ...item, quantity: numValue as number | '' } : item
    );
    setSelectedItems(newItems);
    notifyParent(newItems);
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
                {filteredSuggestions.slice(0, 5).map((defecto: string) => (
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
        {selectedItems.map((item) => {
          const result = validationResults?.defectResults[item.key];
          const isForbidden = result?.isForbidden;
          const isValid = result?.isValid ?? true;

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
                <div className="text-[14px] font-[600] text-[#374151] break-words leading-tight" title={item.label}>
                  {item.label}
                  {result && (
                    <div className="text-[11px] font-normal mt-0.5 flex items-center gap-1">
                      <span className={isValid ? 'text-green-600' : 'text-red-600'}>
                        {result.percentage.toFixed(2)}%
                      </span>
                      {isValid ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <X className="w-3 h-3 text-red-500" />
                      )}
                      <span className="text-gray-400 text-[10px]">
                        ({result.limitDisplay})
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
                  disabled={isEditMode}
                />
              </div>

              {isEditMode && (
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
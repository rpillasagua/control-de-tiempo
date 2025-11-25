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
      onClick={() => handleRemoveDefect(item.key)
  }
                    className = "p-2.5 rounded-[10px] transition-all duration-300 hover:scale-110"
                    style = {{
    background: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
    color: '#DC2626'
  }}
title = "Eliminar defecto"
  >
  <X className="w-4 h-4" />
                  </button >
                )}
              </div >
            ))}
          </div >
        </div >
      )}

{/* Mensaje cuando no hay defectos */ }
{
  selectedItems.length === 0 && (
    <div className="text-center py-8 text-slate-500">
      <div className="text-sm font-[500]">No hay defectos agregados</div>
      <div className="text-xs mt-1">Busca y selecciona defectos para agregarlos</div>
    </div>
  )
}
    </div >
  );
}
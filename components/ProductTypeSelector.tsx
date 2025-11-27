'use client';

import React, { useState } from 'react';
import { Edit2, Check } from 'lucide-react';
import { ProductType, PRODUCT_TYPE_LABELS } from '@/lib/types';

interface ProductTypeSelectorProps {
  selectedType?: ProductType;
  onSelect: (type: ProductType) => void;
}

export default function ProductTypeSelector({ selectedType, onSelect }: ProductTypeSelectorProps) {
  const [isEditing, setIsEditing] = useState(!selectedType);

  const productTypes: ProductType[] = ['ENTERO', 'COLA', 'VALOR_AGREGADO', 'CONTROL_PESOS'];

  if (selectedType && !isEditing) {
    return (
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="text-3xl">
            {selectedType === 'ENTERO' && '🦐'}
            {selectedType === 'COLA' && '🍤'}
            {selectedType === 'VALOR_AGREGADO' && '📦'}
            {selectedType === 'CONTROL_PESOS' && '⚖️'}
          </div>
          <div>
            <p className="text-sm text-blue-600 font-medium mb-0.5">Tipo de Producto Seleccionado</p>
            <p className="text-xl font-bold text-blue-900">{PRODUCT_TYPE_LABELS[selectedType]}</p>
          </div>
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100 rounded-lg transition-colors border-2 border-blue-300"
        >
          <Edit2 className="h-4 w-4" />
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-[3px] animate-fade-in">
      <style jsx global>{`
        @keyframes floatUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <div
        className="bg-white w-[90%] max-w-[500px] p-[25px] rounded-[24px] relative text-left max-h-[90vh] overflow-y-auto"
        style={{
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          animation: 'floatUp 0.3s ease-out'
        }}
      >
        {/* Título */}
        <h2 className="m-0 text-[22px] font-[800] text-[#111827] text-center">
          {selectedType ? 'Selecciona un nuevo tipo de producto' : '¿Qué tipo de producto vas a descongelar?'}
        </h2>
        <p className="mt-[5px] mb-[25px] text-[14px] text-[#6B7280] text-center">
          {selectedType ? 'Escoge el tipo para continuar' : 'Selecciona el tipo de producto a analizar *'}
        </p>

        {/* Advertencia si está editando */}
        {selectedType && isEditing && (
          <div className="mb-[20px] p-[16px] bg-yellow-50 border-2 border-yellow-200 rounded-[14px]">
            <p className="text-[13px] text-yellow-800 font-[600] m-0">
              ⚠️ Al cambiar el tipo de producto, los defectos registrados se perderán si no son compatibles.
            </p>
          </div>
        )}

        {/* Grid de opciones */}
        <div className="grid grid-cols-2 gap-[12px] mb-[20px]">
          {productTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                onSelect(type);
                setIsEditing(false);
              }}
              className="relative p-[20px] rounded-[16px] border-2 transition-all cursor-pointer"
              style={{
                backgroundColor: selectedType === type ? '#EFF6FF' : '#F3F4F6',
                borderColor: selectedType === type ? '#2563EB' : 'transparent',
                boxShadow: selectedType === type
                  ? '0 4px 12px rgba(37, 99, 235, 0.2)'
                  : '0 2px 4px rgba(0, 0, 0, 0.05)',
              }}
              onMouseEnter={(e) => {
                if (selectedType !== type) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedType !== type) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                }
              }}
            >
              <div className="flex flex-col items-center justify-center text-center">
                <div className="text-[48px] mb-[8px]">
                  {type === 'ENTERO' && '🦐'}
                  {type === 'COLA' && '🍤'}
                  {type === 'VALOR_AGREGADO' && '📦'}
                  {type === 'CONTROL_PESOS' && '⚖️'}
                </div>
                <span
                  className="text-[14px] font-[700] leading-tight"
                  style={{ color: selectedType === type ? '#2563EB' : '#1F2937' }}
                >
                  {PRODUCT_TYPE_LABELS[type]}
                </span>
              </div>

              {selectedType === type && (
                <div
                  className="absolute top-[12px] right-[12px] rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: '#2563EB',
                    width: '24px',
                    height: '24px'
                  }}
                >
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Botón Cancelar */}
        {selectedType && isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="w-full bg-[#F3F4F6] text-[#374151] border-none p-[14px] rounded-[14px] text-[15px] font-[600] cursor-pointer transition-all active:scale-[0.98]"
            style={{
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#E5E7EB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
            }}
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { X, Download, Calendar } from 'lucide-react';
import { getAnalysesByDate, getAnalysesByShift } from '@/lib/analysisService';
import { QualityAnalysis, WorkShift, PRODUCT_TYPE_LABELS, DEFECTO_LABELS } from '@/lib/types';
import ExcelJS from 'exceljs';

interface DailyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Función para obtener fecha local en formato YYYY-MM-DD
const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const DailyReportModal: React.FC<DailyReportModalProps> = ({ isOpen, onClose }) => {
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [isLoading, setIsLoading] = useState(false);
  const [analyses, setAnalyses] = useState<QualityAnalysis[]>([]);
  const [selectedShift, setSelectedShift] = useState<'ALL' | WorkShift>('ALL');

  if (!isOpen) return null;

  const handleGenerateReport = async () => {
    setIsLoading(true);
    console.log(`🔍 Buscando análisis para fecha: ${selectedDate}, Turno: ${selectedShift}`);
    try {
      let data: QualityAnalysis[];

      if (selectedShift === 'ALL') {
        data = await getAnalysesByDate(selectedDate);
      } else {
        data = await getAnalysesByShift(selectedDate, selectedShift);
      }

      console.log(`✅ Encontrados ${data.length} análisis`);
      setAnalyses(data);

      if (data.length === 0) {
        alert(`No se encontraron análisis para la fecha ${selectedDate} y turno ${selectedShift}.`);
      }
    } catch (error: any) {
      console.error('Error al cargar análisis:', error);
      alert(`Error al cargar análisis: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (analyses.length === 0) {
      alert('No hay análisis para exportar');
      return;
    }

    setIsLoading(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Reporte Diario');

      // Título del reporte
      worksheet.mergeCells('A1:M1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `Reporte de Análisis de Calidad - ${selectedDate}`;
      titleCell.font = { size: 16, bold: true };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      titleCell.font = { ...titleCell.font, color: { argb: 'FFFFFFFF' } };

      // Subtítulo con turno
      worksheet.mergeCells('A2:M2');
      const subtitleCell = worksheet.getCell('A2');
      subtitleCell.value = selectedShift === 'ALL'
        ? 'Todos los turnos'
        : selectedShift === 'DIA'
          ? 'Turno Día (7:10 AM - 7:10 PM)'
          : 'Turno Noche (7:10 PM - 7:10 AM)';
      subtitleCell.font = { size: 12, bold: true };
      subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      worksheet.addRow([]);

      // Encabezados
      const headerRow = worksheet.addRow([
        'Hora',
        'Turno',
        'Tipo Producto',
        'Lote',
        'Código',
        'Talla',
        'Peso Bruto',
        'Peso Congelado',
        'Peso Neto',
        'Conteo',
        'Uniformidad Grandes',
        'Uniformidad Pequeños',
        'Total Defectos',
        'Observaciones'
      ]);

      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' }
      };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

      // Agrupar por turno
      const analysesByShift = {
        DIA: analyses.filter(a => a.shift === 'DIA'),
        NOCHE: analyses.filter(a => a.shift === 'NOCHE')
      };

      // Agregar datos por turno
      ['DIA', 'NOCHE'].forEach((shift) => {
        const shiftAnalyses = analysesByShift[shift as WorkShift];

        if (shiftAnalyses.length > 0) {
          // Separador de turno
          const separatorRow = worksheet.addRow([shift === 'DIA' ? 'TURNO DÍA' : 'TURNO NOCHE']);
          worksheet.mergeCells(`A${separatorRow.number}:N${separatorRow.number}`);
          separatorRow.font = { bold: true, size: 12 };
          separatorRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: shift === 'DIA' ? 'FFFFF2CC' : 'FFE2EFDA' }
          };

          shiftAnalyses.forEach((analysis) => {
            // Helper to get property from new structure (analyses[0]) or legacy structure
            const getProp = (prop: string): any => {
              return analysis.analyses?.[0]?.[prop as keyof typeof analysis.analyses[0]] || (analysis as any)[prop];
            };

            const defectos = getProp('defectos');
            const totalDefectos = defectos
              ? Object.values(defectos).reduce((sum: any, val: any) => sum + val, 0)
              : 0;

            const row = worksheet.addRow([
              new Date(analysis.createdAt).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
              shift === 'DIA' ? 'Día' : 'Noche',
              PRODUCT_TYPE_LABELS[analysis.productType],
              analysis.lote,
              analysis.codigo,
              analysis.talla || '-',
              getProp('pesoBruto')?.valor || '-',
              getProp('pesoCongelado')?.valor || '-',
              getProp('pesoNeto')?.valor || '-',
              getProp('conteo') || '-',
              getProp('uniformidad')?.grandes?.valor || '-',
              getProp('uniformidad')?.pequenos?.valor || '-',
              totalDefectos,
              analysis.observations || '-'
            ]);

            row.alignment = { vertical: 'middle' };
          });

          // Fila de subtotales por turno
          const subtotalRow = worksheet.addRow([
            '',
            `Subtotal ${shift === 'DIA' ? 'Día' : 'Noche'}:`,
            `${shiftAnalyses.length} análisis`,
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            ''
          ]);
          subtotalRow.font = { bold: true };
          subtotalRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' }
          };

          worksheet.addRow([]);
        }
      });

      // Fila de totales
      const totalRow = worksheet.addRow([
        '',
        'TOTAL:',
        `${analyses.length} análisis`,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
      ]);
      totalRow.font = { bold: true, size: 12 };
      totalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFBDD7EE' }
      };

      // Ajustar ancho de columnas
      worksheet.columns = [
        { width: 10 },  // Hora
        { width: 12 },  // Turno
        { width: 18 },  // Tipo Producto
        { width: 15 },  // Lote
        { width: 12 },  // Código
        { width: 10 },  // Talla
        { width: 14 },  // Peso Bruto
        { width: 16 },  // Peso Congelado
        { width: 12 },  // Peso Neto
        { width: 10 },  // Conteo
        { width: 18 },  // Uniformidad Grandes
        { width: 18 },  // Uniformidad Pequeños
        { width: 15 },  // Total Defectos
        { width: 30 }   // Observaciones
      ];

      // Bordes para todas las celdas con datos
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 2) {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          });
        }
      });

      // Generar archivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte_calidad_${selectedDate}_${selectedShift}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      alert('✅ Reporte descargado exitosamente');
    } catch (error: any) {
      console.error('Error al generar reporte:', error);
      alert(`❌ Error al generar reporte: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg border border-[#dbdbdb] overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#efefef]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#fafafa] rounded-full border border-[#dbdbdb]">
              <Calendar className="h-4 w-4 text-[#262626]" />
            </div>
            <h2 className="text-sm font-semibold text-[#262626]">Reporte Diario</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#8e8e8e] hover:text-[#262626] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Controls Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-[#8e8e8e] uppercase tracking-wide">Fecha</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-[#fafafa] border border-[#dbdbdb] rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#a8a8a8] transition-all text-[#262626]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-[#8e8e8e] uppercase tracking-wide">Turno</label>
              <select
                value={selectedShift}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedShift(e.target.value as 'ALL' | WorkShift)}
                className="w-full bg-[#fafafa] border border-[#dbdbdb] rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#a8a8a8] transition-all text-[#262626]"
              >
                <option value="ALL">Todos</option>
                <option value="DIA">Día</option>
                <option value="NOCHE">Noche</option>
              </select>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleGenerateReport}
            disabled={isLoading}
            className="w-full bg-[#0095f6] text-white py-2 rounded-lg text-xs font-semibold hover:bg-[#1877f2] active:bg-[#1877f2] disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Buscar Análisis'
            )}
          </button>

          {/* Results Section */}
          {analyses.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-[#efefef]">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#fafafa] border border-[#efefef] rounded p-2 text-center">
                  <span className="block text-[10px] text-[#8e8e8e] uppercase">Total</span>
                  <span className="block text-sm font-bold text-[#262626]">{analyses.length}</span>
                </div>
                <div className="bg-[#fafafa] border border-[#efefef] rounded p-2 text-center">
                  <span className="block text-[10px] text-[#8e8e8e] uppercase">Día</span>
                  <span className="block text-sm font-bold text-[#262626]">{analyses.filter(a => a.shift === 'DIA').length}</span>
                </div>
                <div className="bg-[#fafafa] border border-[#efefef] rounded p-2 text-center">
                  <span className="block text-[10px] text-[#8e8e8e] uppercase">Noche</span>
                  <span className="block text-sm font-bold text-[#262626]">{analyses.filter(a => a.shift === 'NOCHE').length}</span>
                </div>
              </div>

              <button
                onClick={handleDownloadReport}
                disabled={isLoading}
                className="w-full bg-white border border-[#dbdbdb] text-[#262626] py-2 rounded-lg text-xs font-semibold hover:bg-[#fafafa] active:bg-[#efefef] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <Download className="h-3.5 w-3.5" />
                Descargar Excel
              </button>
            </div>
          )}

          {!isLoading && analyses.length === 0 && (
            <p className="text-center text-[10px] text-[#8e8e8e] py-2">
              Selecciona fecha y turno para generar reporte
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyReportModal;

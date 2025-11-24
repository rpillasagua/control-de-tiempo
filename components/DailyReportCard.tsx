'use client';

import React, { useState } from 'react';
import { X, Download, Calendar, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { getAnalysesByDate, getAnalysesByShift, getAnalysesByProductionDay } from '@/lib/analysisService';
import { generateDailyReport } from '@/lib/reportService';
import { QualityAnalysis, WorkShift } from '@/lib/types';

interface DailyReportCardProps {
    onClose: () => void;
}

const getLocalDateString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
};

const DailyReportCard: React.FC<DailyReportCardProps> = ({ onClose }) => {
    const [selectedDate, setSelectedDate] = useState(getLocalDateString());
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [analyses, setAnalyses] = useState<QualityAnalysis[]>([]);
    const [selectedShift, setSelectedShift] = useState<'ALL' | WorkShift>('ALL');

    const handleSearch = async () => {
        setIsLoading(true);
        setAnalyses([]);

        try {
            console.log(`🔍 Searching analyses - Date: ${selectedDate}, Shift: ${selectedShift}`);
            const data = selectedShift === 'ALL'
                ? await getAnalysesByProductionDay(selectedDate)
                : await getAnalysesByShift(selectedDate, selectedShift);

            setAnalyses(data);

            if (data.length === 0) {
                toast.info('No se encontraron registros para los filtros seleccionados');
            } else {
                toast.success(`Se encontraron ${data.length} registros`);
            }
        } catch (error) {
            console.error('Error al buscar análisis:', error);
            toast.error('Error al conectar con la base de datos');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async () => {
        if (analyses.length === 0) {
            toast.warning('No hay datos para exportar');
            return;
        }

        setIsGenerating(true);
        try {
            const blob = await generateDailyReport(analyses, selectedDate, selectedShift);

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Reporte_Calidad_${selectedDate}_${selectedShift}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success('Reporte descargado exitosamente');
        } catch (error) {
            console.error('Error generando Excel:', error);
            toast.error('No se pudo generar el archivo Excel');
        } finally {
            setIsGenerating(false);
        }
    };

    const countDia = analyses.filter(a => a.shift === 'DIA').length;
    const countNoche = analyses.filter(a => a.shift === 'NOCHE').length;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-[3px] animate-fade-in">
            <style jsx global>{`
                @keyframes floatUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>

            <div
                className="bg-white w-[90%] max-w-[340px] p-[25px] rounded-[24px] relative text-left max-h-[90vh] overflow-y-auto"
                style={{
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    animation: 'floatUp 0.3s ease-out'
                }}
            >
                {/* Botón Cerrar (X) */}
                <button
                    onClick={onClose}
                    className="absolute top-[20px] right-[20px] bg-[#F3F4F6] border-none w-[32px] h-[32px] rounded-full text-[#6B7280] text-[16px] cursor-pointer flex items-center justify-center transition-colors hover:bg-[#E5E7EB] hover:text-black"
                    aria-label="Cerrar"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Títulos */}
                <h2 className="m-0 text-[22px] font-[800] text-[#111827]">Reporte Diario</h2>
                <p className="mt-[5px] mb-[25px] text-[14px] text-[#6B7280]">Selecciona los filtros para el reporte</p>

                {/* Input Fecha */}
                <div className="mb-[16px]">
                    <label className="block text-[13px] font-[600] text-[#374151] mb-[8px]">Fecha</label>
                    <div className="flex items-center bg-[#F3F4F6] rounded-[12px] px-[16px] py-[12px] border-2 border-transparent transition-all focus-within:bg-white focus-within:border-[#2563EB] focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]">
                        <span className="mr-[10px] text-[18px]">📅</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="border-none bg-transparent w-full text-[15px] text-[#1F2937] outline-none font-[500]"
                        />
                    </div>
                </div>

                {/* Input Turno */}
                <div className="mb-[16px]">
                    <label className="block text-[13px] font-[600] text-[#374151] mb-[8px]">Turno</label>
                    <div className="flex items-center bg-[#F3F4F6] rounded-[12px] px-[16px] py-[12px] border-2 border-transparent transition-all focus-within:bg-white focus-within:border-[#2563EB] focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]">
                        <span className="mr-[10px] text-[18px]">⏰</span>
                        <select
                            value={selectedShift}
                            onChange={(e) => setSelectedShift(e.target.value as 'ALL' | WorkShift)}
                            className="border-none bg-transparent w-full text-[15px] text-[#1F2937] outline-none font-[500] appearance-none cursor-pointer"
                        >
                            <option value="ALL">Todos los turnos</option>
                            <option value="DIA">Turno Día</option>
                            <option value="NOCHE">Turno Noche</option>
                        </select>
                    </div>
                </div>

                {/* Botón Buscar */}
                <button
                    onClick={handleSearch}
                    disabled={isLoading}
                    className="w-full bg-[#2563EB] text-white border-none p-[16px] rounded-[14px] text-[16px] font-[600] mt-[10px] cursor-pointer flex justify-center items-center gap-[8px] transition-transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    style={{ boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}
                >
                    {isLoading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Buscando...</span>
                        </>
                    ) : (
                        <>
                            <span className="text-[18px]">🔍</span>
                            <span>Buscar Registros</span>
                        </>
                    )}
                </button>

                {/* Resultados y Descarga */}
                {analyses.length > 0 && (
                    <div className="mt-[20px] pt-[20px] border-t border-gray-100 animate-slide-up">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-3 gap-2 mb-[16px]">
                            <StatCard label="Total" value={analyses.length} highlight={true} />
                            <StatCard label="Día" value={countDia} highlight={countDia > 0} />
                            <StatCard label="Noche" value={countNoche} highlight={countNoche > 0} />
                        </div>

                        {/* Botón Descargar */}
                        <button
                            onClick={handleDownload}
                            disabled={isGenerating}
                            className="w-full bg-[#10B981] text-white border-none p-[16px] rounded-[14px] text-[16px] font-[600] cursor-pointer flex justify-center items-center gap-[8px] transition-transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                            style={{ boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Generando...</span>
                                </>
                            ) : (
                                <>
                                    <Download className="h-5 w-5" />
                                    <span>Descargar Excel</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// Subcomponente para stat cards
const StatCard = ({
    label,
    value,
    highlight = false
}: {
    label: string;
    value: number;
    highlight?: boolean;
}) => (
    <div className={`p-[10px] rounded-[12px] text-center transition-all border ${highlight
        ? 'bg-blue-50 border-blue-100'
        : 'bg-gray-50 border-gray-100'
        }`}>
        <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-[600]">
            {label}
        </span>
        <span className={`block text-[18px] font-[700] ${highlight ? 'text-[#2563EB]' : 'text-gray-700'
            }`}>
            {value}
        </span>
    </div>
);

export default DailyReportCard;

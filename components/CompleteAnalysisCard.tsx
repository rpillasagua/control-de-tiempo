import React from 'react';
import { CheckCircle2, Edit } from 'lucide-react';
import { toast } from 'sonner';

interface CompleteAnalysisCardProps {
    isCompleted: boolean;
    onComplete: () => void;
    onEnableEdit: () => Promise<void>;
    analysisId: string | null;
}

export const CompleteAnalysisCard: React.FC<CompleteAnalysisCardProps> = ({
    isCompleted,
    onComplete,
    onEnableEdit,
    analysisId
}) => {
    if (!analysisId) return null;

    return !isCompleted ? (
        <div className="pt-8 flex justify-center">
            <button
                onClick={onComplete}
                className="w-full max-w-[280px] bg-gradient-to-r from-green-500 to-emerald-600 text-white border-2 border-green-400/50 hover:from-green-600 hover:to-emerald-700 hover:border-green-300 p-[12px] rounded-[14px] text-[14px] font-[600] cursor-pointer flex justify-center items-center gap-[6px] transition-all active:scale-[0.98] shadow-lg hover:shadow-xl"
                style={{
                    boxShadow: '0 10px 20px -5px rgba(34, 197, 94, 0.3)'
                }}
            >
                <CheckCircle2 className="w-4 h-4" />
                <span>Completar Análisis</span>
            </button>
        </div>
    ) : (
        <div className="pt-8 flex justify-center">
            <button
                onClick={async () => {
                    try {
                        await onEnableEdit();
                    } catch (error) {
                        console.error('Error enabling editing:', error);
                        toast.error('Error al habilitar edición');
                    }
                }}
                className="w-full max-w-[280px] bg-white text-slate-600 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 p-[12px] rounded-[14px] text-[14px] font-[600] cursor-pointer flex justify-center items-center gap-[6px] transition-all active:scale-[0.98] shadow-sm hover:shadow-md"
            >
                <Edit className="w-4 h-4" />
                <span>Habilitar Edición</span>
            </button>
        </div>
    );
};

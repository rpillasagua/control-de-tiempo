import React from 'react';
import { Trash2 } from 'lucide-react';

interface DeleteAnalysisSectionProps {
    onDelete: () => void;
    uploadingPhotosCount: number;
    // Props for modals that are now managed here or passed down? 
    // Actually, to keep it simple, PageContent keeps state for modals, 
    // OR we move the modals inside this component if they are only triggered here.
    // Based on PageContent structure, DeleteConfirmationModal is triggered by this section.
    // PendingUploadsPanel is triggered by Global Upload Indicator (also in this section).
    // TechnicalSpecsModal and EditMetadataModal are triggered by AnalysisHeader/Actions, 
    // BUT they were visually placed at the bottom in PageContent. 
    // Let's keep the Modals in PageContent for now to avoid prop drilling hell, 
    // or just pass the "open" handlers. 
    // Wait, the original code had them nested in this "Delete Section" div for layout reasons?
    // No, they were just at the bottom. 
    // Let's only move the Delete Button and Global Upload Indicator here.
}

export const DeleteAnalysisSection: React.FC<DeleteAnalysisSectionProps> = ({
    onDelete,
    uploadingPhotosCount
}) => {
    return (
        <div className="pt-6 pb-4 flex justify-center sticky bottom-0 z-10 pointer-events-none">
            {/* Added sticky bottom-0 for better UX on mobile? No, original didn't have it. Keeping original layout. */}
            <div className="pt-6 pb-4 flex justify-center w-full pointer-events-auto">
                <div
                    className="bg-white p-[18px] rounded-[14px] w-full max-w-[280px] text-center"
                    style={{
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
                    }}
                >
                    <button
                        type="button"
                        onClick={onDelete}
                        className="w-full bg-red-50 text-red-600 border-2 border-red-100 hover:bg-red-100 hover:border-red-200 p-[10px] rounded-[14px] text-[13px] font-[600] cursor-pointer flex justify-center items-center gap-[6px] transition-all active:scale-[0.98] hover:shadow-md"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span>Borrar Análisis</span>
                    </button>
                </div>
            </div>

            {/* Global Upload Indicator */}
            {
                uploadingPhotosCount > 0 && (
                    <div className="fixed bottom-6 right-6 bg-blue-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300 border border-blue-400/30 backdrop-blur-md pointer-events-auto">
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <div className="flex flex-col">
                            <span className="font-bold text-sm">Subiendo {uploadingPhotosCount} foto{uploadingPhotosCount > 1 ? 's' : ''}...</span>
                            <span className="text-xs text-blue-100">Por favor espera</span>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

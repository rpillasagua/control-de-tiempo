import React, { createContext, useContext, useReducer, useState, useMemo } from 'react';
import { Analysis, ProductType, AnalystColor, QualityAnalysis, PesoConFoto } from '@/lib/types';
import { analysisReducer, initialState, AnalysisAction, AnalysisState } from '@/reducers/analysisReducer';

interface AnalysisContextType {
    // Reducer State
    analyses: Analysis[];
    activeAnalysisIndex: number;
    dispatch: React.Dispatch<AnalysisAction>;

    // Global Metadata State
    analysisId: string | null;
    setAnalysisId: (id: string | null) => void;

    productType: ProductType | null;
    setProductType: (type: ProductType | null) => void;

    basicsCompleted: boolean;
    setBasicsCompleted: (completed: boolean) => void;

    codigo: string;
    setCodigo: (code: string) => void;

    lote: string;
    setLote: (lote: string) => void;

    talla: string;
    setTalla: (talla: string) => void;

    analystColor: AnalystColor | null;
    setAnalystColor: (color: AnalystColor | null) => void;

    sections: { weights: boolean; uniformity: boolean; defects: boolean } | undefined;
    setSections: (sections: { weights: boolean; uniformity: boolean; defects: boolean } | undefined) => void;

    remuestreoConfig: QualityAnalysis['remuestreoConfig'];
    setRemuestreoConfig: (config: QualityAnalysis['remuestreoConfig']) => void;

    globalPesoBruto: PesoConFoto;
    setGlobalPesoBruto: React.Dispatch<React.SetStateAction<PesoConFoto>>;

    // Derived Helpers
    isRemuestreo: boolean;
    currentAnalysis: Analysis;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
    // Reducer for complex analysis list state
    const [{ analyses, activeAnalysisIndex }, dispatch] = useReducer(analysisReducer, initialState);

    // Atom states for metadata
    const [analysisId, setAnalysisId] = useState<string | null>(null);
    const [productType, setProductType] = useState<ProductType | null>(null);
    const [basicsCompleted, setBasicsCompleted] = useState(false);

    const [codigo, setCodigo] = useState('');
    const [lote, setLote] = useState('');
    const [talla, setTalla] = useState('');
    const [analystColor, setAnalystColor] = useState<AnalystColor | null>(null);

    const [sections, setSections] = useState<{ weights: boolean; uniformity: boolean; defects: boolean } | undefined>(undefined);
    const [remuestreoConfig, setRemuestreoConfig] = useState<QualityAnalysis['remuestreoConfig']>(null);

    const [globalPesoBruto, setGlobalPesoBruto] = useState<PesoConFoto>({});

    // Derived values
    const isRemuestreo = productType === 'REMUESTREO';
    const currentAnalysis = (analyses[activeAnalysisIndex] || {}) as Analysis;

    const value = useMemo(() => ({
        analyses,
        activeAnalysisIndex,
        dispatch,
        analysisId,
        setAnalysisId,
        productType,
        setProductType,
        basicsCompleted,
        setBasicsCompleted,
        codigo,
        setCodigo,
        lote,
        setLote,
        talla,
        setTalla,
        analystColor,
        setAnalystColor,
        sections,
        setSections,
        remuestreoConfig,
        setRemuestreoConfig,
        globalPesoBruto,
        setGlobalPesoBruto,
        isRemuestreo,
        currentAnalysis
    }), [
        analyses,
        activeAnalysisIndex,
        analysisId,
        productType,
        basicsCompleted,
        codigo,
        lote,
        talla,
        analystColor,
        sections,
        remuestreoConfig,
        globalPesoBruto,
        isRemuestreo
        // currentAnalysis is derived from analyses/index so implicitly covered
    ]);

    return (
        <AnalysisContext.Provider value={value}>
            {children}
        </AnalysisContext.Provider>
    );
}

export function useAnalysisContext() {
    const context = useContext(AnalysisContext);
    if (context === undefined) {
        throw new Error('useAnalysisContext must be used within an AnalysisProvider');
    }
    return context;
}

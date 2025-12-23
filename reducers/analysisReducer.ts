import { Analysis } from '@/lib/types';

export type AnalysisAction =
    | { type: 'SET_ANALYSES'; payload: Analysis[] }
    | { type: 'SET_ANALYSES_FUNCTIONAL'; payload: (prev: Analysis[]) => Analysis[] }
    | { type: 'ADD_ANALYSIS'; payload: Analysis }
    | { type: 'UPDATE_ANALYSIS'; payload: { index: number; analysis: Analysis } }
    | { type: 'DELETE_ANALYSIS'; payload: string } // payload is analysisId
    | { type: 'SET_ACTIVE_INDEX'; payload: number };

export interface AnalysisState {
    analyses: Analysis[];
    activeAnalysisIndex: number;
}

export const initialState: AnalysisState = {
    analyses: [],
    activeAnalysisIndex: 0
};

export function analysisReducer(state: AnalysisState, action: AnalysisAction): AnalysisState {
    switch (action.type) {
        case 'SET_ANALYSES':
            return { ...state, analyses: action.payload };
        case 'SET_ANALYSES_FUNCTIONAL':
            return { ...state, analyses: action.payload(state.analyses) };
        case 'ADD_ANALYSIS':
            return {
                ...state,
                analyses: [...state.analyses, action.payload],
                activeAnalysisIndex: state.analyses.length // Auto-switch to new
            };
        case 'UPDATE_ANALYSIS': {
            const newAnalyses = [...state.analyses];
            newAnalyses[action.payload.index] = action.payload.analysis;
            return { ...state, analyses: newAnalyses };
        }
        case 'DELETE_ANALYSIS': {
            const newAnalyses = state.analyses.filter(a => a.id !== action.payload);
            let newIndex = state.activeAnalysisIndex;
            if (newIndex >= newAnalyses.length) {
                newIndex = Math.max(0, newAnalyses.length - 1);
            }
            return { ...state, analyses: newAnalyses, activeAnalysisIndex: newIndex };
        }
        case 'SET_ACTIVE_INDEX':
            return { ...state, activeAnalysisIndex: action.payload };
        default:
            return state;
    }
}

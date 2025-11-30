import React from 'react';
import { useTechnicalSpecs } from '@/hooks/useTechnicalSpecs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { AlertCircle } from 'lucide-react';

interface TechnicalSpecsViewerProps {
    code: string;
}

export function TechnicalSpecsViewer({ code }: TechnicalSpecsViewerProps) {
    const { getSpecs } = useTechnicalSpecs();
    const specs = getSpecs(code);

    if (!specs || !specs.defects || specs.defects.length === 0) {
        return null;
    }

    return (
        <Card className="mt-6 border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-blue-800 text-base">
                    <AlertCircle className="w-5 h-5" />
                    Especificaciones de Defectos (Ficha Técnica)
                </CardTitle>
                {(specs.freezingMethod || specs.destination) && (
                    <div className="flex gap-4 mt-2 text-sm text-blue-700">
                        {specs.freezingMethod && (
                            <div className="flex items-center gap-1">
                                <span className="font-semibold">Congelación:</span>
                                <span>{specs.freezingMethod}</span>
                            </div>
                        )}
                        {specs.destination && (
                            <div className="flex items-center gap-1">
                                <span className="font-semibold">Destino:</span>
                                <span>{specs.destination}</span>
                            </div>
                        )}
                    </div>
                )}
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto rounded-lg border border-blue-100">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-blue-100/50 text-blue-900 font-semibold">
                            <tr>
                                <th className="px-4 py-3">Defecto</th>
                                <th className="px-4 py-3 text-right">Límite Permitido</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-100 bg-white">
                            {specs.defects.map((defect, index) => (
                                <tr key={index} className="hover:bg-blue-50/50 transition-colors">
                                    <td className="px-4 py-2.5 font-medium text-slate-700">
                                        {defect.defect.replace(/_/g, ' ')}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                                        {defect.limit === 'NO' ? (
                                            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-xs border border-amber-100">
                                                MONITOREAR
                                            </span>
                                        ) : defect.limit === 'SI' ? (
                                            <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs border border-green-100">
                                                PERMITIDO
                                            </span>
                                        ) : (
                                            <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs border border-blue-100">
                                                {defect.limit}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

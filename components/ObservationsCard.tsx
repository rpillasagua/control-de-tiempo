import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Textarea } from '@/components/ui/textarea';

interface ObservationsCardProps {
    observations?: string;
    onObservationsChange: (value: string) => void;
    isCompleted: boolean;
}

export function ObservationsCard({
    observations,
    onObservationsChange,
    isCompleted
}: ObservationsCardProps) {
    return (
        <Card className="border-slate-300 dark:border-slate-700">
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    📝 Observaciones
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Textarea
                    value={observations || ''}
                    onChange={(e) => onObservationsChange(e.target.value)}
                    placeholder="Ingrese observaciones adicionales sobre este análisis..."
                    className="min-h-[100px] bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                    disabled={isCompleted}
                />
                {isCompleted && (
                    <p className="text-xs text-slate-500 mt-2">
                        Las observaciones no se pueden editar en un análisis completado
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

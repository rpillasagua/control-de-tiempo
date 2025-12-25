import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Lock } from 'lucide-react';

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
                    className="min-h-[100px] resize-none"
                    disabled={isCompleted}
                />
                {isCompleted && (
                    <div className="flex items-center gap-2 mt-3 p-3 bg-slate-100/80 text-slate-600 rounded-lg text-sm border border-slate-200">
                        <Lock className="w-4 h-4" />
                        <span>Análisis completado. Edición bloqueada.</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

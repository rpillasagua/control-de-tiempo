import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CheckCircle2 } from 'lucide-react';
import { Analysis } from '@/lib/types';

interface ConteoCardProps {
    showConteo: boolean;
    conteo: number | undefined;
    onConteoChange: (value: number | undefined) => void;
    validation: {
        isValid: boolean;
        message: string;
    };
    isCompleted?: boolean;
}

export const ConteoCard = React.memo<ConteoCardProps>(({
    showConteo,
    conteo,
    onConteoChange,
    validation,
    isCompleted = false
}) => {
    if (!showConteo) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>🔢 Conteo</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between gap-4">
                    <Label className="flex-1">
                        Número de piezas
                    </Label>
                    <div className="flex items-center gap-3">
                        {conteo && (
                            <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                                <CheckCircle2 className="w-3 h-3 text-white" />
                            </div>
                        )}
                        <Input
                            type="number"
                            placeholder="0"
                            value={conteo || ''}
                            onChange={(e) => onConteoChange(parseInt(e.target.value) || undefined)}
                            className={`w-[80px] text-center font-bold ${!validation.isValid ? 'border-red-500 focus:ring-red-500' : ''}`}
                            disabled={isCompleted}
                        />
                    </div>
                </div>
                {!validation.isValid && (
                    <p className="text-red-500 text-sm mt-2 font-medium text-right">
                        {validation.message}
                    </p>
                )}
            </CardContent>
        </Card>
    );
});

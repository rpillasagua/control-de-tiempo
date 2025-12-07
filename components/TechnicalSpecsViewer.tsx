import React from 'react';
import { useTechnicalSpecs } from '@/hooks/useTechnicalSpecs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { AlertCircle, Package, Scale, Ruler, FileText, Globe, Tag, Info } from 'lucide-react';

interface TechnicalSpecsViewerProps {
    code: string;
}

export function TechnicalSpecsViewer({ code }: TechnicalSpecsViewerProps) {
    const { getSpecs } = useTechnicalSpecs();
    const specs = getSpecs(code);

    if (!code) {
        return (
            <div className="p-12 text-center text-slate-400 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200">
                <p className="text-lg">Ingrese un código de producto arriba para ver su ficha técnica.</p>
            </div>
        );
    }
    if (!specs) {
        return (
            <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                No hay especificaciones técnicas disponibles para el código {code}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Info */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="font-bold text-lg text-slate-900">{specs.description || 'Sin descripción'}</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                            <Badge label="Versión" value={specs.version?.toString()} color="slate" />
                            <Badge label="Tipo" value={specs.productType} color="blue" />
                            <Badge label="Destino" value={specs.destination} color="emerald" />
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-mono font-bold text-slate-700">{specs.code}</div>
                        <div className="text-xs text-slate-400">CÓDIGO</div>
                    </div>
                </div>
            </div>

            {/* General Info Grid */}
            <Section title="Información General" icon={<Info className="w-4 h-4" />}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <InfoItem label="Cliente" value={specs.client} />
                    <InfoItem label="Marca" value={specs.brand} />
                    <InfoItem label="Congelación" value={specs.freezingMethod} />
                    <InfoItem label="Certificación" value={specs.certification} />
                    <InfoItem label="Color" value={specs.color} />
                    <InfoItem label="Preservante" value={specs.preservative} />
                </div>
            </Section>

            {/* Packaging & Weights */}
            <Section title="Empaque y Pesos" icon={<Package className="w-4 h-4" />}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <InfoItem label="Empaque" value={specs.packing} className="col-span-2 md:col-span-3 font-medium" />
                    <InfoItem label="Peso Neto" value={`${specs.netWeight || '-'} ${specs.netWeightUnit || ''}`} />
                    <InfoItem label="Peso Bruto" value={`${specs.grossWeight || '-'} ${specs.grossWeightUnit || ''}`} />
                    <InfoItem label="Peso Máster" value={`${specs.grossWeightMasters || '-'} ${specs.grossWeightMastersUnit || ''}`} />
                    <InfoItem label="Sobrepeso" value={specs.overweightPct} highlight />
                    <InfoItem label="Glaseo" value={`${specs.glazingRatio || '-'} ${specs.glazingUnit || ''}`} highlight />
                </div>
            </Section>

            {/* Sizes Table */}
            <Section title="Tallas y Conteos" icon={<Ruler className="w-4 h-4" />}>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-3 py-2">Talla MP</th>
                                <th className="px-3 py-2">Conteo MP</th>
                                <th className="px-3 py-2">Talla Marcada</th>
                                <th className="px-3 py-2">Conteo Final</th>
                                <th className="px-3 py-2 text-right">Uniformidad</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {specs.sizes?.map((size, index) => (
                                <tr key={index} className="hover:bg-slate-50/50">
                                    <td className="px-3 py-2 font-medium">{size.sizeMp}</td>
                                    <td className="px-3 py-2 text-slate-600">{size.countMp}</td>
                                    <td className="px-3 py-2">{size.sizeMarked}</td>
                                    <td className="px-3 py-2 text-slate-600">{size.countFinal}</td>
                                    <td className="px-3 py-2 text-right font-mono">{size.uniformity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Section>

            {/* Defects Table */}
            <Section title="Especificaciones de Defectos" icon={<AlertCircle className="w-4 h-4" />}>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-2">Defecto</th>
                                <th className="px-4 py-2 text-right">Límite Permitido</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {specs.defects?.map((defect, index) => (
                                <tr key={index} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-2 font-medium text-slate-700">
                                        {defect.defect.replace(/_/g, ' ')}
                                    </td>
                                    <td className="px-4 py-2 text-right font-bold text-slate-900">
                                        {renderLimit(defect.limit)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Section>
        </div>
    );
}

// Subcomponents
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <h4 className="flex items-center gap-2 font-semibold text-slate-800 border-b border-slate-200 pb-2">
                <span className="p-1.5 bg-slate-100 rounded-md text-slate-600">{icon}</span>
                {title}
            </h4>
            {children}
        </div>
    );
}

function InfoItem({ label, value, highlight, className = '' }: { label: string; value?: string | number | null; highlight?: boolean; className?: string }) {
    if (!value) return null;
    return (
        <div className={`flex flex-col ${className}`}>
            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">{label}</span>
            <span className={`text-sm font-medium ${highlight ? 'text-blue-600 font-bold' : 'text-slate-800'}`}>
                {value}
            </span>
        </div>
    );
}

function Badge({ label, value, color }: { label: string; value?: string; color: 'blue' | 'slate' | 'emerald' }) {
    if (!value) return null;
    const colors = {
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
        slate: 'bg-slate-100 text-slate-700 border-slate-200',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${colors[color]}`}>
            <span className="opacity-70">{label}:</span>
            <span className="font-semibold">{value}</span>
        </span>
    );
}

function renderLimit(limit: string | number) {
    if (limit === 'NO') {
        return <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-xs border border-amber-100">MONITOREAR</span>;
    }
    if (limit === 'SI') {
        return <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs border border-green-100">PERMITIDO</span>;
    }
    return (
        <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs border border-blue-100">
            {limit}
        </span>
    );
}

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { CustomProductSpec } from '../lib/customProductService';
import { PRODUCT_TYPE_LABELS, ProductType } from '../lib/types';

interface TechnicalSpecFormProps {
    initialData?: Partial<CustomProductSpec>;
    code: string;
    onSave: (spec: CustomProductSpec) => void;
    onCancel: () => void;
}

export function TechnicalSpecForm({ initialData, code, onSave, onCancel }: TechnicalSpecFormProps) {
    const [formData, setFormData] = useState<Partial<CustomProductSpec>>({
        code,
        type: 'ENTERO',
        unit: 'KG',
        sizes: [],
        defects: [],
        ...initialData
    });

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({ ...prev, ...initialData, code }));
        }
    }, [initialData, code]);

    const handleChange = (field: keyof CustomProductSpec, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSizeChange = (index: number, field: string, value: any) => {
        const newSizes = [...(formData.sizes || [])];
        newSizes[index] = { ...newSizes[index], [field]: value };
        setFormData(prev => ({ ...prev, sizes: newSizes }));
    };

    const addSize = () => {
        setFormData(prev => ({
            ...prev,
            sizes: [...(prev.sizes || []), { sizeMp: '', countMp: '', sizeMarked: '', countFinal: '' }]
        }));
    };

    const removeSize = (index: number) => {
        setFormData(prev => ({
            ...prev,
            sizes: prev.sizes?.filter((_, i) => i !== index)
        }));
    };

    const handleDefectChange = (index: number, field: string, value: any) => {
        const newDefects = [...(formData.defects || [])];
        newDefects[index] = { ...newDefects[index], [field]: value };
        setFormData(prev => ({ ...prev, defects: newDefects }));
    };

    const addDefect = () => {
        setFormData(prev => ({
            ...prev,
            defects: [...(prev.defects || []), { defect: '', limit: '' }]
        }));
    };

    const removeDefect = (index: number) => {
        setFormData(prev => ({
            ...prev,
            defects: prev.defects?.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as CustomProductSpec);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <button
                    type="button"
                    onClick={onCancel}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    title="Volver"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-500" />
                </button>
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Editar Ficha Técnica</h3>
                    <p className="text-sm text-slate-500">Complete la información del producto</p>
                </div>
            </div>

            {/* General Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Cliente</label>
                    <input
                        type="text"
                        required
                        className="w-full p-2 border border-slate-200 rounded-lg"
                        value={formData.client || ''}
                        onChange={e => handleChange('client', e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Marca</label>
                    <input
                        type="text"
                        required
                        className="w-full p-2 border border-slate-200 rounded-lg"
                        value={formData.brand || ''}
                        onChange={e => handleChange('brand', e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Descripción</label>
                    <input
                        type="text"
                        className="w-full p-2 border border-slate-200 rounded-lg"
                        value={formData.description || ''}
                        onChange={e => handleChange('description', e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Tipo Producto</label>
                    <select
                        className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                        value={formData.type || 'ENTERO'}
                        onChange={e => handleChange('type', e.target.value)}
                    >
                        {Object.entries(PRODUCT_TYPE_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Weights & Packing */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                    <span>📦</span> Pesos y Empaque
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="col-span-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Master / Empaque</label>
                        <input
                            type="text"
                            required
                            placeholder="Ej: 10 Und * 2 Kg"
                            className="w-full p-2 border border-slate-200 rounded-lg mt-1"
                            value={formData.master || ''}
                            onChange={e => handleChange('master', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase">Unidad Principal</label>
                        <select
                            className="w-full p-2 border border-slate-200 rounded-lg mt-1 bg-white"
                            value={formData.unit || 'KG'}
                            onChange={e => handleChange('unit', e.target.value)}
                        >
                            <option value="KG">KG</option>
                            <option value="LB">LB</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase">Sobrepeso (%)</label>
                        <input
                            type="text"
                            placeholder="Ej: 2%"
                            className="w-full p-2 border border-slate-200 rounded-lg mt-1"
                            value={formData.overweightPct || ''}
                            onChange={e => handleChange('overweightPct', e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase">Peso Neto</label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                step="0.01"
                                className="w-full p-2 border border-slate-200 rounded-lg mt-1"
                                value={formData.netWeight || ''}
                                onChange={e => handleChange('netWeight', parseFloat(e.target.value))}
                            />
                            <select
                                className="w-20 p-2 border border-slate-200 rounded-lg mt-1 bg-white text-xs"
                                value={formData.netWeightUnit || 'KG'}
                                onChange={e => handleChange('netWeightUnit', e.target.value)}
                            >
                                <option value="KG">KG</option>
                                <option value="LB">LB</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase">Peso Bruto</label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                step="0.01"
                                className="w-full p-2 border border-slate-200 rounded-lg mt-1"
                                value={formData.grossWeight || ''}
                                onChange={e => handleChange('grossWeight', parseFloat(e.target.value))}
                            />
                            <select
                                className="w-20 p-2 border border-slate-200 rounded-lg mt-1 bg-white text-xs"
                                value={formData.grossWeightUnit || 'KG'}
                                onChange={e => handleChange('grossWeightUnit', e.target.value)}
                            >
                                <option value="KG">KG</option>
                                <option value="LB">LB</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase">Peso Bruto Master</label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                step="0.01"
                                className="w-full p-2 border border-slate-200 rounded-lg mt-1"
                                value={formData.grossWeightMasters || ''}
                                onChange={e => handleChange('grossWeightMasters', parseFloat(e.target.value))}
                            />
                            <select
                                className="w-20 p-2 border border-slate-200 rounded-lg mt-1 bg-white text-xs"
                                value={formData.grossWeightMastersUnit || 'KG'}
                                onChange={e => handleChange('grossWeightMastersUnit', e.target.value)}
                            >
                                <option value="KG">KG</option>
                                <option value="LB">LB</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase">Glaseo</label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                step="0.01"
                                className="w-full p-2 border border-slate-200 rounded-lg mt-1"
                                value={formData.glazingRatio || ''}
                                onChange={e => handleChange('glazingRatio', parseFloat(e.target.value))}
                            />
                            <select
                                className="w-20 p-2 border border-slate-200 rounded-lg mt-1 bg-white text-xs"
                                value={formData.glazingUnit || '%'}
                                onChange={e => handleChange('glazingUnit', e.target.value)}
                            >
                                <option value="%">%</option>
                                <option value="ml">ml</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sizes */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                        <span>📏</span> Tallas y Conteos
                    </h4>
                    <button type="button" onClick={addSize} className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1">
                        <Plus className="w-4 h-4" /> Agregar
                    </button>
                </div>
                <div className="space-y-2">
                    {formData.sizes?.map((size, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-lg text-sm">
                            <div className="col-span-2">
                                <input placeholder="Talla MP" className="w-full p-1 border rounded" value={size.sizeMp} onChange={e => handleSizeChange(index, 'sizeMp', e.target.value)} />
                            </div>
                            <div className="col-span-2">
                                <input placeholder="Cont. MP" className="w-full p-1 border rounded" value={size.countMp} onChange={e => handleSizeChange(index, 'countMp', e.target.value)} />
                            </div>
                            <div className="col-span-2">
                                <input placeholder="Marcada" className="w-full p-1 border rounded" value={size.sizeMarked} onChange={e => handleSizeChange(index, 'sizeMarked', e.target.value)} />
                            </div>
                            <div className="col-span-2">
                                <input placeholder="C. Final" className="w-full p-1 border rounded" value={size.countFinal} onChange={e => handleSizeChange(index, 'countFinal', e.target.value)} />
                            </div>
                            <div className="col-span-2">
                                <input placeholder="Unif." type="number" step="0.1" className="w-full p-1 border rounded" value={size.uniformity || ''} onChange={e => handleSizeChange(index, 'uniformity', parseFloat(e.target.value))} />
                            </div>
                            <div className="col-span-2 flex justify-end">
                                <button type="button" onClick={() => removeSize(index)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {(!formData.sizes || formData.sizes.length === 0) && (
                        <p className="text-center text-slate-400 py-4 text-sm italic">No hay tallas definidas</p>
                    )}
                </div>
            </div>

            {/* Defects */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                        <span>⚠️</span> Defectos
                    </h4>
                    <button type="button" onClick={addDefect} className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1">
                        <Plus className="w-4 h-4" /> Agregar
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {formData.defects?.map((defect, index) => (
                        <div key={index} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg text-sm">
                            <input
                                placeholder="Nombre del defecto"
                                className="flex-1 p-1 border rounded font-medium"
                                value={defect.defect}
                                onChange={e => handleDefectChange(index, 'defect', e.target.value)}
                            />
                            <input
                                placeholder="Límite"
                                className="w-24 p-1 border rounded text-right"
                                value={defect.limit}
                                onChange={e => handleDefectChange(index, 'limit', e.target.value)}
                            />
                            <button type="button" onClick={() => removeDefect(index)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {(!formData.defects || formData.defects.length === 0) && (
                        <p className="col-span-2 text-center text-slate-400 py-4 text-sm italic">No hay defectos definidos</p>
                    )}
                </div>
            </div>

            {/* Submit */}
            <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all flex justify-center items-center gap-2"
                >
                    <Save className="w-5 h-5" />
                    Guardar Ficha Técnica
                </button>
            </div>
        </form>
    );
}

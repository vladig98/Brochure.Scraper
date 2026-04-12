import { useState, useEffect } from 'react';
import { Car, Settings2, Check } from 'lucide-react';
import { useOptimization } from '../context/OptimizationContext';
import type { FuelType } from '../context/OptimizationContext';

interface MenuItem {
    text: string;
    value: string;
}

interface MenuState {
    years: MenuItem[];
    makes: MenuItem[];
    models: MenuItem[];
    options: MenuItem[];
}

export function VehicleWizard() {
    const { vehicle, updateVehicle } = useOptimization();
    const [mode, setMode] = useState<'manual' | 'wizard'>('manual');
    const [manualInput, setManualInput] = useState(vehicle.consumption.toFixed(1));
    const [saved, setSaved] = useState(false);

    const [step, setStep] = useState({ year: '', make: '', model: '' });
    const [menus, setMenus] = useState<MenuState>({
        years: [],
        makes: [],
        models: [],
        options: []
    });

    // Helper: Fixes API returning object instead of array for single items
    const normalizeMenu = (data: any) => {
        if (!data) return [];
        return Array.isArray(data.menuItem) ? data.menuItem : [data.menuItem];
    };

    // 1. Fetch Years on mount
    useEffect(() => {
        fetch('https://www.fueleconomy.gov/ws/rest/vehicle/menu/year', { headers: { 'Accept': 'application/json' } })
            .then(res => res.json())
            .then(data => setMenus(prev => ({ ...prev, years: normalizeMenu(data) })));
    }, []);

    // 2. Fetch Makes
    useEffect(() => {
        if (step.year) {
            fetch(`https://www.fueleconomy.gov/ws/rest/vehicle/menu/make?year=${step.year}`, { headers: { 'Accept': 'application/json' } })
                .then(res => res.json())
                .then(data => setMenus(prev => ({ ...prev, makes: normalizeMenu(data), models: [], options: [] })));
        }
    }, [step.year]);

    // 3. Fetch Models
    useEffect(() => {
        if (step.make) {
            fetch(`https://www.fueleconomy.gov/ws/rest/vehicle/menu/model?year=${step.year}&make=${step.make}`, { headers: { 'Accept': 'application/json' } })
                .then(res => res.json())
                .then(data => setMenus(prev => ({ ...prev, models: normalizeMenu(data), options: [] })));
        }
    }, [step.make]);

    // 4. Fetch Trims
    useEffect(() => {
        if (step.model) {
            fetch(`https://www.fueleconomy.gov/ws/rest/vehicle/menu/options?year=${step.year}&make=${step.make}&model=${step.model}`, { headers: { 'Accept': 'application/json' } })
                .then(res => res.json())
                .then(data => setMenus(prev => ({ ...prev, options: normalizeMenu(data) })));
        }
    }, [step.model]);

    const selectFromDb = async (id: string) => {
        if (!id) return;
        try {
            const res = await fetch(`https://www.fueleconomy.gov/ws/rest/vehicle/${id}`, {
                headers: { 'Accept': 'application/json' }
            });
            const data = await res.json();

            // Convert MPG to L/100km
            const l100km = 235.215 / parseFloat(data.comb08);

            // Use the consolidated updater
            updateVehicle({ consumption: l100km });

            setManualInput(l100km.toFixed(1));
            triggerSaveEffect();
        } catch (error) {
            console.error("Failed to fetch vehicle details", error);
        }
    };

    const handleManualSave = () => {
        const val = parseFloat(manualInput);
        if (!isNaN(val) && val > 0) {
            // Use the consolidated updater
            updateVehicle({ consumption: val });
            triggerSaveEffect();
        }
    };

    const triggerSaveEffect = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const fuelOptions: { id: FuelType; label: string }[] = [
        { id: 'A95', label: 'Petrol' },
        { id: 'Diesel', label: 'Diesel' },
        { id: 'LPG', label: 'LPG' },
    ];

    return (
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-6">

            {/* 1. Fuel Type Selector (Always Visible) */}
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fuel Type</label>
                <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
                    {fuelOptions.map((opt) => (
                        <button
                            key={opt.id}
                            /* Pass only the fuelType update; the context handles the rest */
                            onClick={() => updateVehicle({ fuelType: opt.id })}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${vehicle.fuelType === opt.id
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. Mode Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-lg">
                <button onClick={() => setMode('manual')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md transition-all ${mode === 'manual' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Settings2 size={16} /> Manual
                </button>
                <button onClick={() => setMode('wizard')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md transition-all ${mode === 'wizard' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Car size={16} /> Database
                </button>
            </div>

            {/* 3. Input Areas */}
            {mode === 'manual' ? (
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <input
                            type="number"
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                            className="w-full pl-3 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">L/100</span>
                    </div>
                    <button onClick={handleManualSave} className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-colors">
                        {saved ? <Check size={16} className="text-emerald-400" /> : 'Save'}
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" onChange={(e) => setStep({ ...step, year: e.target.value })} value={step.year}>
                        <option value="">1. Year</option>
                        {menus.years.map(y => <option key={y.value} value={y.value}>{y.text}</option>)}
                    </select>
                    {step.year && (
                        <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" onChange={(e) => setStep({ ...step, make: e.target.value })} value={step.make}>
                            <option value="">2. Make</option>
                            {menus.makes.map(m => <option key={m.value} value={m.value}>{m.text}</option>)}
                        </select>
                    )}
                    {step.make && (
                        <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" onChange={(e) => setStep({ ...step, model: e.target.value })} value={step.model}>
                            <option value="">3. Model</option>
                            {menus.models.map(m => <option key={m.value} value={m.value}>{m.text}</option>)}
                        </select>
                    )}
                    {step.model && (
                        <select className="w-full p-2.5 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl text-sm outline-none font-medium" onChange={(e) => selectFromDb(e.target.value)}>
                            <option value="">4. Engine / Trim</option>
                            {menus.options.map(o => <option key={o.value} value={o.value}>{o.text}</option>)}
                        </select>
                    )}
                </div>
            )}
            {saved && mode === 'wizard' && <p className="text-[10px] font-bold text-emerald-600 text-center uppercase tracking-tighter">Database value applied</p>}
        </div>
    );
}
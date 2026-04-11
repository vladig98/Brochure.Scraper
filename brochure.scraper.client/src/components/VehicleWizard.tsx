import { useState, useEffect } from 'react';
import { Car, Settings2, Check } from 'lucide-react';
import { useOptimization } from '../context/OptimizationContext';

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
    const { consumption, setConsumption } = useOptimization();
    const [mode, setMode] = useState<'manual' | 'wizard'>('manual');
    const [manualInput, setManualInput] = useState(consumption.toFixed(1));
    const [saved, setSaved] = useState(false);

    const [step, setStep] = useState({ year: '', make: '', model: '' });
    const [menus, setMenus] = useState<MenuState>({
        years: [],
        makes: [],
        models: [],
        options: []
    });

    // Helper: The API returns an object instead of an array if there's only 1 item. This fixes it.
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

    // 2. Fetch Makes when Year changes
    useEffect(() => {
        if (step.year) {
            setStep(s => ({ ...s, make: '', model: '' })); // Reset downstream
            fetch(`https://www.fueleconomy.gov/ws/rest/vehicle/menu/make?year=${step.year}`, { headers: { 'Accept': 'application/json' } })
                .then(res => res.json())
                .then(data => setMenus(prev => ({ ...prev, makes: normalizeMenu(data), models: [], options: [] })));
        }
    }, [step.year]);

    // 3. Fetch Models when Make changes
    useEffect(() => {
        if (step.make) {
            setStep(s => ({ ...s, model: '' })); // Reset downstream
            fetch(`https://www.fueleconomy.gov/ws/rest/vehicle/menu/model?year=${step.year}&make=${step.make}`, { headers: { 'Accept': 'application/json' } })
                .then(res => res.json())
                .then(data => setMenus(prev => ({ ...prev, models: normalizeMenu(data), options: [] })));
        }
    }, [step.make]);

    // 4. Fetch Options/Trims when Model changes
    useEffect(() => {
        if (step.model) {
            fetch(`https://www.fueleconomy.gov/ws/rest/vehicle/menu/options?year=${step.year}&make=${step.make}&model=${step.model}`, { headers: { 'Accept': 'application/json' } })
                .then(res => res.json())
                .then(data => setMenus(prev => ({ ...prev, options: normalizeMenu(data) })));
        }
    }, [step.model]);

    const selectVehicle = async (id: string) => {
        if (!id) return;
        const res = await fetch(`https://www.fueleconomy.gov/ws/rest/vehicle/${id}`, { headers: { 'Accept': 'application/json' } });
        const data = await res.json();

        // Convert MPG to L/100km: 235.215 / MPG
        const l100km = 235.215 / parseFloat(data.comb08);
        setConsumption(l100km);
        setManualInput(l100km.toFixed(1));

        // Show success state
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleManualSave = () => {
        const val = parseFloat(manualInput);
        if (!isNaN(val) && val > 0) {
            setConsumption(val);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
    };

    return (
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">

            {/* Mode Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-lg">
                <button
                    onClick={() => setMode('manual')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md transition-all ${mode === 'manual' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Settings2 size={16} /> Manual
                </button>
                <button
                    onClick={() => setMode('wizard')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md transition-all ${mode === 'wizard' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Car size={16} /> Database
                </button>
            </div>

            {/* Manual Input Mode */}
            {mode === 'manual' && (
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <input
                            type="number"
                            step="0.1"
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                            className="w-full pl-3 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            L/100
                        </span>
                    </div>
                    <button
                        onClick={handleManualSave}
                        className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                    >
                        {saved ? <Check size={16} className="text-emerald-400" /> : 'Save'}
                    </button>
                </div>
            )}

            {/* Wizard Mode */}
            {mode === 'wizard' && (
                <div className="space-y-3">
                    <select
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors"
                        onChange={(e) => setStep({ ...step, year: e.target.value })}
                        value={step.year}
                    >
                        <option value="">1. Select Year</option>
                        {menus.years.map(y => <option key={y.value} value={y.value}>{y.text}</option>)}
                    </select>

                    {step.year && (
                        <select
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors animate-in fade-in"
                            onChange={(e) => setStep({ ...step, make: e.target.value })}
                            value={step.make}
                        >
                            <option value="">2. Select Make</option>
                            {menus.makes.map(m => <option key={m.value} value={m.value}>{m.text}</option>)}
                        </select>
                    )}

                    {step.make && (
                        <select
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors animate-in fade-in"
                            onChange={(e) => setStep({ ...step, model: e.target.value })}
                            value={step.model}
                        >
                            <option value="">3. Select Model</option>
                            {menus.models.map(m => <option key={m.value} value={m.value}>{m.text}</option>)}
                        </select>
                    )}

                    {step.model && (
                        <select
                            className="w-full p-2.5 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors animate-in fade-in font-medium"
                            onChange={(e) => selectVehicle(e.target.value)}
                        >
                            <option value="">4. Select Engine / Trim</option>
                            {menus.options.map(o => <option key={o.value} value={o.value}>{o.text}</option>)}
                        </select>
                    )}

                    {saved && <p className="text-xs font-bold text-emerald-600 text-center animate-in fade-in">Vehicle saved successfully!</p>}
                </div>
            )}
        </div>
    );
}
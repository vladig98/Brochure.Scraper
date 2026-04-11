import { useOptimization } from '../context/OptimizationContext';
import { getDistanceKm } from '../utils/geo';
import { X, Download } from 'lucide-react';
import type { Product } from '../types';

export function BasketSidebar() {
    const { basket, removeFromBasket, storeLocations, homeCoords, consumption, fuelPrices } = useOptimization();

    const exportShoppingList = () => {
        if (basket.length === 0) return;

        // 1. Group items by store for a better list
        const grouped = basket.reduce((acc, item) => {
            if (!acc[item.storeName]) acc[item.storeName] = [];
            acc[item.storeName].push(item);
            return acc;
        }, {} as Record<string, typeof basket>);

        // 2. Build the text string
        let content = `🛒 SHOPPING LIST - ${new Date().toLocaleDateString()}\n`;
        content += `===============================\n\n`;

        Object.entries(grouped).forEach(([store, items]) => {
            content += `📍 ${store.toUpperCase()}\n`;
            items.forEach(item => {
                const price = item.prices.currentPriceEur || item.prices.currentPriceBgn;
                content += `- [ ] ${item.title} (${price})\n`;
            });
            content += `\n`;
        });

        // 3. Create and trigger download
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `shopping-list-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const calculateOptimizedTravelCost = () => {
        // 1. Get unique stores in the basket
        const uniqueStoreNames = Array.from(new Set(basket.map(item => item.storeName)));

        // 2. Get their coordinates (filter out stores with missing locations)
        const activeStores = uniqueStoreNames
            .map(name => ({ name, coords: storeLocations[name] }))
            .filter(s => s.coords && homeCoords);

        if (activeStores.length === 0 || !homeCoords) return 0;

        // 3. Sort stores by distance from home to create a logical path
        const sortedPath = [...activeStores].sort((a, b) => {
            const distA = getDistanceKm(homeCoords.lat, homeCoords.lng, a.coords.lat, a.coords.lng);
            const distB = getDistanceKm(homeCoords.lat, homeCoords.lng, b.coords.lat, b.coords.lng);
            return distA - distB;
        });

        let totalKm = 0;
        let currentPos = homeCoords;

        // 4. Calculate the chain: Home -> S1 -> S2 -> ... -> Sn
        sortedPath.forEach(store => {
            totalKm += getDistanceKm(currentPos.lat, currentPos.lng, store.coords.lat, store.coords.lng);
            currentPos = store.coords; // Move the car to the current store
        });

        // 5. Add the trip back Home from the last store
        totalKm += getDistanceKm(currentPos.lat, currentPos.lng, homeCoords.lat, homeCoords.lng);

        // 6. Final math
        const pricePerLiter = fuelPrices?.A95 || 2.65;
        const totalCost = (totalKm / 100) * consumption * pricePerLiter;

        return totalCost;
    };

    const totalProductCost = basket.reduce((acc, item) => {
        const price = parseFloat(item.prices.currentPriceEur.replace(',', '.').replace(/[^0-9.]/g, ''));
        return acc + (price * item.quantity);
    }, 0);

    return (
        <div className="w-full bg-white border-l border-slate-200 h-screen sticky top-0 p-6 flex flex-col shadow-2xl">
            <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                🛒 Optimization Basket
            </h2>

            <div className="flex-1 overflow-y-auto space-y-4">
                {basket.map((product, idx) => (
                    <BasketItem
                        key={`${product.title}-${idx}`}
                        item={product}
                        onRemove={() => removeFromBasket(product.title, product.storeName)}
                    />
                ))}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200 space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Products Total:</span>
                    <span className="font-bold">{totalProductCost.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-slate-500 text-sm">
                    <span>⛽ Optimized Fuel (Round Trip)</span>
                    <span className="font-bold text-slate-900">{calculateOptimizedTravelCost().toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-lg font-black text-slate-900 pt-2 border-t border-dashed">
                    <span>True Cost:</span>
                    <span>{(totalProductCost + calculateOptimizedTravelCost()).toFixed(2)} €</span>
                </div>

                <button
                    onClick={exportShoppingList}
                    disabled={basket.length === 0}
                    className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                >
                    <Download size={18} />
                    Export Shopping List
                </button>
            </div>
        </div>
    );
}

function BasketItem({ item, onRemove }: { item: Product, onRemove: () => void }) {
    // Standardize price display logic
    const price = parseFloat(item.prices.currentPriceEur?.replace(',', '.') || '0').toFixed(2);
    const priceBgn = parseFloat(item.prices.currentPriceBgn?.replace(',', '.') || '0').toFixed(2);

    return (
        <div className="group relative bg-white border border-slate-100 rounded-xl p-4 mb-3 shadow-sm hover:border-indigo-200 transition-all">
            <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                    {/* Store Tag */}
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-tight mb-1">
                        {item.storeName}
                    </p>
                    {/* Title */}
                    <h4 className="text-sm font-semibold text-slate-800 truncate leading-snug">
                        {item.title}
                    </h4>
                    {item.subtitle && (
                        <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                    )}
                </div>

                {/* Price Stack */}
                <div className="text-right flex flex-col items-end">
                    <span className="text-sm font-black text-slate-900">
                        {price} <span className="text-[10px] text-slate-400">€</span>
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">
                        {priceBgn} лв.
                    </span>
                </div>
            </div>

            {/* Optional: Simple remove button that appears on hover */}
            <button
                onClick={onRemove}
                className="absolute -top-2 -right-2 bg-white border border-slate-200 text-slate-400 hover:text-red-500 size-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
            >
                <X size={12} />
            </button>
        </div>
    );
}
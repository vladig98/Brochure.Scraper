import React, { useMemo } from 'react';
import { Download } from 'lucide-react';
import { useOptimization } from '../context/OptimizationContext';
import { getDistanceKm } from '../utils/geo';
import { exportShoppingListToFile } from '../utils/exportUtils';
import { BasketItem } from './BasketItem';
import type { StoreLocation, ScraperType } from '../types';

export const BasketSidebar: React.FC = () => {
    const { basket, removeFromBasket, storeLocations, homeCoords, vehicle, fuelPrices } = useOptimization();

    const handleExport = () => {
        exportShoppingListToFile(basket);
    };

    const optimizedTravelCost = useMemo(() => {
        const uniqueStoreNames = Array.from(new Set(basket.map((item) => item.storeName)));

        const activeStores = uniqueStoreNames
            .map((name) => ({
                name: name as ScraperType,
                coords: storeLocations[name as ScraperType]
            }))
            .filter((s): s is { name: ScraperType; coords: StoreLocation } =>
                Boolean(s.coords && homeCoords)
            );

        if (activeStores.length === 0 || !homeCoords) {
            return 0;
        }

        const sortedPath = [...activeStores].sort((a, b) => {
            const distA = getDistanceKm(homeCoords.lat, homeCoords.lng, a.coords.lat, a.coords.lng);
            const distB = getDistanceKm(homeCoords.lat, homeCoords.lng, b.coords.lat, b.coords.lng);
            return distA - distB;
        });

        let totalKm = 0;
        let currentPos = homeCoords;

        sortedPath.forEach((store) => {
            totalKm += getDistanceKm(currentPos.lat, currentPos.lng, store.coords.lat, store.coords.lng);
            currentPos = store.coords;
        });

        totalKm += getDistanceKm(currentPos.lat, currentPos.lng, homeCoords.lat, homeCoords.lng);

        const currentFuelPrice = fuelPrices?.[vehicle.fuelType] || 2.65;
        return (totalKm / 100) * vehicle.consumption * currentFuelPrice;
    }, [basket, storeLocations, homeCoords, fuelPrices, vehicle]);

    const totalProductCost = useMemo(() => {
        return basket.reduce((acc, item) => {
            const price = parseFloat(item.prices.currentPriceEur.replace(',', '.').replace(/[^0-9.]/g, ''));
            return acc + (price * item.quantity);
        }, 0);
    }, [basket]);

    return (
        <div className="w-full bg-white border-l border-slate-200 h-screen sticky top-0 p-6 flex flex-col shadow-2xl">
            <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                🛒 Optimization Basket
            </h2>

            <div className="flex-1 overflow-y-auto space-y-4">
                {basket.map((product) => (
                    <BasketItem
                        key={`${product.storeName}-${product.title}`}
                        item={product}
                        onRemove={() => removeFromBasket(product.title, product.storeName)}
                    />
                ))}
                {basket.length === 0 && (
                    <div className="text-center text-slate-400 mt-10 text-sm">
                        Your basket is currently empty.
                    </div>
                )}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200 space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Products Total:</span>
                    <span className="font-bold">{totalProductCost.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-slate-500 text-sm">
                    <span>⛽ Optimized Fuel (Round Trip)</span>
                    <span className="font-bold text-slate-900">{optimizedTravelCost.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-lg font-black text-slate-900 pt-2 border-t border-dashed">
                    <span>True Cost:</span>
                    <span>{(totalProductCost + optimizedTravelCost).toFixed(2)} €</span>
                </div>

                <button
                    onClick={handleExport}
                    disabled={basket.length === 0}
                    className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                >
                    <Download size={18} />
                    Export Shopping List
                </button>
            </div>
        </div>
    );
};
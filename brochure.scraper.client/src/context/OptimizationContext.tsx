import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Product } from '../types';

interface FuelPrices {
    A95: number;
    Diesel: number;
    LPG: number;
    Methane: number;
}
export interface StoreLocation {
    lat: number;
    lng: number;
    address?: string;
}

interface BasketItem extends Product {
    quantity: number;
}

interface OptimizationState {
    fuelPrices: FuelPrices | null;
    consumption: number; // L/100km
    homeLocation: string; // "Sofia, Mladost" etc.
    storeLocations: Record<string, StoreLocation>;
    homeCoords: StoreLocation | null;
    basket: BasketItem[];
    setStoreLocation: (store: string, loc: StoreLocation) => void;
    setConsumption: (val: number) => void;
    setHomeLocation: (val: string) => void;
    setHomeCoords: (loc: StoreLocation) => void;
    addToBasket: (product: Product) => void;
    removeFromBasket: (title: string, store: string) => void;
    clearBasket: () => void;
}

const OptimizationContext = createContext<OptimizationState | undefined>(undefined);

export const OptimizationProvider = ({ children }: { children: React.ReactNode }) => {
    const [fuelPrices, setFuelPrices] = useState<FuelPrices | null>(null);
    const [homeLocation, setHomeLocation] = useState('');
    const [basket, setBasket] = useState<BasketItem[]>([]);

    const [consumption, setConsumption] = useState<number>(() => {
        const saved = localStorage.getItem('vehicle_consumption');
        return saved ? parseFloat(saved) : 7.5; // Default to 7.5 if nothing found
    });

    useEffect(() => {
        localStorage.setItem('vehicle_consumption', consumption.toString());
    }, [consumption]);

    const [storeLocations, setStoreLocations] = useState<Record<string, StoreLocation>>(() => {
        const saved = localStorage.getItem('store_locations');
        return saved ? JSON.parse(saved) : {};
    });

    const setStoreLocation = (store: string, loc: StoreLocation) => {
        const newLocs = { ...storeLocations, [store]: loc };
        setStoreLocations(newLocs);
        localStorage.setItem('store_locations', JSON.stringify(newLocs));
    };

    const [homeCoords, setHomeCoords] = useState<StoreLocation | null>(() => {
        const saved = localStorage.getItem('home_coords');
        return saved ? JSON.parse(saved) : null;
    });

    const updateHomeCoords = (loc: StoreLocation) => {
        setHomeCoords(loc);
        localStorage.setItem('home_coords', JSON.stringify(loc));
    };

    const addToBasket = (product: Product) => {
        setBasket(prev => {
            const exists = prev.find(item => item.title === product.title && item.storeName === product.storeName);
            if (exists) {
                return prev.map(item =>
                    item.title === product.title ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const removeFromBasket = (title: string, store: string) => {
        setBasket(prev => prev.filter(item =>
            item.title !== title || item.storeName !== store
        ));
    };

    const clearBasket = () => {
        setBasket([]);
    };

    useEffect(() => {
        fetch('fuel_prices.json')
            .then(res => res.json())
            .then(setFuelPrices)
            .catch(() => console.error("Fuel data not found"));
    }, []);

    return (
        <OptimizationContext.Provider value={{
            fuelPrices,
            consumption,
            homeLocation,
            storeLocations,
            homeCoords,
            basket,
            setStoreLocation,
            setConsumption,
            setHomeLocation,
            setHomeCoords: updateHomeCoords,
            addToBasket,
            removeFromBasket,
            clearBasket
        }}>
            {children}
        </OptimizationContext.Provider>
    );
};

export const useOptimization = () => {
    const context = useContext(OptimizationContext);
    if (!context) throw new Error("useOptimization must be used within Provider");
    return context;
};
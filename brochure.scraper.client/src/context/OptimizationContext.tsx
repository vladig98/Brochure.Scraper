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

export type FuelType = 'A95' | 'Diesel' | 'LPG';

interface Vehicle {
    consumption: number;
    fuelType: FuelType;
}

interface OptimizationState {
    fuelPrices: FuelPrices | null;
    homeLocation: string;
    storeLocations: Record<string, StoreLocation>;
    homeCoords: StoreLocation | null;
    basket: BasketItem[];
    vehicle: Vehicle; // Consolidated source of truth
    setStoreLocation: (store: string, loc: StoreLocation) => void;
    setHomeLocation: (val: string) => void;
    setHomeCoords: (loc: StoreLocation) => void;
    addToBasket: (product: Product) => void;
    removeFromBasket: (title: string, store: string) => void;
    clearBasket: () => void;
    updateVehicle: (updates: Partial<Vehicle>) => void; // Partial allowed for specific updates
}

const OptimizationContext = createContext<OptimizationState | undefined>(undefined);

export const OptimizationProvider = ({ children }: { children: React.ReactNode }) => {
    const [fuelPrices, setFuelPrices] = useState<FuelPrices | null>(null);
    const [homeLocation, setHomeLocation] = useState('');
    const [basket, setBasket] = useState<BasketItem[]>([]);

    // Unified Vehicle State (Handles both Fuel and Consumption)
    const [vehicle, setVehicle] = useState<Vehicle>(() => {
        const saved = localStorage.getItem('user_vehicle');
        return saved ? JSON.parse(saved) : { consumption: 7.5, fuelType: 'A95' };
    });

    // Save vehicle object whenever it changes
    useEffect(() => {
        localStorage.setItem('user_vehicle', JSON.stringify(vehicle));
    }, [vehicle]);

    // Unified update function
    const updateVehicle = (updates: Partial<Vehicle>) => {
        setVehicle(prev => ({ ...prev, ...updates }));
    };

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
                    item.title === product.title && item.storeName === product.storeName
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
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

    const clearBasket = () => setBasket([]);

    useEffect(() => {
        fetch('fuel_prices.json')
            .then(res => res.json())
            .then(setFuelPrices)
            .catch(() => console.error("Fuel data not found"));
    }, []);

    return (
        <OptimizationContext.Provider value={{
            fuelPrices,
            homeLocation,
            storeLocations,
            homeCoords,
            basket,
            vehicle,
            setStoreLocation,
            setHomeLocation,
            setHomeCoords: updateHomeCoords,
            addToBasket,
            removeFromBasket,
            clearBasket,
            updateVehicle
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
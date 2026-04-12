import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Product, FuelPrices, StoreLocation, BasketItem, Vehicle } from '../types';

interface OptimizationState {
    fuelPrices: FuelPrices | null;
    homeLocation: string;
    storeLocations: Record<string, StoreLocation>;
    homeCoords: StoreLocation | null;
    basket: BasketItem[];
    vehicle: Vehicle;
    setStoreLocation: (store: string, loc: StoreLocation) => void;
    setHomeLocation: (val: string) => void;
    setHomeCoords: (loc: StoreLocation) => void;
    addToBasket: (product: Product) => void;
    removeFromBasket: (title: string, store: string) => void;
    clearBasket: () => void;
    updateVehicle: (updates: Partial<Vehicle>) => void;
}

const OptimizationContext = createContext<OptimizationState | undefined>(undefined);

export const OptimizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [fuelPrices, setFuelPrices] = useState<FuelPrices | null>(null);
    const [homeLocation, setHomeLocation] = useState<string>('');
    const [basket, setBasket] = useState<BasketItem[]>([]);

    const [vehicle, setVehicle] = useState<Vehicle>(() => {
        const saved = localStorage.getItem('user_vehicle');
        if (saved) {
            return JSON.parse(saved) as Vehicle;
        }
        return { consumption: 7.5, fuelType: 'A95' };
    });

    const [storeLocations, setStoreLocations] = useState<Record<string, StoreLocation>>(() => {
        const saved = localStorage.getItem('store_locations');
        if (saved) {
            return JSON.parse(saved) as Record<string, StoreLocation>;
        }
        return {};
    });

    const [homeCoords, setHomeCoords] = useState<StoreLocation | null>(() => {
        const saved = localStorage.getItem('home_coords');
        if (saved) {
            return JSON.parse(saved) as StoreLocation;
        }
        return null;
    });

    useEffect(() => {
        localStorage.setItem('user_vehicle', JSON.stringify(vehicle));
    }, [vehicle]);

    useEffect(() => {
        const fetchFuelPrices = async () => {
            try {
                const res = await fetch('fuel_prices.json');
                const data = await res.json();
                setFuelPrices(data as FuelPrices);
            } catch (error) {
                console.error("Fuel data not found", error);
            }
        };
        fetchFuelPrices();
    }, []);

    const updateVehicle = useCallback((updates: Partial<Vehicle>) => {
        setVehicle((prev) => ({ ...prev, ...updates }));
    }, []);

    const setStoreLocation = useCallback((store: string, loc: StoreLocation) => {
        setStoreLocations((prev) => {
            const newLocs = { ...prev, [store]: loc };
            localStorage.setItem('store_locations', JSON.stringify(newLocs));
            return newLocs;
        });
    }, []);

    const updateHomeCoords = useCallback((loc: StoreLocation) => {
        setHomeCoords(loc);
        localStorage.setItem('home_coords', JSON.stringify(loc));
    }, []);

    const addToBasket = useCallback((product: Product) => {
        setBasket((prev) => {
            const exists = prev.find((item) => item.title === product.title && item.storeName === product.storeName);
            if (exists) {
                return prev.map((item) =>
                    item.title === product.title && item.storeName === product.storeName
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    }, []);

    const removeFromBasket = useCallback((title: string, store: string) => {
        setBasket((prev) => prev.filter((item) => item.title !== title || item.storeName !== store));
    }, []);

    const clearBasket = useCallback(() => {
        setBasket([]);
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

export const useOptimization = (): OptimizationState => {
    const context = useContext(OptimizationContext);
    if (!context) {
        throw new Error("useOptimization must be used within OptimizationProvider");
    }
    return context;
};
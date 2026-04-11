import React, { createContext, useContext, useState, useEffect } from 'react';

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

interface OptimizationState {
    fuelPrices: FuelPrices | null;
    consumption: number; // L/100km
    homeLocation: string; // "Sofia, Mladost" etc.
    storeLocations: Record<string, StoreLocation>;
    homeCoords: StoreLocation | null;
    setStoreLocation: (store: string, loc: StoreLocation) => void;
    setConsumption: (val: number) => void;
    setHomeLocation: (val: string) => void;
    setHomeCoords: (loc: StoreLocation) => void;
}

const OptimizationContext = createContext<OptimizationState | undefined>(undefined);

export const OptimizationProvider = ({ children }: { children: React.ReactNode }) => {
    const [fuelPrices, setFuelPrices] = useState<FuelPrices | null>(null);
    const [consumption, setConsumption] = useState(8.0); // Default L/100km
    const [homeLocation, setHomeLocation] = useState('');

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

    useEffect(() => {
        fetch('fuel_prices.json')
            .then(res => res.json())
            .then(setFuelPrices)
            .catch(() => console.error("Fuel data not found"));
    }, []);

    return (
        <OptimizationContext.Provider value={{ fuelPrices, consumption, homeLocation, storeLocations, homeCoords, setStoreLocation, setConsumption, setHomeLocation, setHomeCoords: updateHomeCoords }}>
            {children}
        </OptimizationContext.Provider>
    );
};

export const useOptimization = () => {
    const context = useContext(OptimizationContext);
    if (!context) throw new Error("useOptimization must be used within Provider");
    return context;
};
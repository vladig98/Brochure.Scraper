// --- Core Types ---
export type ScraperType = 'Kaufland' | 'Lidl' | 'Billa' | 'Metro' | 'Fantastico';
export type FuelType = 'A95' | 'Diesel' | 'LPG' | 'Methane';

// --- Price & Product Models ---
export interface PriceInfo {
    currentPriceBgn: string;
    currentPriceEur: string;
    oldPriceBgn: string;
    oldPriceEur: string;
    unitPriceBgn: string;
    discount: string;
}

export interface Product {
    dateFrom: string;
    dateTo: string;
    title: string;
    subtitle: string;
    prices: PriceInfo;
    detailTitle: string;
    detailDescription: string;
    categoryName: string;
    storeName: ScraperType;
}

// --- Optimization & Vehicle Models ---
export interface FuelPrices {
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

export interface Vehicle {
    consumption: number;
    fuelType: FuelType;
}

// --- Application State Models ---
export interface BasketItem extends Product {
    quantity: number;
}
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

export type ScraperType = 'Kaufland' | 'Lidl' | 'Billa' | 'Metro' | 'Fantastico';
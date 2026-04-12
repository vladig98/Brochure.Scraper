import React from 'react';
import { X } from 'lucide-react';
import type { BasketItem as BasketItemType } from '../types';

interface BasketItemProps {
    item: BasketItemType;
    onRemove: () => void;
}

export const BasketItem: React.FC<BasketItemProps> = ({ item, onRemove }) => {
    const priceEur = parseFloat(item.prices.currentPriceEur?.replace(',', '.') || '0').toFixed(2);
    const priceBgn = parseFloat(item.prices.currentPriceBgn?.replace(',', '.') || '0').toFixed(2);

    return (
        <div className="group relative bg-white border border-slate-100 rounded-xl p-4 mb-3 shadow-sm hover:border-indigo-200 transition-all">
            <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-tight mb-1">
                        {item.storeName}
                    </p>
                    <h4 className="text-sm font-semibold text-slate-800 truncate leading-snug">
                        {item.title}
                    </h4>
                    {item.subtitle && (
                        <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                    )}
                </div>

                <div className="text-right flex flex-col items-end">
                    <span className="text-sm font-black text-slate-900">
                        {priceEur} <span className="text-[10px] text-slate-400">€</span>
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">
                        {priceBgn} лв.
                    </span>
                    <span className="text-xs font-bold text-slate-500 mt-1">
                        Qty: {item.quantity}
                    </span>
                </div>
            </div>

            <button
                onClick={onRemove}
                aria-label="Remove item"
                className="absolute -top-2 -right-2 bg-white border border-slate-200 text-slate-400 hover:text-red-500 size-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
            >
                <X size={12} />
            </button>
        </div>
    );
};
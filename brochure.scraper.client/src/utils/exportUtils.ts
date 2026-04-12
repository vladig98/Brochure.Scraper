import type { BasketItem } from '../types';

export const exportShoppingListToFile = (basket: BasketItem[]): void => {
    if (basket.length === 0) {
        return;
    }

    const groupedItems = basket.reduce<Record<string, BasketItem[]>>((acc, item) => {
        if (!acc[item.storeName]) {
            acc[item.storeName] = [];
        }
        acc[item.storeName].push(item);
        return acc;
    }, {});

    let content = `🛒 SHOPPING LIST - ${new Date().toLocaleDateString()}\n`;
    content += `===============================\n\n`;

    Object.entries(groupedItems).forEach(([store, items]) => {
        content += `📍 ${store.toUpperCase()}\n`;
        items.forEach((item) => {
            const price = item.prices.currentPriceEur;
            const total = parseFloat(price?.toLowerCase().replace(',', '.').replace('лв.', '').replace('лв', '').replace('€', '') || '0') * item.quantity;
            content += `- [ ] ${item.title} x ${item.quantity} (${price} x ${item.quantity} = ${total.toFixed(2).replace('.', ',')} €)\n`;
        });
        content += `\n`;
    });

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
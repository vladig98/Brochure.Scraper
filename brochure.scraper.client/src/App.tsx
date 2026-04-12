import { useState, useMemo, useEffect } from 'react';
import { Search, Calendar, ChevronLeft, ChevronRight, Tag, AlertCircle, Loader2, MapPin, ShoppingCart } from 'lucide-react';
import { useOptimization } from './context/OptimizationContext';
import { VehicleWizard } from './components/VehicleWizard';
import { StoreMapModal } from './components/StoreMapModal';
import { BasketSidebar } from './components/BasketSidebar';
import type { Product, ScraperType } from './types';
import { getDistanceKm } from './utils/geo';

const ITEMS_PER_PAGE = 24;

// --- Brand Styling Dictionary ---
const storeStyles: Record<string, string> = {
    Kaufland: 'bg-red-600 text-white ring-red-600/30 border-red-600',
    Lidl: 'bg-blue-600 text-white ring-blue-600/30 border-blue-600',
    Billa: 'bg-yellow-400 text-slate-900 ring-yellow-400/30 border-yellow-400',
    Metro: 'bg-slate-800 text-white ring-slate-800/30 border-slate-800',
    Fantastico: 'bg-emerald-500 text-white ring-emerald-500/30 border-emerald-500',
    All: 'bg-slate-900 text-white ring-slate-900/30 border-slate-900'
};

const storeBadges: Record<string, string> = {
    Kaufland: 'text-red-700 bg-red-50/80 border-red-200',
    Lidl: 'text-blue-700 bg-blue-50/80 border-blue-200',
    Billa: 'text-yellow-800 bg-yellow-50/80 border-yellow-300',
    Metro: 'text-slate-800 bg-slate-100 border-slate-300',
    Fantastico: 'text-emerald-700 bg-emerald-50/80 border-emerald-200',
};

// --- Main App Component ---
export default function App() {
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const response = await fetch('products.json');
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                setAllProducts(data.products || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to connect to backend');
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                    <Loader2 className="animate-spin text-indigo-600 size-10 mb-4" />
                    <p className="text-slate-600 font-medium tracking-wide">Aggregating latest deals...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="max-w-md w-full p-8 bg-white rounded-3xl shadow-xl border border-red-100 text-center">
                    <div className="mx-auto bg-red-50 text-red-500 size-16 rounded-full flex items-center justify-center mb-6 ring-4 ring-red-50/50">
                        <AlertCircle size={32} strokeWidth={2} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Connection Error</h2>
                    <p className="text-slate-500 mb-8 leading-relaxed">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return <ProductDashboard allProducts={allProducts} />;
}

// --- Dashboard Component (Internal) ---
function ProductDashboard({ allProducts }: { allProducts: Product[] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStore, setSelectedStore] = useState<ScraperType | 'All'>('All');
    const [currentPage, setCurrentPage] = useState(1);
    const { vehicle, basket, addToBasket, storeLocations, setStoreLocation, homeCoords, setHomeCoords } = useOptimization();
    const [showWizard, setShowWizard] = useState(false);
    const [activeMapStore, setActiveMapStore] = useState<string | null>(null);
    const [isMobileBasketOpen, setIsMobileBasketOpen] = useState(false);

    const filteredProducts = useMemo(() => {
        const filtered = allProducts.filter((p) => {
            const matchesStore = selectedStore === 'All' || p.storeName === selectedStore;
            const searchContent = `${p.title} ${p.subtitle} ${p.detailTitle} ${p.detailDescription} ${p.categoryName} ${p.storeName}`.toLowerCase();
            return searchContent.includes(searchTerm.toLowerCase()) && matchesStore;
        });

        return filtered.sort((a, b) => {
            const priceA = parseFloat(a.prices.currentPriceEur?.replace(',', '.') || '0');
            const priceB = parseFloat(b.prices.currentPriceEur?.replace(',', '.') || '0');
            return priceA - priceB;
        });
    }, [allProducts, searchTerm, selectedStore]);

    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const paginatedProducts = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const stores: (ScraperType | 'All')[] = ['All', 'Kaufland', 'Lidl', 'Billa', 'Metro', 'Fantastico'];

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_384px] min-h-screen bg-[#F8FAFC] font-sans overflow-hidden">
            {/* LEFT COLUMN: Scrollable Products */}
            <main className="h-screen overflow-y-auto overflow-x-hidden scroll-smooth">
                {/* Header (Glassmorphism) */}
                <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 transition-all">
                    <div className="max-w-7xl mx-auto px-6 py-5 space-y-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                            <div>
                                <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight">
                                    Deal Aggregator
                                </h1>
                                <p className="text-sm text-slate-500 font-medium mt-1">
                                    Tracking {filteredProducts.length} active promotions
                                </p>
                            </div>
                            <div className="relative w-full md:max-w-md group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search products, categories, or brands..."
                                    className="w-full pl-11 pr-4 py-3 bg-slate-100/80 border-transparent rounded-xl focus:bg-white border focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-slate-700 placeholder:text-slate-400 font-medium"
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                />
                            </div>
                        </div>

                        {/* Filter Pills */}
                        <div className="flex gap-3 overflow-x-auto py-2 scrollbar-hide">
                            {stores.map((store) => {
                                const isActive = selectedStore === store;

                                return (
                                    <div key={store} className="relative group flex-shrink-0">
                                        <button
                                            onClick={() => { setSelectedStore(store); setCurrentPage(1); }}
                                            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 border ${isActive
                                                ? storeStyles[store] + ' shadow-md scale-105'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                }`}
                                        >
                                            {store}
                                        </button>

                                        {store !== 'All' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMapStore(store);
                                                }}
                                                className={`absolute -top-1.5 -right-1.5 p-1.5 rounded-full border shadow-sm transition-transform hover:scale-110 z-10 
                                                ${storeLocations[store]
                                                        ? 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-500/20'
                                                        : 'bg-white border-slate-200 text-slate-400 hover:text-indigo-500'
                                                    }`}
                                                title={`Set location for ${store}`}
                                            >
                                                <MapPin size={12} strokeWidth={3} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="max-w-7xl mx-auto px-6 py-8">
                    {/* Optimization Settings Panel */}
                    <div className="mb-8 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm inline-flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setActiveMapStore('HOME')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${homeCoords ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-transparent text-slate-600 hover:bg-slate-100'}`}
                        >
                            <MapPin size={16} className={homeCoords ? 'text-emerald-500' : 'text-slate-400'} />
                            {homeCoords ? 'Home Location Set' : 'Set Home Location'}
                        </button>
                        <div className="w-[1px] h-6 bg-slate-200 mx-1 hidden sm:block"></div>
                        <button
                            onClick={() => setShowWizard(!showWizard)}
                            className="flex items-center gap-2 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors"
                        >
                            Vehicle: {vehicle.consumption.toFixed(1)} L/100km
                        </button>
                    </div>

                    {showWizard && (
                        <div className="mb-8 animate-in slide-in-from-top-4 fade-in duration-300">
                            <VehicleWizard />
                        </div>
                    )}

                    {/* Product Grid */}
                    {paginatedProducts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                            {paginatedProducts.map((product, idx) => (
                                <ProductCard key={idx} product={product} onAdd={() => addToBasket(product)} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
                            <Search className="size-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-700">No deals found</h3>
                            <p className="text-slate-500 mt-1">Try adjusting your filters or search term.</p>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="mt-12 flex justify-center items-center gap-6">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                                className="p-3 bg-white border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50 transition-colors shadow-sm active:scale-95"
                            >
                                <ChevronLeft className="text-slate-700" size={20} />
                            </button>
                            <span className="font-semibold text-slate-600 bg-slate-100 px-4 py-2 rounded-lg">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="p-3 bg-white border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50 transition-colors shadow-sm active:scale-95"
                            >
                                <ChevronRight className="text-slate-700" size={20} />
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* RIGHT COLUMN: Sidebar (Desktop Only) */}
            <aside className="hidden xl:flex flex-col bg-white border-l border-slate-200 h-screen overflow-hidden shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <ShoppingCart size={20} className="text-indigo-600" />
                        Current Basket
                    </h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {basket.length > 0 ? (
                        <BasketSidebar />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                            <div className="bg-slate-50 p-6 rounded-full mb-4">
                                <ShoppingCart size={40} className="text-slate-300" />
                            </div>
                            <p className="font-medium text-slate-500">Your basket is empty</p>
                            <p className="text-sm mt-2 text-slate-400">Add some deals to calculate optimized routes.</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* Mobile FAB */}
            {basket.length > 0 && (
                <button
                    onClick={() => setIsMobileBasketOpen(true)}
                    className="xl:hidden fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-2xl shadow-xl shadow-indigo-600/30 z-40 active:scale-95 transition-transform"
                >
                    <ShoppingCart size={24} />
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                        {basket.length}
                    </span>
                </button>
            )}

            {/* Modals */}
            {activeMapStore && (
                <StoreMapModal
                    storeName={activeMapStore}
                    currentLoc={activeMapStore === 'HOME' ? homeCoords : storeLocations[activeMapStore]}
                    onClose={() => setActiveMapStore(null)}
                    onSave={(loc: any) => {
                        activeMapStore === 'HOME' ? setHomeCoords(loc) : setStoreLocation(activeMapStore, loc);
                        setActiveMapStore(null);
                    }}
                />
            )}

            {isMobileBasketOpen && (
                <div className="fixed inset-0 z-[60] xl:hidden">
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsMobileBasketOpen(false)}
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
                        <div className="flex-none p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 rounded-t-3xl">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <ShoppingCart size={20} className="text-indigo-600" />
                                Your Basket
                            </h2>
                            <button
                                onClick={() => setIsMobileBasketOpen(false)}
                                className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 shadow-sm transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 pb-12">
                            <BasketSidebar />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Card Component (Internal) ---
function ProductCard({ product, onAdd }: { product: Product, onAdd: () => void }) {
    const badgeStyle = storeBadges[product.storeName] || storeBadges['Metro'];
    const { storeLocations, vehicle, fuelPrices, homeCoords } = useOptimization();

    const calculateCost = () => {
        let distanceKm = 5; // Default fallback

        const storeLoc = storeLocations[product.storeName];
        if (storeLoc && homeCoords) {
            distanceKm = getDistanceKm(
                homeCoords.lat,
                homeCoords.lng,
                storeLoc.lat,
                storeLoc.lng
            );
        }

        const pricePerLiter = fuelPrices?.[vehicle.fuelType] || 2.65;
        const tripCost = ((distanceKm * 2) / 100) * vehicle.consumption * pricePerLiter;
        return tripCost.toFixed(2);
    };

    const estTravelCost = calculateCost();

    return (
        <div className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 flex flex-col overflow-hidden relative h-full">
            {/* Promo Highlight Banner */}
            <div className={`h-1.5 w-full ${storeStyles[product.storeName]?.split(' ')[0] || 'bg-slate-200'}`} />

            <div className="p-5 flex-1 flex flex-col">
                {/* Header Row */}
                <div className="flex justify-between items-start mb-3">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded border ${badgeStyle}`}>
                        {product.storeName}
                    </span>

                    {product.prices.discount && (
                        <span className="bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-sm">
                            {product.prices.discount}
                        </span>
                    )}
                </div>

                {/* Title Area */}
                <h3 className="font-bold text-slate-900 line-clamp-2 text-[15px] leading-snug min-h-[2.5rem] group-hover:text-indigo-600 transition-colors">
                    {product.title}
                </h3>
                {product.subtitle && (
                    <p className="text-[13px] text-slate-500 line-clamp-1 mt-1 font-medium">{product.subtitle}</p>
                )}

                <div className="flex-grow" />

                {/* Pricing Area */}
                <div className="mt-5 p-4 bg-slate-50/80 rounded-xl border border-slate-100 group-hover:bg-indigo-50/50 group-hover:border-indigo-100 transition-colors">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-end gap-3 flex-wrap">
                            <span className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
                                {parseFloat(product.prices.currentPriceEur?.toLowerCase().replace(',', '.').replace('лв.', '').replace('лв', '').replace('€', '') || '0').toFixed(2)}
                                <span className="text-lg font-bold text-slate-400 ml-1">€</span>
                            </span>
                            <span className="text-sm font-bold text-indigo-600 bg-indigo-100/50 px-2 py-0.5 rounded-md border border-indigo-100 mb-1">
                                {parseFloat(product.prices.currentPriceBgn?.toLowerCase().replace(',', '.').replace('лв.', '').replace('лв', '').replace('€', '') || '0').toFixed(2)} лв.
                            </span>
                        </div>

                        {(product.prices.oldPriceEur || product.prices.oldPriceBgn) && (
                            <div className="flex gap-2 items-center mt-1">
                                {product.prices.oldPriceEur && (
                                    <span className="text-[13px] font-medium text-slate-400 line-through decoration-slate-300">
                                        {parseFloat(product.prices.oldPriceEur?.toLowerCase().replace(',', '.').replace('лв.', '').replace('лв', '').replace('€', '') || '0').toFixed(2)} €
                                    </span>
                                )}
                                {product.prices.oldPriceBgn && (
                                    <span className="text-[13px] font-medium text-slate-400 line-through decoration-slate-300">
                                        {parseFloat(product.prices.oldPriceBgn?.toLowerCase().replace(',', '.').replace('лв.', '').replace('лв', '').replace('€', '') || '0').toFixed(2)} лв.
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    {product.prices.unitPriceBgn && (
                        <div className="mt-3 pt-3 border-t border-slate-200/60">
                            <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                                <Tag size={12} className="text-slate-400" />
                                {product.prices.unitPriceBgn}
                            </p>
                        </div>
                    )}
                </div>

                {product.detailDescription && (
                    <p className="mt-4 text-[12px] text-slate-500 line-clamp-2 leading-relaxed">
                        {product.detailDescription}
                    </p>
                )}
            </div>

            {/* Travel Overhead UI */}
            <div className="px-5 py-2.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                    <MapPin size={12} className="text-slate-400" /> Travel Cost
                </span>
                <span className="text-[11px] font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
                    ~ {estTravelCost} €
                </span>
            </div>

            {/* Footer Area */}
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <div className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-slate-400" />
                    <span>Ends {new Date(product.dateTo).toLocaleDateString()}</span>
                </div>
                {product.categoryName && (
                    <span className="truncate max-w-[100px] text-right text-slate-600 font-semibold">
                        {product.categoryName}
                    </span>
                )}
            </div>

            <div className="p-5 pt-0">
                <button
                    onClick={onAdd}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                    <ShoppingCart size={16} />
                    Add to Basket
                </button>
            </div>
        </div>
    );
}
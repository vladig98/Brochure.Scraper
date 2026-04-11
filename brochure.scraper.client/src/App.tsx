import { useState, useMemo, useEffect } from 'react';
import { Search, Calendar, ChevronLeft, ChevronRight, Tag, AlertCircle, Loader2, Settings, MapPin } from 'lucide-react';
import { useOptimization } from './context/OptimizationContext';
import { VehicleWizard } from './components/VehicleWizard';
import { StoreMapModal } from './components/StoreMapModal';

// --- Types ---
type ScraperType = 'Kaufland' | 'Lidl' | 'Billa' | 'Metro' | 'Fantastico';

interface PriceInfo {
    currentPriceBgn: string;
    currentPriceEur: string;
    oldPriceBgn: string;
    oldPriceEur: string;
    unitPriceBgn: string;
    discount: string;
}

interface Product {
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

const ITEMS_PER_PAGE = 24;

// --- Brand Styling Dictionary ---
const storeStyles: Record<string, string> = {
    Kaufland: 'bg-red-600 text-white ring-red-600/30',
    Lidl: 'bg-blue-600 text-white ring-blue-600/30',
    Billa: 'bg-yellow-400 text-slate-900 ring-yellow-400/30',
    Metro: 'bg-slate-800 text-white ring-slate-800/30',
    Fantastico: 'bg-emerald-500 text-white ring-emerald-500/30',
    All: 'bg-slate-900 text-white ring-slate-900/30'
};

const storeBadges: Record<string, string> = {
    Kaufland: 'text-red-700 bg-red-50 border-red-200',
    Lidl: 'text-blue-700 bg-blue-50 border-blue-200',
    Billa: 'text-yellow-800 bg-yellow-50 border-yellow-300',
    Metro: 'text-slate-800 bg-slate-100 border-slate-300',
    Fantastico: 'text-emerald-700 bg-emerald-50 border-emerald-200',
};

export const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km

    // 1. Calculate the 'Straight Line' (Haversine)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightLine = R * c;

    const multiplier = straightLine < 5 ? 1.4 : 1.2;
    const estimatedDrivingDistance = straightLine * multiplier;

    return estimatedDrivingDistance;
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
                <Loader2 className="animate-spin text-indigo-600 size-12 mb-4" />
                <p className="text-slate-500 font-medium tracking-wide animate-pulse">Aggregating latest deals...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-xl border border-red-100 text-center">
                    <div className="mx-auto bg-red-100 text-red-600 size-16 rounded-full flex items-center justify-center mb-6">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Connection Error</h2>
                    <p className="text-slate-500 mb-8">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-colors"
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

    // Custom States for Optimization
    const { consumption } = useOptimization();
    const [showWizard, setShowWizard] = useState(false);

    const [activeMapStore, setActiveMapStore] = useState<string | null>(null);
    const { storeLocations, setStoreLocation, homeCoords, setHomeCoords } = useOptimization();

    const filteredProducts = useMemo(() => {
        const filtered = allProducts.filter((p) => {
            const matchesStore = selectedStore === 'All' || p.storeName === selectedStore;
            const searchContent = `${p.title} ${p.subtitle} ${p.detailTitle} ${p.detailDescription} ${p.categoryName} ${p.storeName}`.toLowerCase();
            const matchesSearch = searchContent.includes(searchTerm.toLowerCase());
            return matchesStore && matchesSearch;
        });

        return filtered.sort((a, b) => {
            const priceA = parseFloat(a.prices.currentPriceEur?.toLowerCase().replace(',', '.').replace('лв.', '').replace('лв', '').replace('€', '') || '0');
            const priceB = parseFloat(b.prices.currentPriceEur?.toLowerCase().replace(',', '.').replace('лв.', '').replace('лв', '').replace('€', '') || '0');
            return priceA - priceB;
        });
    }, [allProducts, searchTerm, selectedStore]);

    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const stores: (ScraperType | 'All')[] = ['All', 'Kaufland', 'Lidl', 'Billa', 'Metro', 'Fantastico'];

    return (
        <div className="min-h-screen bg-slate-50/50 pb-12 font-sans selection:bg-indigo-100 selection:text-indigo-900">
            {/* Elegant Header Area */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Deal Aggregator</h1>
                            <p className="text-sm text-slate-500 font-medium mt-1">Showing {filteredProducts.length} active promotions</p>
                        </div>

                        {/* Search Bar */}
                        <div className="relative w-full sm:max-w-md group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="size-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search products, categories..."
                                className="w-full pl-11 pr-4 py-3 bg-slate-100 border-transparent hover:bg-slate-200 hover:border-slate-300 focus:bg-white border focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400"
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex gap-3 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                        {stores.map((store) => {
                            return (
                                <div key={store} className="relative group">
                                    <button
                                        onClick={() => { setSelectedStore(store); setCurrentPage(1); }}
                                        className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ...`}
                                    >
                                        {store}
                                    </button>

                                    {store !== 'All' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMapStore(store);
                                            }}
                                            className={`absolute -top-1 -right-1 p-1 rounded-full border shadow-sm transition-transform hover:scale-110 
                    ${storeLocations[store] ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}
                                        >
                                            <MapPin size={10} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="max-w-7xl mx-auto px-6 mt-8">

                {/* Optimization Controls */}
                <div className="mb-8 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col gap-4">
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Settings className="size-4" /> Optimization Settings
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={() => setActiveMapStore('HOME')} // Use a reserved keyword
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border
            ${homeCoords
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}
                        >
                            <MapPin size={16} className={homeCoords ? 'text-emerald-500' : 'text-slate-400'} />
                            {homeCoords ? 'Home Location Set' : 'Set Home on Map'}
                        </button>

                        <button
                            onClick={() => setShowWizard(!showWizard)}
                            className="text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors w-fit whitespace-nowrap"
                        >
                            {showWizard ? 'Close Vehicle Selector' : `Vehicle: ${consumption.toFixed(1)} L/100km (Adjust)`}
                        </button>
                    </div>
                    {showWizard && <div className="mt-2 max-w-sm"><VehicleWizard /></div>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {paginatedProducts.map((product, idx) => (
                        <ProductCard key={`${product.title}-${idx}`} product={product} />
                    ))}
                </div>

                {/* Empty State */}
                {filteredProducts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                        <Tag className="size-16 mb-4 opacity-20" />
                        <h3 className="text-xl font-semibold text-slate-700">No deals found</h3>
                        <p className="text-sm mt-2">Try adjusting your search or store filters.</p>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-16 flex justify-center items-center gap-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-all shadow-sm"
                        >
                            <ChevronLeft className="size-5 text-slate-600" />
                        </button>

                        <div className="px-6 py-3 bg-white border border-slate-200 rounded-xl shadow-sm font-semibold text-slate-700 text-sm">
                            {currentPage} <span className="text-slate-400 font-medium mx-1">/</span> {totalPages}
                        </div>

                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-all shadow-sm"
                        >
                            <ChevronRight className="size-5 text-slate-600" />
                        </button>
                    </div>
                )}

                {
                    activeMapStore && (
                        <StoreMapModal
                            storeName={activeMapStore}
                            currentLoc={storeLocations[activeMapStore]}
                            onClose={() => setActiveMapStore(null)}
                            onSave={(loc: any) => {
                                if (activeMapStore === 'HOME') {
                                    setHomeCoords(loc);
                                } else {
                                    setStoreLocation(activeMapStore, loc);
                                }
                                setActiveMapStore(null);
                            }}
                        />
                    )
                }

            </div>
        </div>
    );
}

// --- Card Component (Internal) ---
function ProductCard({ product }: { product: Product }) {
    const badgeStyle = storeBadges[product.storeName] || storeBadges['Metro'];
    const { storeLocations, consumption, fuelPrices, homeCoords } = useOptimization();

    const calculateCost = () => {
        let distanceKm = 5; // Default fallback

        const storeLoc = storeLocations[product.storeName];

        // Only calculate if BOTH home and store pins exist
        if (storeLoc && homeCoords) {
            distanceKm = getDistanceKm(
                homeCoords.lat,
                homeCoords.lng,
                storeLoc.lat,
                storeLoc.lng
            );
        }

        const pricePerLiter = fuelPrices?.A95 || 2.65;
        const tripCost = ((distanceKm * 2) / 100) * consumption * pricePerLiter;
        return tripCost.toFixed(2);
    };

    const estTravelCost = calculateCost();

    return (
        <div className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden relative">
            {/* Promo Highlight Banner */}
            <div className={`h-1 w-full ${storeStyles[product.storeName]?.split(' ')[0] || 'bg-slate-200'}`} />

            <div className="p-5 flex-1 flex flex-col">
                {/* Header Row */}
                <div className="flex justify-between items-start mb-4">
                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${badgeStyle}`}>
                        {product.storeName}
                    </span>

                    {product.prices.discount && (
                        <span className="bg-red-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-sm animate-in fade-in zoom-in duration-300">
                            {product.prices.discount}
                        </span>
                    )}
                </div>

                {/* Title Area */}
                <h3 className="font-bold text-slate-900 line-clamp-2 text-[15px] leading-tight min-h-[2.5rem] group-hover:text-indigo-600 transition-colors">
                    {product.title}
                </h3>
                {product.subtitle && (
                    <p className="text-[13px] text-slate-500 line-clamp-1 mt-1 font-medium">{product.subtitle}</p>
                )}

                <div className="flex-grow" />

                {/* Pricing Area */}
                <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100 group-hover:bg-indigo-50/50 group-hover:border-indigo-100 transition-colors">
                    <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-2xl font-black text-slate-900 tracking-tight">
                            {parseFloat(product.prices.currentPriceEur?.toLowerCase().replace(',', '.').replace('лв.', '').replace('лв', '').replace('€', '') || '0').toFixed(2)} <span className="text-lg font-bold text-slate-500">€</span>
                        </span>
                        <span className="text-sm font-bold text-indigo-600/70 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                            {parseFloat(product.prices.currentPriceBgn?.toLowerCase().replace(',', '.').replace('лв.', '').replace('лв', '').replace('€', '') || '0').toFixed(2)} лв.
                        </span>
                        {(product.prices.oldPriceEur || product.prices.oldPriceBgn) && (
                            <div className="w-full flex gap-2 mt-1 items-center">
                                {product.prices.oldPriceEur && (
                                    <span className="text-sm font-semibold text-slate-400 line-through decoration-slate-300">
                                        {parseFloat(product.prices.oldPriceEur?.toLowerCase().replace(',', '.').replace('лв.', '').replace('лв', '').replace('€', '') || '0').toFixed(2)} €
                                    </span>
                                )}
                                {product.prices.oldPriceBgn && (
                                    <span className="text-sm font-semibold text-slate-400 line-through decoration-slate-300">
                                        {parseFloat(product.prices.oldPriceBgn?.toLowerCase().replace(',', '.').replace('лв.', '').replace('лв', '').replace('€', '') || '0').toFixed(2)} лв.
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    {product.prices.unitPriceBgn && (
                        <p className="text-[11px] font-medium text-slate-500 mt-1.5 flex items-center gap-1">
                            <Tag size={10} />
                            {product.prices.unitPriceBgn}
                        </p>
                    )}
                </div>

                {product.detailDescription && (
                    <p className="mt-4 text-[12px] text-slate-500 line-clamp-2 leading-relaxed">
                        {product.detailDescription}
                    </p>
                )}
            </div>

            {/* Footer Area */}
            <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <div className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-slate-400" />
                    <span>Valid til {new Date(product.dateTo).toLocaleDateString()}</span>
                </div>
                {product.categoryName && (
                    <span className="truncate max-w-[100px] text-right bg-slate-200/50 px-2 py-0.5 rounded text-slate-600">
                        {product.categoryName}
                    </span>
                )}
            </div>

            {/* Travel Overhead UI */}
            <div className="bg-orange-50 px-5 py-2.5 border-t border-orange-100 text-[11px] text-orange-700 font-bold flex items-center justify-between">
                <span>🚗 Travel Overhead</span>
                <span className="bg-orange-200/50 px-2 py-1 rounded">+ {estTravelCost} €</span>
            </div>
        </div>
    );
}
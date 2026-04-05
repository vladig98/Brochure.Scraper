import { useState, useMemo, useEffect } from 'react';
import { Search, Calendar, ChevronLeft, ChevronRight, Tag, AlertCircle, Loader2 } from 'lucide-react';

// --- Types ---
type ScraperType = 'Kaufland' | 'Lidl' | 'Billa' | 'Metro' | 'Fantastico';

interface PriceInfo {
    currentPriceBgn: string;
    oldPriceBgn: string;
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
// Tailwind needs complete class strings to compile them correctly
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

// --- Main App Component ---
export default function App() {
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const response = await fetch('/products');
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

    const filteredProducts = useMemo(() => {
        return allProducts.filter((p) => {
            const matchesStore = selectedStore === 'All' || p.storeName === selectedStore;
            const searchContent = `${p.title} ${p.subtitle} ${p.detailTitle} ${p.detailDescription} ${p.categoryName} ${p.storeName}`.toLowerCase();
            const matchesSearch = searchContent.includes(searchTerm.toLowerCase());
            return matchesStore && matchesSearch;
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
                            const isSelected = selectedStore === store;
                            const activeClass = storeStyles[store] || storeStyles['All'];
                            const inactiveClass = 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50';

                            return (
                                <button
                                    key={store}
                                    onClick={() => { setSelectedStore(store); setCurrentPage(1); }}
                                    className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 whitespace-nowrap ${isSelected ? `${activeClass} shadow-md ring-4` : inactiveClass
                                        }`}
                                >
                                    {store}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="max-w-7xl mx-auto px-6 mt-8">
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
            </div>
        </div>
    );
}

// --- Card Component (Internal) ---
function ProductCard({ product }: { product: Product }) {
    const badgeStyle = storeBadges[product.storeName] || storeBadges['Metro'];

    return (
        <div className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden relative">
            {/* Promo Highlight Banner (Optional subtle top border) */}
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
                            {product.prices.currentPriceBgn} <span className="text-lg font-bold text-slate-500">лв.</span>
                        </span>
                        {product.prices.oldPriceBgn && (
                            <span className="text-sm font-semibold text-slate-400 line-through decoration-slate-300">
                                {product.prices.oldPriceBgn} лв.
                            </span>
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
        </div>
    );
}
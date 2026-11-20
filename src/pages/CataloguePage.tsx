import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import { filterAndSortProducts, type SortOption } from '../utils/commerce';

export function CataloguePage() {
  const { categorySlug } = useParams<{ categorySlug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { categories, products, catalogLoading } = useStore();

  const initialQuery = searchParams.get('q') || '';
  const initialOffers = searchParams.get('offers') === '1';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [onlyOffers, setOnlyOffers] = useState(initialOffers);
  const [inStockOnly, setInStockOnly] = useState(false);

  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
    setOnlyOffers(searchParams.get('offers') === '1');
  }, [searchParams]);

  const activeCategory = useMemo(() => {
    if (!categorySlug) return null;
    return categories.find((c) => c.slug === categorySlug || c.id === categorySlug) || null;
  }, [categories, categorySlug]);

  const filteredProducts = useMemo(
    () =>
      filterAndSortProducts(products, {
        categoryId: activeCategory ? activeCategory.id : 'all',
        searchQuery,
        sortBy,
        onlyOffers,
        inStockOnly,
      }),
    [products, activeCategory, searchQuery, sortBy, onlyOffers, inStockOnly]
  );

  const selectCategory = (slug: string | null) => {
    const params = new URLSearchParams(searchParams);
    const qs = params.toString();
    navigate(slug ? `/catalogue/${slug}${qs ? `?${qs}` : ''}` : `/catalogue${qs ? `?${qs}` : ''}`);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSortBy('featured');
    setOnlyOffers(false);
    setInStockOnly(false);
    setSearchParams({});
    navigate('/catalogue');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-emerald-700">
            QuickKart Grocery Catalogue
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-slate-900">
            {activeCategory ? activeCategory.name : onlyOffers ? 'Special Offers' : 'All Groceries & Essentials'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {activeCategory
              ? activeCategory.description
              : 'Browse fresh produce, dairy, hostel snacks, pantry staples, and daily necessities.'}
          </p>
        </div>

        <p className="text-sm text-slate-500 tabular-nums shrink-0">
          Showing <strong className="text-slate-900">{filteredProducts.length}</strong> product
          {filteredProducts.length === 1 ? '' : 's'}
        </p>
      </div>

      {/* Category Filter Bar */}
      <div className="py-5 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <button
            type="button"
            onClick={() => selectCategory(null)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
              !activeCategory
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
            }`}
          >
            All Categories
          </button>
          {categories
            .filter((c) => c.isActive !== false)
            .map((cat) => {
              const isSelected = activeCategory?.id === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => selectCategory(cat.slug)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
        </div>
      </div>

      {/* Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-7">
        <div className="relative flex-1 max-w-md">
          <Search
            className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter products by name or description..."
            aria-label="Filter catalogue products"
            className="w-full h-10 rounded-xl border border-slate-300 bg-white pl-10 pr-9 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search query"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyOffers}
              onChange={(e) => setOnlyOffers(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
            />
            Special Offers
          </label>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
            />
            In Stock Only
          </label>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <label htmlFor="catalogue-sort" className="sr-only">
              Sort products
            </label>
            <select
              id="catalogue-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:outline-none"
            >
              <option value="featured">Sort: Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="discount">Biggest Discount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {catalogLoading && products.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-80 rounded-2xl border border-slate-200 bg-slate-50 animate-pulse" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-12 text-center">
          <h2 className="font-display text-xl font-semibold text-slate-900">
            No matching products found
          </h2>
          <p className="mt-1.5 text-sm text-slate-600 max-w-md mx-auto">
            Try clearing your search term or switching to another grocery aisle.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-5 inline-flex items-center rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

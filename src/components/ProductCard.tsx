import { Minus, Plus } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types';
import { formatINR, getDiscountPercent, getEffectivePrice } from '../utils/commerce';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, updateCartQuantity, getItemQuantity, setSelectedProduct } = useStore();
  const qty = getItemQuantity(product.id);
  const effectivePrice = getEffectivePrice(product);
  const discountPct = getDiscountPercent(product);
  const outOfStock = product.stock <= 0;

  return (
    <article className="group flex flex-col rounded-2xl border border-slate-200/90 bg-white overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <button
        type="button"
        onClick={() => setSelectedProduct(product)}
        className="relative aspect-[4/3] w-full overflow-hidden bg-slate-50 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600"
        aria-label={`View details for ${product.name}`}
      >
        <ProductImage
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {outOfStock && (
          <div className="absolute inset-0 bg-white/75 flex items-center justify-center">
            <span className="text-xs font-semibold text-slate-900 bg-white border border-slate-200 px-3 py-1 rounded-md">
              Out of Stock
            </span>
          </div>
        )}
      </button>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="truncate">{product.categoryName}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">{product.unit}</span>
          {discountPct > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="shrink-0 font-semibold text-emerald-700">{discountPct}% off</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setSelectedProduct(product)}
          className="mt-1.5 text-left font-semibold text-slate-900 text-[15px] leading-snug line-clamp-2 hover:text-emerald-700 transition-colors"
        >
          {product.name}
        </button>

        <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed flex-1">
          {product.description}
        </p>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-1.5 tabular-nums">
              <span className="text-base font-bold text-slate-900">
                {formatINR(effectivePrice)}
              </span>
              {effectivePrice < product.price && (
                <span className="text-xs text-slate-400 line-through">
                  {formatINR(product.price)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
              {outOfStock
                ? 'Currently unavailable'
                : product.stock <= 8
                  ? `Only ${product.stock} left`
                  : 'In stock'}
            </p>
          </div>

          {qty > 0 ? (
            <div className="inline-flex items-center rounded-lg border border-emerald-700 bg-emerald-50/70">
              <button
                type="button"
                onClick={() => updateCartQuantity(product.id, qty - 1)}
                aria-label={`Decrease quantity of ${product.name}`}
                className="flex h-9 w-8 items-center justify-center text-emerald-800 hover:bg-emerald-100 rounded-l-lg transition-colors"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-7 text-center text-sm font-semibold text-emerald-950 tabular-nums">
                {qty}
              </span>
              <button
                type="button"
                disabled={qty >= product.stock}
                onClick={() => updateCartQuantity(product.id, qty + 1)}
                aria-label={`Increase quantity of ${product.name}`}
                className="flex h-9 w-8 items-center justify-center text-emerald-800 hover:bg-emerald-100 rounded-r-lg disabled:opacity-40 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={outOfStock}
              onClick={() => addToCart(product, 1)}
              className="h-9 px-3.5 rounded-lg bg-emerald-700 text-xs font-semibold text-white hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-500 transition-colors whitespace-nowrap shrink-0"
            >
              Add to Cart
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

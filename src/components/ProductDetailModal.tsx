import { Minus, Plus, Truck, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import {
  formatINR,
  FREE_DELIVERY_THRESHOLD,
  getDiscountPercent,
  getEffectivePrice,
} from '../utils/commerce';
import { ProductImage } from './ProductImage';

export function ProductDetailModal() {
  const {
    selectedProduct,
    setSelectedProduct,
    addToCart,
    updateCartQuantity,
    getItemQuantity,
  } = useStore();

  if (!selectedProduct) return null;

  const qty = getItemQuantity(selectedProduct.id);
  const effectivePrice = getEffectivePrice(selectedProduct);
  const discountPct = getDiscountPercent(selectedProduct);
  const outOfStock = selectedProduct.stock <= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
    >
      <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setSelectedProduct(null)}
          aria-label="Close product details"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="bg-slate-50 aspect-[4/3] md:aspect-auto">
          <ProductImage
            src={selectedProduct.image}
            alt={selectedProduct.name}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="p-6 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">
              {selectedProduct.categoryName} · {selectedProduct.unit}
            </p>
            <h2
              id="product-modal-title"
              className="mt-1.5 font-display text-2xl font-bold text-slate-900 leading-tight"
            >
              {selectedProduct.name}
            </h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              {selectedProduct.description}
            </p>

            <div className="mt-5 flex items-baseline gap-2.5 tabular-nums">
              <span className="text-2xl font-bold text-slate-900">
                {formatINR(effectivePrice)}
              </span>
              {effectivePrice < selectedProduct.price && (
                <>
                  <span className="text-sm text-slate-400 line-through">
                    {formatINR(selectedProduct.price)}
                  </span>
                  <span className="text-xs font-semibold text-emerald-700">
                    Save {discountPct}%
                  </span>
                </>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <p className="font-medium text-slate-800">
                Availability:{' '}
                <span className={outOfStock ? 'text-red-600' : 'text-emerald-700'}>
                  {outOfStock ? 'Out of stock' : `${selectedProduct.stock} units available`}
                </span>
              </p>
              <p className="flex items-center gap-2 text-slate-500">
                <Truck className="h-3.5 w-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
                <span>
                  15–25 min doorstep delivery · Free above {formatINR(FREE_DELIVERY_THRESHOLD)}
                </span>
              </p>
            </div>
          </div>

          <div className="mt-6">
            {qty > 0 ? (
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center rounded-xl border border-emerald-700 bg-emerald-50">
                  <button
                    type="button"
                    onClick={() => updateCartQuantity(selectedProduct.id, qty - 1)}
                    aria-label={`Decrease quantity of ${selectedProduct.name}`}
                    className="flex h-11 w-11 items-center justify-center text-emerald-800 hover:bg-emerald-100 rounded-l-xl"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-semibold text-emerald-950 tabular-nums">
                    {qty}
                  </span>
                  <button
                    type="button"
                    disabled={qty >= selectedProduct.stock}
                    onClick={() => updateCartQuantity(selectedProduct.id, qty + 1)}
                    aria-label={`Increase quantity of ${selectedProduct.name}`}
                    className="flex h-11 w-11 items-center justify-center text-emerald-800 hover:bg-emerald-100 rounded-r-xl disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="flex-1 h-11 rounded-xl bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={outOfStock}
                onClick={() => addToCart(selectedProduct, 1)}
                className="w-full h-11 rounded-xl bg-emerald-700 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-500 transition-colors"
              >
                {outOfStock ? 'Out of Stock' : 'Add to Cart'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

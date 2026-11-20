import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Minus, Plus, ShoppingBag, Tag, Trash2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductImage } from '../components/ProductImage';
import { formatINR, FREE_DELIVERY_THRESHOLD, getEffectivePrice } from '../utils/commerce';

export function CartPage() {
  const {
    cart,
    cartTotals,
    coupons,
    appliedCoupon,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    applyCouponCode,
    removeCoupon,
  } = useStore();
  const navigate = useNavigate();
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const res = applyCouponCode(couponInput);
    if (!res.valid) {
      setCouponError(res.error || 'Could not apply coupon.');
    } else {
      setCouponError('');
      setCouponInput('');
    }
  };

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 mb-5">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <h1 className="font-display text-3xl font-bold text-slate-900">Your Shopping Cart is Empty</h1>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
          Explore fresh fruits, dairy, snacks, instant noodles, and hostel necessities to build your basket.
        </p>
        <Link
          to="/catalogue"
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
        >
          Browse Catalogue
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900">Shopping Cart</h1>
          <p className="mt-1 text-sm text-slate-600 tabular-nums">
            {cartTotals.itemCount} item{cartTotals.itemCount === 1 ? '' : 's'} ready for fast doorstep delivery
          </p>
        </div>
        <button
          type="button"
          onClick={clearCart}
          className="text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors"
        >
          Clear Cart
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Line Items */}
        <div className="lg:col-span-8 space-y-4">
          {cartTotals.freeDeliveryRemaining > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-950">
              Add <strong>{formatINR(cartTotals.freeDeliveryRemaining)}</strong> more to get{' '}
              <strong>FREE delivery</strong> (orders above {formatINR(FREE_DELIVERY_THRESHOLD)}).
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
            {cart.map(({ product, quantity }) => {
              const effectivePrice = getEffectivePrice(product);
              return (
                <div key={product.id} className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center">
                  <div className="h-24 w-24 sm:h-22 sm:w-22 shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <ProductImage
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500">
                      {product.categoryName} · {product.unit}
                    </p>
                    <h2 className="mt-0.5 font-semibold text-slate-900 text-base">
                      {product.name}
                    </h2>
                    <div className="mt-1 flex items-baseline gap-2 tabular-nums">
                      <span className="text-sm font-bold text-slate-900">
                        {formatINR(effectivePrice)}
                      </span>
                      {effectivePrice < product.price && (
                        <span className="text-xs text-slate-400 line-through">
                          {formatINR(product.price)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5">
                    <div className="inline-flex items-center rounded-xl border border-slate-300">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(product.id, quantity - 1)}
                        aria-label={`Decrease quantity of ${product.name}`}
                        className="flex h-9 w-9 items-center justify-center text-slate-700 hover:bg-slate-100 rounded-l-xl"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-9 text-center text-sm font-semibold tabular-nums">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        disabled={quantity >= product.stock}
                        onClick={() => updateCartQuantity(product.id, quantity + 1)}
                        aria-label={`Increase quantity of ${product.name}`}
                        className="flex h-9 w-9 items-center justify-center text-slate-700 hover:bg-slate-100 rounded-r-xl disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="text-right min-w-[72px] tabular-nums">
                      <p className="text-base font-bold text-slate-900">
                        {formatINR(effectivePrice * quantity)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(product.id)}
                      aria-label={`Remove ${product.name}`}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Summary & Coupons */}
        <aside className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-6 space-y-5 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-bold text-slate-900">Bill Summary</h2>

          {/* Coupon Form */}
          <div className="space-y-3">
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs">
                <div className="flex items-center gap-2 text-emerald-900">
                  <Tag className="h-4 w-4 text-emerald-700" />
                  <span>
                    <strong className="font-mono">{appliedCoupon.code}</strong> saved{' '}
                    {formatINR(cartTotals.couponDiscount)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="font-semibold text-emerald-800 hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="space-y-2">
                <label htmlFor="cart-coupon-input" className="block text-xs font-semibold text-slate-700">
                  Have a discount coupon?
                </label>
                <div className="flex gap-2">
                  <input
                    id="cart-coupon-input"
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Enter code (e.g. HOSTEL10)"
                    className="flex-1 h-10 rounded-xl border border-slate-300 px-3 text-sm uppercase tracking-wide text-slate-900 placeholder:normal-case placeholder:tracking-normal focus:border-emerald-600 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="h-10 px-4 rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                  >
                    Apply
                  </button>
                </div>
                {couponError && <p className="text-xs text-red-600">{couponError}</p>}
              </form>
            )}

            {/* Available Coupons Quick-Select */}
            {!appliedCoupon && coupons.filter((c) => c.isActive).length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-medium text-slate-500">Available offers:</p>
                <div className="flex flex-wrap gap-1.5">
                  {coupons
                    .filter((c) => c.isActive)
                    .map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          const res = applyCouponCode(c.code);
                          if (!res.valid) setCouponError(res.error || '');
                          else setCouponError('');
                        }}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-700 hover:border-emerald-600 hover:text-emerald-800 transition-colors"
                      >
                        {c.code}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          <dl className="space-y-2.5 text-sm border-t border-slate-100 pt-4 tabular-nums">
            <div className="flex justify-between text-slate-600">
              <dt>Item Subtotal</dt>
              <dd className="font-medium text-slate-900">{formatINR(cartTotals.subtotal)}</dd>
            </div>
            {cartTotals.productSavings > 0 && (
              <div className="flex justify-between text-emerald-700">
                <dt>Catalogue Savings</dt>
                <dd className="font-medium">-{formatINR(cartTotals.productSavings)}</dd>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <dt>Delivery Charges</dt>
              <dd className="font-medium text-slate-900">
                {cartTotals.deliveryCharge === 0 ? 'Free' : formatINR(cartTotals.deliveryCharge)}
              </dd>
            </div>
            {cartTotals.couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <dt>Coupon Discount</dt>
                <dd className="font-semibold">-{formatINR(cartTotals.couponDiscount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
              <dt>Final Amount</dt>
              <dd data-testid="cart-final-total">{formatINR(cartTotals.finalTotal)}</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => navigate('/checkout')}
            className="w-full h-12 rounded-xl bg-emerald-700 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2"
          >
            Proceed to Checkout
            <ArrowRight className="h-4 w-4" />
          </button>
        </aside>
      </div>
    </div>
  );
}

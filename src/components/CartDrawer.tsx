import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Minus, Plus, ShoppingBag, Tag, Trash2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatINR, FREE_DELIVERY_THRESHOLD, getEffectivePrice } from '../utils/commerce';
import { ProductImage } from './ProductImage';

export function CartDrawer() {
  const {
    cart,
    cartTotals,
    appliedCoupon,
    cartDrawerOpen,
    closeCartDrawer,
    updateCartQuantity,
    removeFromCart,
    applyCouponCode,
    removeCoupon,
  } = useStore();

  const navigate = useNavigate();
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  if (!cartDrawerOpen) return null;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const res = applyCouponCode(couponInput);
    if (!res.valid) {
      setCouponError(res.error || 'Invalid coupon code.');
    } else {
      setCouponError('');
      setCouponInput('');
    }
  };

  const freeDeliveryProgress = Math.min(
    100,
    Math.round((cartTotals.subtotal / FREE_DELIVERY_THRESHOLD) * 100)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/45 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
    >
      <div className="fixed inset-0" onClick={closeCartDrawer} aria-hidden="true" />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-emerald-700" aria-hidden="true" />
            <h2 id="cart-drawer-title" className="font-display text-lg font-semibold text-slate-900">
              Your Basket ({cartTotals.itemCount})
            </h2>
          </div>
          <button
            type="button"
            onClick={closeCartDrawer}
            aria-label="Close shopping cart"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 mb-4">
              <ShoppingBag className="h-7 w-7" />
            </div>
            <h3 className="font-display text-lg font-semibold text-slate-900">
              Your cart is empty
            </h3>
            <p className="mt-1.5 text-sm text-slate-500 max-w-xs">
              Add fresh produce, hostel noodles, dairy, or study essentials to get started.
            </p>
            <Link
              to="/catalogue"
              onClick={closeCartDrawer}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
            >
              Browse Catalogue
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <>
            {/* Free Delivery Progress */}
            <div className="border-b border-slate-100 bg-emerald-50/60 px-5 py-3">
              <p className="text-xs font-medium text-emerald-950">
                {cartTotals.freeDeliveryRemaining > 0
                  ? `Add ${formatINR(cartTotals.freeDeliveryRemaining)} more for free doorstep delivery`
                  : 'Free doorstep delivery unlocked on this order'}
              </p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-emerald-200/70 overflow-hidden">
                <div
                  className="h-full bg-emerald-700 transition-all duration-300"
                  style={{ width: `${freeDeliveryProgress}%` }}
                />
              </div>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 px-5">
              {cart.map(({ product, quantity }) => {
                const unitPrice = getEffectivePrice(product);
                return (
                  <div key={product.id} className="flex gap-3.5 py-4">
                    <div className="h-18 w-18 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <ProductImage
                        src={product.image}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900 line-clamp-1">
                            {product.name}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">{product.unit}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(product.id)}
                          aria-label={`Remove ${product.name} from cart`}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-lg border border-slate-200">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(product.id, quantity - 1)}
                            aria-label={`Decrease ${product.name} quantity`}
                            className="flex h-7 w-7 items-center justify-center text-slate-700 hover:bg-slate-100 rounded-l-lg"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-7 text-center text-xs font-semibold tabular-nums">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            disabled={quantity >= product.stock}
                            onClick={() => updateCartQuantity(product.id, quantity + 1)}
                            aria-label={`Increase ${product.name} quantity`}
                            className="flex h-7 w-7 items-center justify-center text-slate-700 hover:bg-slate-100 rounded-r-lg disabled:opacity-40"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <span className="text-sm font-bold text-slate-900 tabular-nums">
                          {formatINR(unitPrice * quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Totals & Coupon */}
            <div className="border-t border-slate-200 bg-slate-50/70 p-5 space-y-4">
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs">
                  <div className="flex items-center gap-2 text-emerald-900">
                    <Tag className="h-3.5 w-3.5 text-emerald-700" />
                    <span>
                      <strong className="font-mono">{appliedCoupon.code}</strong> applied (-
                      {formatINR(cartTotals.couponDiscount)})
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
                <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Coupon code (e.g. HOSTEL10)"
                      aria-label="Discount coupon code"
                      className="flex-1 h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs uppercase tracking-wide text-slate-900 placeholder:normal-case placeholder:tracking-normal focus:border-emerald-600 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="h-9 px-3.5 rounded-lg bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && <p className="text-xs text-red-600">{couponError}</p>}
                </form>
              )}

              <dl className="space-y-1.5 text-sm tabular-nums">
                <div className="flex justify-between text-slate-600">
                  <dt>Subtotal</dt>
                  <dd className="font-medium text-slate-900">{formatINR(cartTotals.subtotal)}</dd>
                </div>
                <div className="flex justify-between text-slate-600">
                  <dt>Delivery charge</dt>
                  <dd className="font-medium text-slate-900">
                    {cartTotals.deliveryCharge === 0 ? 'Free' : formatINR(cartTotals.deliveryCharge)}
                  </dd>
                </div>
                {cartTotals.couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <dt>Coupon savings</dt>
                    <dd className="font-semibold">-{formatINR(cartTotals.couponDiscount)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-2.5 text-base font-bold text-slate-900">
                  <dt>Total</dt>
                  <dd>{formatINR(cartTotals.finalTotal)}</dd>
                </div>
              </dl>

              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  to="/cart"
                  onClick={closeCartDrawer}
                  className="flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  View Cart
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    closeCartDrawer();
                    navigate('/checkout');
                  }}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
                >
                  Checkout
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

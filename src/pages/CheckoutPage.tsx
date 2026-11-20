import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  MapPin,
  ShoppingBag,
} from 'lucide-react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import {
  db,
  extractReadableError,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import type { Address, CheckoutFormValues, OrderItem } from '../types';
import {
  formatINR,
  generateOrderNumber,
  getEffectivePrice,
  validateCheckoutForm,
} from '../utils/commerce';

export function CheckoutPage() {
  const { firebaseUser, profile, openAuthModal } = useAuth();
  const { cart, cartTotals, appliedCoupon, clearCart } = useStore();
  const { showToast } = useToast();

  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState<CheckoutFormValues>({
    customerName: profile?.name || firebaseUser?.displayName || '',
    mobile: profile?.phone || '',
    deliveryAddress: '',
    hostelOrFlat: '',
    landmark: '',
    paymentMethod: 'Cash on Delivery',
  });
  const [saveAddressForFuture, setSaveAddressForFuture] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<{
    orderNumber: string;
    finalTotal: number;
    itemCount: number;
  } | null>(null);

  useEffect(() => {
    if (profile) {
      setForm((prev) => ({
        ...prev,
        customerName: prev.customerName || profile.name,
        mobile: prev.mobile || profile.phone,
      }));
    }
  }, [profile]);

  useEffect(() => {
    if (!firebaseUser) {
      setSavedAddresses([]);
      return;
    }

    const q = query(collection(db, 'addresses'), where('userId', '==', firebaseUser.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Address, 'id'>) }));
        setSavedAddresses(list);
        const def = list.find((a) => a.isDefault) || list[0];
        if (def) {
          setForm((prev) =>
            prev.deliveryAddress
              ? prev
              : {
                  ...prev,
                  customerName: def.customerName || prev.customerName,
                  mobile: def.mobile || prev.mobile,
                  deliveryAddress: def.addressLine,
                  hostelOrFlat: def.hostelOrFlat,
                  landmark: def.landmark,
                }
          );
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'addresses');
        } catch {
          // Handled safely
        }
      }
    );

    return () => unsub();
  }, [firebaseUser]);

  const selectSavedAddress = (addr: Address) => {
    setForm((prev) => ({
      ...prev,
      customerName: addr.customerName,
      mobile: addr.mobile,
      deliveryAddress: addr.addressLine,
      hostelOrFlat: addr.hostelOrFlat,
      landmark: addr.landmark,
    }));
    setFieldErrors({});
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (cart.length === 0) {
      setSubmitError('Your shopping cart is empty. Add products before checking out.');
      return;
    }

    const outOfStockItem = cart.find((i) => i.product.stock <= 0 || i.quantity > i.product.stock);
    if (outOfStockItem) {
      setSubmitError(
        `"${outOfStockItem.product.name}" does not have enough stock (${outOfStockItem.product.stock} available). Please update your cart.`
      );
      return;
    }

    const errors = validateCheckoutForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (!firebaseUser) {
      openAuthModal('options');
      return;
    }

    if (!firebaseUser.emailVerified) {
      setSubmitError(
        'Please verify your email address using the link in your inbox (or click "I\'ve Verified" in the top banner) before placing an order.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const orderNumber = generateOrderNumber();
      const orderRef = doc(collection(db, 'orders'));

      const orderItems: OrderItem[] = cart.map(({ product, quantity }) => ({
        productId: product.id,
        name: product.name.slice(0, 120),
        unit: product.unit.slice(0, 40),
        price: getEffectivePrice(product),
        quantity: Math.floor(quantity),
        image: product.image.slice(0, 600),
      }));

      const orderPayload = {
        orderNumber,
        userId: firebaseUser.uid,
        customerName: form.customerName.trim().slice(0, 100),
        customerEmail: (firebaseUser.email || '').slice(0, 160),
        mobile: form.mobile.trim().slice(0, 15),
        deliveryAddress: form.deliveryAddress.trim().slice(0, 240),
        hostelOrFlat: form.hostelOrFlat.trim().slice(0, 100),
        landmark: form.landmark.trim().slice(0, 120),
        items: orderItems,
        subtotal: cartTotals.subtotal,
        deliveryCharge: cartTotals.deliveryCharge,
        discountAmount: cartTotals.couponDiscount,
        couponCode: appliedCoupon?.code || '',
        finalTotal: cartTotals.finalTotal,
        paymentMethod: 'Cash on Delivery' as const,
        status: 'Order Placed' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(orderRef, orderPayload);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `orders/${orderRef.id}`);
      }

      if (saveAddressForFuture && savedAddresses.length < 10) {
        const duplicate = savedAddresses.some(
          (a) =>
            a.addressLine.toLowerCase() === form.deliveryAddress.trim().toLowerCase() &&
            a.hostelOrFlat.toLowerCase() === form.hostelOrFlat.trim().toLowerCase()
        );
        if (!duplicate) {
          const addrRef = doc(collection(db, 'addresses'));
          try {
            await setDoc(addrRef, {
              userId: firebaseUser.uid,
              label: 'Delivery Address',
              customerName: form.customerName.trim().slice(0, 100),
              mobile: form.mobile.trim().slice(0, 15),
              addressLine: form.deliveryAddress.trim().slice(0, 240),
              hostelOrFlat: form.hostelOrFlat.trim().slice(0, 100),
              landmark: form.landmark.trim().slice(0, 120),
              city: 'Dehradun',
              pincode: '248001',
              isDefault: savedAddresses.length === 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } catch {
            // Do not fail order confirmation if optional address bookmark fails
          }
        }
      }

      setPlacedOrder({
        orderNumber,
        finalTotal: cartTotals.finalTotal,
        itemCount: cartTotals.itemCount,
      });
      clearCart();
      showToast(`Order ${orderNumber} placed successfully!`, 'success');
    } catch (error) {
      const msg = extractReadableError(error, 'Failed to place your order. Please try again.');
      setSubmitError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (placedOrder) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
        <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="font-mono text-xs font-semibold text-emerald-700">
            ORDER {placedOrder.orderNumber}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-slate-900">
            Order Placed Successfully
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
            Your order for {placedOrder.itemCount} item{placedOrder.itemCount === 1 ? '' : 's'} totaling{' '}
            <strong className="text-slate-900 tabular-nums">{formatINR(placedOrder.finalTotal)}</strong>{' '}
            (Cash on Delivery) has been recorded in Firestore and is awaiting confirmation.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
            >
              Track My Order
            </Link>
            <Link
              to="/catalogue"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 mb-5">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Nothing to checkout yet</h1>
        <p className="mt-2 text-sm text-slate-600">
          Add groceries to your basket first, then return here to complete delivery details.
        </p>
        <Link
          to="/catalogue"
          className="mt-6 inline-flex items-center rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
        >
          Browse Catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="pb-6 border-b border-slate-200">
        <h1 className="font-display text-3xl font-bold text-slate-900">Checkout</h1>
        <p className="mt-1 text-sm text-slate-600">
          Confirm your delivery address, hostel/flat details, and payment method.
        </p>
      </div>

      {!firebaseUser && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Sign in to place your order</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Your basket stays saved. Sign in with Google or Email so we can track your order and saved addresses securely.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openAuthModal('options')}
            className="shrink-0 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
          >
            Sign In / Register
          </button>
        </div>
      )}

      <form onSubmit={handlePlaceOrder} className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" noValidate>
        <div className="lg:col-span-7 space-y-6">
          {submitError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Saved Address Quick Pick */}
          {savedAddresses.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-display text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                Saved Delivery Addresses
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => selectSavedAddress(addr)}
                    className="text-left rounded-xl border border-slate-200 p-3.5 hover:border-emerald-600 hover:bg-emerald-50/40 transition-colors"
                  >
                    <p className="text-xs font-semibold text-emerald-800">{addr.label}</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{addr.customerName}</p>
                    <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">
                      {addr.hostelOrFlat}, {addr.addressLine}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Delivery Details Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Delivery Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="checkout-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Customer name *
                </label>
                <input
                  id="checkout-name"
                  type="text"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  placeholder="Full name"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
                />
                {fieldErrors.customerName && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.customerName}</p>
                )}
              </div>

              <div>
                <label htmlFor="checkout-mobile" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Mobile number *
                </label>
                <input
                  id="checkout-mobile"
                  type="tel"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  placeholder="10-digit mobile number"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
                />
                {fieldErrors.mobile && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.mobile}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="checkout-hostel" className="block text-sm font-medium text-slate-700 mb-1.5">
                Hostel / Flat number *
              </label>
              <input
                id="checkout-hostel"
                type="text"
                value={form.hostelOrFlat}
                onChange={(e) => setForm({ ...form, hostelOrFlat: e.target.value })}
                placeholder="e.g. Boys Hostel B, Room 214 or Flat 302, Green Park"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
              />
              {fieldErrors.hostelOrFlat && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.hostelOrFlat}</p>
              )}
            </div>

            <div>
              <label htmlFor="checkout-address" className="block text-sm font-medium text-slate-700 mb-1.5">
                Delivery address *
              </label>
              <textarea
                id="checkout-address"
                rows={2}
                value={form.deliveryAddress}
                onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
                placeholder="Street, college campus, locality, Dehradun"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
              />
              {fieldErrors.deliveryAddress && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.deliveryAddress}</p>
              )}
            </div>

            <div>
              <label htmlFor="checkout-landmark" className="block text-sm font-medium text-slate-700 mb-1.5">
                Landmark (optional)
              </label>
              <input
                id="checkout-landmark"
                type="text"
                value={form.landmark}
                onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                placeholder="Near main university gate, temple, or bus stop"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
              />
              {fieldErrors.landmark && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.landmark}</p>
              )}
            </div>

            {firebaseUser && (
              <label className="inline-flex items-center gap-2.5 text-sm text-slate-700 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveAddressForFuture}
                  onChange={(e) => setSaveAddressForFuture(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                />
                Save this address to my account for faster checkout
              </label>
            )}
          </div>

          {/* Payment Method */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-slate-900">Payment Method</h2>

            <div className="space-y-3">
              <label className="flex items-start gap-3.5 rounded-xl border-2 border-emerald-700 bg-emerald-50/40 p-4 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Cash on Delivery"
                  checked={form.paymentMethod === 'Cash on Delivery'}
                  onChange={() => setForm({ ...form, paymentMethod: 'Cash on Delivery' })}
                  className="mt-1 h-4 w-4 text-emerald-700 focus:ring-emerald-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-semibold text-sm text-slate-900">
                    <Banknote className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                    <span>Cash on Delivery (COD)</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Pay with cash or UPI directly to the QuickKart delivery partner at your doorstep.
                  </p>
                </div>
              </label>

              <div className="flex items-start gap-3.5 rounded-xl border border-slate-200 bg-slate-50 p-4 opacity-75">
                <input
                  type="radio"
                  name="paymentMethod"
                  disabled
                  className="mt-1 h-4 w-4"
                  aria-label="Online Payment unavailable"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-semibold text-sm text-slate-700">
                    <CreditCard className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    <span>Online Payment (UPI / Cards)</span>
                    <span className="text-[11px] font-medium text-slate-500">· Gateway setup pending</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Online payment checkout is disabled until a live payment gateway (such as Razorpay or Stripe) is configured.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <aside className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 space-y-5 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-bold text-slate-900">Order Summary</h2>

          <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
            {cart.map(({ product, quantity }) => (
              <li key={product.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{product.name}</p>
                  <p className="text-xs text-slate-500 tabular-nums">
                    {quantity} × {formatINR(getEffectivePrice(product))} ({product.unit})
                  </p>
                </div>
                <span className="font-semibold text-slate-900 tabular-nums shrink-0">
                  {formatINR(getEffectivePrice(product) * quantity)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="space-y-2 text-sm border-t border-slate-200 pt-4 tabular-nums">
            <div className="flex justify-between text-slate-600">
              <dt>Subtotal</dt>
              <dd className="font-medium text-slate-900">{formatINR(cartTotals.subtotal)}</dd>
            </div>
            <div className="flex justify-between text-slate-600">
              <dt>Delivery Charges</dt>
              <dd className="font-medium text-slate-900">
                {cartTotals.deliveryCharge === 0 ? 'Free' : formatINR(cartTotals.deliveryCharge)}
              </dd>
            </div>
            {cartTotals.couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <dt>Coupon ({appliedCoupon?.code})</dt>
                <dd className="font-semibold">-{formatINR(cartTotals.couponDiscount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
              <dt>Total Payable</dt>
              <dd>{formatINR(cartTotals.finalTotal)}</dd>
            </div>
          </dl>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-xl bg-emerald-700 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {firebaseUser
              ? `Place COD Order · ${formatINR(cartTotals.finalTotal)}`
              : 'Sign In to Place Order'}
          </button>
        </aside>
      </form>
    </div>
  );
}

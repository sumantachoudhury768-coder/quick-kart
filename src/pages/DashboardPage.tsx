import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  History,
  Loader2,
  Lock,
  LogOut,
  MapPin,
  Package,
  Plus,
  Settings,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  db,
  extractReadableError,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import type { Address, Order } from '../types';
import {
  canCancelOrder,
  formatINR,
  getOrderStepIndex,
  ORDER_STATUS_SEQUENCE,
} from '../utils/commerce';

type DashboardTab = 'orders' | 'history' | 'addresses' | 'settings';

function formatOrderDate(value: Order['createdAt']): string {
  if (!value) return 'Just now';
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  const d = new Date(value as string | Date);
  return Number.isNaN(d.getTime()) ? 'Recent' : d.toLocaleDateString('en-IN');
}

export function DashboardPage() {
  const {
    firebaseUser,
    profile,
    loading,
    isAdmin,
    openAuthModal,
    updateUserProfile,
    resetPassword,
    logout,
  } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<DashboardTab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Address form state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addrLabel, setAddrLabel] = useState('Hostel Room');
  const [addrName, setAddrName] = useState('');
  const [addrMobile, setAddrMobile] = useState('');
  const [addrLine, setAddrLine] = useState('');
  const [addrHostel, setAddrHostel] = useState('');
  const [addrLandmark, setAddrLandmark] = useState('');
  const [addrCity, setAddrCity] = useState('Dehradun');
  const [addrPincode, setAddrPincode] = useState('248001');
  const [savingAddr, setSavingAddr] = useState(false);

  // Settings form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (profile) {
      setEditName(profile.name);
      setEditPhone(profile.phone || '');
      setAddrName((prev) => prev || profile.name);
      setAddrMobile((prev) => prev || profile.phone || '');
    }
  }, [profile]);

  useEffect(() => {
    if (!firebaseUser) {
      setOrders([]);
      setAddresses([]);
      setOrdersLoading(false);
      return;
    }

    setOrdersLoading(true);
    const ordersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', firebaseUser.uid)
    );
    const unsubOrders = onSnapshot(
      ordersQuery,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) }))
          .sort((a, b) => {
            const ta =
              a.createdAt && typeof a.createdAt === 'object' && 'toMillis' in a.createdAt
                ? a.createdAt.toMillis()
                : 0;
            const tb =
              b.createdAt && typeof b.createdAt === 'object' && 'toMillis' in b.createdAt
                ? b.createdAt.toMillis()
                : 0;
            return tb - ta;
          });
        setOrders(list);
        setOrdersLoading(false);
      },
      (err) => {
        setOrdersLoading(false);
        try {
          handleFirestoreError(err, OperationType.LIST, 'orders');
        } catch {
          // Logged with context
        }
      }
    );

    const addrQuery = query(
      collection(db, 'addresses'),
      where('userId', '==', firebaseUser.uid)
    );
    const unsubAddresses = onSnapshot(
      addrQuery,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Address, 'id'>) }));
        setAddresses(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'addresses');
        } catch {
          // Logged with context
        }
      }
    );

    return () => {
      unsubOrders();
      unsubAddresses();
    };
  }, [firebaseUser]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 mb-5">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Sign in to access your QuickKart dashboard
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          View live grocery deliveries, cancel eligible orders, and manage saved hostel or home addresses.
        </p>
        <button
          type="button"
          onClick={() => openAuthModal('options')}
          className="mt-6 inline-flex items-center rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
        >
          Sign In / Create Account
        </button>
      </div>
    );
  }

  const activeOrders = orders.filter((o) => o.status !== 'Delivered' && o.status !== 'Cancelled');
  const historyOrders = orders.filter((o) => o.status === 'Delivered' || o.status === 'Cancelled');

  const handleCancelOrder = async (order: Order) => {
    if (!canCancelOrder(order.status)) return;
    setCancellingId(order.id);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'Cancelled',
        updatedAt: serverTimestamp(),
      });
      showToast(`Order ${order.orderNumber} has been cancelled.`, 'info');
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
      } catch (wrapped) {
        showToast(extractReadableError(wrapped, 'Could not cancel order.'), 'error');
      }
    } finally {
      setCancellingId(null);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser.emailVerified) {
      showToast('Please verify your email address before saving addresses.', 'error');
      return;
    }
    if (
      addrName.trim().length < 2 ||
      !/^[0-9+\-\s]{10,15}$/.test(addrMobile.trim()) ||
      addrLine.trim().length < 5 ||
      addrHostel.trim().length < 1 ||
      !/^[0-9]{6}$/.test(addrPincode.trim())
    ) {
      showToast('Please fill all required address fields with a valid 10-digit mobile and 6-digit pincode.', 'error');
      return;
    }

    setSavingAddr(true);
    try {
      const ref = doc(collection(db, 'addresses'));
      await setDoc(ref, {
        userId: firebaseUser.uid,
        label: addrLabel.trim().slice(0, 40) || 'Home',
        customerName: addrName.trim().slice(0, 100),
        mobile: addrMobile.trim().slice(0, 15),
        addressLine: addrLine.trim().slice(0, 240),
        hostelOrFlat: addrHostel.trim().slice(0, 100),
        landmark: addrLandmark.trim().slice(0, 120),
        city: addrCity.trim().slice(0, 60) || 'Dehradun',
        pincode: addrPincode.trim(),
        isDefault: addresses.length === 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setShowAddressForm(false);
      setAddrLine('');
      setAddrHostel('');
      setAddrLandmark('');
      showToast('Delivery address saved.', 'success');
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.CREATE, 'addresses');
      } catch (wrapped) {
        showToast(extractReadableError(wrapped, 'Failed to save address.'), 'error');
      }
    } finally {
      setSavingAddr(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      await deleteDoc(doc(db, 'addresses', addressId));
      showToast('Address removed.', 'info');
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.DELETE, `addresses/${addressId}`);
      } catch (wrapped) {
        showToast(extractReadableError(wrapped, 'Failed to remove address.'), 'error');
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editName.trim().length < 2) {
      showToast('Name must be at least 2 characters.', 'error');
      return;
    }
    setSavingProfile(true);
    try {
      await updateUserProfile({ name: editName, phone: editPhone });
    } catch (error) {
      showToast(extractReadableError(error, 'Failed to update profile.'), 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const renderOrderCard = (order: Order) => {
    const stepIndex = getOrderStepIndex(order.status);
    const isCancelled = order.status === 'Cancelled';
    return (
      <article
        key={order.id}
        className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <p className="font-mono text-xs font-semibold text-emerald-700">{order.orderNumber}</p>
            <p className="text-xs text-slate-500 mt-0.5">{formatOrderDate(order.createdAt)}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-semibold ${
                isCancelled
                  ? 'text-red-700'
                  : order.status === 'Delivered'
                    ? 'text-emerald-700'
                    : 'text-slate-900'
              }`}
            >
              Status: {order.status}
            </span>
            <span className="text-sm font-bold text-slate-900 tabular-nums">
              {formatINR(order.finalTotal)}
            </span>
          </div>
        </div>

        {/* Status Stepper */}
        {!isCancelled && (
          <div className="grid grid-cols-5 gap-1.5" aria-label={`Order status ${order.status}`}>
            {ORDER_STATUS_SEQUENCE.map((step, idx) => {
              const reached = idx <= stepIndex;
              return (
                <div key={step} className="space-y-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      reached ? 'bg-emerald-700' : 'bg-slate-200'
                    }`}
                  />
                  <p
                    className={`text-[10px] sm:text-[11px] leading-tight ${
                      reached ? 'font-semibold text-emerald-900' : 'text-slate-400'
                    }`}
                  >
                    {step}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Items */}
        <ul className="space-y-1.5 text-sm">
          {order.items.map((item, idx) => (
            <li key={`${order.id}-${idx}`} className="flex justify-between gap-3 text-slate-700">
              <span className="truncate">
                {item.quantity} × {item.name} ({item.unit})
              </span>
              <span className="font-medium text-slate-900 tabular-nums shrink-0">
                {formatINR(item.price * item.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <p className="truncate max-w-lg">
            Deliver to: <strong className="text-slate-800">{order.hostelOrFlat}</strong>,{' '}
            {order.deliveryAddress}
            {order.landmark ? ` (${order.landmark})` : ''} · {order.paymentMethod}
          </p>

          {canCancelOrder(order.status) && (
            <button
              type="button"
              disabled={cancellingId === order.id}
              onClick={() => handleCancelOrder(order)}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              {cancellingId === order.id ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-white font-display text-lg font-bold">
            {(profile?.name || firebaseUser.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
              {profile?.name || firebaseUser.displayName || 'My QuickKart Account'}
            </h1>
            <p className="text-sm text-slate-600">
              {firebaseUser.email} {profile?.phone ? `· ${profile.phone}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors"
            >
              <ShieldCheck className="h-4 w-4" />
              Admin Dashboard
            </Link>
          )}
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2" role="tablist">
        {[
          { id: 'orders' as const, label: `My Orders (${activeOrders.length})`, icon: Package },
          { id: 'history' as const, label: `Order History (${historyOrders.length})`, icon: History },
          { id: 'addresses' as const, label: `Saved Addresses (${addresses.length})`, icon: MapPin },
          { id: 'settings' as const, label: 'Account Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {ordersLoading ? (
              <div className="p-10 text-center text-sm text-slate-500">Loading your orders...</div>
            ) : activeOrders.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-10 text-center">
                <Clock className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  No active deliveries right now
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Place a grocery order and track every step from confirmation to doorstep arrival here.
                </p>
                <Link
                  to="/catalogue"
                  className="mt-5 inline-flex rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
                >
                  Start Shopping
                </Link>
              </div>
            ) : (
              activeOrders.map(renderOrderCard)
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            {historyOrders.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-10 text-center">
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  No past orders yet
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Completed and cancelled orders will appear here for your records.
                </p>
              </div>
            ) : (
              historyOrders.map(renderOrderCard)
            )}
          </div>
        )}

        {activeTab === 'addresses' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-slate-900">
                Saved Delivery Addresses
              </h2>
              <button
                type="button"
                onClick={() => setShowAddressForm((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors"
              >
                <Plus className="h-4 w-4" />
                {showAddressForm ? 'Cancel' : 'Add Address'}
              </button>
            </div>

            {showAddressForm && (
              <form
                onSubmit={handleAddAddress}
                className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="addr-label" className="block text-xs font-medium text-slate-700 mb-1">
                      Label
                    </label>
                    <input
                      id="addr-label"
                      type="text"
                      value={addrLabel}
                      onChange={(e) => setAddrLabel(e.target.value)}
                      placeholder="Hostel Room / Home"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="addr-name" className="block text-xs font-medium text-slate-700 mb-1">
                      Recipient name *
                    </label>
                    <input
                      id="addr-name"
                      type="text"
                      required
                      value={addrName}
                      onChange={(e) => setAddrName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="addr-mobile" className="block text-xs font-medium text-slate-700 mb-1">
                      Mobile number *
                    </label>
                    <input
                      id="addr-mobile"
                      type="tel"
                      required
                      value={addrMobile}
                      onChange={(e) => setAddrMobile(e.target.value)}
                      placeholder="10-digit mobile"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="addr-hostel" className="block text-xs font-medium text-slate-700 mb-1">
                      Hostel / Flat number *
                    </label>
                    <input
                      id="addr-hostel"
                      type="text"
                      required
                      value={addrHostel}
                      onChange={(e) => setAddrHostel(e.target.value)}
                      placeholder="Hostel A, Room 108"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="addr-landmark" className="block text-xs font-medium text-slate-700 mb-1">
                      Landmark
                    </label>
                    <input
                      id="addr-landmark"
                      type="text"
                      value={addrLandmark}
                      onChange={(e) => setAddrLandmark(e.target.value)}
                      placeholder="Near Main Gate"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label htmlFor="addr-line" className="block text-xs font-medium text-slate-700 mb-1">
                      Street / Campus Address *
                    </label>
                    <input
                      id="addr-line"
                      type="text"
                      required
                      value={addrLine}
                      onChange={(e) => setAddrLine(e.target.value)}
                      placeholder="Campus road, locality"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="addr-city" className="block text-xs font-medium text-slate-700 mb-1">
                        City
                      </label>
                      <input
                        id="addr-city"
                        type="text"
                        value={addrCity}
                        onChange={(e) => setAddrCity(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="addr-pin" className="block text-xs font-medium text-slate-700 mb-1">
                        Pincode *
                      </label>
                      <input
                        id="addr-pin"
                        type="text"
                        required
                        maxLength={6}
                        value={addrPincode}
                        onChange={(e) => setAddrPincode(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingAddr}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  {savingAddr && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Address
                </button>
              </form>
            )}

            {addresses.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-10 text-center text-sm text-slate-600">
                No saved addresses yet. Add your hostel room or home address for 1-click checkout.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1 text-sm">
                      <p className="text-xs font-semibold text-emerald-700">
                        {addr.label} {addr.isDefault ? '· Default' : ''}
                      </p>
                      <p className="font-semibold text-slate-900">{addr.customerName}</p>
                      <p className="text-slate-600">
                        {addr.hostelOrFlat}, {addr.addressLine}
                      </p>
                      <p className="text-xs text-slate-500">
                        {addr.landmark ? `${addr.landmark} · ` : ''}
                        {addr.city} – {addr.pincode} · {addr.mobile}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAddress(addr.id)}
                      aria-label={`Delete ${addr.label} address`}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form
              onSubmit={handleSaveProfile}
              className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4"
            >
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Profile Information
                </h2>
              </div>

              <div>
                <label htmlFor="profile-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Full name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label htmlFor="profile-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email address
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={firebaseUser.email || ''}
                  disabled
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500"
                />
              </div>

              <div>
                <label htmlFor="profile-phone" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Mobile number
                </label>
                <input
                  id="profile-phone"
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </form>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
              <h2 className="font-display text-lg font-semibold text-slate-900">
                Security &amp; Session
              </h2>
              <div className="space-y-2 text-sm text-slate-600">
                <p>
                  Email Verification:{' '}
                  <strong className={firebaseUser.emailVerified ? 'text-emerald-700' : 'text-amber-700'}>
                    {firebaseUser.emailVerified ? 'Verified' : 'Pending Verification'}
                  </strong>
                </p>
                <p>
                  Account Role:{' '}
                  <strong className="text-slate-900 capitalize">
                    {isAdmin ? 'Administrator' : 'Customer'}
                  </strong>
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-3">
                {firebaseUser.email && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await resetPassword(firebaseUser.email!);
                        showToast(`Password reset email sent to ${firebaseUser.email}.`, 'success');
                      } catch (err) {
                        showToast(
                          err instanceof Error ? err.message : 'Failed to send reset email.',
                          'error'
                        );
                      }
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                  >
                    Send Password Reset Email
                  </button>
                )}

                <button
                  type="button"
                  onClick={logout}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
                >
                  Sign Out of QuickKart
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

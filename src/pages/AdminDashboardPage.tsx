import React, { useEffect, useMemo, useState } from 'react';
import {
  Boxes,
  Database,
  Edit2,
  FolderKanban,
  IndianRupee,
  Loader2,
  Lock,
  Package,
  Plus,
  ShoppingBag,
  Tag,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import {
  db,
  extractReadableError,
  handleFirestoreError,
  OperationType,
  storage,
} from '../firebase';
import { CATEGORY_IMAGES, SEED_CATEGORIES, SEED_COUPONS, SEED_PRODUCTS } from '../data/seedCatalog';
import type { Category, Coupon, Order, OrderStatus, Product, UserProfile } from '../types';
import { ALL_ORDER_STATUSES, formatINR, slugify } from '../utils/commerce';
import { ProductImage } from '../components/ProductImage';

type AdminTab = 'products' | 'categories' | 'orders' | 'inventory' | 'customers' | 'coupons';

export function AdminDashboardPage() {
  const { firebaseUser, loading, isAdmin, openAuthModal } = useAuth();
  const { categories, products, coupons, isCatalogSyncedToFirestore } = useStore();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [seeding, setSeeding] = useState(false);

  // Order status filter
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'low' | 'out'>('all');

  // Product form modal state
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCategoryId, setProdCategoryId] = useState('fruits-vegetables');
  const [prodUnit, setProdUnit] = useState('500 g');
  const [prodDescription, setProdDescription] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodDiscountPrice, setProdDiscountPrice] = useState('');
  const [prodStock, setProdStock] = useState('25');
  const [prodImage, setProdImage] = useState<string>(CATEGORY_IMAGES.fruitsVeg);
  const [prodFeatured, setProdFeatured] = useState(false);
  const [prodSpecialOffer, setProdSpecialOffer] = useState(false);
  const [prodRecommended, setProdRecommended] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);

  // Category form state
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catImage, setCatImage] = useState<string>(CATEGORY_IMAGES.fruitsVeg);
  const [catOrder, setCatOrder] = useState('9');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [savingCat, setSavingCat] = useState(false);

  // Coupon form state
  const [couponCode, setCouponCode] = useState('');
  const [couponDesc, setCouponDesc] = useState('');
  const [couponType, setCouponType] = useState<'percentage' | 'flat'>('percentage');
  const [couponValue, setCouponValue] = useState('10');
  const [couponMinOrder, setCouponMinOrder] = useState('199');
  const [couponMaxDiscount, setCouponMaxDiscount] = useState('100');
  const [savingCoupon, setSavingCoupon] = useState(false);

  useEffect(() => {
    if (!firebaseUser || !isAdmin) {
      setOrders([]);
      setCustomers([]);
      return;
    }

    const unsubOrders = onSnapshot(
      collection(db, 'orders'),
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
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'orders');
        } catch {
          // Handled safely
        }
      }
    );

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as UserProfile);
        setCustomers(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'users');
        } catch {
          // Handled safely
        }
      }
    );

    return () => {
      unsubOrders();
      unsubUsers();
    };
  }, [firebaseUser, isAdmin]);

  const metrics = useMemo(() => {
    const nonCancelled = orders.filter((o) => o.status !== 'Cancelled');
    const totalRevenue = nonCancelled.reduce((sum, o) => sum + (o.finalTotal || 0), 0);
    return {
      totalOrders: orders.length,
      totalCustomers: customers.length,
      totalProducts: products.length,
      totalRevenue,
    };
  }, [orders, customers, products]);

  const filteredOrders = useMemo(() => {
    if (orderStatusFilter === 'all') return orders;
    return orders.filter((o) => o.status === orderStatusFilter);
  }, [orders, orderStatusFilter]);

  const filteredInventory = useMemo(() => {
    if (inventoryFilter === 'out') return products.filter((p) => p.stock === 0);
    if (inventoryFilter === 'low') return products.filter((p) => p.stock > 0 && p.stock <= 10);
    return products;
  }, [products, inventoryFilter]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (!firebaseUser || !isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 mb-5">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Administrator Access Required
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          {!firebaseUser
            ? 'Sign in with an authorized QuickKart administrator account to manage inventory, products, and customer orders.'
            : `Signed in as ${firebaseUser.email}. Your account does not have administrator privileges verified by Firestore security rules.`}
        </p>
        {!firebaseUser && (
          <button
            type="button"
            onClick={() => openAuthModal('options')}
            className="mt-6 inline-flex items-center rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
          >
            Sign In as Administrator
          </button>
        )}
      </div>
    );
  }

  const handleSeedFirestore = async () => {
    setSeeding(true);
    try {
      // Seed categories first so product category existence rule succeeds
      for (const cat of SEED_CATEGORIES) {
        await setDoc(doc(db, 'categories', cat.id), {
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          image: cat.image,
          displayOrder: cat.displayOrder,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const prod of SEED_PRODUCTS) {
        await setDoc(doc(db, 'products', prod.id), {
          name: prod.name,
          categoryId: prod.categoryId,
          categoryName: prod.categoryName,
          description: prod.description,
          unit: prod.unit,
          price: prod.price,
          discountPrice: prod.discountPrice,
          stock: prod.stock,
          image: prod.image,
          isFeatured: prod.isFeatured,
          isSpecialOffer: prod.isSpecialOffer,
          isRecommended: prod.isRecommended,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const coupon of SEED_COUPONS) {
        await setDoc(doc(db, 'coupons', coupon.id), {
          code: coupon.code,
          description: coupon.description,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          minOrderAmount: coupon.minOrderAmount,
          maxDiscount: coupon.maxDiscount,
          isActive: coupon.isActive,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      showToast('Starter categories, products, and coupons synced to Cloud Firestore!', 'success');
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.WRITE, 'seed_catalog');
      } catch (wrapped) {
        showToast(extractReadableError(wrapped, 'Failed to seed Firestore catalog.'), 'error');
      }
    } finally {
      setSeeding(false);
    }
  };

  const openNewProductForm = () => {
    setEditingProductId(null);
    setProdName('');
    setProdCategoryId(categories[0]?.id || 'fruits-vegetables');
    setProdUnit('500 g');
    setProdDescription('');
    setProdPrice('');
    setProdDiscountPrice('');
    setProdStock('25');
    setProdImage(categories[0]?.image || CATEGORY_IMAGES.fruitsVeg);
    setProdFeatured(false);
    setProdSpecialOffer(false);
    setProdRecommended(false);
    setProductFormOpen(true);
  };

  const openEditProductForm = (p: Product) => {
    setEditingProductId(p.id);
    setProdName(p.name);
    setProdCategoryId(p.categoryId);
    setProdUnit(p.unit);
    setProdDescription(p.description);
    setProdPrice(String(p.price));
    setProdDiscountPrice(String(p.discountPrice));
    setProdStock(String(p.stock));
    setProdImage(p.image);
    setProdFeatured(p.isFeatured);
    setProdSpecialOffer(p.isSpecialOffer);
    setProdRecommended(p.isRecommended);
    setProductFormOpen(true);
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be smaller than 5 MB.', 'error');
      return;
    }

    setUploadingImage(true);
    try {
      const storageRef = ref(storage, `products/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setProdImage(url);
      showToast('Product image uploaded to Firebase Storage.', 'success');
    } catch (error) {
      showToast(
        extractReadableError(
          error,
          'Firebase Storage upload failed. Ensure Firebase Storage is enabled in your console, or paste an image URL below.'
        ),
        'error'
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(prodPrice);
    const discountPrice = prodDiscountPrice ? Number(prodDiscountPrice) : price;
    const stock = Math.max(0, Math.floor(Number(prodStock)));
    const cat = categories.find((c) => c.id === prodCategoryId);

    if (!cat) {
      showToast('Please select a valid category (seed categories to Firestore first if needed).', 'error');
      return;
    }
    if (prodName.trim().length < 2 || prodDescription.trim().length < 5) {
      showToast('Enter a valid product name (2+ chars) and description (5+ chars).', 'error');
      return;
    }
    if (!Number.isFinite(price) || price <= 0 || discountPrice < 0 || discountPrice > price) {
      showToast('Enter a valid price and discount price (discount cannot exceed price).', 'error');
      return;
    }

    setSavingProduct(true);
    try {
      const payload = {
        name: prodName.trim().slice(0, 120),
        categoryId: cat.id,
        categoryName: cat.name,
        description: prodDescription.trim().slice(0, 600),
        unit: prodUnit.trim().slice(0, 40) || '1 pack',
        price,
        discountPrice,
        stock,
        image: prodImage.trim().slice(0, 600) || cat.image,
        isFeatured: prodFeatured,
        isSpecialOffer: prodSpecialOffer,
        isRecommended: prodRecommended,
        updatedAt: serverTimestamp(),
      };

      if (editingProductId) {
        await updateDoc(doc(db, 'products', editingProductId), payload);
        showToast('Product updated in Firestore.', 'success');
      } else {
        const newRef = doc(collection(db, 'products'));
        await setDoc(newRef, { ...payload, createdAt: serverTimestamp() });
        showToast('Product added to Firestore.', 'success');
      }
      setProductFormOpen(false);
    } catch (error) {
      try {
        handleFirestoreError(
          error,
          editingProductId ? OperationType.UPDATE : OperationType.CREATE,
          editingProductId ? `products/${editingProductId}` : 'products'
        );
      } catch (wrapped) {
        showToast(
          extractReadableError(
            wrapped,
            'Failed to save product. If this is a fresh database, click "Seed Starter Catalogue" first.'
          ),
          'error'
        );
      }
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId: string, name: string) => {
    try {
      await deleteDoc(doc(db, 'products', productId));
      showToast(`Deleted "${name}".`, 'info');
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
      } catch (wrapped) {
        showToast(extractReadableError(wrapped, 'Failed to delete product.'), 'error');
      }
    }
  };

  const handleQuickStockUpdate = async (product: Product, nextStock: number) => {
    const safeStock = Math.max(0, Math.min(100000, Math.floor(nextStock)));
    try {
      await updateDoc(doc(db, 'products', product.id), {
        stock: safeStock,
        updatedAt: serverTimestamp(),
      });
      showToast(`Stock for ${product.name} updated to ${safeStock}.`, 'success');
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.UPDATE, `products/${product.id}`);
      } catch (wrapped) {
        showToast(extractReadableError(wrapped, 'Seed catalogue first to edit stock in Firestore.'), 'error');
      }
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = slugify(catName);
    if (catName.trim().length < 2 || slug.length < 2) {
      showToast('Category name must be at least 2 characters.', 'error');
      return;
    }
    setSavingCat(true);
    try {
      const targetId = editingCatId || slug;
      const payload = {
        name: catName.trim().slice(0, 60),
        slug,
        description: catDesc.trim().slice(0, 240) || 'Fresh daily essentials',
        image: catImage.trim().slice(0, 600) || CATEGORY_IMAGES.fruitsVeg,
        displayOrder: Math.max(0, Math.min(100, Math.floor(Number(catOrder) || 1))),
        isActive: true,
        updatedAt: serverTimestamp(),
      };
      if (editingCatId) {
        await updateDoc(doc(db, 'categories', editingCatId), payload);
        showToast('Category updated.', 'success');
      } else {
        await setDoc(doc(db, 'categories', targetId), { ...payload, createdAt: serverTimestamp() });
        showToast('Category created.', 'success');
      }
      setEditingCatId(null);
      setCatName('');
      setCatDesc('');
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.WRITE, 'categories');
      } catch (wrapped) {
        showToast(extractReadableError(wrapped, 'Failed to save category.'), 'error');
      }
    } finally {
      setSavingCat(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    try {
      await deleteDoc(doc(db, 'categories', cat.id));
      showToast(`Category "${cat.name}" removed.`, 'info');
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.DELETE, `categories/${cat.id}`);
      } catch (wrapped) {
        showToast(extractReadableError(wrapped, 'Failed to delete category.'), 'error');
      }
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status,
        updatedAt: serverTimestamp(),
      });
      showToast(`Order status updated to "${status}".`, 'success');
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
      } catch (wrapped) {
        showToast(extractReadableError(wrapped, 'Failed to update order status.'), 'error');
      }
    }
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = couponCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanCode.length < 3) {
      showToast('Coupon code must be at least 3 alphanumeric characters.', 'error');
      return;
    }
    setSavingCoupon(true);
    try {
      await setDoc(doc(db, 'coupons', `coupon-${cleanCode.toLowerCase()}`), {
        code: cleanCode,
        description: couponDesc.trim().slice(0, 160) || `${cleanCode} promotional discount`,
        discountType: couponType,
        discountValue: Math.max(1, Number(couponValue) || 10),
        minOrderAmount: Math.max(0, Number(couponMinOrder) || 0),
        maxDiscount: Math.max(0, Number(couponMaxDiscount) || 100),
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setCouponCode('');
      setCouponDesc('');
      showToast(`Coupon ${cleanCode} created.`, 'success');
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.CREATE, 'coupons');
      } catch (wrapped) {
        showToast(extractReadableError(wrapped, 'Failed to create coupon.'), 'error');
      }
    } finally {
      setSavingCoupon(false);
    }
  };

  const handleToggleCoupon = async (coupon: Coupon) => {
    try {
      await updateDoc(doc(db, 'coupons', coupon.id), {
        isActive: !coupon.isActive,
        updatedAt: serverTimestamp(),
      });
      showToast(`Coupon ${coupon.code} ${!coupon.isActive ? 'activated' : 'paused'}.`, 'info');
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.UPDATE, `coupons/${coupon.id}`);
      } catch (wrapped) {
        showToast(extractReadableError(wrapped, 'Failed to update coupon.'), 'error');
      }
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    try {
      await deleteDoc(doc(db, 'coupons', couponId));
      showToast('Coupon deleted.', 'info');
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.DELETE, `coupons/${couponId}`);
      } catch (wrapped) {
        showToast(extractReadableError(wrapped, 'Failed to delete coupon.'), 'error');
      }
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-semibold text-emerald-700">QuickKart Operations Console</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage Firestore catalogue, live orders, stock inventory, coupons, and customers.
          </p>
        </div>

        <button
          type="button"
          disabled={seeding}
          onClick={handleSeedFirestore}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-700 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-60 transition-colors self-start md:self-auto"
        >
          {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
          {isCatalogSyncedToFirestore
            ? 'Re-Sync Starter Catalogue'
            : 'Seed Starter Catalogue to Firestore'}
        </button>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: String(metrics.totalOrders), icon: ShoppingBag },
          { label: 'Total Customers', value: String(metrics.totalCustomers), icon: Users },
          { label: 'Total Products', value: String(metrics.totalProducts), icon: Package },
          { label: 'Total Revenue', value: formatINR(metrics.totalRevenue), icon: IndianRupee },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 flex items-start justify-between gap-3"
            >
              <div>
                <p className="text-xs font-medium text-slate-500">{kpi.label}</p>
                <p className="mt-2 font-display text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
                  {kpi.value}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1" role="tablist">
        {[
          { id: 'orders' as const, label: `Orders (${orders.length})`, icon: ShoppingBag },
          { id: 'products' as const, label: `Products (${products.length})`, icon: Package },
          { id: 'inventory' as const, label: 'Inventory', icon: Boxes },
          { id: 'categories' as const, label: `Categories (${categories.length})`, icon: FolderKanban },
          { id: 'customers' as const, label: `Customers (${customers.length})`, icon: Users },
          { id: 'coupons' as const, label: `Coupons (${coupons.length})`, icon: Tag },
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

      {/* 1. MANAGE ORDERS */}
      {activeTab === 'orders' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-slate-900">Manage Orders</h2>
            <select
              aria-label="Filter orders by status"
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
              className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800"
            >
              <option value="all">All Statuses</option>
              {ALL_ORDER_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-10 text-center text-sm text-slate-600">
              No orders found for this filter. Customer orders placed at checkout will appear here in real time.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-700">
                        {order.orderNumber}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="font-semibold text-slate-900">{order.customerName}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-600">{order.mobile}</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      {order.hostelOrFlat}, {order.deliveryAddress}
                      {order.landmark ? ` (${order.landmark})` : ''}
                    </p>
                    <p className="text-xs text-slate-500">
                      {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 shrink-0">
                    <div className="text-right tabular-nums">
                      <p className="text-base font-bold text-slate-900">
                        {formatINR(order.finalTotal)}
                      </p>
                      <p className="text-[11px] text-slate-500">{order.paymentMethod}</p>
                    </div>

                    <select
                      aria-label={`Update status for order ${order.orderNumber}`}
                      value={order.status}
                      onChange={(e) =>
                        handleUpdateOrderStatus(order.id, e.target.value as OrderStatus)
                      }
                      className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 focus:border-emerald-600 focus:outline-none"
                    >
                      {ALL_ORDER_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 2. MANAGE PRODUCTS */}
      {activeTab === 'products' && (
        <section className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-lg font-semibold text-slate-900">Manage Products</h2>
            <button
              type="button"
              onClick={openNewProductForm}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          </div>

          {productFormOpen && (
            <form
              onSubmit={handleSaveProduct}
              className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-6 space-y-4"
            >
              <h3 className="font-display text-base font-bold text-slate-900">
                {editingProductId ? 'Edit Product' : 'Add New Product'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Product name *
                  </label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="e.g. Organic Brown Eggs"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={prodCategoryId}
                    onChange={(e) => setProdCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Unit / Pack Size *
                  </label>
                  <input
                    type="text"
                    required
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value)}
                    placeholder="e.g. 500 g, 1 L, Pack of 6"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Description *
                </label>
                <textarea
                  rows={2}
                  required
                  value={prodDescription}
                  onChange={(e) => setProdDescription(e.target.value)}
                  placeholder="Brief fresh product description"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    MRP Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Discount Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={prodDiscountPrice}
                    onChange={(e) => setProdDiscountPrice(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Image URL
                  </label>
                  <input
                    type="text"
                    value={prodImage}
                    onChange={(e) => setProdImage(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                    {uploadingImage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Upload to Firebase Storage
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-slate-700">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodFeatured}
                    onChange={(e) => setProdFeatured(e.target.checked)}
                    className="h-4 w-4 rounded text-emerald-700"
                  />
                  Featured Product
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodSpecialOffer}
                    onChange={(e) => setProdSpecialOffer(e.target.checked)}
                    className="h-4 w-4 rounded text-emerald-700"
                  />
                  Special Offer
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodRecommended}
                    onChange={(e) => setProdRecommended(e.target.checked)}
                    className="h-4 w-4 rounded text-emerald-700"
                  />
                  Recommended
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  {savingProduct && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingProductId ? 'Update Product' : 'Create Product'}
                </button>
                <button
                  type="button"
                  onClick={() => setProductFormOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
                          <ProductImage src={p.image} alt={p.name} className="h-full w-full object-cover" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{p.name}</p>
                          <p className="text-xs text-slate-500">{p.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{p.categoryName}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className="font-semibold text-slate-900">{formatINR(p.discountPrice || p.price)}</span>
                      {p.discountPrice < p.price && (
                        <span className="ml-1.5 text-xs text-slate-400 line-through">
                          {formatINR(p.price)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={p.stock <= 5 ? 'font-semibold text-red-600' : 'text-slate-700'}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditProductForm(p)}
                          aria-label={`Edit ${p.name}`}
                          className="p-2 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          aria-label={`Delete ${p.name}`}
                          className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 3. MANAGE INVENTORY */}
      {activeTab === 'inventory' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-slate-900">Manage Inventory</h2>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs">
              {[
                { id: 'all' as const, label: 'All Items' },
                { id: 'low' as const, label: 'Low Stock (≤ 10)' },
                { id: 'out' as const, label: 'Out of Stock' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setInventoryFilter(opt.id)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    inventoryFilter === opt.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Current Stock</th>
                  <th className="px-4 py-3 text-right">Quick Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {p.name} <span className="text-xs text-slate-500">({p.unit})</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{p.categoryName}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">
                      <span
                        className={
                          p.stock === 0
                            ? 'text-red-600'
                            : p.stock <= 10
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                        }
                      >
                        {p.stock} units
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleQuickStockUpdate(p, p.stock - 1)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold hover:bg-slate-100"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickStockUpdate(p, p.stock + 1)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold hover:bg-slate-100"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickStockUpdate(p, p.stock + 10)}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                        >
                          +10
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 4. MANAGE CATEGORIES */}
      {activeTab === 'categories' && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSaveCategory}
            className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-semibold text-slate-900">
              {editingCatId ? 'Edit Category' : 'Add Category'}
            </h2>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Category Name *</label>
              <input
                type="text"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Organic Honey & Spreads"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
              <input
                type="text"
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                placeholder="Short category subtitle"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Image URL</label>
                <input
                  type="text"
                  value={catImage}
                  onChange={(e) => setCatImage(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Order</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={catOrder}
                  onChange={(e) => setCatOrder(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={savingCat}
                className="rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {editingCatId ? 'Update Category' : 'Save Category'}
              </button>
              {editingCatId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCatId(null);
                    setCatName('');
                    setCatDesc('');
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
            {categories.map((cat) => (
              <div key={cat.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-12 w-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
                    <ProductImage src={cat.image} alt={cat.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900">{cat.name}</p>
                    <p className="text-xs text-slate-500 truncate">{cat.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCatId(cat.id);
                      setCatName(cat.name);
                      setCatDesc(cat.description);
                      setCatImage(cat.image);
                      setCatOrder(String(cat.displayOrder));
                    }}
                    aria-label={`Edit ${cat.name}`}
                    className="p-2 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat)}
                    aria-label={`Delete ${cat.name}`}
                    className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. CUSTOMERS */}
      {activeTab === 'customers' && (
        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-slate-900">Registered Customers</h2>
          {customers.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-10 text-center text-sm text-slate-600">
              No verified customer profiles recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3 text-right">Orders</th>
                    <th className="px-4 py-3 text-right">Total Spend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((c) => {
                    const userOrders = orders.filter((o) => o.userId === c.uid && o.status !== 'Cancelled');
                    const spend = userOrders.reduce((s, o) => s + o.finalTotal, 0);
                    return (
                      <tr key={c.uid}>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {c.name}{' '}
                          {c.role === 'admin' && (
                            <span className="text-xs font-semibold text-emerald-700">· Admin</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{c.email}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{c.phone || '—'}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{userOrders.length}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">
                          {formatINR(spend)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* 6. COUPONS */}
      {activeTab === 'coupons' && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleAddCoupon}
            className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-semibold text-slate-900">Create Coupon</h2>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Coupon Code *</label>
              <input
                type="text"
                required
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="e.g. CAMPUS20"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
              <input
                type="text"
                value={couponDesc}
                onChange={(e) => setCouponDesc(e.target.value)}
                placeholder="20% off on student essentials"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={couponType}
                  onChange={(e) => setCouponType(e.target.value as 'percentage' | 'flat')}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat (₹)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Value</label>
                <input
                  type="number"
                  min="1"
                  value={couponValue}
                  onChange={(e) => setCouponValue(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Min Order (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={couponMinOrder}
                  onChange={(e) => setCouponMinOrder(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Max Discount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={couponMaxDiscount}
                  onChange={(e) => setCouponMaxDiscount(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={savingCoupon}
              className="rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              Create Coupon
            </button>
          </form>

          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
            {coupons.map((c) => (
              <div key={c.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-sm font-bold text-slate-900">
                    {c.code}{' '}
                    <span className={`font-sans text-xs font-medium ${c.isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
                      · {c.isActive ? 'Active' : 'Paused'}
                    </span>
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">{c.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleCoupon(c)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {c.isActive ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCoupon(c.id)}
                    aria-label={`Delete coupon ${c.code}`}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

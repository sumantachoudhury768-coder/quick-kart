import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { SEED_CATEGORIES, SEED_COUPONS, SEED_PRODUCTS } from '../data/seedCatalog';
import type { CartItem, Category, Coupon, Product } from '../types';
import { calculateCartTotals, validateCoupon, type CartTotals } from '../utils/commerce';
import { useToast } from './ToastContext';

const CART_STORAGE_KEY = 'quickkart_cart_v1';
const COUPON_STORAGE_KEY = 'quickkart_coupon_v1';

interface StoredCartEntry {
  productId: string;
  quantity: number;
  snapshot: Product;
}

interface StoreContextValue {
  categories: Category[];
  products: Product[];
  coupons: Coupon[];
  catalogLoading: boolean;
  isCatalogSyncedToFirestore: boolean;
  cart: CartItem[];
  cartTotals: CartTotals;
  appliedCoupon: Coupon | null;
  cartDrawerOpen: boolean;
  selectedProduct: Product | null;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  setSelectedProduct: (product: Product | null) => void;
  addToCart: (product: Product, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getItemQuantity: (productId: string) => number;
  applyCouponCode: (code: string) => { valid: boolean; error?: string };
  removeCoupon: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function loadStoredCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredCartEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && entry.snapshot && entry.quantity > 0)
      .map((entry) => ({
        product: entry.snapshot,
        quantity: Math.floor(entry.quantity),
      }));
  } catch {
    return [];
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const [firestoreCategories, setFirestoreCategories] = useState<Category[] | null>(null);
  const [firestoreProducts, setFirestoreProducts] = useState<Product[] | null>(null);
  const [firestoreCoupons, setFirestoreCoupons] = useState<Coupon[] | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [cart, setCart] = useState<CartItem[]>(() => loadStoredCart());
  const [appliedCouponCode, setAppliedCouponCode] = useState<string>(() => {
    try {
      return window.localStorage.getItem(COUPON_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    const catQuery = query(collection(db, 'categories'), orderBy('displayOrder', 'asc'));
    const unsubCategories = onSnapshot(
      catQuery,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Category, 'id'>) }));
        setFirestoreCategories(docs);
      },
      (err) => {
        console.error('Categories snapshot error:', err);
        setFirestoreCategories([]);
        try {
          handleFirestoreError(err, OperationType.LIST, 'categories');
        } catch {
          // Handled via graceful fallback
        }
      }
    );

    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, 'id'>) }));
        setFirestoreProducts(docs);
        setCatalogLoading(false);
      },
      (err) => {
        console.error('Products snapshot error:', err);
        setFirestoreProducts([]);
        setCatalogLoading(false);
        try {
          handleFirestoreError(err, OperationType.LIST, 'products');
        } catch {
          // Handled via graceful fallback
        }
      }
    );

    const unsubCoupons = onSnapshot(
      collection(db, 'coupons'),
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Coupon, 'id'>) }));
        setFirestoreCoupons(docs);
      },
      (err) => {
        console.error('Coupons snapshot error:', err);
        setFirestoreCoupons([]);
        try {
          handleFirestoreError(err, OperationType.LIST, 'coupons');
        } catch {
          // Handled via graceful fallback
        }
      }
    );

    return () => {
      unsubCategories();
      unsubProducts();
      unsubCoupons();
    };
  }, []);

  const isCatalogSyncedToFirestore = Boolean(
    firestoreProducts && firestoreProducts.length > 0 && firestoreCategories && firestoreCategories.length > 0
  );

  const categories = useMemo(
    () => (firestoreCategories && firestoreCategories.length > 0 ? firestoreCategories : SEED_CATEGORIES),
    [firestoreCategories]
  );

  const products = useMemo(
    () => (firestoreProducts && firestoreProducts.length > 0 ? firestoreProducts : SEED_PRODUCTS),
    [firestoreProducts]
  );

  const coupons = useMemo(
    () => (firestoreCoupons && firestoreCoupons.length > 0 ? firestoreCoupons : SEED_COUPONS),
    [firestoreCoupons]
  );

  // Keep cart item prices and stock synchronized with latest catalog
  useEffect(() => {
    if (products.length === 0) return;
    setCart((prev) =>
      prev
        .map((item) => {
          const fresh = products.find((p) => p.id === item.product.id);
          if (!fresh) return item;
          const clampedQty = fresh.stock > 0 ? Math.min(item.quantity, fresh.stock) : item.quantity;
          return { product: fresh, quantity: clampedQty };
        })
        .filter((item) => item.quantity > 0)
    );
  }, [products]);

  // Persist cart across page refresh and auth transitions
  useEffect(() => {
    try {
      const payload: StoredCartEntry[] = cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        snapshot: item.product,
      }));
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }, [cart]);

  useEffect(() => {
    try {
      if (appliedCouponCode) {
        window.localStorage.setItem(COUPON_STORAGE_KEY, appliedCouponCode);
      } else {
        window.localStorage.removeItem(COUPON_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, [appliedCouponCode]);

  const appliedCoupon = useMemo(() => {
    if (!appliedCouponCode) return null;
    const subtotalOnly = calculateCartTotals(cart, null).subtotal;
    const check = validateCoupon(appliedCouponCode, subtotalOnly, coupons);
    return check.valid && check.coupon ? check.coupon : null;
  }, [appliedCouponCode, cart, coupons]);

  const cartTotals = useMemo(
    () => calculateCartTotals(cart, appliedCoupon),
    [cart, appliedCoupon]
  );

  const addToCart = useCallback(
    (product: Product, qty = 1) => {
      if (product.stock <= 0) {
        showToast(`${product.name} is currently out of stock.`, 'error');
        return;
      }

      setCart((prev) => {
        const existing = prev.find((i) => i.product.id === product.id);
        if (existing) {
          const nextQty = existing.quantity + qty;
          if (nextQty > product.stock) {
            showToast(`Only ${product.stock} unit(s) of ${product.name} available in stock.`, 'info');
            return prev.map((i) =>
              i.product.id === product.id ? { ...i, product, quantity: product.stock } : i
            );
          }
          return prev.map((i) =>
            i.product.id === product.id ? { ...i, product, quantity: nextQty } : i
          );
        }
        return [...prev, { product, quantity: Math.min(qty, product.stock) }];
      });
      showToast(`Added ${product.name} to cart.`, 'success');
    },
    [showToast]
  );

  const removeFromCart = useCallback(
    (productId: string) => {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
      showToast('Item removed from cart.', 'info');
    },
    [showToast]
  );

  const updateCartQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (quantity <= 0) {
        setCart((prev) => prev.filter((i) => i.product.id !== productId));
        return;
      }
      setCart((prev) =>
        prev.map((item) => {
          if (item.product.id !== productId) return item;
          if (quantity > item.product.stock) {
            showToast(`Maximum available stock (${item.product.stock}) reached.`, 'info');
            return { ...item, quantity: item.product.stock };
          }
          return { ...item, quantity };
        })
      );
    },
    [showToast]
  );

  const clearCart = useCallback(() => {
    setCart([]);
    setAppliedCouponCode('');
  }, []);

  const getItemQuantity = useCallback(
    (productId: string) => cart.find((i) => i.product.id === productId)?.quantity || 0,
    [cart]
  );

  const applyCouponCode = useCallback(
    (code: string) => {
      const subtotalOnly = calculateCartTotals(cart, null).subtotal;
      const result = validateCoupon(code, subtotalOnly, coupons);
      if (!result.valid || !result.coupon) {
        return { valid: false, error: result.error };
      }
      setAppliedCouponCode(result.coupon.code);
      showToast(`Coupon ${result.coupon.code} applied!`, 'success');
      return { valid: true };
    },
    [cart, coupons, showToast]
  );

  const removeCoupon = useCallback(() => {
    setAppliedCouponCode('');
    showToast('Coupon removed.', 'info');
  }, [showToast]);

  return (
    <StoreContext.Provider
      value={{
        categories,
        products,
        coupons,
        catalogLoading,
        isCatalogSyncedToFirestore,
        cart,
        cartTotals,
        appliedCoupon,
        cartDrawerOpen,
        selectedProduct,
        openCartDrawer: () => setCartDrawerOpen(true),
        closeCartDrawer: () => setCartDrawerOpen(false),
        setSelectedProduct,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        getItemQuantity,
        applyCouponCode,
        removeCoupon,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return ctx;
}

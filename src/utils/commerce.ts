import type { CartItem, CheckoutFormValues, Coupon, OrderStatus, Product } from '../types';

export const FREE_DELIVERY_THRESHOLD = 299;
export const STANDARD_DELIVERY_CHARGE = 25;

export const ORDER_STATUS_SEQUENCE: OrderStatus[] = [
  'Order Placed',
  'Confirmed',
  'Preparing',
  'Out for Delivery',
  'Delivered',
];

export const ALL_ORDER_STATUSES: OrderStatus[] = [
  ...ORDER_STATUS_SEQUENCE,
  'Cancelled',
];

export function formatINR(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: safe % 1 === 0 ? 0 : 2,
  }).format(safe);
}

export function getEffectivePrice(product: Pick<Product, 'price' | 'discountPrice'>): number {
  if (product.discountPrice > 0 && product.discountPrice < product.price) {
    return product.discountPrice;
  }
  return product.price;
}

export function getDiscountPercent(product: Pick<Product, 'price' | 'discountPrice'>): number {
  const effective = getEffectivePrice(product);
  if (product.price <= 0 || effective >= product.price) return 0;
  return Math.round(((product.price - effective) / product.price) * 100);
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: Coupon;
  discountAmount: number;
  error?: string;
}

export function validateCoupon(
  rawCode: string,
  subtotal: number,
  coupons: Coupon[]
): CouponValidationResult {
  const normalized = rawCode.trim().toUpperCase();
  if (!normalized) {
    return { valid: false, discountAmount: 0, error: 'Enter a coupon code to apply.' };
  }

  const found = coupons.find((c) => c.code.toUpperCase() === normalized);
  if (!found || !found.isActive) {
    return { valid: false, discountAmount: 0, error: `Coupon "${normalized}" is invalid or expired.` };
  }

  if (subtotal < found.minOrderAmount) {
    const shortfall = Math.ceil(found.minOrderAmount - subtotal);
    return {
      valid: false,
      discountAmount: 0,
      error: `Add ${formatINR(shortfall)} more to unlock ${found.code} (min. order ${formatINR(found.minOrderAmount)}).`,
    };
  }

  let rawDiscount = 0;
  if (found.discountType === 'percentage') {
    rawDiscount = Math.round((subtotal * found.discountValue) / 100);
  } else {
    rawDiscount = found.discountValue;
  }

  const cappedDiscount = Math.min(
    rawDiscount,
    found.maxDiscount > 0 ? found.maxDiscount : rawDiscount,
    subtotal
  );

  return {
    valid: true,
    coupon: found,
    discountAmount: Math.max(0, Math.round(cappedDiscount)),
  };
}

export interface CartTotals {
  itemCount: number;
  mrpTotal: number;
  subtotal: number;
  productSavings: number;
  deliveryCharge: number;
  freeDeliveryRemaining: number;
  couponDiscount: number;
  finalTotal: number;
}

export function calculateCartTotals(
  items: CartItem[],
  appliedCoupon: Coupon | null = null
): CartTotals {
  if (items.length === 0) {
    return {
      itemCount: 0,
      mrpTotal: 0,
      subtotal: 0,
      productSavings: 0,
      deliveryCharge: 0,
      freeDeliveryRemaining: FREE_DELIVERY_THRESHOLD,
      couponDiscount: 0,
      finalTotal: 0,
    };
  }

  let itemCount = 0;
  let mrpTotal = 0;
  let subtotal = 0;

  for (const item of items) {
    const qty = Math.max(0, Math.floor(item.quantity));
    if (qty === 0) continue;
    itemCount += qty;
    mrpTotal += item.product.price * qty;
    subtotal += getEffectivePrice(item.product) * qty;
  }

  const productSavings = Math.max(0, mrpTotal - subtotal);
  const deliveryCharge = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_CHARGE;
  const freeDeliveryRemaining = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);

  let couponDiscount = 0;
  if (appliedCoupon && appliedCoupon.isActive && subtotal >= appliedCoupon.minOrderAmount) {
    const computed =
      appliedCoupon.discountType === 'percentage'
        ? Math.round((subtotal * appliedCoupon.discountValue) / 100)
        : appliedCoupon.discountValue;
    couponDiscount = Math.min(
      computed,
      appliedCoupon.maxDiscount > 0 ? appliedCoupon.maxDiscount : computed,
      subtotal
    );
  }

  const finalTotal = Math.max(0, subtotal + deliveryCharge - couponDiscount);

  return {
    itemCount,
    mrpTotal,
    subtotal,
    productSavings,
    deliveryCharge,
    freeDeliveryRemaining,
    couponDiscount,
    finalTotal,
  };
}

export function canCancelOrder(status: OrderStatus): boolean {
  return status === 'Order Placed' || status === 'Confirmed';
}

export function getOrderStepIndex(status: OrderStatus): number {
  return ORDER_STATUS_SEQUENCE.indexOf(status);
}

export type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'discount';

export interface ProductFilterOptions {
  categoryId?: string;
  searchQuery?: string;
  sortBy?: SortOption;
  onlyOffers?: boolean;
  inStockOnly?: boolean;
}

export function filterAndSortProducts(
  products: Product[],
  options: ProductFilterOptions
): Product[] {
  const query = (options.searchQuery || '').trim().toLowerCase();

  let list = products.filter((p) => {
    if (options.categoryId && options.categoryId !== 'all' && p.categoryId !== options.categoryId) {
      return false;
    }
    if (options.onlyOffers && !p.isSpecialOffer && getDiscountPercent(p) === 0) {
      return false;
    }
    if (options.inStockOnly && p.stock <= 0) {
      return false;
    }
    if (query) {
      const hay = `${p.name} ${p.categoryName} ${p.description} ${p.unit}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  switch (options.sortBy) {
    case 'price-asc':
      list = [...list].sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
      break;
    case 'price-desc':
      list = [...list].sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
      break;
    case 'discount':
      list = [...list].sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a));
      break;
    default:
      list = [...list].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
      break;
  }

  return list;
}

export function validateEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validateEmailLogin(email: string, password: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!validateEmailFormat(email)) {
    errors.email = 'Please enter a valid email address.';
  }
  if (!password) {
    errors.password = 'Password is required.';
  }
  return errors;
}

export function validateEmailRegistration(
  name: string,
  email: string,
  password: string,
  confirmPassword: string
): Record<string, string> {
  const errors: Record<string, string> = {};
  const trimmedName = name.trim();
  if (trimmedName.length < 2) {
    errors.name = 'Full name must be at least 2 characters.';
  } else if (trimmedName.length > 100) {
    errors.name = 'Full name cannot exceed 100 characters.';
  }

  if (!email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!validateEmailFormat(email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters long.';
  }

  if (confirmPassword !== password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}

export function validateCheckoutForm(form: CheckoutFormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  if (form.customerName.trim().length < 2) {
    errors.customerName = 'Please enter your full name (at least 2 characters).';
  }
  const cleanPhone = form.mobile.replace(/[\s\-+]/g, '');
  if (!/^[0-9]{10,13}$/.test(cleanPhone)) {
    errors.mobile = 'Please enter a valid 10-digit mobile number.';
  }
  if (form.deliveryAddress.trim().length < 5) {
    errors.deliveryAddress = 'Please enter a complete street or campus delivery address.';
  }
  if (form.hostelOrFlat.trim().length < 1) {
    errors.hostelOrFlat = 'Please enter your hostel room, block, or flat number.';
  }
  if (form.landmark.trim().length > 120) {
    errors.landmark = 'Landmark must be under 120 characters.';
  }

  return errors;
}

export function generateOrderNumber(now = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `QK-${yyyy}${mm}${dd}-${suffix}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

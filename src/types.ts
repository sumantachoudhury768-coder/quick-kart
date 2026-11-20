import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'customer' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  photoURL: string;
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  displayOrder: number;
  isActive: boolean;
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  description: string;
  unit: string;
  price: number;
  discountPrice: number;
  stock: number;
  image: string;
  isFeatured: boolean;
  isSpecialOffer: boolean;
  isRecommended: boolean;
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  customerName: string;
  mobile: string;
  addressLine: string;
  hostelOrFlat: string;
  landmark: string;
  city: string;
  pincode: string;
  isDefault: boolean;
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

export type OrderStatus =
  | 'Order Placed'
  | 'Confirmed'
  | 'Preparing'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  mobile: string;
  deliveryAddress: string;
  hostelOrFlat: string;
  landmark: string;
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  discountAmount: number;
  couponCode: string;
  finalTotal: number;
  paymentMethod: 'Cash on Delivery';
  status: OrderStatus;
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number;
  isActive: boolean;
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

export interface CheckoutFormValues {
  customerName: string;
  mobile: string;
  deliveryAddress: string;
  hostelOrFlat: string;
  landmark: string;
  paymentMethod: 'Cash on Delivery';
}

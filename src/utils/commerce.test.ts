import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCartTotals,
  canCancelOrder,
  filterAndSortProducts,
  FREE_DELIVERY_THRESHOLD,
  generateOrderNumber,
  STANDARD_DELIVERY_CHARGE,
  validateCheckoutForm,
  validateCoupon,
  validateEmailLogin,
  validateEmailRegistration,
} from './commerce';
import { SEED_COUPONS, SEED_PRODUCTS } from '../data/seedCatalog';

test('calculateCartTotals computes subtotal, delivery charge threshold, and coupon discount', () => {
  const milk = SEED_PRODUCTS.find((p) => p.id === 'prod-full-cream-milk')!; // price 68, discount 64
  const noodles = SEED_PRODUCTS.find((p) => p.id === 'prod-masala-noodles-pack')!; // price 96, discount 84

  // Below free delivery threshold (₹299): 64*2 + 84*1 = 212 -> delivery ₹25 -> total ₹237
  const underThreshold = calculateCartTotals([
    { product: milk, quantity: 2 },
    { product: noodles, quantity: 1 },
  ]);
  assert.equal(underThreshold.itemCount, 3);
  assert.equal(underThreshold.subtotal, 212);
  assert.equal(underThreshold.deliveryCharge, STANDARD_DELIVERY_CHARGE);
  assert.equal(underThreshold.freeDeliveryRemaining, FREE_DELIVERY_THRESHOLD - 212);
  assert.equal(underThreshold.finalTotal, 237);

  // With HOSTEL10 (10% off min 199, max 100): discount = Math.round(21.2) = 21 -> total = 212 + 25 - 21 = 216
  const hostelCoupon = SEED_COUPONS.find((c) => c.code === 'HOSTEL10')!;
  const withCoupon = calculateCartTotals(
    [
      { product: milk, quantity: 2 },
      { product: noodles, quantity: 1 },
    ],
    hostelCoupon
  );
  assert.equal(withCoupon.couponDiscount, 21);
  assert.equal(withCoupon.finalTotal, 216);

  // Above free delivery threshold: 64*5 = 320 -> delivery ₹0
  const freeShipping = calculateCartTotals([{ product: milk, quantity: 5 }]);
  assert.equal(freeShipping.deliveryCharge, 0);
  assert.equal(freeShipping.freeDeliveryRemaining, 0);
  assert.equal(freeShipping.finalTotal, 320);
});

test('validateCoupon enforces minimum order and rejects invalid codes', () => {
  const bad = validateCoupon('NOPE99', 500, SEED_COUPONS);
  assert.equal(bad.valid, false);

  const tooLow = validateCoupon('FRESH50', 250, SEED_COUPONS);
  assert.equal(tooLow.valid, false);
  assert.match(tooLow.error || '', /399/);

  const valid = validateCoupon('fresh50', 450, SEED_COUPONS);
  assert.equal(valid.valid, true);
  assert.equal(valid.discountAmount, 50);
});

test('canCancelOrder allows only Order Placed and Confirmed statuses', () => {
  assert.equal(canCancelOrder('Order Placed'), true);
  assert.equal(canCancelOrder('Confirmed'), true);
  assert.equal(canCancelOrder('Preparing'), false);
  assert.equal(canCancelOrder('Out for Delivery'), false);
  assert.equal(canCancelOrder('Delivered'), false);
  assert.equal(canCancelOrder('Cancelled'), false);
});

test('filterAndSortProducts filters by category, search query, and sorts by price', () => {
  const instant = filterAndSortProducts(SEED_PRODUCTS, { categoryId: 'instant-food' });
  assert.equal(instant.length, 3);

  const noodlesSearch = filterAndSortProducts(SEED_PRODUCTS, { searchQuery: 'noodles' });
  assert.equal(noodlesSearch.length, 1);
  assert.equal(noodlesSearch[0].id, 'prod-masala-noodles-pack');

  const sortedAsc = filterAndSortProducts(SEED_PRODUCTS, { sortBy: 'price-asc' });
  assert.ok(sortedAsc[0].discountPrice <= sortedAsc[sortedAsc.length - 1].discountPrice);
});

test('validateEmailRegistration and validateEmailLogin catch invalid inputs', () => {
  const regErrors = validateEmailRegistration('A', 'bad-email', '123', '456');
  assert.ok(regErrors.name);
  assert.ok(regErrors.email);
  assert.ok(regErrors.password);
  assert.ok(regErrors.confirmPassword);

  const validReg = validateEmailRegistration('Aarav Sharma', 'aarav@dgu.ac.in', 'secret123', 'secret123');
  assert.equal(Object.keys(validReg).length, 0);

  const loginErr = validateEmailLogin('', '');
  assert.ok(loginErr.email);
  assert.ok(loginErr.password);
});

test('validateCheckoutForm enforces required delivery fields and mobile format', () => {
  const errs = validateCheckoutForm({
    customerName: 'A',
    mobile: '12345',
    deliveryAddress: 'Ddn',
    hostelOrFlat: '',
    landmark: '',
    paymentMethod: 'Cash on Delivery',
  });
  assert.ok(errs.customerName);
  assert.ok(errs.mobile);
  assert.ok(errs.deliveryAddress);
  assert.ok(errs.hostelOrFlat);

  const ok = validateCheckoutForm({
    customerName: 'Sumanta Choudhury',
    mobile: '9876543210',
    deliveryAddress: 'DBS Global University Campus, Dehradun',
    hostelOrFlat: 'Hostel B, Room 214',
    landmark: 'Near Main Gate',
    paymentMethod: 'Cash on Delivery',
  });
  assert.equal(Object.keys(ok).length, 0);
});

test('generateOrderNumber matches Firestore blueprint pattern ^QK-[A-Z0-9-]+$', () => {
  const orderNum = generateOrderNumber(new Date('2026-11-20T10:00:00Z'));
  assert.match(orderNum, /^QK-[A-Z0-9\-]+$/);
});

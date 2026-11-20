# QuickKart Firestore Security Specification

## Data Invariants
1. **Identity Isolation (PII)**: `users/{userId}`, `addresses/{addressId}`, and `orders/{orderId}` contain PII (email, phone, physical address) and are strictly readable only by the document owner (`request.auth.uid == userId`) or a verified administrator.
2. **No Self-Assigned Admin Privileges**: Customers may only create a `users/{userId}` document with `role == "customer"` and can never modify `role` or write to `admins/{adminId}`.
3. **Catalog Integrity**: `products/{productId}`, `categories/{categoryId}`, and `coupons/{couponId}` are publicly readable for storefront browsing, and strictly writable only by verified administrators. Creating a product requires the referenced `categoryId` document to exist.
4. **Order Integrity & Terminal State Locking**: Customers can create orders only for themselves with initial `status == "Order Placed"`, valid line items (`1..50` items), and server timestamps (`request.time`). Customers can only transition their own order to `"Cancelled"` when current status is `"Order Placed"` or `"Confirmed"`. Once an order reaches `"Delivered"` or `"Cancelled"`, non-admin updates are strictly rejected. Orders cannot be deleted.
5. **Email Verification Gate**: Standard write operations and all admin checks require `request.auth.token.email_verified == true`.
6. **Temporal Integrity & Path Hardening**: All document IDs match `^[a-zA-Z0-9_\-]+$` (<= 128 chars), all strings enforce `.size()` bounds, and `createdAt`/`updatedAt` strictly equal `request.time`.

## The "Dirty Dozen" Adversarial Payloads
1. **Admin Self-Escalation on Profile Create**: Customer registers `users/{uid}` with `role: "admin"` -> `PERMISSION_DENIED`.
2. **Role Escalation Shadow Update**: Customer updates `users/{uid}` adding `role: "admin"` or ghost field `isSuperAdmin: true` -> `PERMISSION_DENIED`.
3. **Email Spoofing Attack**: Unverified account (`email_verified: false`) matching admin email attempts to write `products/{id}` or list `users` -> `PERMISSION_DENIED`.
4. **Cross-Customer PII Read**: Customer A calls `get` on `users/{customerB}` or `orders/{customerBOrder}` -> `PERMISSION_DENIED`.
5. **Cross-Customer Address List Scrape**: Customer A runs unfiltered `list` on `addresses` without matching `userId == auth.uid` -> `PERMISSION_DENIED`.
6. **Order Identity Spoofing**: Customer A creates `orders/{id}` with `userId: "customerB"` -> `PERMISSION_DENIED`.
7. **Order Status Shortcutting on Create**: Customer creates `orders/{id}` with `status: "Delivered"` -> `PERMISSION_DENIED`.
8. **Terminal State Mutation**: Customer attempts to cancel an order already in `"Out for Delivery"` or `"Delivered"` -> `PERMISSION_DENIED`.
9. **Order Price Tampering on Cancel**: Customer cancels eligible order while also modifying `finalTotal: 1` -> `PERMISSION_DENIED`.
10. **Non-Admin Catalog Tampering**: Customer attempts to create/edit/delete a product in `products/{id}` -> `PERMISSION_DENIED`.
11. **Path Variable Poisoning**: Request targets document ID exceeding 128 characters or containing special injection characters -> `PERMISSION_DENIED`.
12. **Client Timestamp Forgery**: Payload supplies custom `createdAt` or `updatedAt` timestamp instead of `request.time` -> `PERMISSION_DENIED`.

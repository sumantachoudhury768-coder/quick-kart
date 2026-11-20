import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rulesContent = fs.readFileSync('firestore.rules', 'utf8');
const blueprint = JSON.parse(fs.readFileSync('firebase-blueprint.json', 'utf8'));

test('firestore.rules starts with rules_version 2 and default-deny safety net', () => {
  assert.match(rulesContent, /rules_version = '2';/);
  assert.match(rulesContent, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/);
});

test('every collection in firebase-blueprint.json has an explicit match block', () => {
  const collections = Object.keys(blueprint.firestore);
  assert.ok(collections.length >= 7);
  for (const path of collections) {
    assert.ok(
      rulesContent.includes(`match ${path}`),
      `Missing match block for blueprint path: ${path}`
    );
  }
});

test('Dirty Dozen protections: email verification, PII isolation, terminal state lock, no role escalation', () => {
  // Email verification required for admin and verified writes
  assert.match(rulesContent, /request\.auth\.token\.email_verified == true/);
  // No blanket signed-in reads on PII collections
  assert.doesNotMatch(rulesContent, /allow (read|list|get): if isSignedIn\(\);/);
  // Users cannot self-assign admin role
  assert.match(rulesContent, /incoming\(\)\.role == 'customer' \|\| \(isAdmin\(\) && incoming\(\)\.role == 'admin'\)/);
  // Orders lock customer cancellation to eligible pre-dispatch states only
  assert.match(rulesContent, /existing\(\)\.status in \['Order Placed', 'Confirmed'\]/);
  // Orders verify total arithmetic integrity
  assert.match(rulesContent, /data\.subtotal \+ data\.deliveryCharge - data\.discountAmount/);
  // Path variable hardening and strict server timestamps
  assert.match(rulesContent, /function isValidId\(id\)/);
  assert.match(rulesContent, /incoming\(\)\.createdAt == request\.time/);
  assert.match(rulesContent, /incoming\(\)\.updatedAt == request\.time/);
  // Orders and users cannot be deleted
  assert.match(rulesContent, /match \/orders\/\{orderId\}[\s\S]*allow delete: if false;/);
  assert.match(rulesContent, /match \/users\/\{userId\}[\s\S]*allow delete: if false;/);
});

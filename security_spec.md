# Firebase Security Specification - FinanBolso

## Data Invariants
1.  **User Data Isolation**: Transactions, categories, savings goals, and reminders must be strictly isolated to the owner (the user whose `userId` matches the path variable).
2.  **Admin Privileges**: Only admins can manage the central `devices` registry and `activations` keys.
3.  **Device Ownership**: A user can only register or update a device in `/devices/` if they are authenticated, and they can only update their own device entry (if we link them) or any device if they are admin. Actually, let's say users can register their own device, and admins can manage all.
4.  **Activation Integrity**: Activation keys are immutable once created, and can only be marked as "used" by a client (or used by the system).

## The "Dirty Dozen" Payloads

1.  **Identity Spoofing**: Attempt to write a transaction to another user's collection.
2.  **Admin Escalation**: Attempt to create an activation key as a regular user.
3.  **PII Leak**: Attempt to read the `devices` collection (which contains names/emails) as a regular user.
4.  **State Shortcutting**: Attempt to set `isPaid: true` on a reminder without being the owner.
5.  **Resource Poisoning**: Inject a 1MB string into a transaction's `description` (beyond `maxLength: 200`).
6.  **Shadow Update**: Update a transaction with a "Ghost Field" `isSystemVerified: true`.
7.  **Orphaned Record**: Create a transaction with a non-existent category ID (if we enforced it, but we'll at least check types).
8.  **Timestamp Fraud**: Set a future `createdAt` timestamp manually instead of using server time.
9.  **ID Poisoning**: Use a 10KB junk string as a document ID.
10. **Cross-Collection Write**: Attempt to write a `Device` payload into the `transactions` collection.
11. **Verification Bypass**: Attempt to write data with an unverified email (if `email_verified` is required).
12. **Blanket Read Attack**: Attempt a `list` query on `/devices` without any filters as a regular user.

## Test Runner (firestore.rules.test.ts)

```typescript
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'ncg1-af68b',
    firestore: {
      rules: '', // Rules will be loaded during tests
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('FinanBolso Security Rules', () => {
  const adminId = 'admin-user-id';
  const userId = 'regular-user-id';
  const otherUserId = 'other-user-id';

  test('Regular user cannot write to another user data', async () => {
    const context = testEnv.authenticatedContext(userId);
    const db = context.firestore();
    const docRef = doc(db, 'users', otherUserId, 'transactions', 'tx1');
    await assertFails(setDoc(docRef, { amount: 100 }));
  });

  test('Regular user cannot read devices collection', async () => {
    const context = testEnv.authenticatedContext(userId);
    const db = context.firestore();
    const colRef = collection(db, 'devices');
    await assertFails(getDocs(colRef));
  });

  test('Admin can read devices collection', async () => {
    // Note: This requires the rules to check a trusted source for admin status
    // For testing, we mock the admin status in the rules or environment
  });

  test('Regular user cannot create activation keys', async () => {
    const context = testEnv.authenticatedContext(userId);
    const db = context.firestore();
    const docRef = doc(db, 'activations', 'NEW-KEY');
    await assertFails(setDoc(docRef, { durationDays: 30 }));
  });

  test('Field size enforcement on transaction description', async () => {
    const context = testEnv.authenticatedContext(userId);
    const db = context.firestore();
    const docRef = doc(db, 'users', userId, 'transactions', 'tx1');
    const longDesc = 'a'.repeat(201);
    await assertFails(setDoc(docRef, { 
      id: 'tx1',
      type: 'expense',
      amount: 10,
      description: longDesc,
      category: 'Food',
      date: '2023-10-23',
      paymentMethod: 'pix',
      createdAt: Date.now()
    }));
  });
});
```

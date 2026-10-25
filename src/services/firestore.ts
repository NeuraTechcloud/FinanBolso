import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  where, 
  deleteDoc,
  writeBatch,
  getDoc,
  serverTimestamp,
  doc as firestoreDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { User } from 'firebase/auth';
import { Transaction, Category, SavingsGoal, Reminder, UserSubscription } from '../types/finance';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  };

  console.warn('Firestore Operation Warning: ', JSON.stringify(errInfo));
  // Return safely instead of throwing unhandled Error which crashes the React app
  return null;
}

export const FirestoreService = {
  // --- Helper ---
  cleanData(data: any): any {
    if (data === null || data === undefined) return null;
    if (typeof data !== 'object') return data;
    if (data instanceof Date) return data.getTime();
    if (Array.isArray(data)) return data.map(v => this.cleanData(v));

    const clean: any = {};
    Object.keys(data).forEach(key => {
      const val = data[key];
      if (val !== undefined && val !== null) {
        if (typeof val === 'object') {
          clean[key] = this.cleanData(val);
        } else {
          clean[key] = val;
        }
      }
    });
    return clean;
  },

  // --- Users ---
  async saveUser(user: User, additionalData?: any) {
    const path = `users`;
    try {
      const data = this.cleanData({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLogin: Date.now(),
        updatedAt: serverTimestamp(),
        ...additionalData
      });
      await setDoc(doc(db, path, user.uid), data, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${user.uid}`);
    }
  },

  async getUser(userId: string) {
    const path = `users`;
    try {
      const snap = await getDoc(doc(db, path, userId));
      return snap.exists() ? snap.data() : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${path}/${userId}`);
      return null;
    }
  },

  async saveUserSubscription(userId: string, subscription: any) {
    const path = `users`;
    try {
      await setDoc(doc(db, path, userId), {
        subscription: this.cleanData(subscription),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${userId}`);
    }
  },

  async getAllUsers() {
    const path = `users`;
    try {
      const snap = await getDocs(collection(db, path));
      return snap.docs.map(doc => doc.data());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  // --- Transactions ---
  subscribeTransactions(userId: string, callback: (txs: Transaction[]) => void) {
    const path = `users/${userId}/transactions`;
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const txs = snapshot.docs.map(doc => doc.data() as Transaction);
        callback(txs);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, path)
    );
  },

  async saveTransaction(userId: string, transaction: Transaction) {
    const path = `users/${userId}/transactions`;
    try {
      await setDoc(doc(db, path, transaction.id), {
        ...this.cleanData(transaction),
        updatedAt: Date.now()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${transaction.id}`);
    }
  },

  async deleteTransaction(userId: string, txId: string) {
    const path = `users/${userId}/transactions`;
    try {
      await deleteDoc(doc(db, path, txId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${txId}`);
    }
  },

  // --- Categories ---
  subscribeCategories(userId: string, callback: (cats: Category[]) => void) {
    const path = `users/${userId}/categories`;
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const cats = snapshot.docs.map(doc => doc.data() as Category);
        callback(cats);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, path)
    );
  },

  async saveCategory(userId: string, category: Category) {
    const path = `users/${userId}/categories`;
    try {
      await setDoc(doc(db, path, category.id), this.cleanData(category));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${category.id}`);
    }
  },

  // --- Savings Goals ---
  subscribeGoals(userId: string, callback: (goals: SavingsGoal[]) => void) {
    const path = `users/${userId}/savingsGoals`;
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const goals = snapshot.docs.map(doc => doc.data() as SavingsGoal);
        callback(goals);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, path)
    );
  },

  async saveGoal(userId: string, goal: SavingsGoal) {
    const path = `users/${userId}/savingsGoals`;
    try {
      await setDoc(doc(db, path, goal.id), this.cleanData(goal));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${goal.id}`);
    }
  },

  // --- Reminders ---
  subscribeReminders(userId: string, callback: (rems: Reminder[]) => void) {
    const path = `users/${userId}/reminders`;
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const rems = snapshot.docs.map(doc => doc.data() as Reminder);
        callback(rems);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, path)
    );
  },

  async saveReminder(userId: string, reminder: Reminder) {
    const path = `users/${userId}/reminders`;
    try {
      await setDoc(doc(db, path, reminder.id), this.cleanData(reminder));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${reminder.id}`);
    }
  },

  // --- Devices ---
  async getDevice(deviceId: string) {
    const path = `devices`;
    try {
      const snap = await getDoc(doc(db, path, deviceId));
      return snap.exists() ? snap.data() : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${path}/${deviceId}`);
      return null;
    }
  },

  async registerDevice(deviceId: string, data: any) {
    const path = `devices`;
    try {
      // Fetch existing to ensure we have all required fields for isValidDevice
      const existingDoc = await getDoc(doc(db, path, deviceId));
      const existingData = existingDoc.exists() ? existingDoc.data() : {};
      
      const mergedData = {
        id: deviceId,
        ...existingData,
        ...this.cleanData(data),
        lastSeen: Date.now()
      };

      await setDoc(doc(db, path, deviceId), mergedData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${deviceId}`);
    }
  },

  async getDevicesByUserId(userId: string) {
    const path = `devices`;
    try {
      const q = query(collection(db, path), where("userId", "==", userId));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async deleteDevice(deviceId: string) {
    const path = `devices`;
    try {
      await deleteDoc(doc(db, path, deviceId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${deviceId}`);
    }
  },

  subscribeDevices(callback: (devices: any[]) => void) {
    const path = `devices`;
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const devices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(devices);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, path)
    );
  },

  // --- Activation Keys ---
  async saveActivationKey(keyData: any) {
    const path = `activations`;
    try {
      await setDoc(doc(db, path, keyData.key), {
        ...this.cleanData(keyData),
        updatedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${keyData.key}`);
    }
  },

  async deleteActivationKey(key: string) {
    const path = `activations`;
    try {
      await deleteDoc(doc(db, path, key));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${key}`);
    }
  },

  subscribeActivationKeys(callback: (keys: any[]) => void) {
    const path = `activations`;
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const keys = snapshot.docs.map(doc => doc.data());
        callback(keys);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, path)
    );
  },

  async deleteUser(userId: string) {
    const path = `users`;
    try {
      await deleteDoc(doc(db, path, userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${userId}`);
    }
  },

  // --- Batch Upload (Migration) ---
  async uploadUserData(userId: string, data: {
    transactions: Transaction[],
    categories: Category[],
    goals: SavingsGoal[],
    reminders: Reminder[]
  }) {
    const batch = writeBatch(db);
    
    data.transactions.forEach(tx => {
      batch.set(doc(db, `users/${userId}/transactions`, tx.id), this.cleanData(tx));
    });
    data.categories.forEach(cat => {
      batch.set(doc(db, `users/${userId}/categories`, cat.id), this.cleanData(cat));
    });
    data.goals.forEach(goal => {
      batch.set(doc(db, `users/${userId}/savingsGoals`, goal.id), this.cleanData(goal));
    });
    data.reminders.forEach(rem => {
      batch.set(doc(db, `users/${userId}/reminders`, rem.id), this.cleanData(rem));
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
    }
  }
};

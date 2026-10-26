import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { FirestoreService } from '../services/firestore';
import { StorageService } from '../services/storage';

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  updateUserProfile: (displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  isSyncing: boolean;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
      
      if (user) {
        // Save user profile to Firestore
        await FirestoreService.saveUser(user);
        
        // If user already has an active Pro subscription locally, ensure it is linked to user account in Firestore
        const localSub = StorageService.getSubscription();
        if (localSub && localSub.isPro) {
          await FirestoreService.saveUserSubscription(user.uid, localSub);
        }

        // Trigger initial migration if needed
        const localTxs = StorageService.getTransactions();
        if (localTxs.length > 0) {
          setIsSyncing(true);
          try {
            await FirestoreService.uploadUserData(user.uid, {
              transactions: localTxs,
              categories: StorageService.getCategories(),
              goals: StorageService.getSavingsGoals(),
              reminders: StorageService.getReminders()
            });
          } catch (e) {
            console.error('Initial sync failed:', e);
          } finally {
            setIsSyncing(false);
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Email sign in failed:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      if (res.user && displayName?.trim()) {
        const cleanName = displayName.trim();
        await updateProfile(res.user, { displayName: cleanName });
        await FirestoreService.saveUser({ ...res.user, displayName: cleanName } as any);
        setUser({ ...res.user, displayName: cleanName } as any);
      }
    } catch (error) {
      console.error('Email sign up failed:', error);
      throw error;
    }
  };

  const updateUserProfile = async (displayName: string) => {
    if (!auth.currentUser) return;
    try {
      const cleanName = displayName.trim();
      await updateProfile(auth.currentUser, { displayName: cleanName });
      await FirestoreService.saveUser({ ...auth.currentUser, displayName: cleanName } as any);
      setUser({ ...auth.currentUser, displayName: cleanName } as any);
    } catch (error) {
      console.error('Update user profile failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <FirebaseContext.Provider value={{ user, loading, signIn, signInWithEmail, signUpWithEmail, updateUserProfile, logout, isSyncing }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

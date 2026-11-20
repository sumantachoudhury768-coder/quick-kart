import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  extractReadableError,
  googleProvider,
  handleFirestoreError,
  mapAuthError,
  OperationType,
} from '../firebase';
import type { UserProfile } from '../types';
import { useToast } from './ToastContext';

export type AuthModalView = 'options' | 'email-login' | 'email-register' | 'forgot-password';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  authModalOpen: boolean;
  authModalView: AuthModalView;
  openAuthModal: (view?: AuthModalView) => void;
  closeAuthModal: () => void;
  setAuthModalView: (view: AuthModalView) => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshUserVerification: () => Promise<boolean>;
  updateUserProfile: (updates: { name: string; phone: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<AuthModalView>('options');

  const syncUserDocument = useCallback(async (user: User): Promise<{ profile: UserProfile; admin: boolean }> => {
    const bootstrappedAdmin =
      user.emailVerified &&
      (user.email || '').toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

    let isAdminDoc = false;
    if (user.emailVerified) {
      try {
        const adminSnap = await getDoc(doc(db, 'admins', user.uid));
        isAdminDoc = adminSnap.exists();
      } catch {
        isAdminDoc = false;
      }
    }

    const resolvedAdmin = bootstrappedAdmin || isAdminDoc;
    const userRef = doc(db, 'users', user.uid);

    try {
      const existingSnap = await getDoc(userRef);
      if (existingSnap.exists()) {
        const data = existingSnap.data() as UserProfile;
        return {
          profile: {
            uid: user.uid,
            name: data.name || user.displayName || 'QuickKart Shopper',
            email: data.email || user.email || '',
            phone: data.phone || '',
            role: resolvedAdmin ? 'admin' : 'customer',
            photoURL: data.photoURL || user.photoURL || '',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          },
          admin: resolvedAdmin,
        };
      }

      const fallbackProfile: UserProfile = {
        uid: user.uid,
        name: (user.displayName || user.email?.split('@')[0] || 'QuickKart Shopper').slice(0, 100),
        email: (user.email || '').slice(0, 160),
        phone: '',
        role: resolvedAdmin ? 'admin' : 'customer',
        photoURL: (user.photoURL || '').slice(0, 500),
      };

      // Only persist user document once email is verified (enforced by Firestore rules)
      if (user.emailVerified) {
        try {
          await setDoc(userRef, {
            uid: user.uid,
            name: fallbackProfile.name,
            email: fallbackProfile.email,
            phone: '',
            role: resolvedAdmin ? 'admin' : 'customer',
            photoURL: fallbackProfile.photoURL,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (writeErr) {
          handleFirestoreError(writeErr, OperationType.CREATE, `users/${user.uid}`);
        }
      }

      return { profile: fallbackProfile, admin: resolvedAdmin };
    } catch (error) {
      // If user doc read fails due to offline/config, degrade gracefully without breaking session
      console.error('Failed to sync user profile:', error);
      return {
        profile: {
          uid: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'QuickKart Shopper',
          email: user.email || '',
          phone: '',
          role: resolvedAdmin ? 'admin' : 'customer',
          photoURL: user.photoURL || '',
        },
        admin: resolvedAdmin,
      };
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { profile: syncedProfile, admin } = await syncUserDocument(user);
      setProfile(syncedProfile);
      setIsAdmin(admin);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [syncUserDocument]);

  const openAuthModal = useCallback((view: AuthModalView = 'options') => {
    setAuthModalView(view);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      setAuthModalOpen(false);
      showToast(`Welcome back, ${cred.user.displayName || 'Shopper'}!`, 'success');
    } catch (error) {
      const msg = mapAuthError(error);
      throw new Error(msg);
    }
  }, [showToast]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      try {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        setAuthModalOpen(false);
        showToast(
          cred.user.emailVerified
            ? `Signed in as ${cred.user.displayName || cred.user.email}`
            : 'Signed in. Please verify your email to place orders.',
          cred.user.emailVerified ? 'success' : 'info'
        );
      } catch (error) {
        throw new Error(mapAuthError(error));
      }
    },
    [showToast]
  );

  const registerWithEmail = useCallback(
    async (name: string, email: string, password: string) => {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name.trim().slice(0, 100) });
        try {
          await sendEmailVerification(cred.user);
        } catch {
          // Non-fatal if email verification rate-limited
        }
        setProfile({
          uid: cred.user.uid,
          name: name.trim().slice(0, 100),
          email: cred.user.email || email.trim(),
          phone: '',
          role: 'customer',
          photoURL: '',
        });
        setAuthModalOpen(false);
        showToast(
          'Account created! Check your inbox for a verification link before placing orders.',
          'success'
        );
      } catch (error) {
        throw new Error(mapAuthError(error));
      }
    },
    [showToast]
  );

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (error) {
      throw new Error(mapAuthError(error));
    }
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
      showToast('Verification link sent to your email address.', 'success');
    } catch (error) {
      showToast(mapAuthError(error), 'error');
    }
  }, [showToast]);

  const refreshUserVerification = useCallback(async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    try {
      await auth.currentUser.reload();
      await auth.currentUser.getIdToken(true);
      const updatedUser = auth.currentUser;
      setFirebaseUser(updatedUser);
      const { profile: syncedProfile, admin } = await syncUserDocument(updatedUser);
      setProfile(syncedProfile);
      setIsAdmin(admin);
      if (updatedUser.emailVerified) {
        showToast('Email verified! Your account is ready for orders.', 'success');
        return true;
      }
      showToast('Email is not verified yet. Please click the link in your inbox.', 'info');
      return false;
    } catch (error) {
      showToast(extractReadableError(error, 'Could not refresh verification status.'), 'error');
      return false;
    }
  }, [showToast, syncUserDocument]);

  const updateUserProfile = useCallback(
    async ({ name, phone }: { name: string; phone: string }) => {
      if (!auth.currentUser) throw new Error('You must be signed in to update your profile.');
      const trimmedName = name.trim().slice(0, 100);
      const trimmedPhone = phone.trim().slice(0, 20);
      await updateProfile(auth.currentUser, { displayName: trimmedName });
      if (auth.currentUser.emailVerified) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        try {
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            await updateDoc(userRef, {
              name: trimmedName,
              phone: trimmedPhone,
              updatedAt: serverTimestamp(),
            });
          } else {
            await setDoc(userRef, {
              uid: auth.currentUser.uid,
              name: trimmedName,
              email: auth.currentUser.email || '',
              phone: trimmedPhone,
              role: isAdmin ? 'admin' : 'customer',
              photoURL: auth.currentUser.photoURL || '',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
        }
      }
      setProfile((prev) =>
        prev
          ? { ...prev, name: trimmedName, phone: trimmedPhone }
          : {
              uid: auth.currentUser!.uid,
              name: trimmedName,
              email: auth.currentUser!.email || '',
              phone: trimmedPhone,
              role: isAdmin ? 'admin' : 'customer',
              photoURL: auth.currentUser!.photoURL || '',
            }
      );
      showToast('Profile details updated.', 'success');
    },
    [isAdmin, showToast]
  );

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      showToast('You have been logged out.', 'info');
    } catch (error) {
      showToast(mapAuthError(error), 'error');
    }
  }, [showToast]);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        isAdmin,
        authModalOpen,
        authModalView,
        openAuthModal,
        closeAuthModal,
        setAuthModalView,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        resetPassword,
        resendVerificationEmail,
        refreshUserVerification,
        updateUserProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

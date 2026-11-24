import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  reauthenticateWithPopup,
  type User,
} from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { Role, UserProfile } from './types';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  ready: boolean;
  signUp(name: string, email: string, password: string): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  /** True when the account signs in with a password (not only with Google). */
  hasPassword: boolean;
  signOut(): Promise<void>;
  rename(name: string): Promise<void>;
  changePassword(current: string, next: string): Promise<void>;
  deleteAccount(current?: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(!auth);

  useEffect(() => {
    if (!auth) return;
    let unProfile: (() => void) | undefined;
    const un = onAuthStateChanged(auth, (u) => {
      setUser(u);
      unProfile?.();
      setProfile(null);
      if (u && db) {
        unProfile = onSnapshot(
          doc(db, 'users', u.uid),
          (d) => {
            const x = d.data();
            setProfile(x ? { uid: u.uid, name: x.name, email: x.email, role: x.role, active: x.active } : null);
            // First Google sign-in: create the customer profile (email sign-up creates it itself).
            if (!x && !d.metadata.fromCache && u.email && u.providerData.some((p) => p.providerId === 'google.com')) {
              void setDoc(doc(db!, 'users', u.uid), {
                name: (u.displayName || u.email.split('@')[0]).slice(0, 80),
                email: u.email,
                role: 'USER',
                active: true,
                createdAt: serverTimestamp(),
              }).catch(() => undefined);
            }
            setReady(true);
          },
          () => setReady(true),
        );
      } else setReady(true);
    });
    return () => {
      un();
      unProfile?.();
    };
  }, []);

  const value: AuthState = {
    user,
    profile,
    ready,
    async signUp(name, email, password) {
      if (!auth || !db) throw new Error('Accounts are not set up yet.');
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: name.trim() });
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: name.trim(),
        email: cred.user.email,
        role: 'USER',
        active: true,
        createdAt: serverTimestamp(),
      });
    },
    async signIn(email, password) {
      if (!auth) throw new Error('Accounts are not set up yet.');
      await signInWithEmailAndPassword(auth, email.trim(), password);
    },
    async signInWithGoogle() {
      if (!auth) throw new Error('Accounts are not set up yet.');
      await signInWithPopup(auth, new GoogleAuthProvider());
    },
    hasPassword: Boolean(user?.providerData.some((p) => p.providerId === 'password')),
    async signOut() {
      if (auth) await fbSignOut(auth);
    },
    async rename(name) {
      if (!auth?.currentUser || !db) return;
      await updateProfile(auth.currentUser, { displayName: name.trim() });
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { name: name.trim() });
    },
    async changePassword(current, next) {
      const u = auth?.currentUser;
      if (!u?.email) return;
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, current));
      await updatePassword(u, next);
    },
    async deleteAccount(current) {
      const u = auth?.currentUser;
      if (!u?.email || !db) return;
      if (current) await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, current));
      else await reauthenticateWithPopup(u, new GoogleAuthProvider());
      await deleteDoc(doc(db, 'users', u.uid));
      await deleteUser(u);
    },
    async resetPassword(email) {
      if (auth) await sendPasswordResetEmail(auth, email.trim());
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside provider');
  return v;
}

export const STAFF_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'EVENT_MANAGER', 'FINANCE', 'TICKET_SCANNER'];
export const can = {
  dashboard: (r?: Role) => !!r && STAFF_ROLES.includes(r),
  events: (r?: Role) => r === 'SUPER_ADMIN' || r === 'ADMIN' || r === 'EVENT_MANAGER',
  reports: (r?: Role) => r === 'SUPER_ADMIN' || r === 'ADMIN' || r === 'EVENT_MANAGER' || r === 'FINANCE',
  gallery: (r?: Role) => r === 'SUPER_ADMIN' || r === 'ADMIN' || r === 'EVENT_MANAGER',
  users: (r?: Role) => r === 'SUPER_ADMIN',
  activity: (r?: Role) => r === 'SUPER_ADMIN',
  scan: (r?: Role) => r === 'SUPER_ADMIN' || r === 'ADMIN' || r === 'EVENT_MANAGER' || r === 'TICKET_SCANNER',
};

export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found'))
    return 'Email or password is incorrect.';
  if (code.includes('email-already-in-use')) return 'An account with this email already exists. Sign in instead.';
  if (code.includes('weak-password')) return 'Choose a password of at least 8 characters.';
  if (code.includes('too-many-requests')) return 'Too many attempts. Wait a few minutes, then try again.';
  if (code.includes('network')) return 'No connection. Check your signal and try again.';
  if (code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request')) return 'Google sign-in was closed before it finished.';
  if (code.includes('popup-blocked')) return 'The browser blocked the Google window. Allow pop-ups for this site and try again.';
  if (code.includes('account-exists-with-different-credential')) return 'This email already has an account. Sign in with your email and password.';
  if (code.includes('unauthorized-domain')) return 'Google sign-in is not allowed on this web address yet.';
  if (code.includes('requires-recent-login')) return 'Please sign in again, then try once more.';
  return 'Something went wrong. Please try again.';
}

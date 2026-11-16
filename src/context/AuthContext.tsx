import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { auth, googleAuthProvider } from '../lib/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setLoading(false);
      if (nextUser) {
        try {
          const token = await nextUser.getIdToken();
          await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } catch {
          // Non-fatal sync error; subsequent API calls also upsert operator
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to sign in with Google.';
      setAuthError(message);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    await signOut(auth);
  }, []);

  const getToken = useCallback(async () => {
    if (!auth.currentUser) {
      return null;
    }
    return await auth.currentUser.getIdToken();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        signInWithGoogle,
        signOutUser,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return ctx;
}

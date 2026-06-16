import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface User {
  id: string;
  email: string;
  user_metadata: {
    name?: string;
  };
}

interface Session {
  user: User;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, name?: string) => Promise<void>;
  signUp: (email: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

const STORAGE_KEY = "grillgo.auth.session.v1";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const u = JSON.parse(raw);
          setUser(u);
        }
      } catch (e) {
        console.error("Error reading auth session", e);
      } finally {
        setLoading(false);
      }
    }
  }, []);

  const signIn = async (email: string, name?: string) => {
    // Generate a consistent pseudo-UUID for demo purposes based on email
    const id = `user-${Math.floor(Math.random() * 900000 + 100000)}`;
    const u: User = {
      id,
      email,
      user_metadata: { name: name || email.split("@")[0] },
    };
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  };

  const signUp = async (email: string, name: string) => {
    return signIn(email, name);
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const session: Session | null = user ? { user } : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

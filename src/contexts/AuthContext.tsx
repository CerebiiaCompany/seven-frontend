import { createContext, useContext, useEffect, useState } from "react";

type User = {
  email: string;
  displayName?: string;
};

type AuthResult = { error?: string };

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, displayName?: string) => Promise<AuthResult>;
  resetPassword: (email: string, newPassword: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

type StoredUser = {
  email: string;
  password: string;
  displayName?: string;
};

const SESSION_KEY = "sf_auth_session";
const USERS_KEY = "sf_auth_users";

function readUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function readSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(readSession());
    setLoading(false);
  }, []);

  const persist = (nextUser: User | null) => {
    setUser(nextUser);
    if (nextUser) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  };

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const match = readUsers().find((candidate) => candidate.email === email && candidate.password === password);
    if (!match) return { error: "Correo o contraseña incorrectos" };
    persist({ email: match.email, displayName: match.displayName });
    return {};
  };

  const signUp: AuthContextValue["signUp"] = async (email, password, displayName) => {
    const users = readUsers();
    if (users.some((candidate) => candidate.email === email)) {
      return { error: "Ya existe una cuenta con ese correo" };
    }
    users.push({ email, password, displayName });
    writeUsers(users);
    persist({ email, displayName });
    return {};
  };

  const resetPassword: AuthContextValue["resetPassword"] = async (email, newPassword) => {
    const users = readUsers();
    const index = users.findIndex((candidate) => candidate.email === email);
    if (index === -1) return { error: "No existe una cuenta con ese correo" };
    users[index] = { ...users[index], password: newPassword };
    writeUsers(users);
    return {};
  };

  const signOut = async () => {
    persist(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, resetPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

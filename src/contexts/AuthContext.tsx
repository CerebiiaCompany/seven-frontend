import { createContext, useContext, useEffect, useState } from "react";
import api, { TOKEN_KEYS, clearSession } from "@/lib/api";

export type AuthUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone_number: string;
  role: "player" | "coach" | "parent";
  is_staff: boolean;
  is_verified: boolean;
  must_change_password: boolean;
  club_name: string;
  club_logo: string | null;
  created_at: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  refreshUser: () => Promise<AuthUser | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEYS.access);
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get<AuthUser>("/auth/me/")
      .then(({ data }) => {
        setUserState(data);
        localStorage.setItem(TOKEN_KEYS.user, JSON.stringify(data));
      })
      .catch(() => {
        clearSession();
        setUserState(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const setUser = (nextUser: AuthUser | null) => {
    setUserState(nextUser);
    if (nextUser) {
      localStorage.setItem(TOKEN_KEYS.user, JSON.stringify(nextUser));
    }
  };

  // Trae el perfil actual del backend y actualiza el estado global — lo
  // mismo que hace la carga inicial de la app, así cualquier dato que
  // dependa del club (ej. `club_logo`) queda consistente sin necesitar un
  // reload manual tras cambiarlo desde Configuración.
  const refreshUser = async () => {
    try {
      const { data } = await api.get<AuthUser>("/auth/me/");
      setUser(data);
      return data;
    } catch {
      return null;
    }
  };

  const signOut = async () => {
    const refreshToken = localStorage.getItem(TOKEN_KEYS.refresh);
    try {
      if (refreshToken) {
        await api.post("/auth/token/logout/", { refresh: refreshToken });
      }
    } catch {
      // el refresh ya pudo haber expirado; se limpia la sesión igualmente
    } finally {
      clearSession();
      setUserState(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, refreshUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

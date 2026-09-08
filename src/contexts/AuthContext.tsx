import { createContext, useContext, useEffect, useState } from "react";
import api, { clearSession, saveSession, TOKEN_KEYS } from "@/lib/api";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
export type UserRole = "player" | "coach" | "parent";

export type User = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone_number: string;
  role: UserRole;
  is_verified: boolean;
};

type AuthResult = { error?: string };

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: UserRole,
  ) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

// ---------------------------------------------------------------------------
// Contexto
// ---------------------------------------------------------------------------
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Al montar: rehidratar desde localStorage si hay un access token guardado
  useEffect(() => {
    const initSession = async () => {
      const stored = localStorage.getItem(TOKEN_KEYS.user);
      const accessToken = localStorage.getItem(TOKEN_KEYS.access);

      if (!accessToken) {
        setLoading(false);
        return;
      }

      // Si hay datos guardados los usamos inmediatamente (UX más rápida)
      if (stored) {
        try {
          setUser(JSON.parse(stored) as User);
        } catch {
          // datos corruptos, los ignoramos
        }
      }

      // Verificamos con el backend que el token sigue siendo válido
      try {
        const { data } = await api.get<User>("/auth/me/");
        setUser(data);
        localStorage.setItem(TOKEN_KEYS.user, JSON.stringify(data));
      } catch {
        // El interceptor ya intentó el refresh; si falla aquí la sesión fue limpiada
        clearSession();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, []);

  // ------------------------------------------------------------------
  // Login
  // ------------------------------------------------------------------
  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    try {
      const { data } = await api.post("/auth/token/", { email, password });
      // data = { access, refresh, user: { id, email, role, ... } }
      saveSession(data.access, data.refresh, data.user);
      setUser(data.user as User);
      return {};
    } catch (err: unknown) {
      const message = extractErrorMessage(err, "Correo o contraseña incorrectos");
      return { error: message };
    }
  };

  // ------------------------------------------------------------------
  // Registro
  // ------------------------------------------------------------------
  const signUp: AuthContextValue["signUp"] = async (
    email,
    password,
    firstName,
    lastName,
    role,
  ) => {
    try {
      await api.post("/auth/register/", {
        email,
        password,
        password_confirm: password,
        first_name: firstName,
        last_name: lastName,
        role,
      });
      // Después del registro hacemos login automático
      return signIn(email, password);
    } catch (err: unknown) {
      const message = extractErrorMessage(err, "No se pudo crear la cuenta");
      return { error: message };
    }
  };

  // ------------------------------------------------------------------
  // Logout
  // ------------------------------------------------------------------
  const signOut: AuthContextValue["signOut"] = async () => {
    const refresh = localStorage.getItem(TOKEN_KEYS.refresh);
    try {
      if (refresh) {
        await api.post("/auth/token/logout/", { refresh });
      }
    } catch {
      // Si falla el logout en el backend igual limpiamos localmente
    } finally {
      clearSession();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

// ---------------------------------------------------------------------------
// Utilidad interna: extrae el mensaje de error de una respuesta axios
// ---------------------------------------------------------------------------
function extractErrorMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== "object") return fallback;
  const axiosErr = err as {
    response?: { data?: { error?: { message?: string }; detail?: string } };
  };
  const data = axiosErr.response?.data;
  if (data?.error?.message) return data.error.message;
  if (data?.detail) return data.detail;
  return fallback;
}

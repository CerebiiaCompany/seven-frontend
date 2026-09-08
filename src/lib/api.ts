import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";

// ---------------------------------------------------------------------------
// Claves de localStorage
// ---------------------------------------------------------------------------
export const TOKEN_KEYS = {
  access: "sf_access_token",
  refresh: "sf_refresh_token",
  user: "sf_user",
} as const;

// ---------------------------------------------------------------------------
// Cliente base
// ---------------------------------------------------------------------------
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1",
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

// ---------------------------------------------------------------------------
// Interceptor de REQUEST — añade Authorization: Bearer <accessToken>
// ---------------------------------------------------------------------------
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(TOKEN_KEYS.access);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Interceptor de RESPONSE — renueva el access token si llega un 401
// ---------------------------------------------------------------------------
let isRefreshing = false;
// Cola de requests que llegaron mientras se estaba refrescando el token
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  config: AxiosRequestConfig;
}> = [];

function processQueue(error: unknown) {
  failedQueue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error);
    } else {
      resolve(api(config));
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Solo intentar refresh en 401, una sola vez por request, y nunca en el
    // propio endpoint de refresh ni en el de login
    const isAuthEndpoint =
      originalRequest.url?.includes("/auth/token/refresh") ||
      originalRequest.url?.includes("/auth/token/");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Encolar el request hasta que termine el refresh
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      isRefreshing = true;
      const refreshToken = localStorage.getItem(TOKEN_KEYS.refresh);

      if (!refreshToken) {
        isRefreshing = false;
        clearSession();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1"}/auth/token/refresh/`,
          { refresh: refreshToken },
        );
        localStorage.setItem(TOKEN_KEYS.access, data.access);
        // simplejwt rota el refresh con ROTATE_REFRESH_TOKENS=True
        if (data.refresh) {
          localStorage.setItem(TOKEN_KEYS.refresh, data.refresh);
        }
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        clearSession();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ---------------------------------------------------------------------------
// Helpers de sesión
// ---------------------------------------------------------------------------
export function clearSession() {
  localStorage.removeItem(TOKEN_KEYS.access);
  localStorage.removeItem(TOKEN_KEYS.refresh);
  localStorage.removeItem(TOKEN_KEYS.user);
}

export function saveSession(access: string, refresh: string, user: object) {
  localStorage.setItem(TOKEN_KEYS.access, access);
  localStorage.setItem(TOKEN_KEYS.refresh, refresh);
  localStorage.setItem(TOKEN_KEYS.user, JSON.stringify(user));
}

export default api;

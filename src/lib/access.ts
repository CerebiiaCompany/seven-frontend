import type { AuthUser } from "@/contexts/AuthContext";

/**
 * Reglas de acceso por rol, compartidas entre el menú (sidebar/mobile nav) y
 * el guard de rutas, para que ocultar una opción del menú y bloquear su ruta
 * sean siempre la misma regla (una sola fuente de verdad).
 *
 * - Admin (user.is_staff): acceso completo.
 * - Entrenador (role === "coach"): todo excepto Portal Familia.
 * - Jugador/Padre (role === "player" | "parent"): únicamente Portal Familia.
 * - Configuración queda siempre disponible para cualquier rol autenticado.
 */

export const FAMILY_PATH = "/family";
export const SETTINGS_PATH = "/settings";

export function isAdmin(user: AuthUser | null): boolean {
  return !!user?.is_staff;
}

export function isCoach(user: AuthUser | null): boolean {
  return !!user && !isAdmin(user) && user.role === "coach";
}

/** Ruta a la que se redirige a un usuario cuando aterriza en una página que no puede ver. */
export function homePathFor(user: AuthUser | null): string {
  if (isAdmin(user) || isCoach(user)) return "/";
  return FAMILY_PATH;
}

export function canAccessPath(user: AuthUser | null, path: string): boolean {
  if (!user) return false;
  if (path === SETTINGS_PATH) return true;
  if (isAdmin(user)) return true;
  if (user.role === "coach") return path !== FAMILY_PATH;
  // jugador o padre/tutor: solo Portal Familia
  return path === FAMILY_PATH;
}

export function filterNavSections<T extends { items: { path: string }[] }>(
  sections: T[],
  user: AuthUser | null,
): T[] {
  return sections
    .map((section) => ({ ...section, items: section.items.filter((item) => canAccessPath(user, item.path)) }))
    .filter((section) => section.items.length > 0);
}

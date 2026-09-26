import type { AuthUser } from "@/contexts/AuthContext";

/**
 * Reglas de acceso por rol, compartidas entre el menú (sidebar/mobile nav) y
 * el guard de rutas, para que ocultar una opción del menú y bloquear su ruta
 * sean siempre la misma regla (una sola fuente de verdad).
 *
 * Los cuatro roles oficiales (no existe rol "padre" — los padres usan el
 * mismo rol y flujo que los jugadores):
 * - admin      → acceso total a todas las pantallas.
 * - coach      → todo lo deportivo (deportistas, entrenadores, calendario,
 *                asistencia, rendimiento, squad builder); nada de
 *                Configuración, Pagos, Formularios ni Contenido.
 * - aux_admin  → únicamente Pagos, Formularios y Contenido.
 * - player     → únicamente Portal Futbolista (también representa a los padres).
 *
 * Configuración queda siempre disponible para cualquier rol autenticado; lo
 * que cambia por rol es qué ve dentro de esa pantalla (ver `Settings.tsx`).
 */

export const FAMILY_PATH = "/family";
export const SETTINGS_PATH = "/settings";

const COACH_PATHS = new Set([
  "/", "/players", "/coaches", "/calendar", "/attendance", "/performance", "/gamification",
]);

const AUX_ADMIN_PATHS = new Set(["/payments", "/forms", "/content"]);

const PLAYER_PATHS = new Set([FAMILY_PATH]);

/** Ruta a la que se redirige a un usuario cuando aterriza en una página que no puede ver. */
export function homePathFor(user: AuthUser | null): string {
  if (!user) return "/login";
  if (user.role === "admin" || user.role === "coach") return "/";
  if (user.role === "aux_admin") return "/payments";
  return FAMILY_PATH;
}

export function canAccessPath(user: AuthUser | null, path: string): boolean {
  if (!user) return false;
  if (path === SETTINGS_PATH) return true;
  if (user.role === "admin") return true;
  if (user.role === "coach") return COACH_PATHS.has(path);
  if (user.role === "aux_admin") return AUX_ADMIN_PATHS.has(path);
  return PLAYER_PATHS.has(path); // player
}

export function filterNavSections<T extends { items: { path: string }[] }>(
  sections: T[],
  user: AuthUser | null,
): T[] {
  return sections
    .map((section) => ({ ...section, items: section.items.filter((item) => canAccessPath(user, item.path)) }))
    .filter((section) => section.items.length > 0);
}

import { useEffect } from "react";
import { setNavigationGuardMessage } from "@/lib/navigation-guard";

/**
 * Advierte con `message` antes de perder cambios sin guardar:
 * - al navegar a otra pantalla dentro de la app (sidebar, nav móvil — vía
 *   `confirmNavigation()`, ya que `BrowserRouter` no expone un blocker real).
 * - al cerrar la pestaña o recargar (`beforeunload`, mensaje fijo del navegador).
 */
export function useUnsavedChangesPrompt(message: string, when: boolean) {
  useEffect(() => {
    setNavigationGuardMessage(when ? message : null);
    return () => setNavigationGuardMessage(null);
  }, [when, message]);

  useEffect(() => {
    if (!when) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [when]);
}

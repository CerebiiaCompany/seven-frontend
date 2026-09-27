// Guarda un único mensaje de confirmación "activo" (la pantalla actual con
// cambios sin guardar, si la hay). `BrowserRouter` en este proyecto no es un
// data router, así que no existe un `useBlocker` real para interceptar la
// navegación — en su lugar, cada punto de navegación de la app (sidebar,
// nav móvil) pregunta aquí antes de moverse.
let activeGuardMessage: string | null = null;

export function setNavigationGuardMessage(message: string | null) {
  activeGuardMessage = message;
}

/** true = se puede navegar. Si hay un guard activo, confirma con el usuario primero. */
export function confirmNavigation(): boolean {
  if (!activeGuardMessage) return true;
  return window.confirm(activeGuardMessage);
}

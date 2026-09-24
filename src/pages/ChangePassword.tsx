import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { LoaderCircle, LogOut, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/PasswordField";
import { PasswordRequirementsChecklist } from "@/components/PasswordRequirementsChecklist";
import { evaluatePassword } from "@/lib/passwordRequirements";
import api from "@/lib/api";
import { useAuth, type AuthUser } from "@/contexts/AuthContext";

function extractErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { error?: { message?: string } } | undefined;
    if (data?.error?.message) return data.error.message;
  }
  return fallback;
}

function ChangePasswordForm() {
  const { user, setUser, signOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const { allRequirementsMet, passwordsMatch } = evaluatePassword(newPassword, confirmPassword);
  const canSubmit = currentPassword.length > 0 && allRequirementsMet && passwordsMatch && !saving;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    try {
      const { data } = await api.post<AuthUser>("/auth/change-temporary-password/", {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirm: confirmPassword,
      });
      setUser(data);
      toast.success("Contraseña actualizada correctamente.");
      // La navegación al Dashboard la resuelve ChangePasswordGuard: al
      // actualizar `user.must_change_password` a false, el guard redirige.
    } catch (error) {
      toast.error(extractErrorMessage(error, "No se pudo actualizar la contraseña"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 sm:px-6">
      <div className="absolute inset-0 auth-grid opacity-30" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary shadow-[0_0_30px_hsl(var(--primary)/0.28)]">
            <Zap className="h-7 w-7 text-primary-foreground" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">Soccer Future</p>
          <p className="mt-1 text-xs font-semibold uppercase text-primary">Seven Soccer Club</p>
        </div>

        <section className="glass-card-elevated p-5 sm:p-7" aria-labelledby="change-password-title">
          <div className="mb-6">
            <h1 id="change-password-title" className="text-2xl font-bold text-foreground">
              Debes cambiar tu contraseña
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Tu cuenta fue creada con una contraseña temporal. Antes de continuar debes crear una nueva
              contraseña personal.
            </p>
            {user && (
              <p className="mt-2 text-xs text-muted-foreground">
                Sesión iniciada como <span className="font-medium text-foreground">{user.email}</span>
              </p>
            )}
          </div>

          <form className="space-y-4" onSubmit={submit}>
            <PasswordField
              id="current-password"
              label="Contraseña temporal"
              value={currentPassword}
              onChange={setCurrentPassword}
              show={showCurrent}
              onToggleShow={() => setShowCurrent((v) => !v)}
              autoComplete="current-password"
            />
            <PasswordField
              id="new-password"
              label="Nueva contraseña"
              value={newPassword}
              onChange={setNewPassword}
              show={showNew}
              onToggleShow={() => setShowNew((v) => !v)}
              autoComplete="new-password"
            />
            <PasswordField
              id="confirm-password"
              label="Confirmar nueva contraseña"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirm}
              onToggleShow={() => setShowConfirm((v) => !v)}
              autoComplete="new-password"
            />

            <PasswordRequirementsChecklist newPassword={newPassword} confirmPassword={confirmPassword} />

            <Button type="submit" className="h-11 w-full font-semibold" disabled={!canSubmit}>
              {saving && <LoaderCircle className="animate-spin" />}
              Actualizar contraseña
            </Button>
            <Button type="button" variant="outline" className="h-11 w-full gap-2" onClick={() => void signOut()}>
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}

/**
 * Guarda de la pantalla obligatoria de cambio de contraseña.
 *
 * `must_change_password` vive en la base de datos (no en el frontend), así
 * que esta condición se re-evalúa desde `/auth/me/` en cada carga: persiste
 * entre sesiones, cierres de navegador y recargas de página.
 */
export default function ChangePassword() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Ya cambió la contraseña (o nunca la necesitó): este módulo no debe
  // volver a aparecer.
  if (!user.must_change_password) return <Navigate to="/" replace />;

  return <ChangePasswordForm />;
}

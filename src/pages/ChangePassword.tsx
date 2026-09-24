import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import {
  CheckCircle2, Circle, Eye, EyeOff, LoaderCircle, LockKeyhole, LogOut, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { useAuth, type AuthUser } from "@/contexts/AuthContext";

function extractErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { error?: { message?: string } } | undefined;
    if (data?.error?.message) return data.error.message;
  }
  return fallback;
}

const REQUIREMENTS: { key: string; label: string; test: (pw: string) => boolean }[] = [
  { key: "length", label: "Mínimo 8 caracteres", test: (pw) => pw.length >= 8 },
  { key: "upper", label: "Una letra mayúscula", test: (pw) => /[A-Z]/.test(pw) },
  { key: "lower", label: "Una letra minúscula", test: (pw) => /[a-z]/.test(pw) },
  { key: "number", label: "Un número", test: (pw) => /[0-9]/.test(pw) },
  { key: "special", label: "Un carácter especial", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

function PasswordField({
  id, label, value, onChange, show, onToggleShow, autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          className="h-11 px-10"
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          required
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-1/2 min-h-11 min-w-11 -translate-y-1/2"
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          onClick={onToggleShow}
        >
          {show ? <EyeOff /> : <Eye />}
        </Button>
      </div>
    </div>
  );
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

  const metRequirements = REQUIREMENTS.map((r) => ({ ...r, met: r.test(newPassword) }));
  const allRequirementsMet = metRequirements.every((r) => r.met);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
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

            <ul className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
              {metRequirements.map((r) => (
                <li key={r.key} className={`flex items-center gap-2 text-xs ${r.met ? "text-primary" : "text-muted-foreground"}`}>
                  {r.met ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> : <Circle className="h-3.5 w-3.5 flex-shrink-0" />}
                  {r.label}
                </li>
              ))}
              <li className={`flex items-center gap-2 text-xs ${passwordsMatch ? "text-primary" : "text-muted-foreground"}`}>
                {passwordsMatch ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> : <Circle className="h-3.5 w-3.5 flex-shrink-0" />}
                Las contraseñas coinciden
              </li>
            </ul>

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

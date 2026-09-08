import { FormEvent, useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

type Mode = "login" | "signup" | "forgot";

export default function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const { user, loading, signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = (location.state as { from?: string } | null)?.from ?? "/";

  useEffect(() => {
    if (user) navigate(destination, { replace: true });
  }, [destination, navigate, user]);

  if (!loading && user) return <Navigate to={destination} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await resetPassword(email, password);
        if (error) {
          toast.error(error);
          return;
        }
        toast.success("Contraseña actualizada. Ya puedes iniciar sesión.");
        setMode("login");
        setPassword("");
        return;
      }

      if (mode === "signup") {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          toast.error(error);
          return;
        }
        navigate(destination, { replace: true });
        return;
      }

      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error);
        return;
      }
      navigate(destination, { replace: true });
    } finally {
      setBusy(false);
    }
  };

  const title = mode === "login" ? "Bienvenido de nuevo" : mode === "signup" ? "Crea tu cuenta" : "Recupera tu acceso";
  const description = mode === "login"
    ? "Ingresa al centro de gestión de Seven Soccer Club"
    : mode === "signup"
      ? "Únete al equipo y empieza a gestionar tu progreso"
      : "Define una nueva contraseña para tu cuenta";

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

        <section className="glass-card-elevated p-5 sm:p-7" aria-labelledby="auth-title">
          <div className="mb-6">
            <h1 id="auth-title" className="text-2xl font-bold text-foreground">{title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>

          <form className="space-y-4" onSubmit={submit}>
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="display-name">Nombre completo</Label>
                <Input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Tu nombre" autoComplete="name" required />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" className="h-11 pl-10" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@club.com" autoComplete="email" required />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="password">{mode === "forgot" ? "Nueva contraseña" : "Contraseña"}</Label>
                {mode === "login" && (
                  <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setMode("forgot")}>¿La olvidaste?</button>
                )}
              </div>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" className="h-11 px-10" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 6 caracteres" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={6} required />
                <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-1/2 min-h-11 min-w-11 -translate-y-1/2" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </div>

            <Button type="submit" className="h-11 w-full font-semibold" disabled={busy}>
              {busy && <LoaderCircle className="animate-spin" />}
              {mode === "login" ? "Iniciar sesión" : mode === "signup" ? "Crear cuenta" : "Guardar contraseña"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" && <>¿No tienes cuenta? <button className="font-semibold text-primary hover:underline" onClick={() => setMode("signup")}>Crear cuenta</button></>}
            {mode === "signup" && <>¿Ya tienes cuenta? <button className="font-semibold text-primary hover:underline" onClick={() => setMode("login")}>Iniciar sesión</button></>}
            {mode === "forgot" && <button className="font-semibold text-primary hover:underline" onClick={() => setMode("login")}>Volver al inicio de sesión</button>}
          </div>
        </section>
      </div>
    </main>
  );
}

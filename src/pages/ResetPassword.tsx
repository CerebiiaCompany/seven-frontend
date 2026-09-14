import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LoaderCircle, LockKeyhole, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [validRecovery, setValidRecovery] = useState(window.location.hash.includes("type=recovery"));
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setValidRecovery(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contraseña actualizada");
    navigate("/", { replace: true });
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="absolute inset-0 auth-grid opacity-30" aria-hidden="true" />
      <section className="glass-card-elevated relative z-10 w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary shadow-[0_0_24px_hsl(var(--primary)/0.28)]">
          <Zap className="h-6 w-6 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Nueva contraseña</h1>
        <p className="mt-2 text-sm text-muted-foreground">Crea una contraseña segura para volver a Soccer Future.</p>

        {validRecovery ? (
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="new-password" className="h-11 pl-10" type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar contraseña</Label>
              <Input id="confirm-password" className="h-11" type="password" minLength={6} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
            </div>
            <Button className="h-11 w-full" disabled={busy}>
              {busy && <LoaderCircle className="animate-spin" />}
              Guardar contraseña
            </Button>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="rounded-lg border border-border bg-secondary p-4 text-sm text-muted-foreground">Este enlace no es válido o ya venció.</p>
            <Button asChild className="w-full"><Link to="/login">Solicitar otro enlace</Link></Button>
          </div>
        )}
      </section>
    </main>
  );
}
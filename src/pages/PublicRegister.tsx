import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2, Zap } from "lucide-react";
import { getPublicForm, submitPublicForm, type PublicForm } from "@/lib/forms";
import { toast } from "@/hooks/use-toast";

const PublicRegister = () => {
  const { formId } = useParams();
  const [form, setForm] = useState<PublicForm | null | undefined>(undefined);
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Momento en que el visitante empieza a ver el formulario, para calcular
  // cuánto tiempo tardó en responderlo (nunca se pide geolocalización ni
  // ningún otro permiso del navegador para esto — solo un timestamp local).
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!formId) return;
    getPublicForm(formId)
      .then((f) => {
        setForm(f);
        startedAtRef.current = Date.now();
      })
      .catch(() => setForm(null));
  }, [formId]);

  if (form === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <div className="text-center">
          <h1 className="text-xl font-display font-bold mb-2">Formulario no disponible</h1>
          <p className="text-sm text-muted-foreground mb-4">El link puede haber expirado.</p>
          <Link to="/" className="text-primary underline text-sm">Volver al inicio</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const f of form.fields) {
      if (f.required && !values[f.id]?.trim()) {
        toast({ title: "Falta información", description: `Completa: ${f.label}`, variant: "destructive" });
        return;
      }
    }

    const durationSeconds = startedAtRef.current
      ? Math.round((Date.now() - startedAtRef.current) / 1000)
      : 0;

    setSubmitting(true);
    try {
      await submitPublicForm(form.id, { answers: values, duration_seconds: durationSeconds });
      setSubmitted(true);
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || "No se pudo enviar el formulario, intenta de nuevo.";
      toast({ title: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-primary/5 to-background">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-10 max-w-md text-center">
          <CheckCircle2 className="w-14 h-14 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold mb-2">¡Inscripción enviada!</h1>
          <p className="text-sm text-muted-foreground">{form.success_message}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background py-10 px-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-foreground">Soccer Future</span>
        </div>
        <div className="glass-card p-6 md:p-8">
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">{form.title}</h1>
          <p className="text-sm text-muted-foreground mb-6">{form.description}</p>

          {!form.is_open ? (
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground text-center">
              Este formulario ya no está aceptando respuestas.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {form.fields.map((f) => (
                <div key={f.id} className="space-y-2">
                  <Label>{f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}</Label>
                  {f.type === "textarea" ? (
                    <Textarea value={values[f.id] || ""} onChange={(e) => setValues({ ...values, [f.id]: e.target.value })} rows={3} />
                  ) : f.type === "select" ? (
                    <Select value={values[f.id] || ""} onValueChange={(v) => setValues({ ...values, [f.id]: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                      <SelectContent>
                        {(f.options || []).map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={f.type === "phone" ? "tel" : f.type}
                      value={values[f.id] || ""}
                      onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}
                    />
                  )}
                </div>
              ))}
              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Enviar inscripción
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default PublicRegister;

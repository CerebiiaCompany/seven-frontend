import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Zap } from "lucide-react";
import { loadForms, loadSubs, saveSubs, type FormDef, type Submission } from "./Forms";
import { toast } from "@/hooks/use-toast";

const PublicRegister = () => {
  const { formId } = useParams();
  const [form, setForm] = useState<FormDef | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const f = loadForms().find((x) => x.id === formId);
    setForm(f || null);
  }, [formId]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    for (const f of form.fields) {
      if (f.required && !values[f.id]?.trim()) {
        toast({ title: "Falta información", description: `Completa: ${f.label}`, variant: "destructive" });
        return;
      }
    }
    const labeled: Record<string, string> = {};
    form.fields.forEach((f) => { labeled[f.label] = values[f.id] || ""; });
    // Also write canonical keys when matches
    if (values.name) labeled.name = values.name;
    if (values.email) labeled.email = values.email;
    if (values.phone) labeled.phone = values.phone;

    const sub: Submission = {
      id: `s-${Date.now()}`,
      formId: form.id,
      data: { ...values, ...labeled },
      status: "new",
      createdAt: new Date().toISOString(),
    };
    saveSubs([sub, ...loadSubs()]);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-primary/5 to-background">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-10 max-w-md text-center">
          <CheckCircle2 className="w-14 h-14 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold mb-2">¡Inscripción enviada!</h1>
          <p className="text-sm text-muted-foreground">Pronto nos pondremos en contacto contigo.</p>
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
            <Button type="submit" className="w-full" size="lg">Enviar inscripción</Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default PublicRegister;

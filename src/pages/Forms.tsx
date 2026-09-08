import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText, Plus, Link2, Copy, Trash2, Users, Eye, X, Mail, Phone, MessageCircle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

export type FormField = {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "number" | "date" | "select" | "textarea";
  required: boolean;
  options?: string[];
};

export type FormDef = {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  createdAt: string;
};

export type Submission = {
  id: string;
  formId: string;
  data: Record<string, string>;
  status: "new" | "contacted" | "enrolled" | "discarded";
  createdAt: string;
};

const FORMS_KEY = "sf_forms_v1";
const SUBS_KEY = "sf_form_submissions_v1";

const defaultFields: FormField[] = [
  { id: "name", label: "Nombre completo del deportista", type: "text", required: true },
  { id: "birthdate", label: "Fecha de nacimiento", type: "date", required: true },
  { id: "position", label: "Posición preferida", type: "select", required: false, options: ["Portero", "Defensa", "Mediocampista", "Delantero"] },
  { id: "guardian", label: "Nombre del acudiente", type: "text", required: true },
  { id: "email", label: "Correo de contacto", type: "email", required: true },
  { id: "phone", label: "Teléfono / WhatsApp", type: "phone", required: true },
  { id: "notes", label: "Comentarios adicionales", type: "textarea", required: false },
];

export const loadForms = (): FormDef[] => {
  try { return JSON.parse(localStorage.getItem(FORMS_KEY) || "[]"); } catch { return []; }
};
export const saveForms = (f: FormDef[]) => localStorage.setItem(FORMS_KEY, JSON.stringify(f));
export const loadSubs = (): Submission[] => {
  try { return JSON.parse(localStorage.getItem(SUBS_KEY) || "[]"); } catch { return []; }
};
export const saveSubs = (s: Submission[]) => localStorage.setItem(SUBS_KEY, JSON.stringify(s));

const Forms = () => {
  const navigate = useNavigate();
  const [forms, setForms] = useState<FormDef[]>([]);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [viewSub, setViewSub] = useState<Submission | null>(null);
  const [activeFormId, setActiveFormId] = useState<string>("all");

  // Form builder state
  const [title, setTitle] = useState("Inscripción de jugadores 2026");
  const [description, setDescription] = useState("Completa el formulario para registrarte en las pruebas.");
  const [fields, setFields] = useState<FormField[]>(defaultFields);

  useEffect(() => {
    const f = loadForms();
    if (f.length === 0) {
      const seed: FormDef = {
        id: "insc-2026",
        title: "Inscripción de jugadores 2026",
        description: "Completa el formulario para registrarte en las pruebas de selección.",
        fields: defaultFields,
        createdAt: new Date().toISOString(),
      };
      saveForms([seed]);
      setForms([seed]);
    } else setForms(f);
    setSubs(loadSubs());
  }, []);

  const filteredSubs = activeFormId === "all" ? subs : subs.filter((s) => s.formId === activeFormId);

  const createForm = () => {
    if (!title.trim()) return;
    const newForm: FormDef = {
      id: `f-${Date.now()}`,
      title, description, fields,
      createdAt: new Date().toISOString(),
    };
    const next = [newForm, ...forms];
    setForms(next); saveForms(next);
    setOpenCreate(false);
    toast({ title: "Formulario creado", description: "Comparte el link con los candidatos." });
  };

  const deleteForm = (id: string) => {
    const next = forms.filter((f) => f.id !== id);
    setForms(next); saveForms(next);
    const ns = subs.filter((s) => s.formId !== id);
    setSubs(ns); saveSubs(ns);
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/register/${id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado", description: url });
  };

  const updateSubStatus = (id: string, status: Submission["status"]) => {
    const next = subs.map((s) => s.id === id ? { ...s, status } : s);
    setSubs(next); saveSubs(next);
  };

  const addField = () => {
    setFields([...fields, { id: `f${Date.now()}`, label: "Nuevo campo", type: "text", required: false }]);
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Formularios</h1>
            <p className="text-sm text-muted-foreground mt-1">Crea formularios públicos, comparte el link y gestiona las inscripciones.</p>
          </div>
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4" /> Nuevo formulario</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Crear formulario</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Campos</Label>
                    <Button variant="outline" size="sm" onClick={addField}><Plus className="w-3.5 h-3.5" />Agregar</Button>
                  </div>
                  <div className="space-y-2">
                    {fields.map((f, idx) => (
                      <div key={f.id} className="grid grid-cols-12 gap-2 items-center p-2 border border-border rounded-lg">
                        <Input className="col-span-5" value={f.label} onChange={(e) => {
                          const n = [...fields]; n[idx] = { ...f, label: e.target.value }; setFields(n);
                        }} />
                        <Select value={f.type} onValueChange={(v) => {
                          const n = [...fields]; n[idx] = { ...f, type: v as FormField["type"] }; setFields(n);
                        }}>
                          <SelectTrigger className="col-span-4"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Texto</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="phone">Teléfono</SelectItem>
                            <SelectItem value="number">Número</SelectItem>
                            <SelectItem value="date">Fecha</SelectItem>
                            <SelectItem value="select">Selección</SelectItem>
                            <SelectItem value="textarea">Texto largo</SelectItem>
                          </SelectContent>
                        </Select>
                        <label className="col-span-2 text-xs flex items-center gap-1 text-muted-foreground">
                          <input type="checkbox" checked={f.required} onChange={(e) => {
                            const n = [...fields]; n[idx] = { ...f, required: e.target.checked }; setFields(n);
                          }} /> Obligatorio
                        </label>
                        <Button variant="ghost" size="icon" className="col-span-1" onClick={() => setFields(fields.filter((_, i) => i !== idx))}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
                <Button onClick={createForm}>Crear</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        <Tabs defaultValue="forms" className="space-y-5">
          <TabsList className="bg-muted/60">
            <TabsTrigger value="forms" className="text-xs gap-1.5"><FileText className="w-3.5 h-3.5" />Formularios ({forms.length})</TabsTrigger>
            <TabsTrigger value="subs" className="text-xs gap-1.5"><Users className="w-3.5 h-3.5" />Inscripciones ({subs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="forms" className="space-y-3">
            {forms.length === 0 && (
              <div className="glass-card p-10 text-center text-sm text-muted-foreground">
                Aún no hay formularios. Crea el primero.
              </div>
            )}
            {forms.map((f) => {
              const count = subs.filter((s) => s.formId === f.id).length;
              return (
                <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-5 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{f.title}</h3>
                      <Badge variant="secondary" className="text-[10px]">{f.fields.length} campos</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{f.description}</p>
                    <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1.5">
                      <Link2 className="w-3 h-3" />/register/{f.id} · {count} inscripciones
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => copyLink(f.id)}><Copy className="w-3.5 h-3.5" />Copiar link</Button>
                    <Button variant="outline" size="sm" onClick={() => window.open(`/register/${f.id}`, "_blank")}><Eye className="w-3.5 h-3.5" />Vista previa</Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteForm(f.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </motion.div>
              );
            })}
          </TabsContent>

          <TabsContent value="subs" className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Button variant={activeFormId === "all" ? "default" : "outline"} size="sm" onClick={() => setActiveFormId("all")}>Todos</Button>
              {forms.map((f) => (
                <Button key={f.id} variant={activeFormId === f.id ? "default" : "outline"} size="sm" onClick={() => setActiveFormId(f.id)}>{f.title}</Button>
              ))}
            </div>
            <div className="glass-card overflow-hidden">
              {filteredSubs.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">Sin inscripciones aún.</div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredSubs.map((s) => {
                    const name = s.data.name || s.data["Nombre"] || "—";
                    const phone = s.data.phone || s.data["Teléfono"] || "";
                    const email = s.data.email || s.data["Correo"] || "";
                    return (
                      <div key={s.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                          {String(name).slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{email} · {phone}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] capitalize">{s.status}</Badge>
                        <div className="flex gap-1">
                          {email && <Button variant="ghost" size="icon" asChild><a href={`mailto:${email}`}><Mail className="w-4 h-4" /></a></Button>}
                          {phone && <Button variant="ghost" size="icon" asChild><a href={`https://wa.me/${phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle className="w-4 h-4" /></a></Button>}
                          {phone && <Button variant="ghost" size="icon" asChild><a href={`tel:${phone}`}><Phone className="w-4 h-4" /></a></Button>}
                          <Button variant="outline" size="sm" onClick={() => setViewSub(s)}>Ver</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={!!viewSub} onOpenChange={(o) => !o && setViewSub(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Detalle de inscripción</DialogTitle></DialogHeader>
            {viewSub && (
              <div className="space-y-3">
                <div className="space-y-2">
                  {Object.entries(viewSub.data).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 py-2 border-b border-border/50 text-sm">
                      <span className="text-muted-foreground capitalize">{k}</span>
                      <span className="text-foreground text-right">{v || "—"}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={viewSub.status} onValueChange={(v) => {
                    updateSubStatus(viewSub.id, v as Submission["status"]);
                    setViewSub({ ...viewSub, status: v as Submission["status"] });
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Nuevo</SelectItem>
                      <SelectItem value="contacted">Contactado</SelectItem>
                      <SelectItem value="enrolled">Inscrito</SelectItem>
                      <SelectItem value="discarded">Descartado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Forms;

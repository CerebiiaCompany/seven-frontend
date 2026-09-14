import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Clock, Search, ShieldCheck, UserPlus, XCircle, RefreshCw } from "lucide-react";
import { addPlayer, currentSeason, makePositionEntry, playerPositions } from "@/pages/Players";

type RegistrationStatus = "pending" | "validated" | "confirmed" | "rejected";

interface Registration {
  id: string;
  user_id: string;
  display_name: string;
  phone: string | null;
  city: string | null;
  document_id: string | null;
  birth_date: string | null;
  position: string | null;
  category: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  emergency_contact: string | null;
  status: string;
  review_note: string | null;
  created_at: string;
}

const STATUS_META: Record<RegistrationStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pendiente de validación", variant: "secondary" },
  validated: { label: "Validado", variant: "outline" },
  confirmed: { label: "Confirmado", variant: "default" },
  rejected: { label: "Rechazado", variant: "destructive" },
};

const FILTERS: { value: RegistrationStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "validated", label: "Validados" },
  { value: "confirmed", label: "Confirmados" },
  { value: "rejected", label: "Rechazados" },
];

const ageFrom = (birth: string | null) => {
  if (!birth) return null;
  const d = new Date(birth);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)));
};

export function RegistrationsPanel({ categories }: { categories: string[] }) {
  const [rows, setRows] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [filter, setFilter] = useState<RegistrationStatus | "all">("pending");
  const [search, setSearch] = useState("");
  const [confirming, setConfirming] = useState<Registration | null>(null);
  const [form, setForm] = useState({ category: "", position: "Mediocampista", season: currentSeason(), note: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id,user_id,display_name,phone,city,document_id,birth_date,position,category,guardian_name,guardian_phone,guardian_email,emergency_contact,status,review_note,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      setDenied(true);
    } else {
      setDenied(false);
      setRows((data ?? []) as Registration[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const okStatus = filter === "all" || r.status === filter;
        const okSearch = (r.display_name || "").toLowerCase().includes(search.toLowerCase());
        return okStatus && okSearch;
      }),
    [rows, filter, search]
  );

  const counts = useMemo(() => {
    const base = { pending: 0, validated: 0, confirmed: 0, rejected: 0 } as Record<RegistrationStatus, number>;
    rows.forEach((r) => { if (r.status in base) base[r.status as RegistrationStatus] += 1; });
    return base;
  }, [rows]);

  const updateStatus = async (row: Registration, status: RegistrationStatus, extra: Partial<Registration> = {}) => {
    const { error } = await supabase
      .from("profiles")
      .update({ status, reviewed_at: new Date().toISOString(), ...extra })
      .eq("id", row.id);
    if (error) {
      toast({ title: "No se pudo actualizar", description: error.message, variant: "destructive" });
      return false;
    }
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status, ...extra } as Registration : r)));
    return true;
  };

  const openConfirm = (row: Registration) => {
    setForm({
      category: row.category || categories[0] || "",
      position: row.position || "Mediocampista",
      season: currentSeason(),
      note: "Asignación inicial al confirmar inscripción",
    });
    setConfirming(row);
  };

  const confirmRegistration = async () => {
    if (!confirming) return;
    if (!form.category) { toast({ title: "Selecciona una categoría", variant: "destructive" }); return; }
    const ok = await updateStatus(confirming, "confirmed", {
      category: form.category,
      position: form.position,
      review_note: form.note || null,
    });
    if (!ok) return;
    addPlayer({
      name: confirming.display_name || "Sin nombre",
      age: ageFrom(confirming.birth_date) ?? 12,
      category: form.category,
      position: form.position,
      rating: 60,
      status: "active",
      goals: 0,
      assists: 0,
      phone: confirming.phone ?? "",
      email: confirming.guardian_email ?? "",
      guardian: confirming.guardian_name ?? "",
      positionHistory: [makePositionEntry(form.position, { season: form.season, note: form.note, by: "Confirmación de inscripción" })],
    });
    toast({ title: "Deportista confirmado", description: `${confirming.display_name} ya aparece en el listado de deportistas.` });
    setConfirming(null);
  };

  if (denied) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        Tu cuenta no tiene permiso para revisar registros. Pide al administrador del club que te asigne el rol de administrador o entrenador.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          { key: "pending", label: "Pendientes", icon: Clock },
          { key: "validated", label: "Validados", icon: ShieldCheck },
          { key: "confirmed", label: "Confirmados", icon: CheckCircle2 },
          { key: "rejected", label: "Rechazados", icon: XCircle },
        ] as const).map((c) => (
          <Card key={c.key} className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <c.icon className="w-3.5 h-3.5" /> {c.label}
            </div>
            <p className="text-2xl font-display font-bold mt-1">{counts[c.key]}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-semibold">Deportistas registrados</h3>
            <p className="text-xs text-muted-foreground">Solicitudes que llegan desde la pantalla de registro</p>
          </div>
          <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={load}>
            <RefreshCw className="w-4 h-4" /> Actualizar
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nombre..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {FILTERS.map((f) => (
              <Button
                key={f.value}
                size="sm"
                variant={filter === f.value ? "default" : "secondary"}
                className="rounded-full shrink-0"
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Cargando registros...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No hay registros en este estado.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const meta = STATUS_META[(r.status as RegistrationStatus)] ?? STATUS_META.pending;
              const age = ageFrom(r.birth_date);
              return (
                <div key={r.id} className="rounded-lg border border-border p-3 sm:p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium truncate">{r.display_name || "Sin nombre"}</p>
                        <Badge variant={meta.variant} className="text-[10px]">{meta.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {age !== null ? `${age} años` : "Edad sin registrar"}
                        {r.document_id ? ` · Doc. ${r.document_id}` : ""}
                        {r.city ? ` · ${r.city}` : ""}
                        {r.phone ? ` · ${r.phone}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Acudiente: {r.guardian_name || "—"}
                        {r.guardian_phone ? ` · ${r.guardian_phone}` : ""}
                        {r.guardian_email ? ` · ${r.guardian_email}` : ""}
                      </p>
                      {r.status === "confirmed" && (
                        <p className="text-xs text-primary mt-1">
                          {r.category || "Sin categoría"}{r.position ? ` · ${r.position}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {r.status === "pending" && (
                        <>
                          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => updateStatus(r, "validated")}>
                            <ShieldCheck className="w-3.5 h-3.5" /> Validar
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive gap-1.5" onClick={() => updateStatus(r, "rejected")}>
                            <XCircle className="w-3.5 h-3.5" /> Rechazar
                          </Button>
                        </>
                      )}
                      {r.status === "validated" && (
                        <>
                          <Button size="sm" className="gap-1.5" onClick={() => openConfirm(r)}>
                            <UserPlus className="w-3.5 h-3.5" /> Confirmar y asignar categoría
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive gap-1.5" onClick={() => updateStatus(r, "rejected")}>
                            <XCircle className="w-3.5 h-3.5" /> Rechazar
                          </Button>
                        </>
                      )}
                      {r.status === "rejected" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(r, "pending")}>Reabrir</Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Dialog open={!!confirming} onOpenChange={(o) => !o && setConfirming(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar inscripción</DialogTitle>
            <DialogDescription>
              Asigna la categoría y la posición inicial de {confirming?.display_name}. Quedará en el listado de deportistas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <Label>Categoría</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona una categoría" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Posición inicial</Label>
                <Select value={form.position} onValueChange={(v) => setForm((f) => ({ ...f, position: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {playerPositions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Temporada</Label>
                <Input value={form.season} onChange={(e) => setForm((f) => ({ ...f, season: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Nota interna</Label>
              <Textarea rows={2} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setConfirming(null)}>Cancelar</Button>
              <Button className="flex-1" onClick={confirmRegistration}>Confirmar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

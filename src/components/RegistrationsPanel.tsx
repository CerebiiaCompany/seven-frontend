import { useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Clock, Search, XCircle, RefreshCw } from "lucide-react";
import { playerPositions } from "@/pages/Players";

type RegistrationStatus = "pending" | "confirmed" | "rejected";

interface NamedRef {
  id: string;
  name: string;
}

interface Registration {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  city: string;
  document_id: string;
  birth_date: string;
  position: string;
  category: NamedRef | null;
  group: NamedRef | null;
  guardian_name: string;
  guardian_phone: string;
  guardian_email: string;
  emergency_contact: string;
  status: RegistrationStatus;
  review_note: string;
  created_at: string;
}

interface CategoryOption {
  id: string;
  name: string;
  groups: NamedRef[];
}

const STATUS_META: Record<RegistrationStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pendiente", variant: "secondary" },
  confirmed: { label: "Confirmado", variant: "default" },
  rejected: { label: "Rechazado", variant: "destructive" },
};

const FILTERS: { value: RegistrationStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendientes" },
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

export function RegistrationsPanel() {
  const [rows, setRows] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [filter, setFilter] = useState<RegistrationStatus | "all">("pending");
  const [search, setSearch] = useState("");

  const [confirming, setConfirming] = useState<Registration | null>(null);
  const [form, setForm] = useState({ categoryId: "", groupId: "", position: "Mediocampista", note: "" });
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ results: Registration[] }>("/players/", { params: { page_size: 100 } });
      setDenied(false);
      setRows(data.results);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 403) {
        setDenied(true);
      } else {
        toast({ title: "No se pudieron cargar los registros", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError(false);
    try {
      const { data } = await api.get<CategoryOption[]>("/categories/");
      setCategories(data);
    } catch {
      setCategoriesError(true);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const okStatus = filter === "all" || r.status === filter;
        const okSearch = (r.full_name || "").toLowerCase().includes(search.toLowerCase());
        return okStatus && okSearch;
      }),
    [rows, filter, search]
  );

  const counts = useMemo(() => {
    const base: Record<RegistrationStatus, number> = { pending: 0, confirmed: 0, rejected: 0 };
    rows.forEach((r) => { if (r.status in base) base[r.status] += 1; });
    return base;
  }, [rows]);

  const reject = async (row: Registration) => {
    try {
      const { data } = await api.post<Registration>(`/players/${row.id}/reject/`, {});
      setRows((prev) => prev.map((r) => (r.id === row.id ? data : r)));
      toast({ title: "Deportista rechazado" });
    } catch (error) {
      toast({ title: "No se pudo rechazar", variant: "destructive" });
    }
  };

  const openConfirm = (row: Registration) => {
    setForm({ categoryId: "", groupId: "", position: "Mediocampista", note: "" });
    setConfirming(row);
    loadCategories();
  };

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === form.categoryId) ?? null,
    [categories, form.categoryId]
  );

  const confirmRegistration = async () => {
    if (!confirming) return;
    if (!form.categoryId) { toast({ title: "Selecciona una categoría", variant: "destructive" }); return; }
    if (selectedCategory && selectedCategory.groups.length > 0 && !form.groupId) {
      toast({ title: "Selecciona un grupo", variant: "destructive" });
      return;
    }
    if (!form.position) { toast({ title: "Selecciona una posición inicial", variant: "destructive" }); return; }

    setSaving(true);
    try {
      const { data } = await api.post<Registration>(`/players/${confirming.id}/confirm/`, {
        category_id: form.categoryId,
        group_id: form.groupId || null,
        position: form.position,
        review_note: form.note,
      });
      setRows((prev) => prev.map((r) => (r.id === confirming.id ? data : r)));
      toast({ title: "Deportista confirmado", description: `${confirming.full_name} ya está habilitado como jugador activo.` });
      setConfirming(null);
    } catch (error) {
      const detail = isAxiosError(error)
        ? Object.values(error.response?.data ?? {})[0]
        : null;
      toast({
        title: typeof detail === "string" ? detail : Array.isArray(detail) ? String(detail[0]) : "No se pudo confirmar",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
      <div className="grid grid-cols-3 gap-3">
        {([
          { key: "pending", label: "Pendientes", icon: Clock },
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
            <h3 className="font-semibold">Deportistas pendientes</h3>
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
              const meta = STATUS_META[r.status] ?? STATUS_META.pending;
              const age = ageFrom(r.birth_date);
              return (
                <div key={r.id} className="rounded-lg border border-border p-3 sm:p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium truncate">{r.full_name || "Sin nombre"}</p>
                        <Badge variant={meta.variant} className="text-[10px]">{meta.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {age !== null ? `${age} años` : "Edad sin registrar"}
                        {r.document_id ? ` · Doc. ${r.document_id}` : ""}
                        {r.city ? ` · ${r.city}` : ""}
                        {r.phone_number ? ` · ${r.phone_number}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Acudiente: {r.guardian_name || "—"}
                        {r.guardian_phone ? ` · ${r.guardian_phone}` : ""}
                        {r.guardian_email ? ` · ${r.guardian_email}` : ""}
                      </p>
                      {r.status === "confirmed" && (
                        <p className="text-xs text-primary mt-1">
                          {r.category?.name || "Sin categoría"}
                          {r.group ? ` ${r.group.name}` : ""}
                          {r.position ? ` · ${r.position}` : ""}
                        </p>
                      )}
                      {r.status === "rejected" && r.review_note && (
                        <p className="text-xs text-destructive mt-1">Motivo: {r.review_note}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {r.status === "pending" && (
                        <>
                          <Button size="sm" className="gap-1.5" onClick={() => openConfirm(r)}>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive gap-1.5" onClick={() => reject(r)}>
                            <XCircle className="w-3.5 h-3.5" /> Rechazar
                          </Button>
                        </>
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
            <DialogTitle>Confirmar deportista</DialogTitle>
            <DialogDescription>
              Asigna la categoría, el grupo y la posición inicial de {confirming?.full_name}. Pasará de pendiente a confirmado y quedará habilitado como jugador activo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <Label>Categoría</Label>
              {categoriesError ? (
                <div className="flex items-center justify-between gap-3 mt-1.5">
                  <p className="text-xs text-destructive">No se pudieron cargar las categorías.</p>
                  <Button size="sm" variant="outline" onClick={loadCategories}>Reintentar</Button>
                </div>
              ) : (
                <Select
                  value={form.categoryId}
                  onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v, groupId: "" }))}
                  disabled={categoriesLoading || categories.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        categoriesLoading
                          ? "Cargando categorías..."
                          : categories.length === 0
                          ? "No hay categorías creadas"
                          : "Selecciona una categoría"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label>Grupo</Label>
              {!selectedCategory ? (
                <Select disabled value="">
                  <SelectTrigger><SelectValue placeholder="Selecciona primero una categoría" /></SelectTrigger>
                  <SelectContent />
                </Select>
              ) : selectedCategory.groups.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-1.5">Esta categoría no tiene grupos creados.</p>
              ) : (
                <Select value={form.groupId} onValueChange={(v) => setForm((f) => ({ ...f, groupId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecciona un grupo" /></SelectTrigger>
                  <SelectContent>
                    {selectedCategory.groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

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
              <Label>Nota interna</Label>
              <Textarea rows={2} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setConfirming(null)}>Cancelar</Button>
              <Button className="flex-1" onClick={confirmRegistration} disabled={saving}>
                {saving ? "Confirmando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

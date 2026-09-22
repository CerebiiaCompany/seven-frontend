import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, X } from "lucide-react";

interface CategoryGroup {
  id: string;
  name: string;
}

interface CategoryRow {
  id: string;
  name: string;
  age_range: string;
  fee: number;
  groups: CategoryGroup[];
}

/**
 * Categorías del club, persistidas en el backend (`/api/v1/categories/`).
 * Cada categoría puede dividirse en grupos (A, B, C, ...) cuando tiene más
 * deportistas de los que caben en un solo equipo/horario.
 */
export function CategoriesPanel({ onNamesChange }: { onNamesChange?: (names: string[]) => void }) {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [groupDrafts, setGroupDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<CategoryRow[]>("/categories/");
      setDenied(false);
      setRows(data);
      onNamesChange?.(data.map((c) => c.name));
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 403) {
        setDenied(true);
      } else {
        toast({ title: "No se pudieron cargar las categorías", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [onNamesChange]);

  useEffect(() => { load(); }, [load]);

  const persist = async (
    id: string,
    patch: Partial<{ name: string; age_range: string; fee: number; groups: string[] }>,
  ) => {
    const current = rows.find((r) => r.id === id);
    if (!current) return;
    const payload = {
      name: patch.name ?? current.name,
      age_range: patch.age_range ?? current.age_range,
      fee: patch.fee ?? current.fee,
      groups: patch.groups ?? current.groups.map((g) => g.name),
    };
    try {
      const { data } = await api.put<CategoryRow>(`/categories/${id}/`, payload);
      setRows((prev) => {
        const next = prev.map((r) => (r.id === id ? data : r));
        onNamesChange?.(next.map((c) => c.name));
        return next;
      });
    } catch (error) {
      const detail = isAxiosError(error) ? error.response?.data?.name?.[0] : null;
      toast({ title: detail || "No se pudo guardar la categoría", variant: "destructive" });
      load();
    }
  };

  const setLocal = (id: string, patch: Partial<CategoryRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const createCategory = async () => {
    try {
      const { data } = await api.post<CategoryRow>("/categories/", {
        name: "Nueva categoría", age_range: "", fee: 0, groups: [],
      });
      setRows((prev) => {
        const next = [...prev, data];
        onNamesChange?.(next.map((c) => c.name));
        return next;
      });
    } catch (error) {
      toast({ title: "No se pudo crear la categoría", variant: "destructive" });
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await api.delete(`/categories/${id}/`);
      setRows((prev) => {
        const next = prev.filter((r) => r.id !== id);
        onNamesChange?.(next.map((c) => c.name));
        return next;
      });
    } catch (error) {
      toast({ title: "No se pudo eliminar la categoría", variant: "destructive" });
    }
  };

  const addGroup = (row: CategoryRow) => {
    const draft = (groupDrafts[row.id] || "").trim().toUpperCase();
    if (!draft) return;
    if (row.groups.some((g) => g.name.toUpperCase() === draft)) {
      toast({ title: `El grupo "${draft}" ya existe en esta categoría`, variant: "destructive" });
      return;
    }
    persist(row.id, { groups: [...row.groups.map((g) => g.name), draft] });
    setGroupDrafts((prev) => ({ ...prev, [row.id]: "" }));
  };

  const removeGroup = (row: CategoryRow, groupName: string) => {
    persist(row.id, { groups: row.groups.filter((g) => g.name !== groupName).map((g) => g.name) });
  };

  if (denied) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        Tu cuenta no tiene permiso para gestionar categorías. Pide al administrador del club que te asigne el rol de administrador o entrenador.
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold">Categorías del club</h3>
          <p className="text-xs text-muted-foreground">
            Define los grupos por edad, su mensualidad y sus divisiones (A, B, C...)
          </p>
        </div>
        <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={createCategory}>
          <Plus className="w-4 h-4" /> Añadir categoría
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Cargando categorías...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Aún no hay categorías. Crea la primera.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((c) => (
            <div key={c.id} className="p-3 rounded-lg border space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 sm:gap-3 sm:items-end">
                <div>
                  <Label className="text-xs">Nombre</Label>
                  <Input
                    value={c.name}
                    onChange={(e) => setLocal(c.id, { name: e.target.value })}
                    onBlur={() => persist(c.id, { name: c.name })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Rango de edad</Label>
                  <Input
                    value={c.age_range}
                    placeholder="14-15 años"
                    onChange={(e) => setLocal(c.id, { age_range: e.target.value })}
                    onBlur={() => persist(c.id, { age_range: c.age_range })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Mensualidad</Label>
                  <Input
                    type="number"
                    value={c.fee}
                    onChange={(e) => setLocal(c.id, { fee: Number(e.target.value) })}
                    onBlur={() => persist(c.id, { fee: c.fee })}
                  />
                </div>
                <Button
                  variant="ghost" size="icon"
                  className="text-destructive justify-self-end"
                  onClick={() => deleteCategory(c.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div>
                <Label className="text-xs">Grupos (A, B, C...)</Label>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {c.groups.map((g) => (
                    <Badge key={g.id} variant="secondary" className="gap-1 pl-2.5 pr-1 py-1">
                      {g.name}
                      <button
                        type="button"
                        onClick={() => removeGroup(c, g.name)}
                        className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                        aria-label={`Eliminar grupo ${g.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  <div className="flex items-center gap-1.5">
                    <Input
                      className="h-7 w-20 text-xs"
                      placeholder="Ej: A"
                      maxLength={10}
                      value={groupDrafts[c.id] || ""}
                      onChange={(e) => setGroupDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGroup(c); } }}
                    />
                    <Button size="sm" variant="outline" className="h-7 px-2 gap-1" onClick={() => addGroup(c)}>
                      <Plus className="w-3 h-3" /> Grupo
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

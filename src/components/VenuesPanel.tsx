import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, ExternalLink } from "lucide-react";

interface Venue {
  id: string;
  name: string;
  site: string;
  venue_type: string;
  google_maps_url: string;
}

const VENUE_TYPES = [
  { value: "grama_natural", label: "Grama natural" },
  { value: "grama_sintetica", label: "Grama sintética" },
  { value: "preparacion_fisica", label: "Preparación física" },
  { value: "gimnasio", label: "Gimnasio" },
  { value: "cancha_multiple", label: "Cancha múltiple" },
  { value: "otro", label: "Otro" },
];

const isValidUrl = (value: string) => {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Sedes del club, persistidas en el backend (`/api/v1/venues/`).
 */
export function VenuesPanel() {
  const [rows, setRows] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Venue[]>("/venues/");
      setDenied(false);
      setRows(data);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 403) {
        setDenied(true);
      } else {
        toast({ title: "No se pudieron cargar las sedes", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const persist = async (id: string, patch: Partial<Omit<Venue, "id">>) => {
    const current = rows.find((r) => r.id === id);
    if (!current) return;
    const payload = {
      name: patch.name ?? current.name,
      site: patch.site ?? current.site,
      venue_type: patch.venue_type ?? current.venue_type,
      google_maps_url: patch.google_maps_url ?? current.google_maps_url,
    };
    try {
      const { data } = await api.put<Venue>(`/venues/${id}/`, payload);
      setRows((prev) => prev.map((r) => (r.id === id ? data : r)));
    } catch (error) {
      const detail = isAxiosError(error)
        ? Object.values(error.response?.data?.error?.details ?? {})[0]?.[0]
        : null;
      toast({ title: typeof detail === "string" ? detail : "No se pudo guardar la sede", variant: "destructive" });
      load();
    }
  };

  const setLocal = (id: string, patch: Partial<Venue>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addVenue = async () => {
    try {
      const { data } = await api.post<Venue>("/venues/", {
        name: "Nueva sede", site: "", venue_type: "otro", google_maps_url: "",
      });
      setRows((prev) => [...prev, data]);
    } catch {
      toast({ title: "No se pudo crear la sede", variant: "destructive" });
    }
  };

  const deleteVenue = async (id: string) => {
    try {
      await api.delete(`/venues/${id}/`);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch {
      toast({ title: "No se pudo eliminar la sede", variant: "destructive" });
    }
  };

  if (denied) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        Tu cuenta no tiene permiso para gestionar sedes. Pide al administrador del club que te asigne el rol de administrador.
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold">Sedes y escenarios</h3>
          <p className="text-xs text-muted-foreground">Lugares disponibles para entrenamientos y partidos</p>
        </div>
        <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={addVenue}>
          <Plus className="w-4 h-4" /> Añadir sede
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Cargando sedes...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Todavía no hay sedes registradas.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rows.map((v) => (
            <div key={v.id} className="p-3 rounded-lg border space-y-2">
              <div className="flex items-start justify-between gap-2">
                <Input
                  value={v.name}
                  className="font-medium"
                  onChange={(e) => setLocal(v.id, { name: e.target.value })}
                  onBlur={() => persist(v.id, { name: v.name })}
                />
                <Button variant="ghost" size="icon" className="text-destructive flex-shrink-0" onClick={() => deleteVenue(v.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <Input
                value={v.site}
                placeholder="Sede (ej. Sede Principal)"
                onChange={(e) => setLocal(v.id, { site: e.target.value })}
                onBlur={() => persist(v.id, { site: v.site })}
              />
              <Select value={v.venue_type} onValueChange={(val) => { setLocal(v.id, { venue_type: val }); persist(v.id, { venue_type: val }); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VENUE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <div>
                <Label className="text-xs">URL de Google Maps</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    placeholder="https://maps.google.com/..."
                    value={v.google_maps_url}
                    onChange={(e) => setLocal(v.id, { google_maps_url: e.target.value })}
                    onBlur={() => persist(v.id, { google_maps_url: v.google_maps_url })}
                  />
                  {isValidUrl(v.google_maps_url) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 flex-shrink-0"
                      onClick={() => window.open(v.google_maps_url, "_blank", "noopener,noreferrer")}
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Abrir mapa
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

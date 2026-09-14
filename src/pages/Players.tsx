import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Search, Filter, ChevronRight, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import api from "@/lib/api";

// ---------------------------------------------------------------------------
// Tipos compartidos con PlayerProfile.tsx (trazabilidad de posición y ficha
// local de video/observaciones, que aún no tienen respaldo en el backend).
// ---------------------------------------------------------------------------

export interface PositionEntry {
  id: string;
  position: string;
  season: string;
  date: string;
  note?: string;
  by?: string;
}

export interface Player {
  id: string;
  name: string;
  age: number;
  category: string;
  position: string;
  rating: number;
  status: string;
  goals: number;
  assists: number;
  phone?: string;
  email?: string;
  guardian?: string;
  positionHistory?: PositionEntry[];
}

interface ApiPlayer {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  birth_date: string;
  document_id: string;
  city: string;
  guardian_name: string;
  status: "pending" | "confirmed" | "rejected";
  category: string;
  position: string;
  created_at: string;
}

// Caché local (por id de backend) para que PlayerProfile.tsx pueda resolver
// un deportista por id sin repetir el fetch. Se alimenta desde esta página.
const STORAGE_KEY = "sf_players";
export const PLAYERS_STORAGE_KEY = STORAGE_KEY;

export const loadPlayers = (): Player[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
};

const savePlayers = (players: Player[]) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players));

const cachePlayers = (fetched: Player[]) => {
  const merged = new Map(loadPlayers().map((p) => [p.id, p]));
  fetched.forEach((p) => merged.set(p.id, p));
  savePlayers(Array.from(merged.values()));
};

export const playerPositions = ["Portero", "Defensa", "Mediocampista", "Delantero"];

const ageFrom = (birth: string | null | undefined) => {
  if (!birth) return null;
  const d = new Date(birth);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)));
};

const mapApiPlayer = (r: ApiPlayer): Player => ({
  id: r.id,
  name: r.full_name || "Sin nombre",
  age: ageFrom(r.birth_date) ?? 0,
  category: r.category || "Sin categoría",
  position: r.position || "Sin posición",
  rating: 0,
  status: r.status,
  goals: 0,
  assists: 0,
  phone: r.phone_number,
  email: r.email,
  guardian: r.guardian_name,
});

const ALL_CATEGORIES = "Todas";

const Players = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get<string[]>("/players/categories/")
      .then(({ data }) => setCategories(data))
      .catch(() => { /* el filtro queda solo con "Todas" si falla */ });
  }, []);

  // El filtro de categoría (y el de "solo confirmados") se envían al backend
  // como query params — el servidor es quien realmente restringe los datos,
  // no solo la interfaz.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ results: ApiPlayer[] }>("/players/", {
        params: {
          status: "confirmed",
          category: selectedCategory === ALL_CATEGORIES ? undefined : selectedCategory,
          page_size: 100,
        },
      });
      const mapped = data.results.map(mapApiPlayer);
      setDenied(false);
      setPlayers(mapped);
      cachePlayers(mapped);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 403) {
        setDenied(true);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => { load(); }, [load]);

  // El buscador solo refina en el cliente sobre el subconjunto ya filtrado
  // por el backend (confirmados + categoría), nunca sobre el listado completo.
  const filtered = useMemo(
    () => players.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [players, search]
  );

  if (denied) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
          <Card className="p-6 text-sm text-muted-foreground">
            Tu cuenta no tiene permiso para ver el listado de deportistas. Pide al administrador del club que te asigne el rol de entrenador o administrador.
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Deportistas</h1>
            <p className="text-sm text-muted-foreground mt-1">{players.length} deportistas confirmados</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={load} disabled={loading}>
            <RefreshCw className="w-4 h-4" /> Actualizar
          </Button>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar jugador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {[ALL_CATEGORIES, ...categories].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-muted"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Table */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Jugador</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Categoría</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Posición</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Contacto</th>
                  <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Estado</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center text-sm text-muted-foreground py-10">Cargando deportistas...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-sm text-muted-foreground py-10">
                      No hay deportistas confirmados{selectedCategory !== ALL_CATEGORIES ? ` en ${selectedCategory}` : ""}.
                    </td>
                  </tr>
                ) : (
                  filtered.map((player) => (
                    <tr
                      key={player.id}
                      className="border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/players/${player.id}`)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {player.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{player.name}</p>
                            <p className="text-xs text-muted-foreground">{player.age} años</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-foreground">{player.category}</td>
                      <td className="px-5 py-3.5 text-sm text-foreground">{player.position}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">
                        <p>{player.email || "—"}</p>
                        {player.phone && <p className="text-xs">{player.phone}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <Badge>Confirmado</Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); navigate(`/players/${player.id}`); }}
                            aria-label={`Ver ${player.name}`}
                          >
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Players;

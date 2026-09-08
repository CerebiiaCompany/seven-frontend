import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Search, Filter, ChevronRight, Pencil, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export interface Player {
  id: number;
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
}

const defaultPlayers: Player[] = [
  { id: 1, name: "Juan Pérez", age: 16, category: "Sub-17", position: "Delantero", rating: 82, status: "active", goals: 12, assists: 8, phone: "300 123 4567", email: "juan@mail.com", guardian: "Marta Pérez" },
  { id: 2, name: "Carlos Díaz", age: 14, category: "Sub-15", position: "Mediocampista", rating: 75, status: "active", goals: 5, assists: 14, phone: "301 222 1111", email: "carlos@mail.com", guardian: "Luis Díaz" },
  { id: 3, name: "María López", age: 15, category: "Sub-17", position: "Defensa", rating: 78, status: "active", goals: 2, assists: 6, phone: "302 333 2222", email: "maria@mail.com", guardian: "Ana López" },
  { id: 4, name: "Andrés Gómez", age: 13, category: "Sub-13", position: "Portero", rating: 71, status: "inactive", goals: 0, assists: 1, phone: "303 444 3333", email: "andres@mail.com", guardian: "Pedro Gómez" },
  { id: 5, name: "Sofía Ramírez", age: 16, category: "Sub-17", position: "Mediocampista", rating: 85, status: "active", goals: 9, assists: 11, phone: "304 555 4444", email: "sofia@mail.com", guardian: "Elena Ramírez" },
  { id: 6, name: "Diego Torres", age: 14, category: "Sub-15", position: "Delantero", rating: 79, status: "active", goals: 15, assists: 3, phone: "305 666 5555", email: "diego@mail.com", guardian: "Jorge Torres" },
  { id: 7, name: "Valentina Cruz", age: 12, category: "Sub-13", position: "Defensa", rating: 68, status: "active", goals: 1, assists: 4, phone: "306 777 6666", email: "valentina@mail.com", guardian: "Rosa Cruz" },
  { id: 8, name: "Mateo Herrera", age: 15, category: "Sub-15", position: "Mediocampista", rating: 73, status: "trial", goals: 3, assists: 7, phone: "307 888 7777", email: "mateo@mail.com", guardian: "Iván Herrera" },
];

const STORAGE_KEY = "sf_players";

export const loadPlayers = (): Player[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return defaultPlayers;
};

const categories = ["Todas", "Sub-13", "Sub-15", "Sub-17"];
const positions = ["Portero", "Defensa", "Mediocampista", "Delantero"];

const emptyPlayer: Player = {
  id: 0, name: "", age: 12, category: "Sub-13", position: "Mediocampista",
  rating: 60, status: "active", goals: 0, assists: 0, phone: "", email: "", guardian: "",
};

const Players = () => {
  const [players, setPlayers] = useState<Player[]>(loadPlayers);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [editing, setEditing] = useState<Player | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
  }, [players]);

  const filtered = players.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === "Todas" || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const save = () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setPlayers((prev) =>
      editing.id === 0
        ? [...prev, { ...editing, id: Math.max(0, ...prev.map((p) => p.id)) + 1 }]
        : prev.map((p) => (p.id === editing.id ? editing : p))
    );
    toast.success(editing.id === 0 ? "Deportista creado" : "Información actualizada");
    setEditing(null);
  };

  const set = <K extends keyof Player>(key: K, value: Player[K]) =>
    setEditing((e) => (e ? { ...e, [key]: value } : e));

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Deportistas</h1>
            <p className="text-sm text-muted-foreground mt-1">{players.length} jugadores registrados</p>
          </div>
          <Button className="gap-2" onClick={() => setEditing({ ...emptyPlayer })}>
            <Plus className="w-4 h-4" /> Nuevo deportista
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
            {categories.map((cat) => (
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
                  <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Goles</th>
                  <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Asist.</th>
                  <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Rating</th>
                  <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Estado</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((player) => (
                  <tr
                    key={player.id}
                    className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-5 py-3.5 cursor-pointer" onClick={() => navigate(`/players/${player.id}`)}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {player.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{player.name}</p>
                          <p className="text-xs text-muted-foreground">{player.age} años</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-foreground">{player.category}</td>
                    <td className="px-5 py-3.5 text-sm text-foreground">{player.position}</td>
                    <td className="px-5 py-3.5 text-sm text-foreground text-center font-medium">{player.goals}</td>
                    <td className="px-5 py-3.5 text-sm text-foreground text-center font-medium">{player.assists}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`text-sm font-bold ${
                        player.rating >= 80 ? "text-kpi-green" : player.rating >= 70 ? "text-kpi-amber" : "text-kpi-red"
                      }`}>
                        {player.rating}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Badge variant={player.status === "active" ? "default" : player.status === "trial" ? "secondary" : "outline"}>
                        {player.status === "active" ? "Activo" : player.status === "trial" ? "Prueba" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(player)} aria-label={`Editar ${player.name}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/players/${player.id}`)} aria-label={`Ver ${player.name}`}>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id === 0 ? "Nuevo deportista" : "Editar deportista"}</DialogTitle>
            <DialogDescription>Actualiza los datos personales y deportivos</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 pt-1">
              <div><Label>Nombre completo</Label><Input value={editing.name} onChange={(e) => set("name", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Edad</Label><Input type="number" value={editing.age} onChange={(e) => set("age", Number(e.target.value))} /></div>
                <div>
                  <Label>Categoría</Label>
                  <Select value={editing.category} onValueChange={(v) => set("category", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.filter((c) => c !== "Todas").map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Posición</Label>
                  <Select value={editing.position} onValueChange={(v) => set("position", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {positions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select value={editing.status} onValueChange={(v) => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="trial">Prueba</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Goles</Label><Input type="number" value={editing.goals} onChange={(e) => set("goals", Number(e.target.value))} /></div>
                <div><Label>Asistencias</Label><Input type="number" value={editing.assists} onChange={(e) => set("assists", Number(e.target.value))} /></div>
                <div><Label>Rating</Label><Input type="number" value={editing.rating} onChange={(e) => set("rating", Number(e.target.value))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Teléfono</Label><Input value={editing.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></div>
                <div><Label>Correo</Label><Input value={editing.email ?? ""} onChange={(e) => set("email", e.target.value)} /></div>
              </div>
              <div><Label>Acudiente</Label><Input value={editing.guardian ?? ""} onChange={(e) => set("guardian", e.target.value)} /></div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>Cancelar</Button>
                <Button className="flex-1" onClick={save}>Guardar cambios</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Players;

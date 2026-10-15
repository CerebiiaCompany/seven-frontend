import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  UserCog, Plus, Search, BookOpen, Dumbbell,
  Clock, Users, ChevronRight, Target, Layers,
  GraduationCap, Flame, Shield
} from "lucide-react";
import api from "@/lib/api";
import { UserAvatar } from "@/components/UserAvatar";

interface ApiCoach {
  id: string;
  full_name: string;
  email: string;
  photo: string | null;
  categories: string[];
}

// --- Mock Data (metodologías, ciclos y ejercicios: aún no hay módulo real en el backend) ---

const methodologies = [
  { id: 1, name: "Técnica", phases: 6, exercises: 36, category: "Técnica", color: "hsl(var(--primary))" },
  { id: 2, name: "Físico", phases: 3, exercises: 18, category: "Físico", color: "hsl(var(--kpi-amber))" },
  { id: 3, name: "Psicológico", phases: 3, exercises: 15, category: "Psicológico", color: "hsl(var(--kpi-green))" },
  { id: 4, name: "Competencia (Táctico)", phases: 4, exercises: 24, category: "Competencia (Táctico)", color: "hsl(var(--kpi-blue))" },
];

const exercises = [
  { id: 1, name: "Rondo 4v2", category: "Táctica", duration: 15, intensity: "Media", players: "6-8", description: "Juego de posesión en espacio reducido" },
  { id: 2, name: "Circuito de Pases", category: "Técnica", duration: 20, intensity: "Baja", players: "8-12", description: "Secuencia de pases con movilidad" },
  { id: 3, name: "Sprint + Recuperación", category: "Físico", duration: 12, intensity: "Alta", players: "Todos", description: "Intervalos de alta intensidad" },
  { id: 4, name: "Juego Posicional 7v7", category: "Táctica", duration: 25, intensity: "Alta", players: "14-16", description: "Simulación de partido con roles" },
  { id: 5, name: "Control Orientado", category: "Técnica", duration: 15, intensity: "Media", players: "4-6", description: "Ejercicio de primer toque direccional" },
  { id: 6, name: "Fuerza Funcional", category: "Físico", duration: 30, intensity: "Alta", players: "Todos", description: "Trabajo de fuerza con bandas y peso corporal" },
  { id: 7, name: "Pressing Alto", category: "Táctica", duration: 20, intensity: "Alta", players: "10-14", description: "Presión coordinada en campo rival" },
  { id: 8, name: "Conducción en Slalom", category: "Técnica", duration: 10, intensity: "Baja", players: "Todos", description: "Dribling entre conos con cambio de ritmo" },
];

const intensityColor = (i: string) =>
  i === "Alta" ? "text-destructive" : i === "Media" ? "text-[hsl(var(--kpi-amber))]" : "text-[hsl(var(--primary))]";

const Coaches = () => {
  const [coaches, setCoaches] = useState<ApiCoach[]>([]);
  const [search, setSearch] = useState("");
  const [showNewMethodology, setShowNewMethodology] = useState(false);
  const [showNewExercise, setShowNewExercise] = useState(false);

  useEffect(() => {
    api
      .get<ApiCoach[]>("/coaches/")
      .then(({ data }) => setCoaches(data))
      .catch(() => { /* deja la lista vacía si falla */ });
  }, []);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Entrenadores</h1>
            <p className="text-sm text-muted-foreground mt-1">Metodologías y ejercicios</p>
          </div>
        </motion.div>

        {/* Coach cards */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {coaches.length === 0 ? (
            <p className="text-sm text-muted-foreground md:col-span-3">No hay entrenadores registrados todavía.</p>
          ) : (
            coaches.map((c) => (
              <div key={c.id} className="glass-card p-5 flex items-start gap-4">
                <UserAvatar
                  photoUrl={c.photo}
                  name={c.full_name}
                  className="w-11 h-11 rounded-full text-sm text-primary-foreground"
                  style={{ background: "hsl(var(--primary))" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{c.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {c.categories.length > 0 ? (
                      c.categories.map((cat) => (
                        <Badge key={cat} variant="secondary" className="text-[10px]">{cat}</Badge>
                      ))
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Sin categoría/grupo a cargo aún</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="methodologies" className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <TabsList className="bg-muted/60">
              <TabsTrigger value="methodologies" className="text-xs gap-1.5"><BookOpen className="w-3.5 h-3.5" />Metodologías</TabsTrigger>
              <TabsTrigger value="exercises" className="text-xs gap-1.5"><Dumbbell className="w-3.5 h-3.5" />Ejercicios</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-9 pr-3 py-2 rounded-lg border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 w-48" />
              </div>
            </div>
          </div>

          {/* Methodologies */}
          <TabsContent value="methodologies">
            <div className="flex justify-end mb-4">
              <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowNewMethodology(true)}>
                <Plus className="w-3.5 h-3.5" />Nueva Metodología
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {methodologies.filter((m) => m.name.toLowerCase().includes(search.toLowerCase())).map((m, i) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="glass-card p-5 hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${m.color}20` }}>
                      <Target className="w-4 h-4" style={{ color: m.color }} />
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{m.category}</Badge>
                  </div>
                  <h3 className="font-semibold text-sm text-foreground mb-3 group-hover:text-primary transition-colors">{m.name}</h3>
                  <div className="flex gap-4 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{m.phases} fases</span>
                    <span className="flex items-center gap-1"><Dumbbell className="w-3 h-3" />{m.exercises} ejercicios</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Exercises */}
          <TabsContent value="exercises">
            <div className="flex justify-end mb-4">
              <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowNewExercise(true)}>
                <Plus className="w-3.5 h-3.5" />Nuevo Ejercicio
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {exercises.filter((e) => e.name.toLowerCase().includes(search.toLowerCase())).map((e, i) => (
                <motion.div key={e.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
                  className="glass-card p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="text-[10px]">{e.category}</Badge>
                    <span className={`text-[10px] font-semibold ${intensityColor(e.intensity)}`}>{e.intensity}</span>
                  </div>
                  <h4 className="font-semibold text-sm text-foreground mb-1">{e.name}</h4>
                  <p className="text-[11px] text-muted-foreground mb-3 line-clamp-2">{e.description}</p>
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{e.duration} min</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{e.players}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* New Methodology Dialog */}
      <Dialog open={showNewMethodology} onOpenChange={setShowNewMethodology}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Nueva Metodología</DialogTitle>
            <DialogDescription>Define la estructura de tu plan de entrenamiento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div><label className="text-xs font-medium text-foreground mb-1 block">Nombre</label><Input placeholder="Ej: Periodización Táctica Avanzada" /></div>
            <div><label className="text-xs font-medium text-foreground mb-1 block">Categoría</label>
              <select className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">
                <option>Técnica</option><option>Físico</option><option>Psicológico</option><option>Competencia (Táctico)</option>
              </select>
            </div>
            <div><label className="text-xs font-medium text-foreground mb-1 block">Descripción</label><Textarea placeholder="Objetivos y enfoque de la metodología..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-foreground mb-1 block">Fases</label><Input type="number" placeholder="4" /></div>
              <div><label className="text-xs font-medium text-foreground mb-1 block">Ejercicios estimados</label><Input type="number" placeholder="24" /></div>
            </div>
            <Button className="w-full gap-2" onClick={() => setShowNewMethodology(false)}><Plus className="w-4 h-4" />Crear Metodología</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Exercise Dialog */}
      <Dialog open={showNewExercise} onOpenChange={setShowNewExercise}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Dumbbell className="w-5 h-5 text-primary" />Nuevo Ejercicio</DialogTitle>
            <DialogDescription>Añade un ejercicio a tu biblioteca</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div><label className="text-xs font-medium text-foreground mb-1 block">Nombre</label><Input placeholder="Ej: Rondo 5v3 con transición" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-foreground mb-1 block">Categoría</label>
                <select className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">
                  <option>Técnica</option><option>Físico</option><option>Psicológico</option><option>Competencia (Táctico)</option>
                </select>
              </div>
              <div><label className="text-xs font-medium text-foreground mb-1 block">Intensidad</label>
                <select className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">
                  <option>Baja</option><option>Media</option><option>Alta</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-foreground mb-1 block">Duración (min)</label><Input type="number" placeholder="15" /></div>
              <div><label className="text-xs font-medium text-foreground mb-1 block">Jugadores</label><Input placeholder="6-8" /></div>
            </div>
            <div><label className="text-xs font-medium text-foreground mb-1 block">Descripción</label><Textarea placeholder="Describe el ejercicio..." rows={3} /></div>
            <Button className="w-full gap-2" onClick={() => setShowNewExercise(false)}><Plus className="w-4 h-4" />Crear Ejercicio</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Coaches;

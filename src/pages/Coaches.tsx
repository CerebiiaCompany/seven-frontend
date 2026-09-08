import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  UserCog, Plus, Search, BookOpen, RefreshCcw, Dumbbell,
  Clock, Users, ChevronRight, Target, Calendar, Layers,
  GraduationCap, Flame, Shield
} from "lucide-react";

// --- Mock Data ---
const coaches = [
  { id: 1, name: "Carlos Mendoza", specialty: "Técnica Individual", categories: ["Sub-15", "Sub-17"], methodologies: 3, cycles: 2, avatar: "CM" },
  { id: 2, name: "Laura Gutiérrez", specialty: "Preparación Física", categories: ["Sub-13", "Sub-15"], methodologies: 2, cycles: 1, avatar: "LG" },
  { id: 3, name: "Roberto Sánchez", specialty: "Táctica y Estrategia", categories: ["Sub-17"], methodologies: 4, cycles: 3, avatar: "RS" },
];

const methodologies = [
  { id: 1, name: "Periodización Táctica", coach: "Carlos Mendoza", phases: 4, exercises: 24, category: "Táctica", color: "hsl(var(--kpi-blue))" },
  { id: 2, name: "Desarrollo Técnico Progresivo", coach: "Carlos Mendoza", phases: 6, exercises: 36, category: "Técnica", color: "hsl(var(--primary))" },
  { id: 3, name: "Preparación Física Integrada", coach: "Laura Gutiérrez", phases: 3, exercises: 18, category: "Físico", color: "hsl(var(--kpi-amber))" },
  { id: 4, name: "Modelo de Juego Posicional", coach: "Roberto Sánchez", phases: 5, exercises: 30, category: "Táctica", color: "hsl(var(--kpi-blue))" },
  { id: 5, name: "Circuitos de Velocidad", coach: "Laura Gutiérrez", phases: 2, exercises: 12, category: "Físico", color: "hsl(var(--kpi-amber))" },
];

interface Cycle {
  id: number;
  name: string;
  methodology: string;
  startDate: string;
  endDate: string;
  status: string;
  progress: number;
  weeks: number;
  coach: string;
  category: string;
  objective: string;
  tasks: { name: string; owner: string; due: string; done: boolean }[];
  exercises: { name: string; focus: string; duration: number }[];
  matches: { rival: string; date: string; result: string; type: string }[];
  goals: { name: string; target: string; progress: number }[];
}

const cycles: Cycle[] = [
  {
    id: 1, name: "Pretemporada 2025", methodology: "Periodización Táctica", startDate: "Ene 2025", endDate: "Feb 2025",
    status: "active", progress: 65, weeks: 8, coach: "Carlos Mendoza", category: "Sub-15",
    objective: "Construir base física y asentar el modelo de juego para el inicio de liga.",
    tasks: [
      { name: "Test físicos iniciales", owner: "Laura Gutiérrez", due: "10 Ene", done: true },
      { name: "Definir modelo de juego", owner: "Carlos Mendoza", due: "15 Ene", done: true },
      { name: "Evaluación técnica individual", owner: "Carlos Mendoza", due: "05 Feb", done: false },
      { name: "Informe de cierre de ciclo", owner: "Carlos Mendoza", due: "28 Feb", done: false },
    ],
    exercises: [
      { name: "Rondo 4v2", focus: "Posesión", duration: 15 },
      { name: "Sprint + Recuperación", focus: "Físico", duration: 12 },
      { name: "Pressing Alto", focus: "Táctica", duration: 20 },
      { name: "Circuito de Pases", focus: "Técnica", duration: 20 },
    ],
    matches: [
      { rival: "Halcones FC", date: "20 Ene", result: "2-1", type: "Amistoso" },
      { rival: "Atlético Norte", date: "03 Feb", result: "1-1", type: "Amistoso" },
      { rival: "Academia Sur", date: "17 Feb", result: "Pendiente", type: "Amistoso" },
    ],
    goals: [
      { name: "Asistencia a entrenamientos", target: "≥ 90%", progress: 88 },
      { name: "Mejorar resistencia (Yo-Yo test)", target: "+10%", progress: 70 },
      { name: "Reducir pérdidas en salida", target: "-25%", progress: 45 },
    ],
  },
  {
    id: 2, name: "Fase Competitiva I", methodology: "Modelo de Juego Posicional", startDate: "Mar 2025", endDate: "Jun 2025",
    status: "active", progress: 30, weeks: 16, coach: "Roberto Sánchez", category: "Sub-17",
    objective: "Competir en liga manteniendo la identidad de juego posicional.",
    tasks: [
      { name: "Análisis de rivales", owner: "Roberto Sánchez", due: "Semanal", done: true },
      { name: "Rotación de convocatorias", owner: "Roberto Sánchez", due: "Mensual", done: false },
      { name: "Seguimiento de cargas", owner: "Laura Gutiérrez", due: "Semanal", done: false },
    ],
    exercises: [
      { name: "Juego Posicional 7v7", focus: "Táctica", duration: 25 },
      { name: "Control Orientado", focus: "Técnica", duration: 15 },
      { name: "Finalización en zona 3", focus: "Ataque", duration: 20 },
    ],
    matches: [
      { rival: "Deportivo Andes", date: "08 Mar", result: "3-0", type: "Liga" },
      { rival: "Club Real", date: "15 Mar", result: "0-2", type: "Liga" },
      { rival: "Unión FC", date: "22 Mar", result: "2-2", type: "Liga" },
    ],
    goals: [
      { name: "Posesión promedio", target: "≥ 55%", progress: 62 },
      { name: "Puntos en liga", target: "30 pts", progress: 33 },
      { name: "Minutos a canteranos", target: "1200 min", progress: 40 },
    ],
  },
  {
    id: 3, name: "Microciclo Técnico Abr", methodology: "Desarrollo Técnico Progresivo", startDate: "Abr 2025", endDate: "Abr 2025",
    status: "planned", progress: 0, weeks: 4, coach: "Carlos Mendoza", category: "Sub-13",
    objective: "Refinar el primer toque y la conducción bajo presión.",
    tasks: [
      { name: "Diseñar sesiones semanales", owner: "Carlos Mendoza", due: "01 Abr", done: false },
      { name: "Grabar video de referencia", owner: "Staff", due: "05 Abr", done: false },
    ],
    exercises: [
      { name: "Conducción en Slalom", focus: "Técnica", duration: 10 },
      { name: "Control Orientado", focus: "Técnica", duration: 15 },
    ],
    matches: [{ rival: "Escuela Este", date: "26 Abr", result: "Pendiente", type: "Amistoso" }],
    goals: [{ name: "Precisión de pase", target: "≥ 80%", progress: 0 }],
  },
  {
    id: 4, name: "Camp de Verano 2024", methodology: "Preparación Física Integrada", startDate: "Jul 2024", endDate: "Ago 2024",
    status: "completed", progress: 100, weeks: 6, coach: "Laura Gutiérrez", category: "Todas",
    objective: "Mantenimiento físico y socialización entre categorías.",
    tasks: [
      { name: "Logística del campamento", owner: "Administración", due: "01 Jul", done: true },
      { name: "Informe final a familias", owner: "Laura Gutiérrez", due: "30 Ago", done: true },
    ],
    exercises: [
      { name: "Fuerza Funcional", focus: "Físico", duration: 30 },
      { name: "Circuitos de Velocidad", focus: "Físico", duration: 20 },
    ],
    matches: [{ rival: "Interno (mixto)", date: "20 Ago", result: "4-3", type: "Interno" }],
    goals: [{ name: "Participación", target: "60 deportistas", progress: 100 }],
  },
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

const statusBadge = (s: string) => {
  if (s === "active") return <Badge className="bg-primary/15 text-primary border-0 text-[10px]">Activo</Badge>;
  if (s === "completed") return <Badge className="bg-muted text-muted-foreground border-0 text-[10px]">Completado</Badge>;
  return <Badge className="bg-[hsl(var(--kpi-blue))]/15 text-[hsl(var(--kpi-blue))] border-0 text-[10px]">Planificado</Badge>;
};

const Coaches = () => {
  const [search, setSearch] = useState("");
  const [showNewMethodology, setShowNewMethodology] = useState(false);
  const [showNewExercise, setShowNewExercise] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(null);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Entrenadores</h1>
            <p className="text-sm text-muted-foreground mt-1">Metodologías, ciclos formativos y ejercicios</p>
          </div>
        </motion.div>

        {/* Coach cards */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {coaches.map((c) => (
            <div key={c.id} className="glass-card p-5 flex items-start gap-4">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground flex-shrink-0" style={{ background: "hsl(var(--primary))" }}>
                {c.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.specialty}</p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {c.categories.map((cat) => (
                    <Badge key={cat} variant="secondary" className="text-[10px]">{cat}</Badge>
                  ))}
                </div>
                <div className="flex gap-4 mt-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{c.methodologies} metodologías</span>
                  <span className="flex items-center gap-1"><RefreshCcw className="w-3 h-3" />{c.cycles} ciclos</span>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="methodologies" className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <TabsList className="bg-muted/60">
              <TabsTrigger value="methodologies" className="text-xs gap-1.5"><BookOpen className="w-3.5 h-3.5" />Metodologías</TabsTrigger>
              <TabsTrigger value="cycles" className="text-xs gap-1.5"><RefreshCcw className="w-3.5 h-3.5" />Ciclos Formativos</TabsTrigger>
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
                  <h3 className="font-semibold text-sm text-foreground mb-1 group-hover:text-primary transition-colors">{m.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{m.coach}</p>
                  <div className="flex gap-4 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{m.phases} fases</span>
                    <span className="flex items-center gap-1"><Dumbbell className="w-3 h-3" />{m.exercises} ejercicios</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Cycles */}
          <TabsContent value="cycles">
            <div className="space-y-3">
              {cycles.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())).map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedCycle(c)}
                  className="glass-card p-5 flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer hover:border-primary/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm text-foreground">{c.name}</h3>
                      {statusBadge(c.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">{c.methodology}</p>
                    <div className="flex gap-4 mt-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{c.startDate} – {c.endDate}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{c.weeks} semanas</span>
                    </div>
                  </div>
                  <div className="w-full sm:w-40 flex-shrink-0">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                      <span>Progreso</span>
                      <span className="font-semibold text-foreground">{c.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${c.progress}%` }} transition={{ duration: 0.8, delay: i * 0.1 }}
                        className="h-full rounded-full" style={{ background: "hsl(var(--primary))" }} />
                    </div>
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

      {/* Cycle Detail Dialog */}
      <Dialog open={!!selectedCycle} onOpenChange={(o) => !o && setSelectedCycle(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedCycle && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />{selectedCycle.name}
                </DialogTitle>
                <DialogDescription>{selectedCycle.methodology} · {selectedCycle.category} · {selectedCycle.coach}</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                {[
                  { label: "Duración", value: `${selectedCycle.weeks} sem` },
                  { label: "Inicio", value: selectedCycle.startDate },
                  { label: "Fin", value: selectedCycle.endDate },
                  { label: "Progreso", value: `${selectedCycle.progress}%` },
                ].map((s) => (
                  <div key={s.label} className="p-3 rounded-lg border">
                    <p className="text-[10px] uppercase text-muted-foreground">{s.label}</p>
                    <p className="text-sm font-semibold mt-1">{s.value}</p>
                  </div>
                ))}
              </div>

              <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/40">{selectedCycle.objective}</p>

              <Tabs defaultValue="tasks" className="space-y-3">
                <TabsList>
                  <TabsTrigger value="tasks">Tareas</TabsTrigger>
                  <TabsTrigger value="exercises">Ejercicios</TabsTrigger>
                  <TabsTrigger value="matches">Partidos</TabsTrigger>
                  <TabsTrigger value="goals">Metas</TabsTrigger>
                </TabsList>

                <TabsContent value="tasks" className="space-y-2">
                  {selectedCycle.tasks.map((t) => (
                    <div key={t.name} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.owner} · {t.due}</p>
                      </div>
                      <Badge variant={t.done ? "outline" : "secondary"} className="flex-shrink-0">{t.done ? "Hecha" : "Pendiente"}</Badge>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="exercises" className="space-y-2">
                  {selectedCycle.exercises.map((e) => (
                    <div key={e.name} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Dumbbell className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{e.name}</p>
                          <p className="text-xs text-muted-foreground">{e.focus}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0"><Clock className="w-3 h-3" />{e.duration} min</span>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="matches" className="space-y-2">
                  {selectedCycle.matches.map((m) => (
                    <div key={m.rival + m.date} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">vs. {m.rival}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{m.date} · {m.type}</p>
                      </div>
                      <Badge variant="outline" className="flex-shrink-0">{m.result}</Badge>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="goals" className="space-y-3">
                  {selectedCycle.goals.map((g) => (
                    <div key={g.name} className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium flex items-center gap-2"><Target className="w-3.5 h-3.5 text-primary" />{g.name}</span>
                        <span className="text-xs text-muted-foreground">{g.target}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden mt-2">
                        <div className="h-full rounded-full" style={{ width: `${g.progress}%`, background: "hsl(var(--primary))" }} />
                      </div>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

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
                <option>Táctica</option><option>Técnica</option><option>Físico</option><option>Mental</option>
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
                  <option>Táctica</option><option>Técnica</option><option>Físico</option><option>Mental</option>
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

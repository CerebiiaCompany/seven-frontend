import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
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
  GraduationCap, Flame, Shield, UserPlus
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { UserAvatar } from "@/components/UserAvatar";
import { ApiExercise, EXERCISE_CATEGORIES, INTENSITIES, categoryLabel, intensityLabel, intensityColor } from "@/lib/exercises";

interface ApiCoach {
  id: string;
  full_name: string;
  email: string;
  photo: string | null;
  categories: string[];
}

interface MethodologyCoachInfo {
  id: string;
  full_name: string;
  email: string;
  photo: string | null;
}

// --- Mock Data (metodologías: aún no hay módulo real en el backend; los ejercicios sí se persisten en /api/v1/exercises/) ---

const methodologies = [
  { id: 1, name: "Técnica", phases: 6, category: "tecnica", color: "hsl(var(--primary))", description: "Fundamentos y gesto técnico" },
  { id: 2, name: "Físico", phases: 3, category: "fisico", color: "hsl(var(--kpi-amber))", description: "Fuerza · Velocidad · Resistencia" },
  { id: 3, name: "Psicológico", phases: 3, category: "psicologico", color: "hsl(var(--kpi-green))", description: "Mentalidad, foco y emociones" },
  { id: 4, name: "Competencia (Táctico)", phases: 4, category: "competencia_tactico", color: "hsl(var(--kpi-blue))", description: "Modelo de juego y competencia" },
];

const emptyExerciseForm = {
  name: "",
  category: EXERCISE_CATEGORIES[0].value,
  intensity: INTENSITIES[0].value,
  duration_minutes: "",
  players: "",
  description: "",
};

const Coaches = () => {
  const navigate = useNavigate();
  const [coaches, setCoaches] = useState<ApiCoach[]>([]);
  const [exercises, setExercises] = useState<ApiExercise[]>([]);
  const [search, setSearch] = useState("");
  const [showNewMethodology, setShowNewMethodology] = useState(false);
  const [showNewExercise, setShowNewExercise] = useState(false);
  const [exerciseForm, setExerciseForm] = useState(emptyExerciseForm);
  const [savingExercise, setSavingExercise] = useState(false);
  const [activeTab, setActiveTab] = useState("methodologies");
  // Entrenadores a cargo de cada metodología, por categoría (`/api/v1/methodology-coaches/`).
  const [methodologyCoaches, setMethodologyCoaches] = useState<Record<string, MethodologyCoachInfo[]>>({});
  const [assignDialogFor, setAssignDialogFor] = useState<string | null>(null);
  const [selectedCoachIds, setSelectedCoachIds] = useState<string[]>([]);
  const [savingAssignment, setSavingAssignment] = useState(false);

  const loadExercises = useCallback(() => {
    return api
      .get<ApiExercise[]>("/exercises/")
      .then(({ data }) => setExercises(data))
      .catch(() => { /* deja la lista vacía si falla */ });
  }, []);

  const loadMethodologyCoaches = useCallback(() => {
    return api
      .get<Record<string, MethodologyCoachInfo[]>>("/methodology-coaches/")
      .then(({ data }) => setMethodologyCoaches(data))
      .catch(() => { /* deja la lista vacía si falla */ });
  }, []);

  useEffect(() => {
    api
      .get<ApiCoach[]>("/coaches/")
      .then(({ data }) => setCoaches(data))
      .catch(() => { /* deja la lista vacía si falla */ });
    loadExercises();
    loadMethodologyCoaches();
  }, [loadExercises, loadMethodologyCoaches]);

  const openAssignDialog = (category: string) => {
    setAssignDialogFor(category);
    setSelectedCoachIds((methodologyCoaches[category] ?? []).map((c) => c.id));
  };

  const toggleSelectedCoach = (coachId: string) => {
    setSelectedCoachIds((prev) =>
      prev.includes(coachId) ? prev.filter((id) => id !== coachId) : [...prev, coachId]
    );
  };

  const saveMethodologyCoaches = async () => {
    if (!assignDialogFor) return;
    setSavingAssignment(true);
    try {
      const { data } = await api.put<{ methodology: string; coaches: MethodologyCoachInfo[] }>(
        `/methodology-coaches/${assignDialogFor}/`,
        { coach_ids: selectedCoachIds }
      );
      setMethodologyCoaches((prev) => ({ ...prev, [data.methodology]: data.coaches }));
      setAssignDialogFor(null);
      toast({ title: "Entrenadores actualizados" });
    } catch {
      toast({ title: "No se pudieron guardar los entrenadores", variant: "destructive" });
    } finally {
      setSavingAssignment(false);
    }
  };

  const createExercise = async () => {
    if (!exerciseForm.name.trim() || !exerciseForm.players.trim() || !exerciseForm.duration_minutes) {
      toast({ title: "Completa nombre, duración y jugadores", variant: "destructive" });
      return;
    }
    setSavingExercise(true);
    try {
      await api.post("/exercises/", {
        name: exerciseForm.name.trim(),
        category: exerciseForm.category,
        intensity: exerciseForm.intensity,
        duration_minutes: Number(exerciseForm.duration_minutes),
        players: exerciseForm.players.trim(),
        description: exerciseForm.description.trim(),
      });
      await loadExercises();
      setShowNewExercise(false);
      setExerciseForm(emptyExerciseForm);
      toast({ title: "Ejercicio creado" });
    } catch (error) {
      const detail = isAxiosError(error)
        ? Object.values(error.response?.data?.error?.details ?? {})[0]?.[0]
        : null;
      toast({ title: typeof detail === "string" ? detail : "No se pudo crear el ejercicio", variant: "destructive" });
    } finally {
      setSavingExercise(false);
    }
  };

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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
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
              {methodologies.filter((m) => m.name.toLowerCase().includes(search.toLowerCase())).map((m, i) => {
                const assigned = methodologyCoaches[m.category] ?? [];
                return (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    onClick={() => navigate(`/coaches/methodologies/${m.category}`)}
                    className="glass-card p-5 h-full flex flex-col hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="flex items-start justify-between mb-3">
                      <Target className="w-5 h-5" style={{ color: m.color }} />
                      <span className="text-xs font-medium text-muted-foreground">{categoryLabel(m.category)}</span>
                    </div>
                    <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors">{m.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">{m.description}</p>
                    <div className="flex gap-4 text-[11px] text-muted-foreground mb-4">
                      <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{m.phases} fases</span>
                      <span className="flex items-center gap-1"><Dumbbell className="w-3 h-3" />{exercises.filter((e) => e.category === m.category).length} ejercicios</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 pt-3 mt-auto border-t border-border">
                      {assigned.length > 0 ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex -space-x-2 flex-shrink-0">
                            {assigned.slice(0, 3).map((c) => (
                              <UserAvatar
                                key={c.id}
                                photoUrl={c.photo}
                                name={c.full_name}
                                className="w-6 h-6 rounded-full text-[9px] text-primary-foreground ring-2 ring-card"
                                style={{ background: "hsl(var(--primary))" }}
                              />
                            ))}
                            {assigned.length > 3 && (
                              <div className="w-6 h-6 rounded-full bg-muted text-[9px] text-muted-foreground flex items-center justify-center ring-2 ring-card">
                                +{assigned.length - 3}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-foreground truncate">
                            {assigned.map((c) => c.full_name.split(" ")[0]).join(", ")}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin entrenador asignado</span>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1.5 text-xs flex-shrink-0"
                        onClick={(e) => { e.stopPropagation(); openAssignDialog(m.category); }}
                      >
                        <UserPlus className="w-3.5 h-3.5" />{assigned.length > 0 ? "Editar" : "Asignar"}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
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
              {exercises.length === 0 && (
                <p className="text-sm text-muted-foreground md:col-span-4">Todavía no hay ejercicios registrados.</p>
              )}
              {exercises
                .filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
                .map((e, i) => (
                <motion.div key={e.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
                  className="glass-card p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="text-[10px]">{categoryLabel(e.category)}</Badge>
                    <span className={`text-[10px] font-semibold ${intensityColor(e.intensity)}`}>{intensityLabel(e.intensity)}</span>
                  </div>
                  <h4 className="font-semibold text-sm text-foreground mb-1">{e.name}</h4>
                  <p className="text-[11px] text-muted-foreground mb-3 line-clamp-2">{e.description}</p>
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{e.duration_minutes} min</span>
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
      <Dialog open={showNewExercise} onOpenChange={(open) => { setShowNewExercise(open); if (!open) setExerciseForm(emptyExerciseForm); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Dumbbell className="w-5 h-5 text-primary" />Nuevo Ejercicio</DialogTitle>
            <DialogDescription>Añade un ejercicio a tu biblioteca</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Nombre</label>
              <Input
                placeholder="Ej: Rondo 5v3 con transición"
                value={exerciseForm.name}
                onChange={(e) => setExerciseForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Categoría</label>
                <select
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                  value={exerciseForm.category}
                  onChange={(e) => setExerciseForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {EXERCISE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Intensidad</label>
                <select
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                  value={exerciseForm.intensity}
                  onChange={(e) => setExerciseForm((f) => ({ ...f, intensity: e.target.value }))}
                >
                  {INTENSITIES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Duración (min)</label>
                <Input
                  type="number"
                  placeholder="15"
                  value={exerciseForm.duration_minutes}
                  onChange={(e) => setExerciseForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Jugadores</label>
                <Input
                  placeholder="6-8"
                  value={exerciseForm.players}
                  onChange={(e) => setExerciseForm((f) => ({ ...f, players: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Descripción</label>
              <Textarea
                placeholder="Describe el ejercicio..."
                rows={3}
                value={exerciseForm.description}
                onChange={(e) => setExerciseForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <Button className="w-full gap-2" disabled={savingExercise} onClick={createExercise}>
              <Plus className="w-4 h-4" />{savingExercise ? "Creando..." : "Crear Ejercicio"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Coaches to Methodology Dialog */}
      <Dialog open={assignDialogFor !== null} onOpenChange={(open) => !open && setAssignDialogFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" />Asignar entrenadores</DialogTitle>
            <DialogDescription>Elige quiénes estarán a cargo de esta metodología (puedes elegir varios)</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 pt-2">
            {coaches.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No hay entrenadores registrados todavía.</p>
            ) : (
              coaches.map((c) => {
                const checked = selectedCoachIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleSelectedCoach(c.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-colors text-left ${
                      checked ? "border-primary/40 bg-primary/10" : "border-border hover:bg-accent/10"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center ${
                        checked ? "bg-primary border-primary" : "border-border"
                      }`}
                    >
                      {checked && <div className="w-2 h-2 rounded-sm bg-primary-foreground" />}
                    </div>
                    <UserAvatar
                      photoUrl={c.photo}
                      name={c.full_name}
                      className="w-8 h-8 rounded-full text-xs text-primary-foreground flex-shrink-0"
                      style={{ background: "hsl(var(--primary))" }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{c.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                    </div>
                  </button>
                );
              })
            )}
            {coaches.length > 0 && (
              <Button className="w-full gap-2 mt-2" disabled={savingAssignment} onClick={saveMethodologyCoaches}>
                {savingAssignment ? "Guardando..." : "Guardar"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Coaches;

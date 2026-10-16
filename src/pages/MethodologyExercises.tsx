import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ClipboardCheck, Clock, Pencil, Users, Activity, Zap, Heart, Save } from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import api from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { UserAvatar } from "@/components/UserAvatar";
import { ApiExercise, categoryColor, categoryLabel, intensityLabel, intensityColor } from "@/lib/exercises";

interface NamedRef {
  id: string;
  name: string;
}

interface CategoryOption {
  id: string;
  name: string;
  groups: NamedRef[];
}

interface RosterPlayer {
  id: string;
  full_name: string;
  photo: string | null;
}

// --- Evaluación física (baremo): solo para la metodología "fisico" ---

interface PhysicalTestMetricData {
  exercise_id: string;
  name: string;
  unit: string;
  weight: number;
  higher_is_better: boolean;
  value: number | null;
  t_score: number | null;
  percentage: number | null;
}

interface PhysicalTestGroupData {
  name: string;
  weight: number;
  score: number;
  metrics: PhysicalTestMetricData[];
}

interface PhysicalTestEvaluation {
  player: { id: string; full_name: string };
  groups: PhysicalTestGroupData[];
  overall: { percentage: number; level: "bajo" | "medio" | "alto" };
  radar: { group: string; value: number }[];
}

const GROUP_ICONS: Record<string, typeof Activity> = {
  Fuerza: Activity,
  Velocidad: Zap,
  Resistencia: Heart,
};

const LEVEL_LABEL: Record<string, string> = { bajo: "Bajo", medio: "Medio", alto: "Alto" };
const LEVEL_BADGE: Record<string, string> = {
  bajo: "text-destructive bg-destructive/15",
  medio: "text-[hsl(var(--kpi-amber))] bg-[hsl(var(--kpi-amber))]/15",
  alto: "text-primary bg-primary/15",
};

const PhysicalTestPanel = ({
  methodology, roster, rosterLoading,
}: {
  methodology: string;
  roster: RosterPlayer[];
  rosterLoading: boolean;
}) => {
  const [playerId, setPlayerId] = useState("");
  const [evaluation, setEvaluation] = useState<PhysicalTestEvaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!playerId && roster.length > 0) setPlayerId(roster[0].id);
  }, [roster, playerId]);

  const applyEvaluation = (data: PhysicalTestEvaluation) => {
    setEvaluation(data);
    const next: Record<string, string> = {};
    data.groups.forEach((g) => g.metrics.forEach((m) => {
      next[m.exercise_id] = m.value !== null ? String(m.value) : "";
    }));
    setValues(next);
  };

  const loadEvaluation = useCallback(async () => {
    if (!playerId) return;
    setLoading(true);
    try {
      const { data } = await api.get<PhysicalTestEvaluation>(`/physical-tests/${playerId}/`, {
        params: { methodology },
      });
      applyEvaluation(data);
    } catch {
      toast({ title: "No se pudo cargar la evaluación", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [playerId, methodology]);

  useEffect(() => { loadEvaluation(); }, [loadEvaluation]);

  const saveEvaluation = async () => {
    if (!playerId || !evaluation) return;
    setSaving(true);
    try {
      const entries = evaluation.groups.flatMap((g) => g.metrics.map((m) => ({
        exercise_id: m.exercise_id,
        value: values[m.exercise_id] ? Number(values[m.exercise_id]) : null,
      })));
      const { data } = await api.put<PhysicalTestEvaluation>(`/physical-tests/${playerId}/`, {
        methodology, entries,
      });
      applyEvaluation(data);
      toast({ title: "Evaluación guardada" });
    } catch {
      toast({ title: "No se pudo guardar la evaluación", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const radarData = evaluation?.radar.map((r) => ({ attr: r.group, value: r.value })) ?? [];

  return (
    <div className="space-y-5">
      <div className="glass-card p-5">
        <Label>Deportista</Label>
        {rosterLoading ? (
          <p className="text-sm text-muted-foreground mt-1.5">Cargando deportistas...</p>
        ) : roster.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-1.5">No hay deportistas confirmados en esa categoría/grupo.</p>
        ) : (
          <Select value={playerId} onValueChange={setPlayerId}>
            <SelectTrigger className="mt-1.5 w-full sm:max-w-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {roster.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading || !evaluation ? (
        <p className="text-sm text-muted-foreground">Cargando evaluación...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            {evaluation.groups.map((g) => {
              const Icon = GROUP_ICONS[g.name] ?? Activity;
              return (
                <div key={g.name} className="glass-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Icon className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-sm text-foreground">{g.name}</h3>
                    <span className="text-[11px] text-muted-foreground">Ponderación {g.weight}%</span>
                  </div>
                  <div className="space-y-3">
                    {g.metrics.map((m) => (
                      <div key={m.exercise_id} className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                        <div className="min-w-0">
                          <p className="text-sm text-foreground">{m.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Peso {m.weight}% · {m.higher_is_better ? "mayor es mejor" : "menor es mejor"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.01"
                              className="w-24 pr-8 text-right"
                              value={values[m.exercise_id] ?? ""}
                              onChange={(e) => setValues((v) => ({ ...v, [m.exercise_id]: e.target.value }))}
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground pointer-events-none">
                              {m.unit}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground w-14 text-right flex-shrink-0">
                            {m.t_score !== null ? `T ${m.t_score}` : "T —"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="glass-card p-5 h-fit lg:sticky lg:top-5">
            <p className="text-xs text-muted-foreground mb-2">Resultado general</p>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-3xl font-bold text-foreground">{evaluation.overall.percentage}%</span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${LEVEL_BADGE[evaluation.overall.level]}`}>
                {LEVEL_LABEL[evaluation.overall.level]}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-4">0–50% Bajo · 51–80% Medio · 81–100% Alto</p>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="attr" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
            <Button className="w-full gap-2 mt-2" disabled={saving} onClick={saveEvaluation}>
              <Save className="w-4 h-4" />{saving ? "Guardando..." : "Guardar evaluación"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const MethodologyExercises = () => {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();

  // Paso 1: elegir categoría/grupo antes de ver la pantalla de ejercicios.
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryId, setCategoryId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId]
  );
  const selectedGroup = useMemo(
    () => selectedCategory?.groups.find((g) => g.id === groupId) ?? null,
    [selectedCategory, groupId]
  );

  useEffect(() => {
    api
      .get<CategoryOption[]>("/categories/")
      .then(({ data }) => setCategories(data))
      .catch(() => toast({ title: "No se pudieron cargar las categorías", variant: "destructive" }))
      .finally(() => setCategoriesLoading(false));
  }, []);

  // Paso 2: ejercicios de esta metodología, solo tras confirmar categoría/grupo.
  const [exercises, setExercises] = useState<ApiExercise[]>([]);
  const [exercisesLoading, setExercisesLoading] = useState(false);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  const loadScreen = useCallback(async () => {
    if (!selectedCategory) return;
    setExercisesLoading(true);
    setRosterLoading(true);
    try {
      const [exercisesRes, rosterRes] = await Promise.all([
        api.get<ApiExercise[]>("/exercises/", { params: { category } }),
        api.get<{ results: RosterPlayer[] }>("/players/", {
          params: { status: "confirmed", category: selectedCategory.name, group: groupId || undefined },
        }),
      ]);
      setExercises(exercisesRes.data);
      setRoster(rosterRes.data.results);
    } catch {
      toast({ title: "No se pudo cargar la pantalla", variant: "destructive" });
    } finally {
      setExercisesLoading(false);
      setRosterLoading(false);
    }
  }, [category, selectedCategory, groupId]);

  const confirmSelection = () => {
    if (!selectedCategory) {
      toast({ title: "Selecciona una categoría", variant: "destructive" });
      return;
    }
    if (selectedCategory.groups.length > 0 && !groupId) {
      toast({ title: "Selecciona un grupo", variant: "destructive" });
      return;
    }
    setConfirmed(true);
    loadScreen();
  };

  // Paso 3: calificar — ya con categoría/grupo fijos, solo falta la nota de cada jugador.
  const [rating, setRating] = useState<ApiExercise | null>(null);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<Record<string, { t_score: number; percentage: number }>>({});
  const [norms, setNorms] = useState<{ mean: number; sd: number; count: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const openRating = async (exercise: ApiExercise) => {
    setRating(exercise);
    setScores({});
    setStats({});
    setNorms(null);
    setScoresLoading(true);
    try {
      const { data } = await api.get<{
        norms: { mean: number; sd: number; count: number } | null;
        players: Record<string, { score: number; t_score?: number; percentage?: number }>;
      }>(`/exercises/${exercise.id}/scores/`, {
        params: { category_id: categoryId, group_id: groupId || undefined },
      });
      const prefilled: Record<string, string> = {};
      const prefilledStats: Record<string, { t_score: number; percentage: number }> = {};
      Object.entries(data.players).forEach(([playerId, entry]) => {
        prefilled[playerId] = String(entry.score);
        if (entry.t_score !== undefined && entry.percentage !== undefined) {
          prefilledStats[playerId] = { t_score: entry.t_score, percentage: entry.percentage };
        }
      });
      setScores(prefilled);
      setStats(prefilledStats);
      setNorms(data.norms);
    } catch {
      toast({ title: "No se pudieron cargar las calificaciones existentes", variant: "destructive" });
    } finally {
      setScoresLoading(false);
    }
  };

  const saveRatings = async () => {
    if (!rating) return;
    const entries = Object.entries(scores)
      .filter(([, value]) => value !== "")
      .map(([playerId, value]) => ({ player_id: playerId, score: Number(value) }));
    if (entries.length === 0) {
      toast({ title: "Ingresa al menos una calificación", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await api.post(`/exercises/${rating.id}/rate/`, {
        category_id: categoryId,
        group_id: groupId || null,
        entries,
      });
      toast({ title: "Calificaciones guardadas" });
      setRating(null);
    } catch (error) {
      const detail = isAxiosError(error)
        ? Object.values(error.response?.data?.error?.details ?? {})[0]?.[0]
        : null;
      toast({ title: typeof detail === "string" ? detail : "No se pudieron guardar las calificaciones", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const changeSelection = () => {
    setConfirmed(false);
    setExercises([]);
    setRoster([]);
  };

  if (!confirmed) {
    const color = categoryColor(category ?? "");
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-lg mx-auto w-full">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs mb-6 -ml-2" onClick={() => navigate("/coaches")}>
            <ArrowLeft className="w-3.5 h-3.5" />Volver a Entrenadores
          </Button>

          <div className="glass-card p-6 sm:p-8">
            <div className="flex flex-col items-center text-center mb-6">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: `${color}1a` }}
              >
                <ClipboardCheck className="w-7 h-7" style={{ color }} />
              </div>
              <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">{categoryLabel(category ?? "")}</h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                Selecciona la categoría y el grupo para ver sus ejercicios y calificarlos
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Categoría</Label>
                <Select
                  value={categoryId}
                  onValueChange={(v) => { setCategoryId(v); setGroupId(""); }}
                  disabled={categoriesLoading || categories.length === 0}
                >
                  <SelectTrigger className="mt-1.5 w-full">
                    <SelectValue placeholder={categoriesLoading ? "Cargando categorías..." : "Selecciona una categoría"} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Grupo</Label>
                {!selectedCategory ? (
                  <Select disabled value="">
                    <SelectTrigger className="mt-1.5 w-full"><SelectValue placeholder="Selecciona primero una categoría" /></SelectTrigger>
                    <SelectContent />
                  </Select>
                ) : selectedCategory.groups.length === 0 ? (
                  <p className="text-xs text-muted-foreground mt-1.5">Esta categoría no tiene grupos creados.</p>
                ) : (
                  <Select value={groupId} onValueChange={setGroupId}>
                    <SelectTrigger className="mt-1.5 w-full"><SelectValue placeholder="Selecciona un grupo" /></SelectTrigger>
                    <SelectContent>
                      {selectedCategory.groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Button className="w-full gap-2" onClick={confirmSelection}>Continuar</Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => navigate("/coaches")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground truncate">{categoryLabel(category ?? "")}</h1>
          </div>
          <div className="flex items-center gap-2 sm:flex-shrink-0">
            <Badge variant="secondary" className="text-xs font-normal">
              {selectedCategory?.name}{selectedGroup ? ` ${selectedGroup.name}` : ""}
            </Badge>
            <button onClick={changeSelection} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <Pencil className="w-3 h-3" />Cambiar
            </button>
          </div>
        </div>

        {category === "fisico" ? (
          <PhysicalTestPanel methodology={category} roster={roster} rosterLoading={rosterLoading} />
        ) : exercisesLoading ? (
          <p className="text-sm text-muted-foreground">Cargando ejercicios...</p>
        ) : exercises.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay ejercicios en esta metodología.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {exercises.map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-semibold text-sm text-foreground truncate">{e.name}</h4>
                    <span className={`text-[10px] font-semibold flex-shrink-0 ${intensityColor(e.intensity)}`}>{intensityLabel(e.intensity)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-2 line-clamp-2">{e.description}</p>
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{e.duration_minutes} min</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{e.players}</span>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs flex-shrink-0 w-full sm:w-auto" onClick={() => openRating(e)}>
                  <ClipboardCheck className="w-3.5 h-3.5" />Calificar
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!rating} onOpenChange={(open) => !open && setRating(null)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Calificar: {rating?.name}</DialogTitle>
            <DialogDescription>
              {selectedCategory?.name}{selectedGroup ? ` ${selectedGroup.name}` : ""} — ya tienen nota se muestra precargada con su T-score.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-1">
            {rosterLoading || scoresLoading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Cargando jugadores...</p>
            ) : roster.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No hay deportistas confirmados en esa categoría/grupo.</p>
            ) : (
              <>
                {norms ? (
                  <p className="text-[11px] text-muted-foreground px-0.5">
                    Promedio de la categoría: {norms.mean} (± {norms.sd}, n={norms.count})
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground px-0.5">
                    El T-score aparece cuando la categoría tenga al menos 2 calificaciones en este ejercicio.
                  </p>
                )}
                {roster.map((p) => {
                  const stat = stats[p.id];
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border">
                      <div className="flex items-center gap-2 min-w-0">
                        <UserAvatar
                          photoUrl={p.photo}
                          name={p.full_name}
                          className="w-8 h-8 rounded-full text-xs text-primary-foreground flex-shrink-0"
                          style={{ background: "hsl(var(--primary))" }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm truncate">{p.full_name}</p>
                          {stat && (
                            <p className="text-[10px] text-muted-foreground">
                              T-score {stat.t_score} · {stat.percentage}%
                            </p>
                          )}
                        </div>
                      </div>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        className="w-16 text-center flex-shrink-0"
                        placeholder="1-10"
                        value={scores[p.id] ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setScores((s) => ({ ...s, [p.id]: value }));
                          setStats((s) => { const next = { ...s }; delete next[p.id]; return next; });
                        }}
                      />
                    </div>
                  );
                })}
                <Button className="w-full gap-2 mt-2" disabled={saving} onClick={saveRatings}>
                  {saving ? "Guardando..." : "Guardar calificaciones"}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default MethodologyExercises;

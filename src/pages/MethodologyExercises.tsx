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
import { ArrowLeft, ClipboardCheck, Clock, Pencil, Users } from "lucide-react";
import api from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { UserAvatar } from "@/components/UserAvatar";
import { ApiExercise, categoryLabel, intensityLabel, intensityColor } from "@/lib/exercises";

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
  const [saving, setSaving] = useState(false);

  const openRating = async (exercise: ApiExercise) => {
    setRating(exercise);
    setScores({});
    setScoresLoading(true);
    try {
      const { data } = await api.get<Record<string, number>>(`/exercises/${exercise.id}/scores/`, {
        params: { category_id: categoryId, group_id: groupId || undefined },
      });
      const prefilled: Record<string, string> = {};
      Object.entries(data).forEach(([playerId, score]) => { prefilled[playerId] = String(score); });
      setScores(prefilled);
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
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate("/coaches")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">{categoryLabel(category ?? "")}</h1>
              <p className="text-sm text-muted-foreground mt-1">Selecciona la categoría y el grupo a trabajar</p>
            </div>
          </div>

          <div className="glass-card p-5 space-y-4">
            <div>
              <Label>Categoría</Label>
              <Select
                value={categoryId}
                onValueChange={(v) => { setCategoryId(v); setGroupId(""); }}
                disabled={categoriesLoading || categories.length === 0}
              >
                <SelectTrigger>
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
                  <SelectTrigger><SelectValue placeholder="Selecciona primero una categoría" /></SelectTrigger>
                  <SelectContent />
                </Select>
              ) : selectedCategory.groups.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-1.5">Esta categoría no tiene grupos creados.</p>
              ) : (
                <Select value={groupId} onValueChange={setGroupId}>
                  <SelectTrigger><SelectValue placeholder="Selecciona un grupo" /></SelectTrigger>
                  <SelectContent>
                    {selectedCategory.groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Button className="w-full" onClick={confirmSelection}>Continuar</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/coaches")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{categoryLabel(category ?? "")}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-6 ml-11">
          <Badge variant="secondary" className="text-xs font-normal">
            {selectedCategory?.name}{selectedGroup ? ` ${selectedGroup.name}` : ""}
          </Badge>
          <button onClick={changeSelection} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <Pencil className="w-3 h-3" />Cambiar
          </button>
        </div>

        {exercisesLoading ? (
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
                className="glass-card p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm text-foreground truncate">{e.name}</h4>
                    <span className={`text-[10px] font-semibold flex-shrink-0 ${intensityColor(e.intensity)}`}>{intensityLabel(e.intensity)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-2 line-clamp-2">{e.description}</p>
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{e.duration_minutes} min</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{e.players}</span>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs flex-shrink-0" onClick={() => openRating(e)}>
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
              {selectedCategory?.name}{selectedGroup ? ` ${selectedGroup.name}` : ""} — ya tienen nota se muestra precargada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-1">
            {rosterLoading || scoresLoading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Cargando jugadores...</p>
            ) : roster.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No hay deportistas confirmados en esa categoría/grupo.</p>
            ) : (
              <>
                {roster.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserAvatar
                        photoUrl={p.photo}
                        name={p.full_name}
                        className="w-8 h-8 rounded-full text-xs text-primary-foreground flex-shrink-0"
                        style={{ background: "hsl(var(--primary))" }}
                      />
                      <span className="text-sm truncate">{p.full_name}</span>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      className="w-16 text-center flex-shrink-0"
                      placeholder="1-10"
                      value={scores[p.id] ?? ""}
                      onChange={(e) => setScores((s) => ({ ...s, [p.id]: e.target.value }))}
                    />
                  </div>
                ))}
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

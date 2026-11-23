import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { isAxiosError } from "axios";
import {
  addMonths, format, getDate, getDay, getDaysInMonth, isSameMonth, parseISO, startOfMonth,
} from "date-fns";
import { es } from "date-fns/locale";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft, ChevronRight, Plus, MapPin, Clock, Users,
  Trophy, Dumbbell, ClipboardCheck, Pencil, Trash2, CalendarDays, Cake,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface EventItem {
  id: string;
  day: number;
  type: string;
  title: string;
  time: string;
  location: string;
  coach: string;
  category?: string;
  group?: string;
  notes?: string;
}

interface ApiTrainingSession {
  id: string;
  title: string;
  event_type: string;
  scheduled_at: string;
  location: string;
  category: string | null;
  group: string | null;
  coach_name: string | null;
  status: string;
  notes: string;
}

interface NamedRef {
  id: string;
  name: string;
}

interface CategoryOption {
  id: string;
  name: string;
  groups: NamedRef[];
}

interface VenueOption {
  id: string;
  name: string;
  site: string;
}

const NO_VENUE = "none";

const venueLabel = (v: VenueOption) => (v.site ? `${v.name} — ${v.site}` : v.name);

interface CoachCategoryAssignment {
  category_id: string;
  category_name: string;
  group_id: string | null;
  group_name: string | null;
  label: string;
}

// Agrupa las asignaciones del entrenador (una fila por grupo) en el mismo
// formato de `/categories/`, para reusar el mismo selector de categoría/grupo
// pero limitado a lo que tiene a cargo.
const categoriesFromAssignments = (assignments: CoachCategoryAssignment[]): CategoryOption[] => {
  const byCategory = new Map<string, CategoryOption>();
  for (const a of assignments) {
    if (!byCategory.has(a.category_id)) {
      byCategory.set(a.category_id, { id: a.category_id, name: a.category_name, groups: [] });
    }
    if (a.group_id && a.group_name) {
      byCategory.get(a.category_id)!.groups.push({ id: a.group_id, name: a.group_name });
    }
  }
  return Array.from(byCategory.values());
};

const mapEvent = (r: ApiTrainingSession): EventItem => {
  const dt = parseISO(r.scheduled_at);
  return {
    id: r.id,
    day: getDate(dt),
    type: r.event_type,
    title: r.title,
    time: format(dt, "HH:mm"),
    location: r.location || "Sin ubicación",
    coach: r.coach_name || "Sin asignar",
    category: r.category || undefined,
    group: r.group || undefined,
    notes: r.notes || undefined,
  };
};

interface ApiPlayerBirthday {
  id: string;
  full_name: string;
  birth_date: string | null;
  status: "pending" | "confirmed" | "rejected";
  category: { id: string; name: string } | null;
}

interface BirthdayPlayer {
  id: string;
  name: string;
  category: string;
  birthYear: number;
  birthMonth: number; // 0-11
  birthDay: number;
}

interface BirthdayItem extends BirthdayPlayer {
  day: number;
  age: number;
}

// Lee `YYYY-MM-DD` como fecha local (sin pasar por UTC) y descarta fechas imposibles.
const parseBirthDate = (value: string | null) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return { year, month: month - 1, day };
};

const mapBirthdayPlayer = (r: ApiPlayerBirthday): BirthdayPlayer | null => {
  const birth = r.status === "confirmed" ? parseBirthDate(r.birth_date) : null;
  if (!birth) return null;
  return {
    id: r.id,
    name: r.full_name || "Sin nombre",
    category: r.category?.name || "Sin categoría",
    birthYear: birth.year,
    birthMonth: birth.month,
    birthDay: birth.day,
  };
};

// Se calcula por mes visible; nunca se guarda. Un 29 de febrero cae el 28 en años no bisiestos.
const birthdaysInMonth = (players: BirthdayPlayer[], monthDate: Date): BirthdayItem[] => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const lastDay = getDaysInMonth(monthDate);
  return players
    .filter((p) => p.birthMonth === month && year > p.birthYear)
    .map((p) => ({ ...p, day: Math.min(p.birthDay, lastDay), age: year - p.birthYear }))
    .sort((a, b) => a.day - b.day || a.name.localeCompare(b.name, "es"));
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const emptyForm = { type: "training", title: "", date: "", time: "", venueId: "", categoryId: "", groupId: "" };

export default function CalendarPage() {
  const { user } = useAuth();
  const isCoach = user?.role === "coach";
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [birthdayPlayers, setBirthdayPlayers] = useState<BirthdayPlayer[]>([]);
  const [selectedBirthday, setSelectedBirthday] = useState<BirthdayItem | null>(null);
  const [dayOpen, setDayOpen] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState(false);
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [venuesError, setVenuesError] = useState(false);

  // Mismo catálogo de sedes que Configuración del club > Sedes (`/venues/`).
  const loadVenues = useCallback(async () => {
    setVenuesLoading(true);
    setVenuesError(false);
    try {
      const { data } = await api.get<VenueOption[]>("/venues/");
      setVenues(data);
    } catch {
      setVenuesError(true);
      toast.error("No se pudieron cargar las sedes");
    } finally {
      setVenuesLoading(false);
    }
  }, []);

  // Un entrenador solo puede crear eventos para sus propias categorías/grupos
  // a cargo (`/coaches/me/categories/`); admin/aux ven el catálogo completo
  // (`/categories/`), igual que en Configuración del club > Categorías.
  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError(false);
    try {
      if (isCoach) {
        const { data } = await api.get<CoachCategoryAssignment[]>("/coaches/me/categories/");
        setCategories(categoriesFromAssignments(data));
      } else {
        const { data } = await api.get<CategoryOption[]>("/categories/");
        setCategories(data);
      }
    } catch {
      setCategoriesError(true);
      toast.error("No se pudieron cargar las categorías");
    } finally {
      setCategoriesLoading(false);
    }
  }, [isCoach]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === form.categoryId) ?? null,
    [categories, form.categoryId]
  );

  const today = new Date();
  const daysInMonth = getDaysInMonth(monthDate);
  const firstDay = getDay(startOfMonth(monthDate));
  const isCurrentMonth = isSameMonth(monthDate, today);
  const monthLabel = capitalize(format(monthDate, "MMMM yyyy", { locale: es }));
  const monthShortLabel = capitalize(format(monthDate, "MMM", { locale: es }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ results: ApiTrainingSession[] }>("/training-sessions/", {
        params: { year: monthDate.getFullYear(), month: monthDate.getMonth() + 1, page_size: 100 },
      });
      setDenied(false);
      setEvents(data.results.map(mapEvent));
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 403) {
        setDenied(true);
      } else {
        toast.error("No se pudieron cargar los eventos del calendario");
      }
    } finally {
      setLoading(false);
    }
  }, [monthDate]);

  useEffect(() => { load(); }, [load]);

  // Independiente de los eventos: si falla o el rol no tiene permiso, el calendario sigue igual.
  useEffect(() => {
    let cancelled = false;
    const loadBirthdays = async () => {
      const players = new Map<string, BirthdayPlayer>();
      try {
        for (let page = 1; !cancelled; page += 1) {
          const { data } = await api.get<{ next: string | null; results: ApiPlayerBirthday[] }>("/players/", {
            params: { status: "confirmed", page_size: 100, page },
          });
          for (const r of data.results) {
            const player = mapBirthdayPlayer(r);
            if (player) players.set(player.id, player);
          }
          if (!data.next) break;
        }
      } catch (error) {
        if (!cancelled && !(isAxiosError(error) && error.response?.status === 403)) {
          toast.error("No se pudieron cargar los cumpleaños");
        }
      }
      if (!cancelled) setBirthdayPlayers(Array.from(players.values()));
    };
    loadBirthdays();
    return () => { cancelled = true; };
  }, [user?.id]);

  const birthdays = useMemo(() => birthdaysInMonth(birthdayPlayers, monthDate), [birthdayPlayers, monthDate]);

  const getEventForDay = (day: number) => events.filter((e) => e.day === day);
  const getBirthdaysForDay = (day: number) => birthdays.filter((b) => b.day === day);

  const removeEvent = async (id: string) => {
    try {
      await api.delete(`/training-sessions/${id}/`);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      setSelected(null);
      toast.success("Evento eliminado");
    } catch {
      toast.error("No se pudo eliminar el evento");
    }
  };

  const createEvent = async () => {
    if (!form.title.trim() || !form.date || !form.time) {
      toast.error("Completa título, fecha y hora");
      return;
    }
    if (!form.categoryId) {
      toast.error("Selecciona la categoría del evento");
      return;
    }
    if (selectedCategory && selectedCategory.groups.length > 0 && !form.groupId) {
      toast.error("Selecciona el grupo del evento");
      return;
    }
    setSaving(true);
    try {
      const scheduledAt = new Date(`${form.date}T${form.time}`).toISOString();
      const { data } = await api.post<ApiTrainingSession>("/training-sessions/", {
        title: form.title.trim(),
        event_type: form.type,
        scheduled_at: scheduledAt,
        venue_id: form.venueId || null,
        category_id: form.categoryId,
        group_id: form.groupId || null,
      });
      const created = mapEvent(data);
      const createdMonth = parseISO(data.scheduled_at);
      if (isSameMonth(createdMonth, monthDate)) {
        setEvents((prev) => [...prev, created]);
      }
      toast.success("Evento creado");
      setCreateOpen(false);
      setForm(emptyForm);
    } catch (error) {
      const message = isAxiosError(error)
        ? (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message
        : null;
      toast.error(message || "No se pudo crear el evento");
    } finally {
      setSaving(false);
    }
  };

  if (denied) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          <Card className="p-6 text-sm text-muted-foreground">
            Tu cuenta no tiene permiso para ver el calendario del club. Pide al administrador que te asigne el rol de entrenador o administrador.
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold">Calendario</h1>
            <p className="text-muted-foreground mt-1">Entrenamientos y partidos del club</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" asChild>
              <Link to="/attendance"><ClipboardCheck className="w-4 h-4" /> Asistencia</Link>
            </Button>
            <Dialog
              open={createOpen}
              onOpenChange={(o) => {
                setCreateOpen(o);
                if (o) {
                  loadCategories();
                  loadVenues();
                } else {
                  setForm(emptyForm);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" /> Nuevo evento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear evento</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="training">Entrenamiento</SelectItem>
                        <SelectItem value="match">Partido</SelectItem>
                        <SelectItem value="evaluation">Evaluación</SelectItem>
                        <SelectItem value="meeting">Reunión</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Título</Label>
                    <Input
                      placeholder="Ej. Entrenamiento Sub-15"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Categoría</Label>
                    <Select
                      value={form.categoryId}
                      onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v, groupId: "" }))}
                      disabled={categoriesLoading || categories.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={categoriesLoading ? "Cargando categorías..." : "Selecciona una categoría"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {categoriesError ? (
                      <p className="text-xs text-destructive mt-1">
                        No se pudieron cargar las categorías.{" "}
                        <button type="button" className="underline" onClick={loadCategories}>
                          Reintentar
                        </button>
                      </p>
                    ) : !categoriesLoading && categories.length === 0 ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        {isCoach
                          ? "No tienes categorías o grupos asignados. Pide al administrador que te los asigne en Usuarios y roles."
                          : "No hay categorías creadas. Crea una desde Configuración del club."}
                      </p>
                    ) : null}
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Fecha</Label>
                      <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Hora</Label>
                      <Input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <Label>Ubicación</Label>
                    <Select
                      value={form.venueId || NO_VENUE}
                      onValueChange={(v) => setForm((f) => ({ ...f, venueId: v === NO_VENUE ? "" : v }))}
                      disabled={venuesLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={venuesLoading ? "Cargando sedes..." : "Selecciona una sede"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_VENUE}>Sin sede específica</SelectItem>
                        {venues.map((v) => (
                          <SelectItem key={v.id} value={v.id}>{venueLabel(v)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {venuesError ? (
                      <p className="text-xs text-destructive mt-1">
                        No se pudieron cargar las sedes.{" "}
                        <button type="button" className="underline" onClick={loadVenues}>
                          Reintentar
                        </button>
                      </p>
                    ) : !venuesLoading && venues.length === 0 ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        No hay sedes creadas. Créalas desde Configuración del club.
                      </p>
                    ) : null}
                  </div>
                  <Button
                    className="w-full"
                    onClick={createEvent}
                    disabled={saving || categoriesLoading || categories.length === 0}
                  >
                    {saving ? "Creando..." : "Crear evento"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="calendar" className="space-y-4">
          <TabsList>
            <TabsTrigger value="calendar">Calendario</TabsTrigger>
            <TabsTrigger value="upcoming">Próximos</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">{monthLabel}</h2>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" onClick={() => setMonthDate((d) => addMonths(d, -1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setMonthDate(startOfMonth(new Date()))}>Hoy</Button>
                  <Button variant="outline" size="icon" onClick={() => setMonthDate((d) => addMonths(d, 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
                ))}
              </div>

              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-10">Cargando calendario...</p>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dayEvents = getEventForDay(day);
                    const dayBirthdays = getBirthdaysForDay(day);
                    // Con eventos y cumpleaños el mismo día, se ve al menos uno de cada tipo.
                    const visibleBirthdays = dayBirthdays.slice(0, dayEvents.length ? 1 : 2);
                    const visibleEvents = dayEvents.slice(0, 2 - visibleBirthdays.length);
                    const totalItems = dayEvents.length + dayBirthdays.length;
                    const hiddenItems = totalItems - visibleBirthdays.length - visibleEvents.length;
                    const isToday = isCurrentMonth && day === today.getDate();
                    return (
                      <motion.div
                        key={day}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => {
                          if (totalItems > 1) setDayOpen(day);
                          else if (dayBirthdays.length) setSelectedBirthday(dayBirthdays[0]);
                          else if (dayEvents.length) setSelected(dayEvents[0]);
                        }}
                        className={`aspect-square rounded-lg border p-1.5 cursor-pointer transition-all flex flex-col ${
                          isToday ? "bg-primary/10 border-primary" : "bg-card border-border hover:border-primary/40"
                        }`}
                      >
                        <span className={`text-xs font-semibold ${isToday ? "text-primary" : ""}`}>{day}</span>
                        <div className="flex-1 space-y-0.5 mt-0.5 overflow-hidden">
                          {visibleBirthdays.map((b) => (
                            <div
                              key={`birthday-${b.id}`}
                              title={`Cumpleaños de ${b.name}`}
                              className="text-[9px] px-1 py-0.5 rounded font-medium flex items-center gap-0.5 bg-[hsl(var(--chart-4)/0.2)] text-[hsl(var(--chart-4))]"
                            >
                              <Cake className="w-2.5 h-2.5 flex-shrink-0" />
                              <span className="truncate">{b.name}</span>
                            </div>
                          ))}
                          {visibleEvents.map((e) => (
                            <div
                              key={e.id}
                              className={`text-[9px] px-1 py-0.5 rounded truncate font-medium ${
                                e.type === "match"
                                  ? "bg-[hsl(var(--kpi-amber)/0.2)] text-[hsl(var(--kpi-amber))]"
                                  : "bg-primary/15 text-primary"
                              }`}
                            >
                              {e.time} {e.title.split(" ")[0]}
                            </div>
                          ))}
                          {hiddenItems > 0 && (
                            <div className="text-[9px] text-muted-foreground">+{hiddenItems}</div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-wrap gap-4 mt-6 text-xs">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-primary/30" /> Entrenamiento</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-[hsl(var(--kpi-amber)/0.4)]" /> Partido</div>
                <div className="flex items-center gap-2"><Cake className="w-3 h-3 text-[hsl(var(--chart-4))]" /> Cumpleaños</div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="upcoming">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-10">Cargando eventos...</p>
            ) : events.length === 0 && birthdays.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No hay eventos programados para {monthLabel}.</p>
            ) : (
              <div className="space-y-3">
                {birthdays.map((b) => (
                  <Card key={`birthday-${b.id}`} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-[hsl(var(--chart-4)/0.15)]">
                        <Cake className="w-5 h-5 text-[hsl(var(--chart-4))]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold">{b.name}</h4>
                          <Badge variant="outline" className="text-xs">Cumpleaños</Badge>
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground mt-1 flex-wrap">
                          <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {monthShortLabel} {b.day}</span>
                          <span className="flex items-center gap-1"><Cake className="w-3 h-3" /> Cumple {b.age} {b.age === 1 ? "año" : "años"}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {b.category}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setSelectedBirthday(b)}>Ver detalle</Button>
                    </div>
                  </Card>
                ))}
                {events.map((e) => (
                  <Card key={e.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        e.type === "match" ? "bg-[hsl(var(--kpi-amber)/0.15)]" : "bg-primary/10"
                      }`}>
                        {e.type === "match" ? <Trophy className="w-5 h-5 text-[hsl(var(--kpi-amber))]" /> : <Dumbbell className="w-5 h-5 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold">{e.title}</h4>
                          <Badge variant="outline" className="text-xs">{e.type === "match" ? "Partido" : "Entrenamiento"}</Badge>
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground mt-1 flex-wrap">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {monthShortLabel} {e.day} • {e.time}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {e.location}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {e.coach}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setSelected(e)}>Ver detalle</Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Day events popup */}
      <Dialog open={dayOpen !== null} onOpenChange={(o) => !o && setDayOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarDays className="w-5 h-5 text-primary" /> {monthShortLabel} {dayOpen}</DialogTitle>
            <DialogDescription>Eventos programados para este día</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {dayOpen !== null && getBirthdaysForDay(dayOpen).map((b) => (
              <button key={`birthday-${b.id}`} onClick={() => { setSelectedBirthday(b); setDayOpen(null); }}
                className="w-full text-left p-3 rounded-lg border hover:border-primary/50 hover:bg-muted/40 transition-colors">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Cake className="w-3.5 h-3.5 flex-shrink-0 text-[hsl(var(--chart-4))]" /> {b.name}
                </p>
                <p className="text-xs text-muted-foreground">Cumple {b.age} {b.age === 1 ? "año" : "años"} • {b.category}</p>
              </button>
            ))}
            {dayOpen !== null && getEventForDay(dayOpen).map((e) => (
              <button key={e.id} onClick={() => { setSelected(e); setDayOpen(null); }}
                className="w-full text-left p-3 rounded-lg border hover:border-primary/50 hover:bg-muted/40 transition-colors">
                <p className="text-sm font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground">{e.time} • {e.location}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Birthday detail popup (solo lectura) */}
      <Dialog open={!!selectedBirthday} onOpenChange={(o) => !o && setSelectedBirthday(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedBirthday && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-[hsl(var(--chart-4)/0.15)]">
                    <Cake className="w-5 h-5 text-[hsl(var(--chart-4))]" />
                  </div>
                  <div className="text-left">
                    <DialogTitle>{selectedBirthday.name}</DialogTitle>
                    <DialogDescription>Cumpleaños · {selectedBirthday.category}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm pt-1">
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Fecha</p>
                  <p className="font-medium mt-1">{monthShortLabel} {selectedBirthday.day}</p>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Cake className="w-3 h-3" /> Edad que cumple</p>
                  <p className="font-medium mt-1">{selectedBirthday.age} {selectedBirthday.age === 1 ? "año" : "años"}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Event detail popup */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                    selected.type === "match" ? "bg-[hsl(var(--kpi-amber)/0.15)]" : "bg-primary/10"
                  }`}>
                    {selected.type === "match" ? <Trophy className="w-5 h-5 text-[hsl(var(--kpi-amber))]" /> : <Dumbbell className="w-5 h-5 text-primary" />}
                  </div>
                  <div className="text-left">
                    <DialogTitle>{selected.title}</DialogTitle>
                    <DialogDescription>
                      {selected.type === "match" ? "Partido" : "Entrenamiento"} · {selected.category}
                      {selected.group ? ` ${selected.group}` : ""}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg border">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Fecha</p>
                    <p className="font-medium mt-1">{monthShortLabel} {selected.day} • {selected.time}</p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Lugar</p>
                    <p className="font-medium mt-1">{selected.location}</p>
                  </div>
                  <div className="p-3 rounded-lg border col-span-2">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Responsable</p>
                    <p className="font-medium mt-1">{selected.coach}</p>
                  </div>
                </div>
                {selected.notes && (
                  <div className="p-3 rounded-lg bg-muted/40 text-sm text-muted-foreground">{selected.notes}</div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" className="gap-2 flex-1" asChild>
                    <Link to={`/attendance?session=${selected.id}`}><ClipboardCheck className="w-4 h-4" /> Pasar asistencia</Link>
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => toast.info("Edición de evento próximamente")}>
                    <Pencil className="w-4 h-4" /> Editar
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-2" onClick={() => removeEvent(selected.id)}>
                    <Trash2 className="w-4 h-4" /> Eliminar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

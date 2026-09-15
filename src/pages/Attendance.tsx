import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CheckCircle2, XCircle, AlertCircle, Search, ClipboardCheck, Percent, Users, CalendarDays,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";

type Status = "present" | "late" | "absent" | "excused";

interface ApiSessionBrief {
  id: string;
  title: string;
  event_type: string;
  scheduled_at: string;
  location: string;
  category: string;
}

interface RosterPlayer {
  player_id: string;
  full_name: string;
  document_id: string;
  status: Status | null;
}

interface AttendanceSummary {
  called_up: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  attendance_rate: number;
}

interface SessionAttendanceResponse {
  training_session: ApiSessionBrief;
  roster: RosterPlayer[];
  summary: AttendanceSummary;
}

const statusMeta: Record<Status, { label: string; icon: typeof CheckCircle2 }> = {
  present: { label: "Presente", icon: CheckCircle2 },
  late: { label: "Tarde", icon: AlertCircle },
  absent: { label: "Ausente", icon: XCircle },
  excused: { label: "Excusa", icon: ClipboardCheck },
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const shortDate = (iso: string) => capitalize(format(parseISO(iso), "d MMM", { locale: es }));
const timeOf = (iso: string) => format(parseISO(iso), "HH:mm");

export default function Attendance() {
  const [searchParams] = useSearchParams();
  const requestedSessionId = searchParams.get("session");

  const [sessions, setSessions] = useState<ApiSessionBrief[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [search, setSearch] = useState("");

  // Sesión tal como la devolvió /roster/ — es la única fuente de verdad para
  // lo que se muestra en "Pasar lista" (categoría, fecha, lugar). Nunca se
  // deriva de una copia local ni de la lista de sesiones del mes.
  const [sessionDetail, setSessionDetail] = useState<ApiSessionBrief | null>(null);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [current, setCurrent] = useState<Record<string, Status>>({});
  const [rosterLoading, setRosterLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState<SessionAttendanceResponse[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyDetail, setHistoryDetail] = useState<SessionAttendanceResponse | null>(null);

  // Sesiones del selector: únicamente los eventos de HOY. El día se calcula
  // en el servidor (`/training-sessions/today/`, a partir de la fecha real
  // de cada evento) — nunca se filtra por una fecha calculada en el cliente,
  // así que no aparecen eventos de días anteriores ni futuros.
  useEffect(() => {
    api
      .get<ApiSessionBrief[]>("/training-sessions/today/")
      .then(({ data }) => {
        setDenied(false);
        setSessions(data);

        const defaultId =
          (requestedSessionId && data.find((s) => s.id === requestedSessionId)?.id) ||
          data[0]?.id ||
          "";
        if (defaultId) setSessionId(defaultId);
      })
      .catch((error) => {
        if (isAxiosError(error) && error.response?.status === 403) setDenied(true);
        else toast.error("No se pudieron cargar las sesiones de hoy");
      })
      .finally(() => setSessionsLoading(false));
  }, [requestedSessionId]);

  // Evita que la respuesta de una sesión anterior (más lenta) sobreescriba
  // por accidente la de la sesión seleccionada más recientemente.
  const rosterRequestRef = useRef(0);

  const loadRoster = useCallback(async (id: string) => {
    const requestId = ++rosterRequestRef.current;
    setRosterLoading(true);
    try {
      const { data } = await api.get<SessionAttendanceResponse>(`/training-sessions/${id}/roster/`);
      if (rosterRequestRef.current !== requestId) return;
      setSessionDetail(data.training_session);
      setRoster(data.roster);
      const initial: Record<string, Status> = {};
      data.roster.forEach((p) => { if (p.status) initial[p.player_id] = p.status; });
      setCurrent(initial);
    } catch {
      if (rosterRequestRef.current === requestId) toast.error("No se pudo cargar el listado de convocados");
    } finally {
      if (rosterRequestRef.current === requestId) setRosterLoading(false);
    }
  }, []);

  useEffect(() => { if (sessionId) loadRoster(sessionId); }, [sessionId, loadRoster]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { data } = await api.get<SessionAttendanceResponse[]>("/training-sessions/attendance-history/");
      setHistory(data);
    } catch {
      toast.error("No se pudo cargar el histórico de asistencia");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Mientras carga el roster de la sesión recién seleccionada, se muestra de
  // forma optimista el dato ya conocido de la lista del mes (también viene
  // de la base de datos); en cuanto responde /roster/, esa es la fuente que
  // manda — así nunca queda una categoría de otra sesión pegada en pantalla.
  const selectedFromList = sessions.find((s) => s.id === sessionId);
  const displaySession = sessionDetail && sessionDetail.id === sessionId ? sessionDetail : selectedFromList;

  const list = useMemo(
    () => roster.filter((p) => p.full_name.toLowerCase().includes(search.toLowerCase())),
    [roster, search]
  );

  const count = (s: Status) => list.filter((p) => current[p.player_id] === s).length;
  const rate = list.length ? Math.round(((count("present") + count("late")) / list.length) * 100) : 0;

  const mark = (playerId: string, status: Status) =>
    setCurrent((c) => ({ ...c, [playerId]: status }));

  const markAll = (status: Status) =>
    setCurrent((c) => ({ ...c, ...Object.fromEntries(list.map((p) => [p.player_id, status])) }));

  const clear = () => setCurrent({});

  const save = async () => {
    const entries = Object.entries(current).map(([player_id, status]) => ({ player_id, status }));
    if (!entries.length) {
      toast.error("Marca la asistencia de al menos un deportista");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post<SessionAttendanceResponse>(
        `/training-sessions/${sessionId}/mark-attendance/`,
        { entries }
      );
      setRoster(data.roster);
      toast.success("Asistencia guardada");
      loadHistory();
    } catch {
      toast.error("No se pudo guardar la asistencia");
    } finally {
      setSaving(false);
    }
  };

  if (denied) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          <Card className="p-6 text-sm text-muted-foreground">
            Tu cuenta no tiene permiso para gestionar asistencia. Pide al administrador que te asigne el rol de entrenador o administrador.
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1400px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold">Asistencia</h1>
            <p className="text-muted-foreground mt-1">Control de asistencia a entrenamientos y partidos</p>
          </div>
          <Button className="gap-2" onClick={save} disabled={saving || !sessionId}>
            <ClipboardCheck className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar asistencia"}
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: "Convocados", value: list.length, icon: Users, color: "kpi-blue" },
            { label: "Presentes", value: count("present"), icon: CheckCircle2, color: "kpi-green" },
            { label: "Ausentes", value: count("absent"), icon: XCircle, color: "kpi-red" },
            { label: "Tasa de asistencia", value: `${rate}%`, icon: Percent, color: "kpi-amber" },
          ].map((k) => (
            <Card key={k.label} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{k.label}</p>
                  <p className="text-2xl font-bold mt-2">{k.value}</p>
                </div>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `hsl(var(--${k.color}) / 0.15)` }}>
                  <k.icon className="w-4 h-4" style={{ color: `hsl(var(--${k.color}))` }} />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="pass" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pass">Pasar lista</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="pass">
            <Card className="p-4 sm:p-6 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-end gap-3">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Sesión</p>
                  <Select value={sessionId} onValueChange={setSessionId} disabled={sessionsLoading || !sessions.length}>
                    <SelectTrigger><SelectValue placeholder={sessionsLoading ? "Cargando sesiones..." : "Selecciona una sesión"} /></SelectTrigger>
                    <SelectContent>
                      {sessions.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.title} · {s.category} · {shortDate(s.scheduled_at)} {timeOf(s.scheduled_at)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 bottom-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground mb-1">Buscar</p>
                  <Input className="pl-9" placeholder="Buscar deportista..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>

              {!sessionsLoading && !sessions.length ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No hay sesiones programadas para hoy en el calendario.</p>
              ) : displaySession && (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" /> {displaySession.category} • {shortDate(displaySession.scheduled_at)} • {timeOf(displaySession.scheduled_at)} • {displaySession.location || "Sin ubicación"}
                    </span>
                    <span className="flex-1" />
                    <Button size="sm" variant="outline" onClick={() => markAll("present")}>Marcar todos presentes</Button>
                    <Button size="sm" variant="ghost" onClick={clear}>Limpiar</Button>
                  </div>

                  <div className="space-y-2">
                    {rosterLoading ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">Cargando convocados...</p>
                    ) : (
                      <>
                        {list.map((p, i) => (
                          <motion.div key={p.player_id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center font-bold text-xs">
                                {p.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{p.full_name}</p>
                                <p className="text-xs text-muted-foreground">{displaySession.category}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 sm:flex gap-1">
                              {(Object.keys(statusMeta) as Status[]).map((s) => {
                                const Icon = statusMeta[s].icon;
                                const active = current[p.player_id] === s;
                                return (
                                  <Button
                                    key={s}
                                    size="sm"
                                    variant={active ? (s === "absent" ? "destructive" : "default") : "outline"}
                                    className="gap-1 h-8 px-2"
                                    onClick={() => mark(p.player_id, s)}
                                  >
                                    <Icon className="w-3.5 h-3.5" /> <span className="text-xs">{statusMeta[s].label}</span>
                                  </Button>
                                );
                              })}
                            </div>
                          </motion.div>
                        ))}
                        {list.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Sin deportistas convocados para esta sesión.</p>}
                      </>
                    )}
                  </div>
                </>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="p-4 sm:p-6">
              {historyLoading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Cargando histórico...</p>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Aún no hay asistencia registrada.</p>
              ) : (
                <div className="space-y-2">
                  {history.map((h) => (
                    <button
                      key={h.training_session.id}
                      onClick={() => setHistoryDetail(h)}
                      className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg border hover:border-primary/50 hover:bg-muted/40 transition-colors text-left"
                    >
                      <div>
                        <p className="text-sm font-medium">{h.training_session.title}</p>
                        <p className="text-xs text-muted-foreground">{shortDate(h.training_session.scheduled_at)} · {h.training_session.category}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge className="bg-primary/15 text-primary border-0">{h.summary.present} presentes</Badge>
                        <Badge className="bg-[hsl(var(--kpi-amber)/0.15)] text-[hsl(var(--kpi-amber))] border-0">{h.summary.late} tarde</Badge>
                        <Badge variant="destructive">{h.summary.absent} ausentes</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Detalle de asistencia histórica por sesión */}
      <Dialog open={!!historyDetail} onOpenChange={(o) => !o && setHistoryDetail(null)}>
        <DialogContent className="sm:max-w-md">
          {historyDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" /> {historyDetail.training_session.title}
                </DialogTitle>
                <DialogDescription>
                  {historyDetail.training_session.category} • {shortDate(historyDetail.training_session.scheduled_at)} • {timeOf(historyDetail.training_session.scheduled_at)}
                  {historyDetail.training_session.location ? ` • ${historyDetail.training_session.location}` : ""}
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-2 flex-wrap">
                <Badge className="bg-primary/15 text-primary border-0">{historyDetail.summary.present} presentes</Badge>
                <Badge className="bg-[hsl(var(--kpi-amber)/0.15)] text-[hsl(var(--kpi-amber))] border-0">{historyDetail.summary.late} tarde</Badge>
                <Badge variant="destructive">{historyDetail.summary.absent} ausentes</Badge>
                <Badge variant="outline">{historyDetail.summary.attendance_rate}% asistencia</Badge>
              </div>
              <div className="space-y-1.5 pt-1 max-h-72 overflow-y-auto">
                {historyDetail.roster.map((p) => {
                  const meta = p.status ? statusMeta[p.status] : null;
                  const Icon = meta?.icon ?? Users;
                  return (
                    <div key={p.player_id} className="flex items-center justify-between gap-2 p-2 rounded-lg border text-sm">
                      <span>{p.full_name}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Icon className="w-3.5 h-3.5" /> {meta?.label ?? "Sin registrar"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

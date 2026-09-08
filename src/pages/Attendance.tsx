import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2, XCircle, AlertCircle, Search, ClipboardCheck, Percent, Users, CalendarDays,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

type Status = "present" | "late" | "absent" | "excused";

const sessions = [
  { id: "s1", title: "Entrenamiento Sub-15", date: "17 Abr", time: "15:00", place: "Cancha 1", category: "Sub-15" },
  { id: "s2", title: "Partido vs. Atlético FC", date: "17 Abr", time: "18:30", place: "Estadio Central", category: "Sub-15" },
  { id: "s3", title: "Sesión Técnica Sub-13", date: "19 Abr", time: "16:00", place: "Cancha 2", category: "Sub-13" },
  { id: "s4", title: "Físico Sub-17", date: "23 Abr", time: "17:00", place: "Gimnasio", category: "Sub-17" },
];

const roster = [
  { id: 1, name: "Mateo Rodríguez", number: 10, category: "Sub-15" },
  { id: 2, name: "Santiago López", number: 7, category: "Sub-15" },
  { id: 3, name: "Diego Martínez", number: 9, category: "Sub-15" },
  { id: 4, name: "Andrés Gómez", number: 4, category: "Sub-15" },
  { id: 5, name: "Juan Hernández", number: 11, category: "Sub-15" },
  { id: 6, name: "Felipe Castro", number: 6, category: "Sub-15" },
  { id: 7, name: "Tomás Vargas", number: 8, category: "Sub-15" },
  { id: 8, name: "Sebastián Ruiz", number: 3, category: "Sub-15" },
  { id: 9, name: "Valentina Cruz", number: 5, category: "Sub-13" },
  { id: 10, name: "Samuel Peña", number: 2, category: "Sub-13" },
  { id: 11, name: "Sofía Ramírez", number: 14, category: "Sub-17" },
  { id: 12, name: "Juan Pérez", number: 9, category: "Sub-17" },
];

const history = [
  { session: "Entrenamiento Sub-15", date: "15 Abr", present: 7, late: 1, absent: 0 },
  { session: "Partido vs. Halcones", date: "13 Abr", present: 6, late: 1, absent: 1 },
  { session: "Entrenamiento Sub-15", date: "10 Abr", present: 8, late: 0, absent: 0 },
  { session: "Sesión Técnica Sub-13", date: "09 Abr", present: 5, late: 0, absent: 2 },
];

const STORAGE_KEY = "sf_attendance";

const statusMeta: Record<Status, { label: string; icon: typeof CheckCircle2 }> = {
  present: { label: "Presente", icon: CheckCircle2 },
  late: { label: "Tarde", icon: AlertCircle },
  absent: { label: "Ausente", icon: XCircle },
  excused: { label: "Excusa", icon: ClipboardCheck },
};

export default function Attendance() {
  const [sessionId, setSessionId] = useState(sessions[0].id);
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState<Record<string, Record<number, Status>>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return {};
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  const session = sessions.find((s) => s.id === sessionId)!;
  const current = records[sessionId] ?? {};

  const list = useMemo(
    () => roster.filter((p) => p.category === session.category && p.name.toLowerCase().includes(search.toLowerCase())),
    [session.category, search]
  );

  const count = (s: Status) => list.filter((p) => current[p.id] === s).length;
  const rate = list.length ? Math.round(((count("present") + count("late")) / list.length) * 100) : 0;

  const mark = (playerId: number, status: Status) =>
    setRecords((r) => ({ ...r, [sessionId]: { ...(r[sessionId] ?? {}), [playerId]: status } }));

  const markAll = (status: Status) =>
    setRecords((r) => ({
      ...r,
      [sessionId]: { ...(r[sessionId] ?? {}), ...Object.fromEntries(list.map((p) => [p.id, status])) },
    }));

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1400px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold">Asistencia</h1>
            <p className="text-muted-foreground mt-1">Control de asistencia a entrenamientos y partidos</p>
          </div>
          <Button className="gap-2" onClick={() => toast.success("Asistencia guardada")}>
            <ClipboardCheck className="w-4 h-4" /> Guardar asistencia
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
                  <Select value={sessionId} onValueChange={setSessionId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {sessions.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.title} · {s.date} {s.time}</SelectItem>
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

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" /> {session.date} • {session.time} • {session.place}
                </span>
                <span className="flex-1" />
                <Button size="sm" variant="outline" onClick={() => markAll("present")}>Marcar todos presentes</Button>
                <Button size="sm" variant="ghost" onClick={() => setRecords((r) => ({ ...r, [sessionId]: {} }))}>Limpiar</Button>
              </div>

              <div className="space-y-2">
                {list.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center font-bold text-sm">{p.number}</div>
                      <div>
                        <p className="font-medium text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.category}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:flex gap-1">
                      {(Object.keys(statusMeta) as Status[]).map((s) => {
                        const Icon = statusMeta[s].icon;
                        const active = current[p.id] === s;
                        return (
                          <Button
                            key={s}
                            size="sm"
                            variant={active ? (s === "absent" ? "destructive" : "default") : "outline"}
                            className="gap-1 h-8 px-2"
                            onClick={() => mark(p.id, s)}
                          >
                            <Icon className="w-3.5 h-3.5" /> <span className="text-xs">{statusMeta[s].label}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
                {list.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Sin deportistas para esta sesión.</p>}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="p-4 sm:p-6">
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.session + h.date} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{h.session}</p>
                      <p className="text-xs text-muted-foreground">{h.date}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge className="bg-primary/15 text-primary border-0">{h.present} presentes</Badge>
                      <Badge className="bg-[hsl(var(--kpi-amber)/0.15)] text-[hsl(var(--kpi-amber))] border-0">{h.late} tarde</Badge>
                      <Badge variant="destructive">{h.absent} ausentes</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

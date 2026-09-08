import { useState } from "react";
import { Link } from "react-router-dom";
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
  Trophy, Dumbbell, ClipboardCheck, Pencil, Trash2, CalendarDays,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface EventItem {
  id: number;
  day: number;
  type: string;
  title: string;
  time: string;
  location: string;
  coach: string;
  category?: string;
  notes?: string;
}

const initialEvents: EventItem[] = [
  { id: 1, day: 17, type: "training", title: "Entrenamiento Sub-15", time: "15:00", location: "Cancha 1", coach: "Carlos Mendoza", category: "Sub-15", notes: "Trabajo de posesión y transiciones. Traer petos." },
  { id: 2, day: 17, type: "match", title: "Partido vs. Atlético FC", time: "18:30", location: "Estadio Central", coach: "Carlos Mendoza", category: "Sub-15", notes: "Concentración 1 hora antes. Uniforme alterno." },
  { id: 3, day: 19, type: "training", title: "Sesión Técnica Sub-13", time: "16:00", location: "Cancha 2", coach: "Ana Restrepo", category: "Sub-13", notes: "Control orientado y conducción." },
  { id: 4, day: 21, type: "match", title: "Liga Local - Final", time: "10:00", location: "Estadio Municipal", coach: "Carlos Mendoza", category: "Sub-15", notes: "Final del torneo. Convocatoria de 18 jugadores." },
  { id: 5, day: 23, type: "training", title: "Físico Sub-17", time: "17:00", location: "Gimnasio", coach: "Luis Pérez", category: "Sub-17", notes: "Fuerza funcional y core." },
  { id: 6, day: 25, type: "training", title: "Táctico", time: "15:30", location: "Cancha 1", coach: "Carlos Mendoza", category: "Sub-15", notes: "Pressing alto y salida desde el fondo." },
];

export default function CalendarPage() {
  const [currentMonth] = useState("Abril 2026");
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [dayOpen, setDayOpen] = useState<number | null>(null);
  const daysInMonth = 30;
  const firstDay = 2; // Wednesday
  const today = 17;

  const getEventForDay = (day: number) => events.filter((e) => e.day === day);

  const removeEvent = (id: number) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setSelected(null);
    toast.success("Evento eliminado");
  };

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
            <Dialog>
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
                    <Select defaultValue="training">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="training">Entrenamiento</SelectItem>
                        <SelectItem value="match">Partido</SelectItem>
                        <SelectItem value="evaluation">Evaluación</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Título</Label><Input placeholder="Ej. Entrenamiento Sub-15" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Fecha</Label><Input type="date" /></div>
                    <div><Label>Hora</Label><Input type="time" /></div>
                  </div>
                  <div><Label>Ubicación</Label><Input placeholder="Cancha 1" /></div>
                  <Button className="w-full" onClick={() => toast.success("Evento creado")}>Crear evento</Button>
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
                <h2 className="text-xl font-semibold">{currentMonth}</h2>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon"><ChevronLeft className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm">Hoy</Button>
                  <Button variant="outline" size="icon"><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayEvents = getEventForDay(day);
                  const isToday = day === today;
                  return (
                    <motion.div
                      key={day}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => dayEvents.length && (dayEvents.length === 1 ? setSelected(dayEvents[0]) : setDayOpen(day))}
                      className={`aspect-square rounded-lg border p-1.5 cursor-pointer transition-all flex flex-col ${
                        isToday ? "bg-primary/10 border-primary" : "bg-card border-border hover:border-primary/40"
                      }`}
                    >
                      <span className={`text-xs font-semibold ${isToday ? "text-primary" : ""}`}>{day}</span>
                      <div className="flex-1 space-y-0.5 mt-0.5 overflow-hidden">
                        {dayEvents.slice(0, 2).map((e) => (
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
                        {dayEvents.length > 2 && (
                          <div className="text-[9px] text-muted-foreground">+{dayEvents.length - 2}</div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="flex gap-4 mt-6 text-xs">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-primary/30" /> Entrenamiento</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-[hsl(var(--kpi-amber)/0.4)]" /> Partido</div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="upcoming">
            <div className="space-y-3">
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
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Abr {e.day} • {e.time}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {e.location}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {e.coach}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSelected(e)}>Ver detalle</Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Day events popup */}
      <Dialog open={dayOpen !== null} onOpenChange={(o) => !o && setDayOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarDays className="w-5 h-5 text-primary" /> Abril {dayOpen}</DialogTitle>
            <DialogDescription>Eventos programados para este día</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
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
                    <DialogDescription>{selected.type === "match" ? "Partido" : "Entrenamiento"} · {selected.category}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg border">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Fecha</p>
                    <p className="font-medium mt-1">Abr {selected.day} • {selected.time}</p>
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
                    <Link to="/attendance"><ClipboardCheck className="w-4 h-4" /> Pasar asistencia</Link>
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

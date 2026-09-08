import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Trophy, TrendingUp, Calendar, MessageSquare, Bell, CreditCard,
  Star, Target, Activity, ChevronRight, CheckCircle2, Clock, Plus, Trash2
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

type Goal = { label: string; current: number; total: number };
type Match = { date: string; opponent: string; result: string; goals: number; assists: number; rating: number };

const initialEvolution = [
  { week: "S1", rating: 7.2, goals: 1 },
  { week: "S2", rating: 7.5, goals: 2 },
  { week: "S3", rating: 7.8, goals: 1 },
  { week: "S4", rating: 8.1, goals: 3 },
  { week: "S5", rating: 8.4, goals: 2 },
  { week: "S6", rating: 8.7, goals: 4 },
];

const initialMatches: Match[] = [
  { date: "12 Abr", opponent: "Atlético FC", result: "W 3-1", goals: 2, assists: 1, rating: 8.9 },
  { date: "05 Abr", opponent: "Real Cali", result: "W 2-0", goals: 1, assists: 0, rating: 8.4 },
  { date: "29 Mar", opponent: "Deportivo Sur", result: "D 1-1", goals: 1, assists: 0, rating: 7.8 },
  { date: "22 Mar", opponent: "Juventud", result: "W 4-2", goals: 2, assists: 2, rating: 9.1 },
];

const initialGoals: Goal[] = [
  { label: "Goles", current: 4, total: 5 },
  { label: "Entrenamientos", current: 12, total: 14 },
  { label: "Pases completados", current: 87, total: 100 },
];

const comments = [
  { coach: "Carlos Mendoza", date: "Hace 2 días", text: "Excelente progreso en definición. Mantén el trabajo defensivo en los partidos de visitante.", rating: 5 },
  { coach: "Ana Restrepo", date: "Hace 1 semana", text: "Mejora notable en el control bajo presión. Trabajaremos esta semana en pase largo.", rating: 4 },
  { coach: "Carlos Mendoza", date: "Hace 2 semanas", text: "Liderazgo destacado en el último partido. Sigue así.", rating: 5 },
];

const notifications = [
  { type: "match", icon: Trophy, text: "Próximo partido vs. Real Cali el 19 de Abril a las 10:00", time: "Hace 1h" },
  { type: "payment", icon: CreditCard, text: "Recordatorio: pago mensual de Mayo vence el 5 de mayo", time: "Hace 5h" },
  { type: "achievement", icon: Star, text: "¡Nuevo logro desbloqueado: 10 partidos consecutivos como titular!", time: "Ayer" },
  { type: "message", icon: MessageSquare, text: "Nuevo comentario del entrenador Carlos Mendoza", time: "Hace 2 días" },
];

export default function Family() {
  const [evolution] = useState(initialEvolution);
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [goals, setGoals] = useState<Goal[]>(initialGoals);

  const [goalOpen, setGoalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({ label: "", current: "0", total: "" });

  const [matchOpen, setMatchOpen] = useState(false);
  const [newMatch, setNewMatch] = useState({
    date: "", opponent: "", result: "W", scoreFor: "", scoreAgainst: "",
    goals: "0", assists: "0", rating: "7.0",
  });

  const handleAddGoal = () => {
    if (!newGoal.label.trim() || !newGoal.total) {
      toast({ title: "Campos incompletos", description: "Indica un nombre y meta.", variant: "destructive" });
      return;
    }
    setGoals([...goals, {
      label: newGoal.label.trim(),
      current: Number(newGoal.current) || 0,
      total: Number(newGoal.total),
    }]);
    setNewGoal({ label: "", current: "0", total: "" });
    setGoalOpen(false);
    toast({ title: "Objetivo añadido", description: `"${newGoal.label}" registrado.` });
  };

  const handleRemoveGoal = (idx: number) => {
    setGoals(goals.filter((_, i) => i !== idx));
  };

  const handleAddMatch = () => {
    if (!newMatch.date || !newMatch.opponent.trim() || !newMatch.scoreFor || !newMatch.scoreAgainst) {
      toast({ title: "Campos incompletos", description: "Completa fecha, rival y marcador.", variant: "destructive" });
      return;
    }
    const result = `${newMatch.result} ${newMatch.scoreFor}-${newMatch.scoreAgainst}`;
    setMatches([{
      date: newMatch.date,
      opponent: newMatch.opponent.trim(),
      result,
      goals: Number(newMatch.goals) || 0,
      assists: Number(newMatch.assists) || 0,
      rating: Number(newMatch.rating) || 0,
    }, ...matches]);
    setNewMatch({ date: "", opponent: "", result: "W", scoreFor: "", scoreAgainst: "", goals: "0", assists: "0", rating: "7.0" });
    setMatchOpen(false);
    toast({ title: "Partido registrado", description: `vs. ${newMatch.opponent}` });
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Portal del Acudiente</p>
            <h1 className="text-2xl sm:text-3xl font-display font-bold">Bienvenido, Familia Rodríguez 👋</h1>
          </div>
          <Button variant="outline" className="gap-2 relative">
            <Bell className="w-4 h-4" />
            Notificaciones
            <Badge className="absolute -top-1.5 -right-1.5 h-5 w-5 p-0 flex items-center justify-center bg-destructive">4</Badge>
          </Button>
        </div>

        {/* Player Hero Card */}
        <Card className="p-6 bg-gradient-to-br from-primary/10 via-card to-card border-primary/20">
          <div className="flex items-center gap-6">
            <Avatar className="w-20 h-20 border-4 border-primary/20">
              <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">MR</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-display font-bold">Mateo Rodríguez</h2>
                <Badge className="bg-primary/15 text-primary border-0">Sub-15</Badge>
                <Badge variant="outline">Delantero • #10</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Categoría élite • Entrenador: Carlos Mendoza</p>
              <div className="flex gap-6 mt-3">
                <div>
                  <p className="text-xs text-muted-foreground">Rating actual</p>
                  <p className="text-xl font-bold text-primary">8.7</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Goles temporada</p>
                  <p className="text-xl font-bold">18</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Asistencias</p>
                  <p className="text-xl font-bold">9</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Asistencia</p>
                  <p className="text-xl font-bold">94%</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Main column */}
          <div className="col-span-2 space-y-4">
            <Tabs defaultValue="progress">
              <TabsList>
                <TabsTrigger value="progress">Progreso</TabsTrigger>
                <TabsTrigger value="matches">Partidos</TabsTrigger>
                <TabsTrigger value="comments">Comentarios</TabsTrigger>
              </TabsList>

              <TabsContent value="progress" className="space-y-4">
                <Card className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" /> Evolución de rendimiento
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={evolution}>
                      <defs>
                        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[6, 10]} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Area type="monotone" dataKey="rating" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#grad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" /> Objetivos del mes
                    </h3>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setGoalOpen(true)}>
                      <Plus className="w-3.5 h-3.5" /> Registrar objetivo
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {goals.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Aún no hay objetivos registrados.</p>
                    )}
                    {goals.map((g, idx) => (
                      <div key={idx} className="group">
                        <div className="flex justify-between items-center text-sm mb-1.5">
                          <span className="font-medium">{g.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{g.current} / {g.total}</span>
                            <button
                              onClick={() => handleRemoveGoal(idx)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                              aria-label="Eliminar objetivo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <Progress value={Math.min((g.current / g.total) * 100, 100)} />
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="matches">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Estadísticas por partido</h3>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setMatchOpen(true)}>
                      <Plus className="w-3.5 h-3.5" /> Registrar partido
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {matches.map((m, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/40 transition-colors">
                        <div className="text-center w-14">
                          <p className="text-xs text-muted-foreground">{m.date}</p>
                          <Badge variant={m.result.startsWith("W") ? "default" : "outline"} className="mt-1 text-xs">
                            {m.result}
                          </Badge>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">vs. {m.opponent}</p>
                          <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                            <span>⚽ {m.goals}</span>
                            <span>🅰️ {m.assists}</span>
                          </div>
                        </div>
                        <Badge className="bg-primary/15 text-primary border-0">⭐ {m.rating}</Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="comments">
                <Card className="p-6 space-y-4">
                  <h3 className="font-semibold">Comentarios del entrenador</h3>
                  {comments.map((c, i) => (
                    <div key={i} className="p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-7 h-7">
                            <AvatarFallback className="text-xs bg-primary/15 text-primary font-semibold">
                              {c.coach.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{c.coach}</p>
                            <p className="text-xs text-muted-foreground">{c.date}</p>
                          </div>
                        </div>
                        <div className="flex">
                          {Array.from({ length: c.rating }).map((_, j) => (
                            <Star key={j} className="w-3.5 h-3.5 fill-[hsl(var(--kpi-amber))] text-[hsl(var(--kpi-amber))]" />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-foreground/80">{c.text}</p>
                    </div>
                  ))}
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar column */}
          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" /> Notificaciones
              </h3>
              <div className="space-y-3">
                {notifications.map((n, i) => (
                  <div key={i} className="flex gap-3 pb-3 border-b last:border-0 last:pb-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <n.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-relaxed">{n.text}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" /> Estado de pago
              </h3>
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">Al día</span>
                </div>
                <p className="text-xs text-muted-foreground">Próximo pago: 5 de Mayo • $180.000</p>
              </div>
              <Button className="w-full mt-3" size="sm">Ver historial</Button>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" /> Próximos eventos
              </h3>
              <div className="space-y-2">
                {[
                  { day: "19", month: "ABR", title: "Partido vs. Real Cali", time: "10:00" },
                  { day: "21", month: "ABR", title: "Entrenamiento", time: "15:00" },
                  { day: "23", month: "ABR", title: "Evaluación física", time: "16:30" },
                ].map((e, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="w-11 h-11 rounded-lg bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary leading-none">{e.day}</span>
                      <span className="text-[9px] text-primary uppercase">{e.month}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{e.title}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {e.time}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Goal Dialog */}
      <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar objetivo del mes</DialogTitle>
            <DialogDescription>Define un objetivo medible y su meta para el mes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal-label">Objetivo</Label>
              <Input
                id="goal-label"
                placeholder="Ej. Tiros al arco"
                value={newGoal.label}
                onChange={(e) => setNewGoal({ ...newGoal, label: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="goal-current">Actual</Label>
                <Input
                  id="goal-current"
                  type="number"
                  min="0"
                  value={newGoal.current}
                  onChange={(e) => setNewGoal({ ...newGoal, current: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-total">Meta</Label>
                <Input
                  id="goal-total"
                  type="number"
                  min="1"
                  placeholder="10"
                  value={newGoal.total}
                  onChange={(e) => setNewGoal({ ...newGoal, total: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGoalOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddGoal}>Guardar objetivo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Match Dialog */}
      <Dialog open={matchOpen} onOpenChange={setMatchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar datos del partido</DialogTitle>
            <DialogDescription>Captura el resultado y estadísticas individuales.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="m-date">Fecha</Label>
                <Input
                  id="m-date"
                  placeholder="12 Abr"
                  value={newMatch.date}
                  onChange={(e) => setNewMatch({ ...newMatch, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-opp">Rival</Label>
                <Input
                  id="m-opp"
                  placeholder="Atlético FC"
                  value={newMatch.opponent}
                  onChange={(e) => setNewMatch({ ...newMatch, opponent: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="m-res">Resultado</Label>
                <select
                  id="m-res"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={newMatch.result}
                  onChange={(e) => setNewMatch({ ...newMatch, result: e.target.value })}
                >
                  <option value="W">Victoria</option>
                  <option value="D">Empate</option>
                  <option value="L">Derrota</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-sf">Goles a favor</Label>
                <Input
                  id="m-sf"
                  type="number"
                  min="0"
                  value={newMatch.scoreFor}
                  onChange={(e) => setNewMatch({ ...newMatch, scoreFor: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-sa">Goles en contra</Label>
                <Input
                  id="m-sa"
                  type="number"
                  min="0"
                  value={newMatch.scoreAgainst}
                  onChange={(e) => setNewMatch({ ...newMatch, scoreAgainst: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="m-g">Goles ⚽</Label>
                <Input
                  id="m-g"
                  type="number"
                  min="0"
                  value={newMatch.goals}
                  onChange={(e) => setNewMatch({ ...newMatch, goals: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-a">Asistencias 🅰️</Label>
                <Input
                  id="m-a"
                  type="number"
                  min="0"
                  value={newMatch.assists}
                  onChange={(e) => setNewMatch({ ...newMatch, assists: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-r">Rating ⭐</Label>
                <Input
                  id="m-r"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={newMatch.rating}
                  onChange={(e) => setNewMatch({ ...newMatch, rating: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddMatch}>Guardar partido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

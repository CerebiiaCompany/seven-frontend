import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy, TrendingUp, TrendingDown, Users, User, Target,
  Zap, Heart, Brain, Shield, Flame, Star, ArrowUpRight
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from "recharts";

// --- Mock Data ---
const teamStats = [
  { label: "Rendimiento Global", value: "78%", change: "+3.2%", trend: "up", icon: Trophy, color: "var(--primary)" },
  { label: "Goles/Partido", value: "2.4", change: "+0.3", trend: "up", icon: Target, color: "var(--kpi-blue)" },
  { label: "Posesión Promedio", value: "58%", change: "-1.1%", trend: "down", icon: Zap, color: "var(--kpi-amber)" },
  { label: "Condición Física", value: "82%", change: "+4.5%", trend: "up", icon: Heart, color: "var(--kpi-green)" },
];

const radarData = [
  { attr: "Técnica", A: 85, B: 70 },
  { attr: "Táctica", A: 78, B: 65 },
  { attr: "Físico", A: 82, B: 75 },
  { attr: "Mental", A: 70, B: 60 },
  { attr: "Velocidad", A: 88, B: 72 },
  { attr: "Resistencia", A: 75, B: 80 },
];

const weeklyProgress = [
  { week: "Sem 1", tecnica: 72, tactica: 65, fisico: 70 },
  { week: "Sem 2", tecnica: 74, tactica: 68, fisico: 73 },
  { week: "Sem 3", tecnica: 78, tactica: 70, fisico: 71 },
  { week: "Sem 4", tecnica: 76, tactica: 74, fisico: 76 },
  { week: "Sem 5", tecnica: 80, tactica: 72, fisico: 79 },
  { week: "Sem 6", tecnica: 83, tactica: 76, fisico: 82 },
  { week: "Sem 7", tecnica: 85, tactica: 78, fisico: 82 },
  { week: "Sem 8", tecnica: 84, tactica: 80, fisico: 85 },
];

const topPlayers = [
  { name: "Sofía Ramírez", position: "MC", rating: 85, trend: "+3", avatar: "SR" },
  { name: "Juan Pérez", position: "DC", rating: 82, trend: "+2", avatar: "JP" },
  { name: "Diego Torres", position: "DC", rating: 79, trend: "+5", avatar: "DT" },
  { name: "María López", position: "DF", rating: 78, trend: "+1", avatar: "ML" },
  { name: "Carlos Díaz", position: "MC", rating: 75, trend: "+4", avatar: "CD" },
];

const matchPerformance = [
  { match: "vs León FC", result: "3-1", rating: 8.2, possession: 62, shots: 14 },
  { match: "vs Águilas", result: "1-1", rating: 6.8, possession: 55, shots: 9 },
  { match: "vs Tigres Jr", result: "2-0", rating: 7.5, possession: 58, shots: 11 },
  { match: "vs Halcones", result: "4-2", rating: 8.8, possession: 61, shots: 18 },
  { match: "vs Cóndores", result: "1-2", rating: 5.9, possession: 48, shots: 7 },
];

const Performance = () => {
  const [period, setPeriod] = useState("month");

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Rendimiento</h1>
            <p className="text-sm text-muted-foreground mt-1">Análisis y métricas del equipo e individuales</p>
          </div>
          <div className="flex gap-1 bg-muted/60 rounded-lg p-1">
            {["week", "month", "season"].map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {p === "week" ? "Semana" : p === "month" ? "Mes" : "Temporada"}
              </button>
            ))}
          </div>
        </motion.div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {teamStats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="kpi-card">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `hsl(${s.color} / 0.12)` }}>
                  <s.icon className="w-4 h-4" style={{ color: `hsl(${s.color})` }} />
                </div>
                <span className={`text-[11px] font-semibold flex items-center gap-0.5 ${s.trend === "up" ? "text-primary" : "text-destructive"}`}>
                  {s.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {s.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <Tabs defaultValue="team" className="space-y-5">
          <TabsList className="bg-muted/60">
            <TabsTrigger value="team" className="text-xs gap-1.5"><Users className="w-3.5 h-3.5" />Equipo</TabsTrigger>
            <TabsTrigger value="individual" className="text-xs gap-1.5"><User className="w-3.5 h-3.5" />Individual</TabsTrigger>
            <TabsTrigger value="matches" className="text-xs gap-1.5"><Trophy className="w-3.5 h-3.5" />Partidos</TabsTrigger>
          </TabsList>

          {/* Team */}
          <TabsContent value="team">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Radar */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-5">
                <h3 className="font-semibold text-sm text-foreground mb-1">Perfil del Equipo</h3>
                <p className="text-[11px] text-muted-foreground mb-4">Comparación vs promedio de liga</p>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="attr" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Equipo" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                    <Radar name="Liga" dataKey="B" stroke="hsl(var(--kpi-amber))" fill="hsl(var(--kpi-amber))" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 4" />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="flex gap-4 justify-center text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(var(--primary))" }} />Equipo</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(var(--kpi-amber))" }} />Liga</span>
                </div>
              </motion.div>

              {/* Weekly Progress */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-5">
                <h3 className="font-semibold text-sm text-foreground mb-1">Progreso Semanal</h3>
                <p className="text-[11px] text-muted-foreground mb-4">Evolución por pilar de rendimiento</p>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={weeklyProgress}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis domain={[50, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="tecnica" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} strokeWidth={2} />
                    <Area type="monotone" dataKey="tactica" stroke="hsl(var(--kpi-blue))" fill="hsl(var(--kpi-blue))" fillOpacity={0.1} strokeWidth={2} />
                    <Area type="monotone" dataKey="fisico" stroke="hsl(var(--kpi-amber))" fill="hsl(var(--kpi-amber))" fillOpacity={0.1} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex gap-4 justify-center text-[11px] text-muted-foreground mt-2">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(var(--primary))" }} />Técnica</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(var(--kpi-blue))" }} />Táctica</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(var(--kpi-amber))" }} />Físico</span>
                </div>
              </motion.div>
            </div>
          </TabsContent>

          {/* Individual */}
          <TabsContent value="individual">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card overflow-hidden">
              <div className="p-5 border-b border-border">
                <h3 className="font-semibold text-sm text-foreground">Top Rendimiento</h3>
                <p className="text-[11px] text-muted-foreground">Mejores deportistas del período</p>
              </div>
              <div className="divide-y divide-border">
                {topPlayers.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                    <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0" style={{ background: "hsl(var(--primary))" }}>
                      {p.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">{p.position}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">{p.rating}</p>
                      <p className="text-[10px] text-primary font-semibold flex items-center gap-0.5 justify-end"><ArrowUpRight className="w-3 h-3" />{p.trend}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </TabsContent>

          {/* Matches */}
          <TabsContent value="matches">
            <div className="space-y-3">
              {matchPerformance.map((m, i) => (
                <motion.div key={m.match} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="glass-card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm text-foreground">{m.match}</h3>
                      <Badge variant="secondary" className="text-[10px] font-bold">{m.result}</Badge>
                    </div>
                    <div className="flex gap-4 text-[11px] text-muted-foreground mt-1">
                      <span>Posesión: {m.possession}%</span>
                      <span>Tiros: {m.shots}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Rating</span>
                    <div className={`px-3 py-1.5 rounded-lg font-bold text-sm ${m.rating >= 8 ? "bg-primary/15 text-primary" : m.rating >= 7 ? "bg-[hsl(var(--kpi-blue))]/15 text-[hsl(var(--kpi-blue))]" : m.rating >= 6 ? "bg-[hsl(var(--kpi-amber))]/15 text-[hsl(var(--kpi-amber))]" : "bg-destructive/15 text-destructive"}`}>
                      {m.rating}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Performance;

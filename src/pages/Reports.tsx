import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, FileSpreadsheet, TrendingUp, Users, Trophy, Calendar } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell
} from "recharts";

const monthlyPerf = [
  { month: "Ene", goles: 22, asistencias: 14, victorias: 6 },
  { month: "Feb", goles: 28, asistencias: 18, victorias: 7 },
  { month: "Mar", goles: 35, asistencias: 22, victorias: 8 },
  { month: "Abr", goles: 41, asistencias: 28, victorias: 9 },
];

const categoryDist = [
  { name: "Sub-13", value: 28, color: "hsl(var(--chart-1))" },
  { name: "Sub-15", value: 32, color: "hsl(var(--chart-2))" },
  { name: "Sub-17", value: 24, color: "hsl(var(--chart-3))" },
  { name: "Sub-19", value: 18, color: "hsl(var(--chart-4))" },
];

const topPlayers = [
  { name: "Mateo Rodríguez", goals: 18, assists: 9, rating: 8.7 },
  { name: "Santiago López", goals: 14, assists: 12, rating: 8.4 },
  { name: "Diego Martínez", goals: 12, assists: 7, rating: 8.1 },
  { name: "Juan Hernández", goals: 10, assists: 11, rating: 7.9 },
  { name: "Felipe Castro", goals: 8, assists: 14, rating: 7.8 },
];

const reportTemplates = [
  { title: "Reporte individual", desc: "Estadísticas completas por deportista", icon: Users },
  { title: "Reporte de equipo", desc: "Rendimiento colectivo y comparativas", icon: Trophy },
  { title: "Reporte de asistencia", desc: "Histórico mensual de presencia", icon: Calendar },
  { title: "Análisis comparativo", desc: "Métricas vs. liga y benchmarks", icon: TrendingUp },
];

export default function Reports() {
  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold">Reportes y Analítica</h1>
            <p className="text-muted-foreground mt-1">Métricas, comparativas y exportación de datos</p>
          </div>
          <div className="flex gap-2">
            <Select defaultValue="month">
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Último mes</SelectItem>
                <SelectItem value="quarter">Trimestre</SelectItem>
                <SelectItem value="year">Año completo</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2"><Download className="w-4 h-4" /> PDF</Button>
            <Button variant="outline" className="gap-2"><FileSpreadsheet className="w-4 h-4" /> Excel</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: "Reportes generados", value: "147", change: "+12%", icon: FileText, color: "kpi-blue" },
            { label: "Goles totales", value: "126", change: "+18%", icon: Trophy, color: "kpi-amber" },
            { label: "Tasa victoria", value: "68%", change: "+5%", icon: TrendingUp, color: "kpi-green" },
            { label: "Deportistas activos", value: "102", change: "+8", icon: Users, color: "kpi-blue" },
          ].map((kpi) => (
            <Card key={kpi.label} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-2xl font-bold mt-2">{kpi.value}</p>
                  <p className="text-xs text-primary mt-1">{kpi.change}</p>
                </div>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `hsl(var(--${kpi.color}) / 0.15)` }}>
                  <kpi.icon className="w-4 h-4" style={{ color: `hsl(var(--${kpi.color}))` }} />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList>
            <TabsTrigger value="performance">Rendimiento</TabsTrigger>
            <TabsTrigger value="players">Jugadores</TabsTrigger>
            <TabsTrigger value="templates">Plantillas</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6 col-span-2">
                <h3 className="font-semibold mb-4">Evolución mensual del equipo</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyPerf}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Legend />
                    <Bar dataKey="goles" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="asistencias" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="victorias" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-4">Distribución por categoría</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={categoryDist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {categoryDist.map((c, i) => <Cell key={i} fill={c.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {categoryDist.map((c) => (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }} />
                        <span>{c.name}</span>
                      </div>
                      <span className="font-semibold">{c.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Tendencia comparativa vs. liga</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={monthlyPerf}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Legend />
                  <Line type="monotone" dataKey="goles" stroke="hsl(var(--chart-1))" strokeWidth={3} dot={{ r: 5 }} />
                  <Line type="monotone" dataKey="asistencias" stroke="hsl(var(--chart-2))" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          <TabsContent value="players">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Top rendimiento individual</h3>
              <div className="space-y-2">
                {topPlayers.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/40 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center font-bold text-sm text-primary">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{p.name}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-0.5">
                        <span>⚽ {p.goals} goles</span>
                        <span>🅰️ {p.assists} asistencias</span>
                      </div>
                    </div>
                    <Badge className="bg-primary/15 text-primary border-0 text-base px-3 py-1">{p.rating}</Badge>
                    <Button variant="outline" size="sm">Ver reporte</Button>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <div className="grid grid-cols-2 gap-4">
              {reportTemplates.map((t) => (
                <Card key={t.title} className="p-6 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                      <t.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{t.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" className="gap-1.5"><Download className="w-3.5 h-3.5" /> PDF</Button>
                        <Button size="sm" variant="outline" className="gap-1.5"><FileSpreadsheet className="w-3.5 h-3.5" /> Excel</Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

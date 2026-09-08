import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const performanceData = [
  { month: "Ene", tecnica: 65, fisica: 70, tactica: 55 },
  { month: "Feb", tecnica: 68, fisica: 72, tactica: 60 },
  { month: "Mar", tecnica: 72, fisica: 68, tactica: 65 },
  { month: "Abr", tecnica: 75, fisica: 74, tactica: 70 },
  { month: "May", tecnica: 78, fisica: 76, tactica: 72 },
  { month: "Jun", tecnica: 82, fisica: 80, tactica: 78 },
];

const attendanceData = [
  { day: "Lun", asistencia: 92 },
  { day: "Mar", asistencia: 88 },
  { day: "Mié", asistencia: 95 },
  { day: "Jue", asistencia: 85 },
  { day: "Vie", asistencia: 90 },
  { day: "Sáb", asistencia: 78 },
];

export function PerformanceChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="glass-card p-5"
    >
      <h3 className="font-display font-semibold text-foreground mb-1">Rendimiento Promedio</h3>
      <p className="text-xs text-muted-foreground mb-4">Evolución por pilar — Últimos 6 meses</p>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={performanceData}>
          <defs>
            <linearGradient id="colorTecnica" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.25} />
              <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorFisica" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorTactica" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              color: "hsl(var(--popover-foreground))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Area type="monotone" dataKey="tecnica" stroke="hsl(var(--chart-1))" fill="url(#colorTecnica)" strokeWidth={2} name="Técnica" />
          <Area type="monotone" dataKey="fisica" stroke="hsl(var(--chart-2))" fill="url(#colorFisica)" strokeWidth={2} name="Física" />
          <Area type="monotone" dataKey="tactica" stroke="hsl(var(--chart-3))" fill="url(#colorTactica)" strokeWidth={2} name="Táctica" />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

export function AttendanceChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
      className="glass-card p-5"
    >
      <h3 className="font-display font-semibold text-foreground mb-1">Asistencia Semanal</h3>
      <p className="text-xs text-muted-foreground mb-4">Porcentaje por día</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={attendanceData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              color: "hsl(var(--popover-foreground))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Bar dataKey="asistencia" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Asistencia %" />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

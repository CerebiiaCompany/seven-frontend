import { useEffect, useState } from "react";
import { startOfWeek, addDays, isSameDay } from "date-fns";
import { DashboardLayout } from "@/components/DashboardLayout";
import { KpiCard } from "@/components/KpiCard";
import { RecentActivity } from "@/components/RecentActivity";
import { PerformanceChart, AttendanceChart } from "@/components/DashboardCharts";
import { Users, CalendarCheck, DollarSign, TrendingUp, Bell } from "lucide-react";
import { motion } from "framer-motion";
import api from "@/lib/api";

const alerts = [
  { text: "5 pagos pendientes para este mes", type: "warning" as const },
  { text: "Torneo regional en 3 días", type: "info" as const },
  { text: "2 jugadores sin evaluación reciente", type: "warning" as const },
];

interface SessionAttendanceItem {
  training_session: { scheduled_at: string };
  summary: { attendance_rate: number };
}

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const Dashboard = () => {
  const [totalPlayers, setTotalPlayers] = useState<number | null>(null);
  const [avgAttendance, setAvgAttendance] = useState<number | null>(null);
  const [weeklyAttendance, setWeeklyAttendance] = useState(
    WEEKDAY_LABELS.map((day) => ({ day, asistencia: 0 })),
  );

  useEffect(() => {
    api
      .get<{ count: number }>("/players/", { params: { status: "confirmed", page_size: 1 } })
      .then(({ data }) => setTotalPlayers(data.count))
      .catch(() => { /* deja el KPI en "—" si falla */ });

    api
      .get<SessionAttendanceItem[]>("/training-sessions/attendance-history/")
      .then(({ data }) => {
        if (data.length === 0) {
          setAvgAttendance(0);
          return;
        }
        const avg = data.reduce((sum, s) => sum + s.summary.attendance_rate, 0) / data.length;
        setAvgAttendance(Math.round(avg));

        // Asistencia por día de la semana en curso: promedia las sesiones de
        // cada día (puede haber más de una) contra las ya registradas.
        const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
        setWeeklyAttendance(
          WEEKDAY_LABELS.map((day, i) => {
            const date = addDays(monday, i);
            const sessions = data.filter((s) =>
              isSameDay(new Date(s.training_session.scheduled_at), date)
            );
            const asistencia = sessions.length
              ? Math.round(sessions.reduce((sum, s) => sum + s.summary.attendance_rate, 0) / sessions.length)
              : 0;
            return { day, asistencia };
          }),
        );
      })
      .catch(() => { /* deja el gráfico en 0 si falla */ });
  }, []);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Resumen general del club — Marzo 2026</p>
        </motion.div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard icon={Users} title="Total Deportistas" value={totalPlayers === null ? "—" : String(totalPlayers)} color="green" delay={0.05} />
          <KpiCard icon={CalendarCheck} title="Asistencia Promedio" value={avgAttendance === null ? "—" : `${avgAttendance}%`} color="blue" delay={0.1} />
          <KpiCard icon={DollarSign} title="Ingresos del Mes" value="$12.4M" change="+8%" trend="up" color="amber" delay={0.15} />
          <KpiCard icon={TrendingUp} title="Rendimiento Prom." value="76.3" change="-2%" trend="down" color="red" delay={0.2} />
        </div>

        {/* Alerts bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-4 mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-kpi-amber" />
            <h3 className="font-display font-semibold text-sm text-foreground">Alertas</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {alerts.map((a, i) => (
              <span
                key={i}
                className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                  a.type === "warning"
                    ? "bg-kpi-amber/10 text-kpi-amber"
                    : "bg-kpi-blue/10 text-kpi-blue"
                }`}
              >
                {a.text}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Charts + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <PerformanceChart />
            <AttendanceChart data={weeklyAttendance} />
          </div>
          <div>
            <RecentActivity />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;

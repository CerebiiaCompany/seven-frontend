import { motion } from "framer-motion";
import { Clock, AlertTriangle, CreditCard, UserCheck } from "lucide-react";

const activities = [
  { icon: UserCheck, label: "Juan Pérez registró asistencia", time: "Hace 5 min", color: "var(--kpi-green)" },
  { icon: CreditCard, label: "Pago recibido — María López", time: "Hace 12 min", color: "var(--kpi-blue)" },
  { icon: AlertTriangle, label: "3 jugadores sin pago este mes", time: "Hace 30 min", color: "var(--kpi-amber)" },
  { icon: Clock, label: "Entrenamiento Sub-15 completado", time: "Hace 1h", color: "var(--kpi-green)" },
  { icon: AlertTriangle, label: "Carlos Díaz — 3 inasistencias seguidas", time: "Hace 2h", color: "var(--kpi-red)" },
];

export function RecentActivity() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="glass-card p-5"
    >
      <h3 className="font-display font-semibold text-foreground mb-4">Actividad Reciente</h3>
      <div className="space-y-3">
        {activities.map((item, i) => (
          <div key={i} className="flex items-start gap-3 py-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: `hsl(${item.color} / 0.1)` }}
            >
              <item.icon className="w-4 h-4" style={{ color: `hsl(${item.color})` }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

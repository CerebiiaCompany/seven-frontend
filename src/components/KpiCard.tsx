import { TrendingUp, TrendingDown, LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface KpiCardProps {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: LucideIcon;
  color: "green" | "blue" | "amber" | "red";
  delay?: number;
}

const colorMap = {
  green: "var(--kpi-green)",
  blue: "var(--kpi-blue)",
  amber: "var(--kpi-amber)",
  red: "var(--kpi-red)",
};

export function KpiCard({ title, value, change, trend, icon: Icon, color, delay = 0 }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="kpi-card"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: `hsl(${colorMap[color]} / 0.1)` }}
        >
          <Icon className="w-5 h-5" style={{ color: `hsl(${colorMap[color]})` }} />
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
          trend === "up" ? "bg-accent text-accent-foreground" : "bg-destructive/10 text-destructive"
        }`}>
          {trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {change}
        </div>
      </div>
      <p className="text-2xl font-display font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{title}</p>
    </motion.div>
  );
}

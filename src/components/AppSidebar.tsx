import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, UserCog, Calendar, Trophy, CreditCard,
  BarChart3, Video, GraduationCap, Settings, ChevronLeft, ChevronRight,
  Zap, FileText, ClipboardCheck, LogOut
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const navSections = [
  {
    label: "Principal",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
      { icon: Users, label: "Deportistas", path: "/players" },
      { icon: UserCog, label: "Entrenadores", path: "/coaches" },
      { icon: Calendar, label: "Calendario", path: "/calendar" },
      { icon: ClipboardCheck, label: "Asistencia", path: "/attendance" },
    ],
  },
  {
    label: "Deportivo",
    items: [
      { icon: Trophy, label: "Rendimiento", path: "/performance" },
      { icon: Zap, label: "Squad Builder", path: "/gamification" },
      { icon: BarChart3, label: "Reportes", path: "/reports" },
    ],
  },
  {
    label: "Administración",
    items: [
      { icon: CreditCard, label: "Pagos", path: "/payments" },
      { icon: FileText, label: "Formularios", path: "/forms" },
      { icon: Video, label: "Contenido", path: "/content" },
      { icon: GraduationCap, label: "Portal Familia", path: "/family" },
    ],
  },
];

interface SidebarContentProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function SidebarNav({ collapsed = false, onNavigate }: SidebarContentProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const go = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  return (
    <>
      <nav className="sidebar-scroll flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navSections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 px-3"
                style={{ color: "hsl(var(--sidebar-fg) / 0.5)" }}>
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => go(item.path)}
                    className={`sidebar-item w-full ${isActive ? "sidebar-item-active" : ""}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-3 pb-4 space-y-1">
        <button
          className={`sidebar-item w-full ${location.pathname === "/settings" ? "sidebar-item-active" : ""}`}
          onClick={() => go("/settings")}
          title={collapsed ? "Configuración" : undefined}
        >
          <Settings className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>Configuración</span>}
        </button>
      </div>
    </>
  );
}

export function SidebarBrand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 h-16 border-b" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary shadow-[0_0_20px_hsl(var(--primary)/0.28)]">
        <Zap className="w-4 h-4 text-primary-foreground" />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="text-sm font-display font-bold text-foreground">Soccer Future</p>
          <p className="text-[10px] font-medium uppercase text-primary">Seven Soccer Club</p>
        </div>
      )}
    </div>
  );
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { signOut } = useAuth();

  return (
    <aside
      className="hidden lg:flex flex-col h-screen sticky top-0 transition-all duration-300 border-r"
      style={{
        width: collapsed ? 72 : 260,
        background: "hsl(var(--sidebar-bg))",
        borderColor: "hsl(var(--sidebar-border))",
      }}
    >
      <SidebarBrand collapsed={collapsed} />
      <SidebarNav collapsed={collapsed} />
      <div className="px-3 pb-4">
        <button onClick={() => void signOut()} className="sidebar-item mb-1 w-full" title={collapsed ? "Cerrar sesión" : undefined}>
          <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
          {!collapsed && <span className="text-xs">Cerrar sesión</span>}
        </button>
        <button onClick={() => setCollapsed(!collapsed)} className="sidebar-item w-full">
          {collapsed ? <ChevronRight className="w-[18px] h-[18px]" /> : <ChevronLeft className="w-[18px] h-[18px]" />}
          {!collapsed && <span className="text-xs">Colapsar</span>}
        </button>
      </div>
    </aside>
  );
}

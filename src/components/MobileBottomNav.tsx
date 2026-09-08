import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Trophy, Briefcase, User, Settings, LogOut } from "lucide-react";
import { navSections } from "./AppSidebar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";

const tabs = [
  { key: "Principal", label: "Principal", icon: LayoutDashboard },
  { key: "Deportivo", label: "Deportivo", icon: Trophy },
  { key: "Administración", label: "Admin", icon: Briefcase },
];

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const { signOut } = useAuth();

  const section = navSections.find((s) => s.label === openKey);
  const isProfile = openKey === "Perfil";

  const sectionActive = (key: string) =>
    navSections
      .find((s) => s.label === key)
      ?.items.some((i) => i.path === location.pathname) ?? false;

  const go = (path: string) => {
    navigate(path);
    setOpenKey(null);
  };

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t grid grid-cols-4"
        style={{
          background: "hsl(var(--sidebar-bg))",
          borderColor: "hsl(var(--sidebar-border))",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {tabs.map((t) => {
          const active = sectionActive(t.key) || openKey === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setOpenKey(openKey === t.key ? null : t.key)}
              className="flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors"
              style={{ color: active ? "hsl(var(--sidebar-active))" : "hsl(var(--sidebar-fg))" }}
            >
              <t.icon className="w-5 h-5" />
              <span>{t.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setOpenKey(openKey === "Perfil" ? null : "Perfil")}
          className="flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors"
          style={{
            color:
              location.pathname === "/settings" || openKey === "Perfil"
                ? "hsl(var(--sidebar-active))"
                : "hsl(var(--sidebar-fg))",
          }}
        >
          <User className="w-5 h-5" />
          <span>Perfil</span>
        </button>
      </nav>

      <Sheet open={openKey !== null} onOpenChange={(o) => !o && setOpenKey(null)}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl border-t p-0 pb-[env(safe-area-inset-bottom)]"
          style={{ background: "hsl(var(--sidebar-bg))", borderColor: "hsl(var(--sidebar-border))" }}
        >
          <SheetHeader className="px-5 pt-5 pb-2 text-left">
            <SheetTitle className="text-sm text-foreground">
              {openKey}
            </SheetTitle>
          </SheetHeader>
          <div className="px-3 pb-6 space-y-1">
            {isProfile ? (
              <>
                <button
                  onClick={() => go("/settings")}
                  className={`sidebar-item w-full ${location.pathname === "/settings" ? "sidebar-item-active" : ""}`}
                >
                  <Settings className="w-[18px] h-[18px]" />
                  <span>Configuración</span>
                </button>
                <button onClick={() => void signOut()} className="sidebar-item w-full">
                  <LogOut className="h-[18px] w-[18px]" />
                  <span>Cerrar sesión</span>
                </button>
              </>
            ) : (
              section?.items.map((item) => (
                <button
                  key={item.path}
                  onClick={() => go(item.path)}
                  className={`sidebar-item w-full ${location.pathname === item.path ? "sidebar-item-active" : ""}`}
                >
                  <item.icon className="w-[18px] h-[18px]" />
                  <span>{item.label}</span>
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

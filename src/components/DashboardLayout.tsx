import { Zap } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { MobileBottomNav } from "./MobileBottomNav";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header
          className="lg:hidden sticky top-0 z-40 flex items-center gap-2 h-14 px-4 border-b"
          style={{ background: "hsl(var(--sidebar-bg))", borderColor: "hsl(var(--sidebar-border))" }}
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary shadow-[0_0_18px_hsl(var(--primary)/0.3)]">
            <Zap className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <span className="block text-sm font-display font-bold text-foreground">Soccer Future</span>
            <span className="block text-[9px] font-medium uppercase text-primary">Seven Soccer Club</span>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden pb-20 lg:pb-0">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
}

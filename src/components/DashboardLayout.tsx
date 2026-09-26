import { AppSidebar } from "./AppSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { ClubBrandMark } from "./ClubBrandMark";

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
          <ClubBrandMark className="w-7 h-7" textClassName="text-[8px]" />
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

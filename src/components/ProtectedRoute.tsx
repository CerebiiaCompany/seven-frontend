import { Navigate, useLocation } from "react-router-dom";
import { LoaderCircle, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary shadow-[0_0_24px_hsl(var(--primary)/0.3)]">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm">Preparando tu espacio...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
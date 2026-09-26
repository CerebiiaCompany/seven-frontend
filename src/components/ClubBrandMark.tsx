import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface ClubBrandMarkProps {
  className?: string;
  textClassName?: string;
}

/**
 * Marca del club (escudo o placeholder "SFF") usada en el sidebar y la
 * barra superior móvil. Circular y `object-cover` para no deformar el
 * escudo subido desde Configuración; se actualiza sola en cuanto cambia
 * `user.club_logo` en `AuthContext` (mismo estado global que usa Settings).
 */
export function ClubBrandMark({ className, textClassName }: ClubBrandMarkProps) {
  const { user } = useAuth();

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden",
        user?.club_logo ? "bg-transparent" : "bg-primary shadow-[0_0_20px_hsl(var(--primary)/0.28)]",
        className,
      )}
    >
      {user?.club_logo ? (
        <img src={user.club_logo} alt="Escudo del club" className="w-full h-full object-cover" />
      ) : (
        <span className={cn("font-display font-bold text-primary-foreground", textClassName)}>SFF</span>
      )}
    </div>
  );
}

import { cn } from "@/lib/utils";

interface UserAvatarProps {
  photoUrl?: string | null;
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

const DEFAULT_FALLBACK_STYLE: React.CSSProperties = {
  background: "hsl(var(--primary) / 0.1)",
  color: "hsl(var(--primary))",
};

/** Foto de perfil si el usuario tiene una; si no, sus iniciales — mismo criterio en toda la app. */
export function UserAvatar({ photoUrl, name, className, style }: UserAvatarProps) {
  return (
    <div
      className={cn("flex items-center justify-center font-bold flex-shrink-0 overflow-hidden", className)}
      style={photoUrl ? undefined : (style ?? DEFAULT_FALLBACK_STYLE)}
    >
      {photoUrl ? (
        <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        initialsOf(name)
      )}
    </div>
  );
}

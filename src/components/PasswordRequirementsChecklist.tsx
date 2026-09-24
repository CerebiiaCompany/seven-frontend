import { CheckCircle2, Circle } from "lucide-react";
import { evaluatePassword } from "@/lib/passwordRequirements";

export function PasswordRequirementsChecklist({
  newPassword, confirmPassword,
}: {
  newPassword: string;
  confirmPassword: string;
}) {
  const { requirements, passwordsMatch } = evaluatePassword(newPassword, confirmPassword);

  return (
    <ul className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
      {requirements.map((r) => (
        <li key={r.key} className={`flex items-center gap-2 text-xs ${r.met ? "text-primary" : "text-muted-foreground"}`}>
          {r.met ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> : <Circle className="h-3.5 w-3.5 flex-shrink-0" />}
          {r.label}
        </li>
      ))}
      <li className={`flex items-center gap-2 text-xs ${passwordsMatch ? "text-primary" : "text-muted-foreground"}`}>
        {passwordsMatch ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> : <Circle className="h-3.5 w-3.5 flex-shrink-0" />}
        Las contraseñas coinciden
      </li>
    </ul>
  );
}

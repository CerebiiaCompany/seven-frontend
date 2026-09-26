import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Copy, Plus, Trash2, Users, UserX } from "lucide-react";

// Color por rol (mismos tokens `--kpi-*` que usan los KPIs del dashboard),
// para poder identificar el rol de un vistazo en los chips y las filas.
const ROLE_COLOR_VAR: Record<string, string> = {
  coach: "--kpi-blue",
  parent: "--kpi-amber",
  player: "--kpi-green",
};
const roleColorVar = (role: string) => ROLE_COLOR_VAR[role] ?? "--primary";

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  role_display: string;
  is_active: boolean;
  is_staff: boolean;
  initial: string;
}

interface RoleOption {
  value: string;
  label: string;
}

interface NewUserCredentials {
  fullName: string;
  email: string;
  password: string;
}

const emptyInvite = { first_name: "", last_name: "", email: "", phone_number: "", role: "" };

// El registro público (`/auth/register/`) exige datos de deportista + acudiente
// cuando role === "player" — esta pantalla invita entrenadores/padres, no
// deportistas (esos se registran desde el flujo público con esos datos).
const INVITABLE_ROLES = new Set(["coach", "parent"]);

const randomPassword = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);

/**
 * Usuarios y roles del sistema, persistidos en el backend (`/api/v1/users/`).
 * El rol es el mismo `User.Role` que usa el login/permisos — no se inventa
 * ninguno nuevo aquí.
 */
export function UsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState(emptyInvite);
  const [inviting, setInviting] = useState(false);
  const [credentials, setCredentials] = useState<NewUserCredentials | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get<AdminUser[]>("/users/"),
        api.get<RoleOption[]>("/users/roles/"),
      ]);
      setDenied(false);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 403) {
        setDenied(true);
      } else {
        toast({ title: "No se pudieron cargar los usuarios", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const changeRole = async (user: AdminUser, role: string) => {
    const previous = user.role;
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role } : u)));
    try {
      const { data } = await api.patch<AdminUser>(`/users/${user.id}/role/`, { role });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? data : u)));
      toast({ title: "Rol actualizado", description: `${user.full_name} ahora es ${data.role_display}.` });
    } catch (error) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: previous } : u)));
      toast({ title: "No se pudo actualizar el rol", variant: "destructive" });
    }
  };

  const removeUser = async (user: AdminUser) => {
    try {
      await api.delete(`/users/${user.id}/`);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      toast({ title: "Usuario eliminado", description: `${user.full_name} fue desactivado.` });
    } catch (error) {
      toast({ title: "No se pudo eliminar el usuario", variant: "destructive" });
    }
  };

  const invite = async () => {
    const { first_name, last_name, email, phone_number, role } = inviteForm;
    if (!first_name.trim() || !last_name.trim() || !email.trim() || !phone_number.trim() || !role) {
      toast({ title: "Completa todos los campos", variant: "destructive" });
      return;
    }
    setInviting(true);
    const password = randomPassword();
    try {
      const { data } = await api.post("/auth/register/", {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim(),
        phone_number: phone_number.trim(),
        role,
        password,
        password_confirm: password,
      });
      setUsers((prev) => [
        {
          id: data.id,
          full_name: data.full_name,
          email: data.email,
          role: data.role,
          role_display: roles.find((r) => r.value === data.role)?.label ?? data.role,
          is_active: true,
          is_staff: false,
          initial: (data.full_name?.[0] || data.email[0]).toUpperCase(),
        },
        ...prev,
      ]);
      toast({ title: "Usuario creado correctamente." });
      setInviteOpen(false);
      setInviteForm(emptyInvite);
      setCredentials({ fullName: data.full_name || `${first_name} ${last_name}`.trim(), email: data.email, password });
    } catch (error) {
      const detail = isAxiosError(error)
        ? Object.values(error.response?.data?.error?.details ?? {})[0]?.[0]
        : null;
      toast({ title: typeof detail === "string" ? detail : "No se pudo invitar al usuario", variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const copyCredentials = async () => {
    if (!credentials) return;
    const text = `Bienvenido a Soccer Future.\n\nCorreo: ${credentials.email}\nContraseña temporal: ${credentials.password}\n\nInicia sesión y cambia tu contraseña cuando ingreses por primera vez.`;
    await navigator.clipboard.writeText(text);
    toast({ title: "Credenciales copiadas." });
  };

  const copyPasswordOnly = async () => {
    if (!credentials) return;
    await navigator.clipboard.writeText(credentials.password);
    toast({ title: "Contraseña copiada." });
  };

  const filteredUsers = roleFilter === "all" ? users : users.filter((u) => u.role === roleFilter);
  const roleCounts = roles.reduce<Record<string, number>>((acc, r) => {
    acc[r.value] = users.filter((u) => u.role === r.value).length;
    return acc;
  }, {});

  if (denied) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        Tu cuenta no tiene permiso para administrar usuarios. Pide al administrador del club que te asigne el rol de administrador o entrenador.
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Usuarios y roles</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Quién puede acceder al panel y con qué permisos</p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={(o) => { setInviteOpen(o); if (!o) setInviteForm(emptyInvite); }}>
          <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={() => setInviteOpen(true)}>
            <Plus className="w-4 h-4" /> Invitar usuario
          </Button>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invitar usuario</DialogTitle>
              <DialogDescription>Crea la cuenta con una contraseña temporal que podrás compartir.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nombre</Label>
                  <Input value={inviteForm.first_name} onChange={(e) => setInviteForm((f) => ({ ...f, first_name: e.target.value }))} />
                </div>
                <div>
                  <Label>Apellido</Label>
                  <Input value={inviteForm.last_name} onChange={(e) => setInviteForm((f) => ({ ...f, last_name: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Correo</Label>
                <Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input value={inviteForm.phone_number} onChange={(e) => setInviteForm((f) => ({ ...f, phone_number: e.target.value }))} />
              </div>
              <div>
                <Label>Rol inicial</Label>
                <Select value={inviteForm.role} onValueChange={(v) => setInviteForm((f) => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecciona un rol" /></SelectTrigger>
                  <SelectContent>
                    {roles.filter((r) => INVITABLE_ROLES.has(r.value)).map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={invite} disabled={inviting}>
                {inviting ? "Invitando..." : "Invitar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!credentials} onOpenChange={(o) => { if (!o) setCredentials(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Usuario creado correctamente</DialogTitle>
            <DialogDescription>Comparte estas credenciales con el usuario para que pueda iniciar sesión.</DialogDescription>
          </DialogHeader>
          {credentials && (
            <div className="space-y-4 pt-1">
              <div>
                <Label>Nombre</Label>
                <p className="text-sm font-medium">{credentials.fullName}</p>
              </div>
              <div>
                <Label>Correo electrónico</Label>
                <p className="text-sm font-medium">{credentials.email}</p>
              </div>
              <div>
                <Label>Contraseña temporal</Label>
                <Input readOnly value={credentials.password} onFocus={(e) => e.target.select()} />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button className="flex-1 gap-2" onClick={copyCredentials}>
                  <Copy className="w-4 h-4" /> Copiar credenciales
                </Button>
                <Button variant="outline" className="flex-1" onClick={copyPasswordOnly}>
                  Copiar solo contraseña
                </Button>
              </div>
              <Button variant="ghost" className="w-full" onClick={() => setCredentials(null)}>
                Cerrar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {!loading && users.length > 0 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 themed-scroll">
          <button
            type="button"
            onClick={() => setRoleFilter("all")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex-shrink-0",
              roleFilter === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent text-muted-foreground border-border hover:bg-muted",
            )}
          >
            Todos <span className="opacity-70">{users.length}</span>
          </button>
          {roles.map((r) => {
            const colorVar = roleColorVar(r.value);
            const active = roleFilter === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setRoleFilter(r.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex-shrink-0",
                  active ? "border-transparent" : "bg-transparent border-border text-muted-foreground hover:bg-muted",
                )}
                style={active ? { background: `hsl(var(${colorVar}) / 0.15)`, color: `hsl(var(${colorVar}))` } : undefined}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: `hsl(var(${colorVar}))` }} />
                {r.label} <span className="opacity-70">{roleCounts[r.value] ?? 0}</span>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Cargando usuarios...</p>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center">
            <Users className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Todavía no hay usuarios registrados.</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center">
            <UserX className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No hay usuarios con ese rol.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((u) => {
            const colorVar = roleColorVar(u.role);
            return (
              <div
                key={u.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm hover:border-primary/30"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: `hsl(var(${colorVar}) / 0.15)`, color: `hsl(var(${colorVar}))` }}
                  >
                    {u.initial}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{u.full_name || "Sin nombre"}</p>
                      {!u.is_active && <Badge variant="outline" className="text-[10px]">Inactivo</Badge>}
                      {u.is_staff && <Badge variant="secondary" className="text-[10px]">Admin</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: `hsl(var(${colorVar}))` }} />
                  <Select value={u.role} onValueChange={(v) => changeRole(u, v)}>
                    <SelectTrigger className="w-full sm:w-[170px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeUser(u)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-muted-foreground mt-4">
        <Badge variant="outline" className="mr-2">Nota</Badge>
        Eliminar desactiva la cuenta; no borra su historial deportivo.
      </p>
    </Card>
  );
}

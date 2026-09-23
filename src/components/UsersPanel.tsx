import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState(emptyInvite);
  const [inviting, setInviting] = useState(false);

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
      toast({
        title: "Usuario invitado",
        description: `Contraseña temporal para ${data.email}: ${password} (compártela y pide que la cambie al ingresar).`,
      });
      setInviteOpen(false);
      setInviteForm(emptyInvite);
    } catch (error) {
      const detail = isAxiosError(error)
        ? Object.values(error.response?.data?.error?.details ?? {})[0]?.[0]
        : null;
      toast({ title: typeof detail === "string" ? detail : "No se pudo invitar al usuario", variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

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
          <h3 className="font-semibold">Usuarios y roles</h3>
          <p className="text-xs text-muted-foreground">Quién puede acceder al panel y con qué permisos</p>
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

      {loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Cargando usuarios...</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Todavía no hay usuarios registrados.</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
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
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground mt-4">
        <Badge variant="outline" className="mr-2">Nota</Badge>
        Eliminar desactiva la cuenta; no borra su historial deportivo.
      </p>
    </Card>
  );
}

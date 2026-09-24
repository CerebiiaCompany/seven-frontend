import { FormEvent, useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Building2, MapPin, Users, Bell, Shield, Save, Upload, Palette, UserCheck,
  Mail, Phone, User as UserIcon, Loader2, Lock, type LucideIcon,
} from "lucide-react";
import { RegistrationsPanel } from "@/components/RegistrationsPanel";
import { CategoriesPanel } from "@/components/CategoriesPanel";
import { UsersPanel } from "@/components/UsersPanel";
import { VenuesPanel } from "@/components/VenuesPanel";
import { PasswordField } from "@/components/PasswordField";
import { PasswordRequirementsChecklist } from "@/components/PasswordRequirementsChecklist";
import { evaluatePassword } from "@/lib/passwordRequirements";
import api from "@/lib/api";
import { useAuth, type AuthUser } from "@/contexts/AuthContext";

const ROLE_LABELS: Record<AuthUser["role"], string> = {
  player: "Jugador",
  coach: "Entrenador",
  parent: "Padre/Tutor",
};

/**
 * Cambio de contraseña posterior al primer ingreso (el usuario ya usa la
 * plataforma con normalidad). El flujo obligatorio de contraseña temporal
 * vive aparte en `/change-password`; si `must_change_password` siguiera en
 * `true` este usuario nunca llegaría a `/settings` (lo bloquea `ProtectedRoute`
 * antes de renderizar la página).
 */
function SecurityPanel() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const { allRequirementsMet, passwordsMatch } = evaluatePassword(newPassword, confirmPassword);
  const canSubmit = currentPassword.length > 0 && allRequirementsMet && passwordsMatch && !saving;

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const closeAndReset = () => {
    setOpen(false);
    resetForm();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    try {
      await api.post("/auth/change-password/", {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirm: confirmPassword,
      });
      toast({ title: "Contraseña actualizada correctamente." });
      closeAndReset();
    } catch (error) {
      const detail = isAxiosError(error)
        ? (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message
        : null;
      toast({ title: detail || "No se pudo actualizar la contraseña", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5 sm:p-6 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2 mb-1">
        <Shield className="w-4 h-4 text-primary" />
        <h3 className="font-semibold">Seguridad</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Mantén tu cuenta protegida actualizando tu contraseña cuando lo necesites.
      </p>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeAndReset())}>
        <DialogTrigger asChild>
          <Button className="gap-2 w-full sm:w-auto">
            <Lock className="w-4 h-4" /> Cambiar contraseña
          </Button>
        </DialogTrigger>
        <DialogContent className="themed-scroll w-[95vw] sm:w-full sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <DialogTitle>Cambiar contraseña</DialogTitle>
            </div>
            <DialogDescription>
              Introduce tu contraseña actual y crea una nueva contraseña segura.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-3.5" onSubmit={submit}>
            <PasswordField
              id="modal-current-password"
              label="Contraseña actual"
              value={currentPassword}
              onChange={setCurrentPassword}
              show={showCurrent}
              onToggleShow={() => setShowCurrent((v) => !v)}
              autoComplete="current-password"
            />
            <PasswordField
              id="modal-new-password"
              label="Nueva contraseña"
              value={newPassword}
              onChange={setNewPassword}
              show={showNew}
              onToggleShow={() => setShowNew((v) => !v)}
              autoComplete="new-password"
            />
            <PasswordField
              id="modal-confirm-password"
              label="Confirmar nueva contraseña"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirm}
              onToggleShow={() => setShowConfirm((v) => !v)}
              autoComplete="new-password"
            />
            <PasswordRequirementsChecklist newPassword={newPassword} confirmPassword={confirmPassword} />

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={closeAndReset} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" className="gap-2" disabled={!canSubmit}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Actualizar contraseña
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ProfileField({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate" title={value}>{value}</p>
      </div>
    </div>
  );
}

/**
 * Perfil de solo lectura para Padre/Jugador: en `/settings` solo ven sus
 * propios datos, nunca la configuración administrativa del club (esa queda
 * detrás de `IsCoachOrAdminRole` también en el backend — ocultar la pestaña
 * aquí es una capa de UX, no la única barrera).
 */
function ProfileOnlySettings({ user }: { user: AuthUser }) {
  const roleLabel = user.is_staff ? "Administrador" : ROLE_LABELS[user.role];
  const initial = (user.full_name?.[0] || user.email[0]).toUpperCase();

  return (
    <DashboardLayout>
      <div className="w-full max-w-[960px] mx-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 overflow-x-hidden">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">Mi perfil</h1>
          <p className="text-sm text-muted-foreground mt-1">Tu información personal</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Card className="p-5 sm:p-6 transition-shadow hover:shadow-md">
            <div className="flex flex-col sm:flex-row gap-5 sm:gap-6">
              <div className="flex sm:flex-col items-center gap-3 sm:gap-2 sm:w-28 flex-shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-display font-bold flex-shrink-0">
                  {initial}
                </div>
                <Badge variant="secondary" className="text-[10px]">{roleLabel}</Badge>
              </div>

              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <ProfileField icon={UserIcon} label="Nombre" value={user.full_name} />
                <ProfileField icon={Mail} label="Correo electrónico" value={user.email} />
                <ProfileField icon={Phone} label="Teléfono" value={user.phone_number || "No registrado"} />
                <ProfileField icon={Shield} label="Rol" value={roleLabel} />
                <ProfileField icon={Building2} label="Club" value={user.club_name} />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
          <SecurityPanel />
        </motion.div>
      </div>
    </DashboardLayout>
  );
}

// Datos del club: persistidos en el backend (`/api/v1/club/settings/`),
// nunca hardcodeados. Usuarios y sedes tienen su propio panel API-backed
// (UsersPanel, VenuesPanel). Solo notificaciones y color siguen en
// localStorage (fuera del alcance de estos cambios).
interface ClubData {
  logo: string | null;
  name: string;
  short_name: string;
  nit: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  description: string;
  currency: string;
  timezone: string;
}

const EMPTY_CLUB: ClubData = {
  logo: null,
  name: "",
  short_name: "",
  nit: "",
  email: "",
  phone: "",
  city: "",
  address: "",
  description: "",
  currency: "COP",
  timezone: "America/Bogota",
};

interface Extras {
  accent: string;
  notifications: {
    attendance: boolean;
    payments: boolean;
    matches: boolean;
    weeklyReport: boolean;
  };
}

const EXTRAS_DEFAULTS: Extras = {
  accent: "153 60% 38%",
  notifications: { attendance: true, payments: true, matches: true, weeklyReport: false },
};

const STORAGE_KEY = "sf_club_settings";

const accents = [
  { label: "Esmeralda", value: "153 60% 38%" },
  { label: "Azul", value: "213 80% 50%" },
  { label: "Ámbar", value: "38 92% 50%" },
  { label: "Violeta", value: "280 60% 55%" },
  { label: "Rojo", value: "0 72% 51%" },
];

/** Configuración completa del club: solo para administradores/entrenadores. */
function AdminClubSettings() {
  const [club, setClub] = useState<ClubData>(EMPTY_CLUB);
  const [clubLoading, setClubLoading] = useState(true);
  const [clubError, setClubError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extras, setExtras] = useState<Extras>(EXTRAS_DEFAULTS);

  const loadClub = useCallback(async () => {
    setClubLoading(true);
    setClubError(false);
    try {
      const { data } = await api.get<ClubData>("/club/settings/");
      setClub(data);
    } catch (error) {
      setClubError(true);
      if (!(isAxiosError(error) && error.response?.status === 403)) {
        toast({ title: "No se pudo cargar la configuración del club", variant: "destructive" });
      }
    } finally {
      setClubLoading(false);
    }
  }, []);

  useEffect(() => { loadClub(); }, [loadClub]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { setExtras({ ...EXTRAS_DEFAULTS, ...JSON.parse(raw) }); } catch { /* ignore */ }
    }
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put<ClubData>("/club/settings/", {
        name: club.name,
        short_name: club.short_name,
        nit: club.nit,
        email: club.email,
        phone: club.phone,
        city: club.city,
        address: club.address,
        description: club.description,
        currency: club.currency,
        timezone: club.timezone,
      });
      setClub(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(extras));
      toast({ title: "Configuración guardada", description: "Los cambios del club se aplicaron correctamente." });
    } catch (error) {
      const detail = isAxiosError(error)
        ? Object.values(error.response?.data?.error?.details ?? {})[0]?.[0]
        : null;
      toast({
        title: typeof detail === "string" ? detail : "No se pudo guardar la configuración",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof ClubData>(k: K, v: ClubData[K]) => setClub((p) => ({ ...p, [k]: v }));
  const setExtra = <K extends keyof Extras>(k: K, v: Extras[K]) => setExtras((p) => ({ ...p, [k]: v }));

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold">Configuración del club</h1>
            <p className="text-sm text-muted-foreground mt-1">Datos, categorías, sedes, usuarios y notificaciones</p>
          </div>
          <Button onClick={save} disabled={saving || clubLoading} className="gap-2 w-full sm:w-auto">
            <Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>

        <Tabs defaultValue="club" className="space-y-4">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="w-max">
              <TabsTrigger value="club" className="gap-1.5"><Building2 className="w-4 h-4" /> Club</TabsTrigger>
              <TabsTrigger value="athletes" className="gap-1.5"><UserCheck className="w-4 h-4" /> Deportistas</TabsTrigger>
              <TabsTrigger value="categories" className="gap-1.5"><Users className="w-4 h-4" /> Categorías</TabsTrigger>
              <TabsTrigger value="venues" className="gap-1.5"><MapPin className="w-4 h-4" /> Sedes</TabsTrigger>
              <TabsTrigger value="team" className="gap-1.5"><Shield className="w-4 h-4" /> Usuarios</TabsTrigger>
              <TabsTrigger value="notifications" className="gap-1.5"><Bell className="w-4 h-4" /> Alertas</TabsTrigger>
            </TabsList>
          </div>

          {/* DEPORTISTAS REGISTRADOS */}
          <TabsContent value="athletes" className="space-y-4">
            <RegistrationsPanel />
          </TabsContent>

          {/* CLUB */}
          <TabsContent value="club" className="space-y-4">
            {clubLoading ? (
              <Card className="p-6 text-sm text-muted-foreground text-center">Cargando configuración del club...</Card>
            ) : (
              <>
                {clubError && (
                  <Card className="p-4 text-sm text-destructive flex items-center justify-between gap-3">
                    No se pudo cargar la configuración del club.
                    <Button variant="outline" size="sm" onClick={loadClub}>Reintentar</Button>
                  </Card>
                )}
                <Card className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-display font-bold text-xl overflow-hidden">
                      {club.logo ? (
                        <img src={club.logo} alt="Escudo del club" className="w-full h-full object-cover" />
                      ) : (
                        club.short_name.slice(0, 3).toUpperCase() || "SF"
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">Escudo del club</p>
                      <p className="text-xs text-muted-foreground">PNG o SVG, mínimo 512x512px</p>
                    </div>
                    <Button variant="outline" className="gap-2 w-full sm:w-auto"><Upload className="w-4 h-4" /> Subir logo</Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label>Nombre del club</Label><Input value={club.name} onChange={(e) => set("name", e.target.value)} /></div>
                    <div><Label>Nombre corto</Label><Input value={club.short_name} onChange={(e) => set("short_name", e.target.value)} /></div>
                    <div><Label>NIT / Identificación</Label><Input value={club.nit} onChange={(e) => set("nit", e.target.value)} /></div>
                    <div><Label>Email de contacto</Label><Input type="email" value={club.email} onChange={(e) => set("email", e.target.value)} /></div>
                    <div><Label>Teléfono</Label><Input value={club.phone} onChange={(e) => set("phone", e.target.value)} /></div>
                    <div><Label>Ciudad</Label><Input value={club.city} onChange={(e) => set("city", e.target.value)} /></div>
                    <div className="md:col-span-2"><Label>Dirección</Label><Input value={club.address} onChange={(e) => set("address", e.target.value)} /></div>
                    <div className="md:col-span-2">
                      <Label>Descripción</Label>
                      <Textarea rows={3} value={club.description} onChange={(e) => set("description", e.target.value)} />
                    </div>
                    <div>
                      <Label>Moneda</Label>
                      <Select value={club.currency} onValueChange={(v) => set("currency", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="COP">COP - Peso colombiano</SelectItem>
                          <SelectItem value="USD">USD - Dólar</SelectItem>
                          <SelectItem value="MXN">MXN - Peso mexicano</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Zona horaria</Label>
                      <Select value={club.timezone} onValueChange={(v) => set("timezone", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/Bogota">America/Bogotá</SelectItem>
                          <SelectItem value="America/Mexico_City">America/Ciudad de México</SelectItem>
                          <SelectItem value="America/Argentina/Buenos_Aires">America/Buenos Aires</SelectItem>
                          <SelectItem value="Europe/Madrid">Europe/Madrid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Palette className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">Color del club</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {accents.map((a) => (
                      <button
                        key={a.value}
                        onClick={() => setExtra("accent", a.value)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                          extras.accent === a.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full" style={{ background: `hsl(${a.value})` }} />
                        {a.label}
                      </button>
                    ))}
                  </div>
                </Card>
              </>
            )}
          </TabsContent>

          {/* CATEGORIES */}
          <TabsContent value="categories">
            <CategoriesPanel />
          </TabsContent>

          {/* VENUES */}
          <TabsContent value="venues">
            <VenuesPanel />
          </TabsContent>

          {/* TEAM */}
          <TabsContent value="team">
            <UsersPanel />
          </TabsContent>

          {/* NOTIFICATIONS */}
          <TabsContent value="notifications">
            <Card className="p-4 sm:p-6 space-y-1">
              {[
                { key: "attendance" as const, title: "Asistencia", desc: "Avisar a acudientes cuando el deportista falte a un entrenamiento" },
                { key: "payments" as const, title: "Pagos", desc: "Recordatorios de mensualidad y avisos de mora" },
                { key: "matches" as const, title: "Partidos", desc: "Convocatorias y recordatorios de partidos" },
                { key: "weeklyReport" as const, title: "Reporte semanal", desc: "Resumen de rendimiento y asistencia cada lunes" },
              ].map((n) => (
                <div key={n.key} className="flex items-start justify-between gap-4 py-3 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.desc}</p>
                  </div>
                  <Switch
                    checked={extras.notifications[n.key]}
                    onCheckedChange={(v) => setExtra("notifications", { ...extras.notifications, [n.key]: v })}
                  />
                </div>
              ))}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

/**
 * Padre/Jugador → solo su perfil de solo lectura.
 * Admin/entrenador → configuración completa del club, sin cambios.
 */
export default function SettingsPage() {
  const { user } = useAuth();
  if (!user) return null;

  if (!user.is_staff && (user.role === "player" || user.role === "parent")) {
    return <ProfileOnlySettings user={user} />;
  }

  return <AdminClubSettings />;
}

import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
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
import { toast } from "@/hooks/use-toast";
import {
  Building2, MapPin, Users, Bell, Shield, Plus, Trash2, Save, Upload, Palette, UserCheck,
} from "lucide-react";
import { RegistrationsPanel } from "@/components/RegistrationsPanel";
import { CategoriesPanel } from "@/components/CategoriesPanel";
import api from "@/lib/api";

type Venue = { id: string; name: string; address: string; type: string };
type Member = { id: string; name: string; email: string; role: string };

// Datos del club: persistidos en el backend (`/api/v1/club/settings/`),
// nunca hardcodeados. El resto de esta pantalla (sedes, usuarios,
// notificaciones, color) sigue siendo solo del navegador (localStorage).
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
  venues: Venue[];
  members: Member[];
  notifications: {
    attendance: boolean;
    payments: boolean;
    matches: boolean;
    weeklyReport: boolean;
  };
}

const EXTRAS_DEFAULTS: Extras = {
  accent: "153 60% 38%",
  venues: [
    { id: "v1", name: "Cancha 1", address: "Sede Principal", type: "Grama sintética" },
    { id: "v2", name: "Cancha 2", address: "Sede Principal", type: "Grama natural" },
    { id: "v3", name: "Gimnasio", address: "Sede Principal", type: "Preparación física" },
  ],
  members: [
    { id: "m1", name: "Laura Gómez", email: "laura@soccerfuture.com", role: "Admin del club" },
    { id: "m2", name: "Carlos Mendoza", email: "carlos@soccerfuture.com", role: "Entrenador" },
    { id: "m3", name: "Ana Restrepo", email: "ana@soccerfuture.com", role: "Entrenador" },
  ],
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

export default function SettingsPage() {
  const [club, setClub] = useState<ClubData>(EMPTY_CLUB);
  const [clubLoading, setClubLoading] = useState(true);
  const [clubError, setClubError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extras, setExtras] = useState<Extras>(EXTRAS_DEFAULTS);
  const [categoryNames, setCategoryNames] = useState<string[]>([]);

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
            <RegistrationsPanel categories={categoryNames} />
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
            <CategoriesPanel onNamesChange={setCategoryNames} />
          </TabsContent>

          {/* VENUES */}
          <TabsContent value="venues">
            <Card className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold">Sedes y escenarios</h3>
                  <p className="text-xs text-muted-foreground">Lugares disponibles para entrenamientos y partidos</p>
                </div>
                <Button
                  variant="outline"
                  className="gap-2 w-full sm:w-auto"
                  onClick={() => setExtra("venues", [...extras.venues, { id: crypto.randomUUID(), name: "Nueva sede", address: "", type: "Grama sintética" }])}
                >
                  <Plus className="w-4 h-4" /> Añadir sede
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {extras.venues.map((v, i) => (
                  <div key={v.id} className="p-3 rounded-lg border space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Input value={v.name} className="font-medium" onChange={(e) => {
                        const next = [...extras.venues]; next[i] = { ...v, name: e.target.value }; setExtra("venues", next);
                      }} />
                      <Button variant="ghost" size="icon" className="text-destructive flex-shrink-0"
                        onClick={() => setExtra("venues", extras.venues.filter((x) => x.id !== v.id))}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Input value={v.address} placeholder="Dirección" onChange={(e) => {
                      const next = [...extras.venues]; next[i] = { ...v, address: e.target.value }; setExtra("venues", next);
                    }} />
                    <Select value={v.type} onValueChange={(val) => {
                      const next = [...extras.venues]; next[i] = { ...v, type: val }; setExtra("venues", next);
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Grama sintética">Grama sintética</SelectItem>
                        <SelectItem value="Grama natural">Grama natural</SelectItem>
                        <SelectItem value="Cancha cubierta">Cancha cubierta</SelectItem>
                        <SelectItem value="Preparación física">Preparación física</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* TEAM */}
          <TabsContent value="team">
            <Card className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold">Usuarios y roles</h3>
                  <p className="text-xs text-muted-foreground">Quién puede acceder al panel y con qué permisos</p>
                </div>
                <Button
                  variant="outline"
                  className="gap-2 w-full sm:w-auto"
                  onClick={() => setExtra("members", [...extras.members, { id: crypto.randomUUID(), name: "Nuevo usuario", email: "", role: "Entrenador" }])}
                >
                  <Plus className="w-4 h-4" /> Invitar usuario
                </Button>
              </div>
              <div className="space-y-2">
                {extras.members.map((m, i) => (
                  <div key={m.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {m.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{m.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.email || "sin email"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={m.role} onValueChange={(val) => {
                        const next = [...extras.members]; next[i] = { ...m, role: val }; setExtra("members", next);
                      }}>
                        <SelectTrigger className="w-full sm:w-[170px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin del club">Admin del club</SelectItem>
                          <SelectItem value="Entrenador">Entrenador</SelectItem>
                          <SelectItem value="Administrativo">Administrativo</SelectItem>
                          <SelectItem value="Acudiente">Acudiente</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="text-destructive"
                        onClick={() => setExtra("members", extras.members.filter((x) => x.id !== m.id))}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                <Badge variant="outline" className="mr-2">Nota</Badge>
                Los roles se aplicarán de forma real cuando se active el inicio de sesión del club.
              </p>
            </Card>
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

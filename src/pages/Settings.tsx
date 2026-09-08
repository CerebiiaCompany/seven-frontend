import { useEffect, useState } from "react";
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
  Building2, MapPin, Users, Bell, Shield, Plus, Trash2, Save, Upload, Palette,
} from "lucide-react";

type Category = { id: string; name: string; ageRange: string; fee: number };
type Venue = { id: string; name: string; address: string; type: string };
type Member = { id: string; name: string; email: string; role: string };

interface ClubSettings {
  name: string;
  shortName: string;
  nit: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  description: string;
  currency: string;
  timezone: string;
  accent: string;
  categories: Category[];
  venues: Venue[];
  members: Member[];
  notifications: {
    attendance: boolean;
    payments: boolean;
    matches: boolean;
    weeklyReport: boolean;
  };
}

const DEFAULTS: ClubSettings = {
  name: "Soccer Future FC",
  shortName: "SFFC",
  nit: "901.234.567-8",
  email: "contacto@soccerfuture.com",
  phone: "+57 300 123 4567",
  city: "Medellín",
  address: "Cra. 43A #1-50, Sede Principal",
  description: "Club formativo de fútbol enfocado en el desarrollo integral de jóvenes deportistas.",
  currency: "COP",
  timezone: "America/Bogota",
  accent: "153 60% 38%",
  categories: [
    { id: "c1", name: "Sub-11", ageRange: "9-11 años", fee: 120000 },
    { id: "c2", name: "Sub-13", ageRange: "12-13 años", fee: 140000 },
    { id: "c3", name: "Sub-15", ageRange: "14-15 años", fee: 160000 },
    { id: "c4", name: "Sub-17", ageRange: "16-17 años", fee: 180000 },
  ],
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
  const [s, setS] = useState<ClubSettings>(DEFAULTS);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { setS({ ...DEFAULTS, ...JSON.parse(raw) }); } catch { /* ignore */ }
    }
  }, []);

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    toast({ title: "Configuración guardada", description: "Los cambios del club se aplicaron correctamente." });
  };

  const set = <K extends keyof ClubSettings>(k: K, v: ClubSettings[K]) => setS((p) => ({ ...p, [k]: v }));

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold">Configuración del club</h1>
            <p className="text-sm text-muted-foreground mt-1">Datos, categorías, sedes, usuarios y notificaciones</p>
          </div>
          <Button onClick={save} className="gap-2 w-full sm:w-auto">
            <Save className="w-4 h-4" /> Guardar cambios
          </Button>
        </div>

        <Tabs defaultValue="club" className="space-y-4">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="w-max">
              <TabsTrigger value="club" className="gap-1.5"><Building2 className="w-4 h-4" /> Club</TabsTrigger>
              <TabsTrigger value="categories" className="gap-1.5"><Users className="w-4 h-4" /> Categorías</TabsTrigger>
              <TabsTrigger value="venues" className="gap-1.5"><MapPin className="w-4 h-4" /> Sedes</TabsTrigger>
              <TabsTrigger value="team" className="gap-1.5"><Shield className="w-4 h-4" /> Usuarios</TabsTrigger>
              <TabsTrigger value="notifications" className="gap-1.5"><Bell className="w-4 h-4" /> Alertas</TabsTrigger>
            </TabsList>
          </div>

          {/* CLUB */}
          <TabsContent value="club" className="space-y-4">
            <Card className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-display font-bold text-xl">
                  {s.shortName.slice(0, 3).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Escudo del club</p>
                  <p className="text-xs text-muted-foreground">PNG o SVG, mínimo 512x512px</p>
                </div>
                <Button variant="outline" className="gap-2 w-full sm:w-auto"><Upload className="w-4 h-4" /> Subir logo</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Nombre del club</Label><Input value={s.name} onChange={(e) => set("name", e.target.value)} /></div>
                <div><Label>Nombre corto</Label><Input value={s.shortName} onChange={(e) => set("shortName", e.target.value)} /></div>
                <div><Label>NIT / Identificación</Label><Input value={s.nit} onChange={(e) => set("nit", e.target.value)} /></div>
                <div><Label>Email de contacto</Label><Input type="email" value={s.email} onChange={(e) => set("email", e.target.value)} /></div>
                <div><Label>Teléfono</Label><Input value={s.phone} onChange={(e) => set("phone", e.target.value)} /></div>
                <div><Label>Ciudad</Label><Input value={s.city} onChange={(e) => set("city", e.target.value)} /></div>
                <div className="md:col-span-2"><Label>Dirección</Label><Input value={s.address} onChange={(e) => set("address", e.target.value)} /></div>
                <div className="md:col-span-2">
                  <Label>Descripción</Label>
                  <Textarea rows={3} value={s.description} onChange={(e) => set("description", e.target.value)} />
                </div>
                <div>
                  <Label>Moneda</Label>
                  <Select value={s.currency} onValueChange={(v) => set("currency", v)}>
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
                  <Select value={s.timezone} onValueChange={(v) => set("timezone", v)}>
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
                    onClick={() => set("accent", a.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                      s.accent === a.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full" style={{ background: `hsl(${a.value})` }} />
                    {a.label}
                  </button>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* CATEGORIES */}
          <TabsContent value="categories">
            <Card className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold">Categorías del club</h3>
                  <p className="text-xs text-muted-foreground">Define los grupos por edad y su mensualidad</p>
                </div>
                <Button
                  variant="outline"
                  className="gap-2 w-full sm:w-auto"
                  onClick={() => set("categories", [...s.categories, { id: crypto.randomUUID(), name: "Nueva categoría", ageRange: "", fee: 0 }])}
                >
                  <Plus className="w-4 h-4" /> Añadir categoría
                </Button>
              </div>
              <div className="space-y-3">
                {s.categories.map((c, i) => (
                  <div key={c.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 sm:gap-3 sm:items-end p-3 rounded-lg border">
                    <div>
                      <Label className="text-xs">Nombre</Label>
                      <Input value={c.name} onChange={(e) => {
                        const next = [...s.categories]; next[i] = { ...c, name: e.target.value }; set("categories", next);
                      }} />
                    </div>
                    <div>
                      <Label className="text-xs">Rango de edad</Label>
                      <Input value={c.ageRange} placeholder="14-15 años" onChange={(e) => {
                        const next = [...s.categories]; next[i] = { ...c, ageRange: e.target.value }; set("categories", next);
                      }} />
                    </div>
                    <div>
                      <Label className="text-xs">Mensualidad</Label>
                      <Input type="number" value={c.fee} onChange={(e) => {
                        const next = [...s.categories]; next[i] = { ...c, fee: Number(e.target.value) }; set("categories", next);
                      }} />
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="text-destructive justify-self-end"
                      onClick={() => set("categories", s.categories.filter((x) => x.id !== c.id))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
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
                  onClick={() => set("venues", [...s.venues, { id: crypto.randomUUID(), name: "Nueva sede", address: "", type: "Grama sintética" }])}
                >
                  <Plus className="w-4 h-4" /> Añadir sede
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {s.venues.map((v, i) => (
                  <div key={v.id} className="p-3 rounded-lg border space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Input value={v.name} className="font-medium" onChange={(e) => {
                        const next = [...s.venues]; next[i] = { ...v, name: e.target.value }; set("venues", next);
                      }} />
                      <Button variant="ghost" size="icon" className="text-destructive flex-shrink-0"
                        onClick={() => set("venues", s.venues.filter((x) => x.id !== v.id))}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Input value={v.address} placeholder="Dirección" onChange={(e) => {
                      const next = [...s.venues]; next[i] = { ...v, address: e.target.value }; set("venues", next);
                    }} />
                    <Select value={v.type} onValueChange={(val) => {
                      const next = [...s.venues]; next[i] = { ...v, type: val }; set("venues", next);
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
                  onClick={() => set("members", [...s.members, { id: crypto.randomUUID(), name: "Nuevo usuario", email: "", role: "Entrenador" }])}
                >
                  <Plus className="w-4 h-4" /> Invitar usuario
                </Button>
              </div>
              <div className="space-y-2">
                {s.members.map((m, i) => (
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
                        const next = [...s.members]; next[i] = { ...m, role: val }; set("members", next);
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
                        onClick={() => set("members", s.members.filter((x) => x.id !== m.id))}>
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
                    checked={s.notifications[n.key]}
                    onCheckedChange={(v) => set("notifications", { ...s.notifications, [n.key]: v })}
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

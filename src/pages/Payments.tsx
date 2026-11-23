import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertTriangle, CheckCircle2, CreditCard, DollarSign, FileDown, GraduationCap, History,
  Mail, MessageSquare, Plus, Search, Send, User, Wallet,
} from "lucide-react";
import { toast } from "sonner";

type PaymentType = "monthly" | "enrollment" | "custom";
type PaymentStatus = "paid" | "pending";
type MembershipState = "al_dia" | "mora";

interface Payment {
  id: string;
  athleteId: number;
  type: PaymentType;
  concept: string;
  period?: string;
  amount: number;
  date: string;
  method?: string;
  status: PaymentStatus;
}

interface Athlete {
  id: number;
  name: string;
  category: string;
  fee: number;
  enrollmentFee: number;
  activation: string;
  guardian: string;
  phone: string;
  email: string;
}

interface ScheduleItem {
  period: string;
  dueDate: Date;
  paid: boolean;
  overdue: boolean;
}

const PAYMENTS_STORAGE_KEY = "sf_payments_v3";
const NOTIFICATIONS_STORAGE_KEY = "sf_notifications";
const PAYMENT_METHODS = ["Transferencia", "Efectivo", "Tarjeta", "PSE", "Nequi"];
const DEFAULT_MONTHLY_FEE = 160000;
const DEFAULT_ENROLLMENT_FEE = 250000;

const now = new Date();
const currentYear = now.getFullYear();

const pad = (n: number) => String(n).padStart(2, "0");

const feeForCategory = (category: string) => {
  try {
    const settings = JSON.parse(localStorage.getItem("sf_club_settings") || "{}");
    const match = settings.categories?.find((c: { name: string; fee?: number | string }) => c.name === category);
    if (match?.fee) return Number(match.fee);
  } catch { /* usa valor por defecto */ }
  return DEFAULT_MONTHLY_FEE;
};

const demoAthletes: Omit<Athlete, "fee" | "enrollmentFee" | "phone" | "email">[] = [
  { id: 1, name: "Juan Pérez", category: "Sub-17", activation: "2026-02-05", guardian: "Marta Pérez" },
  { id: 2, name: "Carlos Díaz", category: "Sub-15", activation: "2026-06-10", guardian: "Luis Díaz" },
  { id: 3, name: "María López", category: "Sub-17", activation: "2026-08-20", guardian: "Ana López" },
  { id: 4, name: "Andrés Gómez", category: "Sub-13", activation: "2026-03-01", guardian: "Pedro Gómez" },
  { id: 5, name: "Sofía Ramírez", category: "Sub-17", activation: "2026-09-15", guardian: "Elena Ramírez" },
  { id: 6, name: "Diego Torres", category: "Sub-15", activation: "2026-10-01", guardian: "Jorge Torres" },
  { id: 7, name: "Valentina Cruz", category: "Sub-13", activation: "2026-01-15", guardian: "Rosa Cruz" },
  { id: 8, name: "Mateo Herrera", category: "Sub-15", activation: "2026-11-02", guardian: "Iván Herrera" },
];

const buildAthletes = (): Athlete[] =>
  demoAthletes.map((a) => ({
    ...a,
    fee: feeForCategory(a.category),
    enrollmentFee: DEFAULT_ENROLLMENT_FEE,
    phone: "",
    email: "",
  }));

const buildSeedPayments = (athletes: Athlete[]): Payment[] => {
  const payments: Payment[] = [];
  let seq = 1;
  const add = (p: Omit<Payment, "id">) => payments.push({ ...p, id: `PAG-${String(seq++).padStart(4, "0")}` });

  athletes.forEach((athlete, index) => {
    if (index !== 3) {
      add({
        athleteId: athlete.id, type: "enrollment", concept: `Matrícula ${currentYear}`, period: String(currentYear),
        amount: athlete.enrollmentFee, date: athlete.activation, method: "Transferencia", status: "paid",
      });
    }
    add({
      athleteId: athlete.id, type: "enrollment", concept: `Matrícula ${currentYear - 1}`, period: String(currentYear - 1),
      amount: athlete.enrollmentFee - 20000, date: `${currentYear - 1}-02-01`, method: "Efectivo", status: "paid",
    });

    const firstMonth = athlete.activation.startsWith(String(currentYear)) ? Number(athlete.activation.slice(5, 7)) : 1;
    const lastMonth = index % 2 === 0 ? now.getMonth() + 1 : now.getMonth() - 1;
    for (let month = firstMonth; month <= lastMonth; month++) {
      add({
        athleteId: athlete.id, type: "monthly", concept: "Mensualidad", period: `${currentYear}-${pad(month)}`,
        amount: athlete.fee, date: `${currentYear}-${pad(month)}-05`, method: "Transferencia", status: "paid",
      });
    }
  });

  add({
    athleteId: athletes[1]?.id ?? 2, type: "custom", concept: "Uniforme oficial", amount: 120000,
    date: `${currentYear}-10-12`, status: "pending",
  });
  return payments;
};

const readStored = <T,>(key: string, fallback: () => T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* usa valor por defecto */ }
  return fallback();
};

const buildSchedule = (activation: string, payments: Payment[], today = new Date(), monthsAhead = 3): ScheduleItem[] => {
  const start = new Date(`${activation}T00:00:00`);
  const dueDay = start.getDate();
  const paidPeriods = new Set(payments.filter((p) => p.type === "monthly" && p.status === "paid").map((p) => p.period));
  const schedule: ScheduleItem[] = [];
  const limit = new Date(today.getFullYear(), today.getMonth() + monthsAhead, 1);

  for (let year = start.getFullYear(), month = start.getMonth(); new Date(year, month, 1) <= limit; month++) {
    if (month > 11) {
      month = 0;
      year++;
    }
    const lastDay = new Date(year, month + 1, 0).getDate();
    const dueDate = new Date(year, month, Math.min(dueDay, lastDay));
    const period = `${year}-${pad(month + 1)}`;
    const paid = paidPeriods.has(period);
    schedule.push({ period, dueDate, paid, overdue: !paid && dueDate < today });
  }
  return schedule;
};

const hasEnrollment = (payments: Payment[], year: number) =>
  payments.some((p) => p.type === "enrollment" && p.status === "paid" && p.period === String(year));

const periodLabel = (period: string) => {
  const [year, month] = period.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("es-CO", { month: "short", year: "numeric" });
};

const money = (n: number) => `$${n.toLocaleString("es-CO")}`;

const formatDate = (value: string | Date) =>
  new Date(typeof value === "string" && value.length === 10 ? `${value}T00:00:00` : value)
    .toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });

const typeLabels: Record<PaymentType, string> = {
  monthly: "Mensualidad",
  enrollment: "Matrícula",
  custom: "Personalizado",
};

const downloadCSV = (rows: (string | number)[][], filename: string) => {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([String.fromCharCode(0xfeff), csv], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  toast.success("Archivo exportado");
};

const paymentStateBadge = (state: MembershipState) =>
  state === "mora"
    ? <Badge variant="destructive">En mora</Badge>
    : <Badge className="bg-primary/15 text-primary border-0">Al día</Badge>;

const activeBadge = (active: boolean) =>
  active
    ? <Badge variant="outline" className="border-primary/40 text-primary">Activo</Badge>
    : <Badge variant="outline" className="text-muted-foreground">Inactivo</Badge>;

export default function Payments() {
  const [athletes] = useState<Athlete[]>(buildAthletes);
  const [payments, setPayments] = useState<Payment[]>(() =>
    readStored(PAYMENTS_STORAGE_KEY, () => buildSeedPayments(buildAthletes())),
  );

  useEffect(() => {
    localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(payments));
  }, [payments]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [payAthlete, setPayAthlete] = useState<Athlete | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [method, setMethod] = useState("Transferencia");
  const [historyAthlete, setHistoryAthlete] = useState<Athlete | null>(null);
  const [renewAthlete, setRenewAthlete] = useState<Athlete | null>(null);
  const [renewAmount, setRenewAmount] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [customForm, setCustomForm] = useState({ athleteId: "", concept: "", amount: "", paid: false });
  const [notifyTarget, setNotifyTarget] = useState<{ ids: number[] } | null>(null);
  const [channels, setChannels] = useState({ sms: true, email: true });
  const [notifyMessage, setNotifyMessage] = useState("");

  const paymentsFor = (athleteId: number) => payments.filter((p) => p.athleteId === athleteId);

  const summaries = useMemo(() => new Map(athletes.map((athlete) => {
    const own = payments.filter((p) => p.athleteId === athlete.id);
    const schedule = buildSchedule(athlete.activation, own, now);
    const overdue = schedule.filter((s) => s.overdue);
    return [athlete.id, {
      schedule,
      overdue,
      debt: overdue.length * athlete.fee,
      next: schedule.find((s) => !s.paid && !s.overdue),
      active: hasEnrollment(own, currentYear),
      state: (overdue.length ? "mora" : "al_dia") as MembershipState,
    }];
  })), [athletes, payments]);

  const summaryOf = (id: number) => summaries.get(id)!;

  const filteredAthletes = athletes.filter((athlete) => {
    const summary = summaryOf(athlete.id);
    return (athlete.name + athlete.guardian).toLowerCase().includes(search.toLowerCase())
      && (categoryFilter === "all" || athlete.category === categoryFilter)
      && (paymentFilter === "all" || summary.state === paymentFilter)
      && (statusFilter === "all" || (statusFilter === "active") === summary.active);
  });

  const categories = [...new Set(athletes.map((a) => a.category))];
  const monthKey = `${currentYear}-${pad(now.getMonth() + 1)}`;
  const monthRevenue = payments
    .filter((p) => p.status === "paid" && p.date.slice(0, 7) === monthKey)
    .reduce((sum, p) => sum + p.amount, 0);
  const totalDebt = [...summaries.values()].reduce((sum, s) => sum + s.debt, 0);
  const overdueAthletes = athletes.filter((a) => summaryOf(a.id).state === "mora");
  const withoutEnrollment = athletes.filter((a) => !summaryOf(a.id).active);

  const nextId = () => `PAG-${String(payments.length + 1 + Math.floor(Math.random() * 1000)).padStart(4, "0")}`;

  const openPayment = (athlete: Athlete) => {
    setPayAthlete(athlete);
    setMethod("Transferencia");
    const firstUnpaid = summaryOf(athlete.id).schedule.find((s) => !s.paid);
    setSelectedMonths(firstUnpaid ? [firstUnpaid.period] : []);
  };

  const confirmPayment = () => {
    if (!payAthlete || !selectedMonths.length) {
      toast.error("Selecciona al menos un mes");
      return;
    }
    const date = new Date().toISOString();
    const baseId = nextId();
    setPayments((prev) => [
      ...selectedMonths.map((period, index): Payment => ({
        id: `${baseId}-${index}`, athleteId: payAthlete.id, type: "monthly", concept: "Mensualidad",
        period, amount: payAthlete.fee, date, method, status: "paid",
      })),
      ...prev,
    ]);
    toast.success(`${selectedMonths.length} mes(es) pagado(s) · ${payAthlete.name}`);
    setPayAthlete(null);
  };

  const confirmRenewal = () => {
    if (!renewAthlete) return;
    setPayments((prev) => [{
      id: nextId(), athleteId: renewAthlete.id, type: "enrollment", concept: `Matrícula ${currentYear}`,
      period: String(currentYear), amount: Number(renewAmount) || renewAthlete.enrollmentFee,
      date: new Date().toISOString(), method, status: "paid",
    }, ...prev]);
    toast.success(`Matrícula ${currentYear} renovada · ${renewAthlete.name} queda activo`);
    setRenewAthlete(null);
  };

  const saveCustomPayment = () => {
    if (!customForm.athleteId || !customForm.concept.trim() || !Number(customForm.amount)) {
      toast.error("Completa deportista, concepto y monto");
      return;
    }
    setPayments((prev) => [{
      id: nextId(), athleteId: Number(customForm.athleteId), type: "custom", concept: customForm.concept.trim(),
      amount: Number(customForm.amount), date: new Date().toISOString(),
      method: customForm.paid ? method : undefined, status: customForm.paid ? "paid" : "pending",
    }, ...prev]);
    toast.success("Pago personalizado registrado");
    setCustomOpen(false);
    setCustomForm({ athleteId: "", concept: "", amount: "", paid: false });
  };

  const markPaid = (id: string) => {
    setPayments((prev) => prev.map((p) => (
      p.id === id ? { ...p, status: "paid", method: p.method ?? "Efectivo", date: new Date().toISOString() } : p
    )));
    toast.success("Pago registrado");
  };

  const openNotify = (ids: number[]) => {
    if (!ids.length) {
      toast.error("No hay destinatarios");
      return;
    }
    setNotifyTarget({ ids });
    setNotifyMessage("Hola {acudiente}, te recordamos que {deportista} tiene un saldo pendiente de {saldo} con Seven Soccer Club. ¡Gracias!");
  };

  const sendNotification = () => {
    if (!notifyTarget || (!channels.sms && !channels.email)) {
      toast.error("Elige al menos un canal");
      return;
    }
    const stored = readStored<unknown[]>(NOTIFICATIONS_STORAGE_KEY, () => []);
    notifyTarget.ids.forEach((id) => {
      const athlete = athletes.find((a) => a.id === id);
      if (!athlete) return;
      stored.push({
        to: athlete.name,
        sms: channels.sms ? athlete.phone : null,
        email: channels.email ? athlete.email : null,
        msg: notifyMessage,
        date: new Date().toISOString(),
      });
    });
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(stored));
    toast.success(`Notificación preparada para ${notifyTarget.ids.length} deportista(s)`, {
      description: "El envío real de SMS y correos se activa al conectar un proveedor.",
    });
    setNotifyTarget(null);
    setSelectedIds([]);
  };

  const exportAthletes = () => downloadCSV([
    ["Deportista", "Categoría", "Acudiente", "Teléfono", "Correo", "Activación", "Mensualidad", `Matrícula ${currentYear}`, "Estado", "Meses en mora", "Saldo"],
    ...filteredAthletes.map((a) => {
      const s = summaryOf(a.id);
      return [a.name, a.category, a.guardian, a.phone, a.email, a.activation, a.fee, s.active ? "Pagada" : "Pendiente", s.state === "mora" ? "En mora" : "Al día", s.overdue.length, s.debt];
    }),
  ], "deportistas-pagos.csv");

  const exportHistory = () => downloadCSV([
    ["Recibo", "Deportista", "Tipo", "Concepto", "Periodo", "Monto", "Fecha", "Método", "Estado"],
    ...payments.map((p) => [
      p.id, athletes.find((a) => a.id === p.athleteId)?.name ?? "", typeLabels[p.type], p.concept, p.period ?? "",
      p.amount, p.date.slice(0, 10), p.method ?? "", p.status === "paid" ? "Pagado" : "Pendiente",
    ]),
  ], "historial-pagos.csv");

  const toggleSelected = (id: number) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const filtersBar = (
    <div className="flex flex-col lg:flex-row gap-3 mb-4">
      <div className="relative flex-1 lg:max-w-xs">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar deportista o acudiente..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-2 lg:flex">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="lg:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Categorías</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="lg:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Pagos: todos</SelectItem>
            <SelectItem value="al_dia">Al día</SelectItem>
            <SelectItem value="mora">En mora</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="lg:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Estado: todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 lg:ml-auto">
        <Button variant="outline" className="gap-2 flex-1" onClick={() => openNotify(selectedIds.length ? selectedIds : filteredAthletes.map((a) => a.id))}>
          <Send className="w-4 h-4" />Notificar{selectedIds.length ? ` (${selectedIds.length})` : ""}
        </Button>
        <Button variant="outline" className="gap-2 flex-1" onClick={exportAthletes}>
          <FileDown className="w-4 h-4" />Exportar
        </Button>
      </div>
    </div>
  );

  const kpis = [
    { label: "Ingresos del mes", value: money(monthRevenue), icon: DollarSign, color: "kpi-green" },
    { label: "Saldo en mora", value: money(totalDebt), icon: AlertTriangle, color: "kpi-red" },
    { label: "Deportistas en mora", value: `${overdueAthletes.length} / ${athletes.length}`, icon: Wallet, color: "kpi-amber" },
    { label: `Sin matrícula ${currentYear}`, value: `${withoutEnrollment.length}`, icon: GraduationCap, color: "kpi-blue" },
  ];

  const unpaidMonths = payAthlete ? summaryOf(payAthlete.id).schedule.filter((s) => !s.paid) : [];
  const historyPayments = historyAthlete
    ? paymentsFor(historyAthlete.id).sort((a, b) => b.date.localeCompare(a.date))
    : [];
  const historySummary = historyAthlete ? summaryOf(historyAthlete.id) : null;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold">Pagos</h1>
            <p className="text-muted-foreground mt-1">Membresías, matrículas anuales y pagos personalizados</p>
          </div>
          <Button className="gap-2" onClick={() => setCustomOpen(true)}>
            <Plus className="w-4 h-4" /> Pago personalizado
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-lg sm:text-2xl font-bold mt-2 truncate">{kpi.value}</p>
                </div>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `hsl(var(--${kpi.color}) / 0.15)` }}>
                  <kpi.icon className="w-4 h-4" style={{ color: `hsl(var(--${kpi.color}))` }} />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {overdueAthletes.length > 0 && (
          <Card className="p-4 border-destructive/30 bg-destructive/5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-sm">{overdueAthletes.length} deportistas con mensualidades en mora</p>
                <p className="text-xs text-muted-foreground">Total adeudado: {money(totalDebt)}</p>
              </div>
              <Button variant="destructive" size="sm" className="gap-2" onClick={() => openNotify(overdueAthletes.map((a) => a.id))}>
                <Send className="w-3.5 h-3.5" /> Notificar morosos
              </Button>
            </div>
          </Card>
        )}

        <Tabs defaultValue="memberships" className="space-y-4">
          <TabsList className="w-full sm:w-auto overflow-x-auto justify-start">
            <TabsTrigger value="memberships">Membresías</TabsTrigger>
            <TabsTrigger value="enrollments">Matrículas</TabsTrigger>
            <TabsTrigger value="custom">Personalizados</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="memberships">
            <Card className="p-4 sm:p-6">
              {filtersBar}
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>Deportista</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Mensualidad</TableHead>
                      <TableHead>Próximo vencimiento</TableHead>
                      <TableHead>Pagos</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAthletes.map((athlete) => {
                      const summary = summaryOf(athlete.id);
                      return (
                        <TableRow key={athlete.id}>
                          <TableCell>
                            <Checkbox checked={selectedIds.includes(athlete.id)} onCheckedChange={() => toggleSelected(athlete.id)} aria-label={`Seleccionar ${athlete.name}`} />
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{athlete.name}</p>
                            <p className="text-xs text-muted-foreground">Desde {formatDate(athlete.activation)}</p>
                          </TableCell>
                          <TableCell><Badge variant="outline">{athlete.category}</Badge></TableCell>
                          <TableCell className="font-semibold">{money(athlete.fee)}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {summary.overdue.length
                              ? <span className="text-destructive">{summary.overdue.length} mes(es) · {money(summary.debt)}</span>
                              : summary.next ? formatDate(summary.next.dueDate) : "—"}
                          </TableCell>
                          <TableCell>{paymentStateBadge(summary.state)}</TableCell>
                          <TableCell>{activeBadge(summary.active)}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <Button variant="ghost" size="sm" aria-label={`Ver historial de ${athlete.name}`} onClick={() => setHistoryAthlete(athlete)}>
                              <History className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" aria-label={`Notificar a ${athlete.name}`} onClick={() => openNotify([athlete.id])}>
                              <Send className="w-4 h-4" />
                            </Button>
                            <Button size="sm" className="ml-1" onClick={() => openPayment(athlete)}>Registrar pago</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="enrollments">
            <Card className="p-4 sm:p-6">
              <div className="mb-4">
                <h2 className="font-display font-semibold text-lg">Control de matrículas anuales</h2>
                <p className="text-sm text-muted-foreground">Un deportista solo queda activo si pagó la matrícula de {currentYear}.</p>
              </div>
              {filtersBar}
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deportista</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Valor matrícula</TableHead>
                      <TableHead>Último pago</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAthletes.map((athlete) => {
                      const summary = summaryOf(athlete.id);
                      const lastEnrollment = paymentsFor(athlete.id)
                        .filter((p) => p.type === "enrollment" && p.status === "paid")
                        .sort((a, b) => (b.period ?? "").localeCompare(a.period ?? ""))[0];
                      return (
                        <TableRow key={athlete.id}>
                          <TableCell className="font-medium">{athlete.name}</TableCell>
                          <TableCell><Badge variant="outline">{athlete.category}</Badge></TableCell>
                          <TableCell className="font-semibold">{money(athlete.enrollmentFee)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {lastEnrollment ? `${lastEnrollment.period} · ${formatDate(lastEnrollment.date)}` : "—"}
                          </TableCell>
                          <TableCell>{activeBadge(summary.active)}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <Button variant="ghost" size="sm" className="gap-1" onClick={() => setHistoryAthlete(athlete)}>
                              <History className="w-4 h-4" />Renovaciones
                            </Button>
                            {!summary.active && (
                              <Button size="sm" className="ml-1" onClick={() => { setRenewAthlete(athlete); setRenewAmount(String(athlete.enrollmentFee)); setMethod("Transferencia"); }}>
                                Renovar {currentYear}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="custom">
            <Card className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-display font-semibold text-lg">Pagos personalizados</h2>
                  <p className="text-sm text-muted-foreground">Uniformes, torneos, viajes y otros conceptos.</p>
                </div>
                <Button className="gap-2" onClick={() => setCustomOpen(true)}><Plus className="w-4 h-4" />Nuevo</Button>
              </div>
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Deportista</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.filter((p) => p.type === "custom").map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.concept}</TableCell>
                        <TableCell>{athletes.find((a) => a.id === p.athleteId)?.name}</TableCell>
                        <TableCell className="font-semibold">{money(p.amount)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(p.date)}</TableCell>
                        <TableCell>
                          {p.status === "paid"
                            ? <Badge className="bg-primary/15 text-primary border-0">Pagado</Badge>
                            : <Badge variant="secondary">Pendiente</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          {p.status === "pending" && <Button size="sm" onClick={() => markPaid(p.id)}>Marcar pagado</Button>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="p-4 sm:p-6">
              <div className="flex justify-end mb-4">
                <Button variant="outline" className="gap-2" onClick={exportHistory}><FileDown className="w-4 h-4" />Exportar</Button>
              </div>
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recibo</TableHead>
                      <TableHead>Deportista</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Periodo</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Método</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...payments].sort((a, b) => b.date.localeCompare(a.date)).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.id}</TableCell>
                        <TableCell className="font-medium">{athletes.find((a) => a.id === p.athleteId)?.name}</TableCell>
                        <TableCell><Badge variant="outline">{typeLabels[p.type]}</Badge></TableCell>
                        <TableCell className="text-sm">{p.type === "monthly" && p.period ? periodLabel(p.period) : p.period ?? p.concept}</TableCell>
                        <TableCell className="font-semibold">{money(p.amount)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(p.date)}</TableCell>
                        <TableCell className="text-sm">{p.method ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!payAthlete} onOpenChange={(open) => !open && setPayAthlete(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          {payAthlete && (
            <>
              <DialogHeader>
                <DialogTitle>Registrar pago</DialogTitle>
                <DialogDescription>
                  {payAthlete.name} · cada mes vence el día {new Date(`${payAthlete.activation}T00:00:00`).getDate()} (activado el {formatDate(payAthlete.activation)})
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Meses a pagar</Label>
                    <button
                      type="button"
                      className="text-xs text-primary"
                      onClick={() => setSelectedMonths(selectedMonths.length === unpaidMonths.length ? [] : unpaidMonths.map((m) => m.period))}
                    >
                      {selectedMonths.length === unpaidMonths.length ? "Ninguno" : "Todos"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {unpaidMonths.map((m) => (
                      <label key={m.period} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-sm ${selectedMonths.includes(m.period) ? "border-primary bg-primary/10" : ""}`}>
                        <Checkbox
                          checked={selectedMonths.includes(m.period)}
                          onCheckedChange={() => setSelectedMonths((prev) => (prev.includes(m.period) ? prev.filter((x) => x !== m.period) : [...prev, m.period]))}
                        />
                        <span className="flex-1 capitalize">{periodLabel(m.period)}</span>
                        {m.overdue && <span className="text-[10px] text-destructive font-semibold">MORA</span>}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Método de pago</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-4 rounded-lg border text-center">
                  <p className="text-xs uppercase text-muted-foreground">Total · {selectedMonths.length} mes(es)</p>
                  <p className="text-3xl font-display font-bold mt-1">{money(selectedMonths.length * payAthlete.fee)}</p>
                </div>
                <Button className="w-full gap-2" onClick={confirmPayment}>
                  <CheckCircle2 className="w-4 h-4" />Confirmar pago
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyAthlete} onOpenChange={(open) => !open && setHistoryAthlete(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {historyAthlete && historySummary && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" />{historyAthlete.name}</DialogTitle>
                <DialogDescription>{historyAthlete.category} · Acudiente: {historyAthlete.guardian}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-lg border">
                  <p className="text-[10px] uppercase text-muted-foreground">Matrícula {currentYear}</p>
                  <div className="mt-1 flex justify-center">{activeBadge(historySummary.active)}</div>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-[10px] uppercase text-muted-foreground">Mensualidades</p>
                  <div className="mt-1 flex justify-center">{paymentStateBadge(historySummary.state)}</div>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-[10px] uppercase text-muted-foreground">Saldo</p>
                  <p className="text-sm font-semibold mt-1">{money(historySummary.debt)}</p>
                </div>
              </div>
              <Tabs defaultValue="enroll">
                <TabsList className="w-full">
                  <TabsTrigger value="enroll" className="flex-1">Renovaciones de matrícula</TabsTrigger>
                  <TabsTrigger value="all" className="flex-1">Todos los pagos</TabsTrigger>
                </TabsList>
                {(["enroll", "all"] as const).map((tab) => {
                  const rows = historyPayments.filter((p) => tab === "all" || p.type === "enrollment");
                  return (
                    <TabsContent key={tab} value={tab} className="space-y-2">
                      {rows.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                          <div className="min-w-0">
                            <p className="text-sm font-medium capitalize">
                              {p.type === "monthly" && p.period ? `Mensualidad ${periodLabel(p.period)}` : p.concept}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(p.date)}{p.method ? ` · ${p.method}` : ""} · {p.id}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-semibold">{money(p.amount)}</p>
                            <p className={`text-[10px] ${p.status === "paid" ? "text-primary" : "text-muted-foreground"}`}>
                              {p.status === "paid" ? "Pagado" : "Pendiente"}
                            </p>
                          </div>
                        </div>
                      ))}
                      {!rows.length && <p className="text-sm text-muted-foreground text-center py-4">Sin registros</p>}
                    </TabsContent>
                  );
                })}
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!renewAthlete} onOpenChange={(open) => !open && setRenewAthlete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renovar matrícula {currentYear}</DialogTitle>
            <DialogDescription>{renewAthlete?.name} · al pagar queda activo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Valor (COP)</Label>
              <Input type="number" value={renewAmount} onChange={(e) => setRenewAmount(e.target.value)} />
            </div>
            <div>
              <Label>Método de pago</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full gap-2" onClick={confirmRenewal}>
              <GraduationCap className="w-4 h-4" />Registrar matrícula
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pago personalizado</DialogTitle>
            <DialogDescription>Cobra cualquier concepto adicional</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Deportista</Label>
              <Select value={customForm.athleteId} onValueChange={(athleteId) => setCustomForm({ ...customForm, athleteId })}>
                <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                <SelectContent>
                  {athletes.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Concepto</Label>
              <Input placeholder="Ej. Uniforme, torneo, viaje" value={customForm.concept} onChange={(e) => setCustomForm({ ...customForm, concept: e.target.value })} />
            </div>
            <div>
              <Label>Monto (COP)</Label>
              <Input type="number" value={customForm.amount} onChange={(e) => setCustomForm({ ...customForm, amount: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={customForm.paid} onCheckedChange={(checked) => setCustomForm({ ...customForm, paid: !!checked })} />
              Ya fue pagado
            </label>
            <Button className="w-full gap-2" onClick={saveCustomPayment}>
              <CreditCard className="w-4 h-4" />Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!notifyTarget} onOpenChange={(open) => !open && setNotifyTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar notificación</DialogTitle>
            <DialogDescription>
              {notifyTarget?.ids.length} destinatario(s)
              {notifyTarget?.ids.length === 1 ? ` · ${athletes.find((a) => a.id === notifyTarget.ids[0])?.name}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={channels.sms} onCheckedChange={(checked) => setChannels({ ...channels, sms: !!checked })} />
                <MessageSquare className="w-4 h-4" />SMS
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={channels.email} onCheckedChange={(checked) => setChannels({ ...channels, email: !!checked })} />
                <Mail className="w-4 h-4" />Correo
              </label>
            </div>
            <div>
              <Label>Mensaje</Label>
              <Textarea rows={5} value={notifyMessage} onChange={(e) => setNotifyMessage(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Usa {"{acudiente}"}, {"{deportista}"} y {"{saldo}"}.</p>
            </div>
            <Button className="w-full gap-2" onClick={sendNotification}>
              <Send className="w-4 h-4" />Enviar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertTriangle, CheckCircle2, CreditCard, DollarSign, ExternalLink,
  FileDown, GraduationCap, History, Loader2, Plus, RefreshCw,
  Search, Send, Wallet,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

// ---------------------------------------------------------------------------
// Tipos que coinciden con el backend
// ---------------------------------------------------------------------------

export type PaymentType = "monthly" | "enrollment" | "custom";
export type PaymentStatus = "pending" | "approved" | "declined" | "voided" | "error";
type MembershipState = "al_dia" | "mora";

/** Categoría embebida en el jugador */
interface PlayerCategory {
  id: string;
  name: string;
  fee: number;        // mensualidad en pesos
  age_range?: string;
}

/** Jugador confirmado del backend */
export interface ApiPlayer {
  id: string;         // UUID
  slug: string;
  full_name: string;
  email: string;
  phone_number: string;
  photo: string | null;
  document_id: string;
  document_type: string;
  birth_date: string;
  city: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email: string;
  category: PlayerCategory | null;
  group: { id: string; name: string } | null;
  position: string;
  status: string;
  created_at: string;
}

/** Pago del backend */
export interface Payment {
  id: string;
  player: {
    id: string;
    full_name: string;
    document_id: string;
    document_type: string;
    photo: string | null;
    category: PlayerCategory | null;
  };
  type: PaymentType;
  type_display: string;
  concept: string;
  period: string;
  amount_in_cents: number;
  amount: number;
  reference: string;
  wompi_id: string;
  wompi_status: string;
  wompi_payment_method_type: string;
  status: PaymentStatus;
  status_display: string;
  paid_at: string | null;
  notes: string;
  created_at: string;
}

interface CheckoutData {
  payment_id: string;
  reference: string;
  amount_in_cents: number;
  currency: string;
  public_key: string;
  signature: string;
  redirect_url: string;
  checkout_url: string;
}

interface ScheduleItem {
  period: string;
  dueDate: Date;
  paid: boolean;
  overdue: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_ENROLLMENT_FEE = 250000;
const now = new Date();
const currentYear = now.getFullYear();
const pad = (n: number) => String(n).padStart(2, "0");

const money = (n: number) =>
  `$${Math.round(n).toLocaleString("es-CO")}`;

const formatDate = (value: string | Date) =>
  new Date(typeof value === "string" && value.length === 10 ? `${value}T00:00:00` : value)
    .toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });

const periodLabel = (period: string) => {
  const [year, month] = period.split("-").map(Number);
  if (!month) return period;
  return new Date(year, month - 1, 1).toLocaleDateString("es-CO", { month: "short", year: "numeric" });
};

const typeLabels: Record<PaymentType, string> = {
  monthly: "Mensualidad",
  enrollment: "Matrícula",
  custom: "Personalizado",
};

const statusColors: Record<PaymentStatus, string> = {
  approved: "bg-primary/15 text-primary border-0",
  pending: "bg-muted text-muted-foreground",
  declined: "bg-destructive/15 text-destructive border-0",
  voided: "bg-muted text-muted-foreground",
  error: "bg-destructive/15 text-destructive border-0",
};

/** Genera calendario de mensualidades desde la fecha de inscripción */
const buildSchedule = (
  activation: string,
  paidPeriods: Set<string>,
  today = new Date(),
  monthsAhead = 3,
): ScheduleItem[] => {
  const start = new Date(`${activation}T00:00:00`);
  const dueDay = start.getDate();
  const schedule: ScheduleItem[] = [];
  const limit = new Date(today.getFullYear(), today.getMonth() + monthsAhead, 1);

  for (
    let year = start.getFullYear(), month = start.getMonth();
    new Date(year, month, 1) <= limit;
    month++
  ) {
    if (month > 11) { month = 0; year++; }
    const lastDay = new Date(year, month + 1, 0).getDate();
    const dueDate = new Date(year, month, Math.min(dueDay, lastDay));
    const period = `${year}-${pad(month + 1)}`;
    const paid = paidPeriods.has(period);
    schedule.push({ period, dueDate, paid, overdue: !paid && dueDate < today });
  }
  return schedule;
};

const downloadCSV = (rows: (string | number)[][], filename: string) => {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(
    new Blob([String.fromCharCode(0xfeff), csv], { type: "text/csv;charset=utf-8;" }),
  );
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

const enrollmentBadge = (active: boolean) =>
  active
    ? <Badge variant="outline" className="border-primary/40 text-primary">Activo</Badge>
    : <Badge variant="outline" className="text-muted-foreground">Inactivo</Badge>;

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function Payments() {
  // ---- datos del backend ----
  const [players, setPlayers] = useState<ApiPlayer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);

  // ---- filtros ----
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ---- diálogos ----
  const [payPlayer, setPayPlayer] = useState<ApiPlayer | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const [historyPlayer, setHistoryPlayer] = useState<ApiPlayer | null>(null);
  const [renewPlayer, setRenewPlayer] = useState<ApiPlayer | null>(null);
  const [renewAmount, setRenewAmount] = useState("");

  const [customOpen, setCustomOpen] = useState(false);
  const [customForm, setCustomForm] = useState({
    playerId: "", concept: "", amount: "", notes: "",
  });
  const [customLoading, setCustomLoading] = useState(false);

  // ---- carga inicial ----
  useEffect(() => {
    api.get<{ results?: ApiPlayer[]; data?: ApiPlayer[] } | ApiPlayer[]>(
      "/players/?status=confirmed&page_size=200",
    )
      .then((res) => {
        const raw = res.data;
        const list = Array.isArray(raw)
          ? raw
          : (raw as { results?: ApiPlayer[] }).results ?? [];
        setPlayers(list);
      })
      .catch(() => toast.error("No se pudieron cargar los deportistas"))
      .finally(() => setLoadingPlayers(false));
  }, []);

  useEffect(() => {
    api.get<{ results?: Payment[] } | Payment[]>("/payments/?page_size=500")
      .then((res) => {
        const raw = res.data;
        const list = Array.isArray(raw)
          ? raw
          : (raw as { results?: Payment[] }).results ?? [];
        setPayments(list);
      })
      .catch(() => toast.error("No se pudieron cargar los pagos"))
      .finally(() => setLoadingPayments(false));
  }, []);

  const refreshPayments = () => {
    setLoadingPayments(true);
    api.get<{ results?: Payment[] } | Payment[]>("/payments/?page_size=500")
      .then((res) => {
        const raw = res.data;
        setPayments(Array.isArray(raw) ? raw : (raw as { results?: Payment[] }).results ?? []);
      })
      .catch(() => toast.error("Error al actualizar pagos"))
      .finally(() => setLoadingPayments(false));
  };

  // ---- resúmenes por jugador ----
  const summaries = useMemo(() => {
    return new Map(players.map((player) => {
      const own = payments.filter((p) => p.player.id === player.id);
      const paidPeriods = new Set(
        own.filter((p) => p.type === "monthly" && p.status === "approved").map((p) => p.period),
      );
      const schedule = buildSchedule(player.created_at.slice(0, 10), paidPeriods, now);
      const overdue = schedule.filter((s) => s.overdue);
      const monthlyFee = player.category?.fee ?? 0;
      const hasEnroll = own.some(
        (p) => p.type === "enrollment" && p.status === "approved" && p.period === String(currentYear),
      );
      return [player.id, {
        schedule,
        overdue,
        debt: overdue.length * monthlyFee,
        next: schedule.find((s) => !s.paid && !s.overdue),
        active: hasEnroll,
        state: (overdue.length ? "mora" : "al_dia") as MembershipState,
      }];
    }));
  }, [players, payments]);

  const summaryOf = (id: string) => summaries.get(id)!;
  const paymentsFor = (playerId: string) => payments.filter((p) => p.player.id === playerId);

  // ---- filtros de tabla ----
  const categories = [...new Set(players.map((p) => p.category?.name).filter(Boolean))] as string[];

  const filteredPlayers = players.filter((p) => {
    const s = summaryOf(p.id);
    if (!s) return true;
    const text = `${p.full_name} ${p.guardian_name}`.toLowerCase();
    return (
      text.includes(search.toLowerCase()) &&
      (categoryFilter === "all" || p.category?.name === categoryFilter) &&
      (paymentFilter === "all" || s.state === paymentFilter)
    );
  });

  // ---- KPIs ----
  const monthKey = `${currentYear}-${pad(now.getMonth() + 1)}`;
  const monthRevenue = payments
    .filter((p) => p.status === "approved" && p.paid_at?.slice(0, 7) === monthKey)
    .reduce((sum, p) => sum + p.amount, 0);
  const totalDebt = [...summaries.values()].reduce((sum, s) => sum + s.debt, 0);
  const overdueCount = players.filter((p) => summaryOf(p.id)?.state === "mora").length;
  const withoutEnrollment = players.filter((p) => !summaryOf(p.id)?.active).length;

  // ---- abrir pago mensual → crear cobro + obtener checkout ----
  const openPayment = (player: ApiPlayer) => {
    const s = summaryOf(player.id);
    const firstUnpaid = s?.schedule.find((item) => !item.paid);
    setSelectedMonths(firstUnpaid ? [firstUnpaid.period] : []);
    setCheckoutData(null);
    setPayPlayer(player);
  };

  const createMonthlyCheckout = async () => {
    if (!payPlayer || !selectedMonths.length) {
      toast.error("Selecciona al menos un mes");
      return;
    }
    setCheckoutLoading(true);
    try {
      const fee = payPlayer.category?.fee ?? 0;
      const totalCents = selectedMonths.length * fee * 100;
      const concept =
        selectedMonths.length === 1
          ? `Mensualidad ${periodLabel(selectedMonths[0])}`
          : `Mensualidades ${periodLabel(selectedMonths[0])} – ${periodLabel(selectedMonths[selectedMonths.length - 1])}`;

      // Crear el cobro en el backend
      const { data: payment } = await api.post<Payment>("/payments/", {
        player_id: payPlayer.id,
        type: "monthly",
        concept,
        amount_in_cents: totalCents,
        period: selectedMonths[0],
        notes: selectedMonths.length > 1 ? selectedMonths.join(", ") : "",
      });

      // Obtener datos del checkout de Wompi
      const { data: checkout } = await api.get<CheckoutData>(`/payments/${payment.id}/checkout/`);
      setCheckoutData(checkout);
      setPayments((prev) => [payment, ...prev]);
    } catch {
      toast.error("No se pudo generar el cobro");
    } finally {
      setCheckoutLoading(false);
    }
  };

  // ---- renovar matrícula ----
  const confirmRenewal = async () => {
    if (!renewPlayer) return;
    setCheckoutLoading(true);
    try {
      const amount = Number(renewAmount) || DEFAULT_ENROLLMENT_FEE;
      const { data: payment } = await api.post<Payment>("/payments/", {
        player_id: renewPlayer.id,
        type: "enrollment",
        concept: `Matrícula ${currentYear}`,
        amount_in_cents: amount * 100,
        period: String(currentYear),
      });
      const { data: checkout } = await api.get<CheckoutData>(`/payments/${payment.id}/checkout/`);
      setPayments((prev) => [payment, ...prev]);
      setRenewPlayer(null);
      // Abrir checkout directamente
      window.open(checkout.checkout_url, "_blank");
      toast.success("Cobro de matrícula creado — se abrió el pago en Wompi");
    } catch {
      toast.error("No se pudo crear el cobro de matrícula");
    } finally {
      setCheckoutLoading(false);
    }
  };

  // ---- pago personalizado ----
  const saveCustomPayment = async () => {
    if (!customForm.playerId || !customForm.concept.trim() || !Number(customForm.amount)) {
      toast.error("Completa deportista, concepto y monto");
      return;
    }
    setCustomLoading(true);
    try {
      const { data: payment } = await api.post<Payment>("/payments/", {
        player_id: customForm.playerId,
        type: "custom",
        concept: customForm.concept.trim(),
        amount_in_cents: Number(customForm.amount) * 100,
        notes: customForm.notes.trim(),
      });
      setPayments((prev) => [payment, ...prev]);
      toast.success("Cobro personalizado creado");
      setCustomOpen(false);
      setCustomForm({ playerId: "", concept: "", amount: "", notes: "" });
    } catch {
      toast.error("No se pudo crear el cobro");
    } finally {
      setCustomLoading(false);
    }
  };

  // ---- abrir Wompi checkout ----
  const openWompiCheckout = (url: string) => {
    window.open(url, "_blank");
    toast.info("Se abrió Wompi en una nueva pestaña. Los pagos se confirman automáticamente.");
  };

  // ---- exportar CSV ----
  const exportPlayers = () =>
    downloadCSV(
      [
        ["Deportista", "Documento", "Categoría", "Acudiente", "Teléfono", "Mensualidad", `Matrícula ${currentYear}`, "Estado", "Meses mora", "Saldo"],
        ...filteredPlayers.map((p) => {
          const s = summaryOf(p.id);
          return [
            p.full_name, p.document_id, p.category?.name ?? "", p.guardian_name,
            p.guardian_phone, p.category?.fee ?? 0,
            s?.active ? "Pagada" : "Pendiente",
            s?.state === "mora" ? "En mora" : "Al día",
            s?.overdue.length ?? 0, s?.debt ?? 0,
          ];
        }),
      ],
      "deportistas-pagos.csv",
    );

  const exportHistory = () =>
    downloadCSV(
      [
        ["Referencia", "Deportista", "Tipo", "Concepto", "Periodo", "Monto", "Estado", "Fecha pago", "Método"],
        ...payments.map((p) => [
          p.reference, p.player.full_name, typeLabels[p.type],
          p.concept, p.period, p.amount,
          p.status_display, p.paid_at?.slice(0, 10) ?? "",
          p.wompi_payment_method_type,
        ]),
      ],
      "historial-pagos.csv",
    );

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  // ---- loading state ----
  const loading = loadingPlayers || loadingPayments;

  // ---- barra de filtros ----
  const filtersBar = (
    <div className="flex flex-col lg:flex-row gap-3 mb-4">
      <div className="relative flex-1 lg:max-w-xs">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar deportista o acudiente..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 lg:flex">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="lg:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
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
      </div>
      <div className="flex gap-2 lg:ml-auto">
        <Button variant="outline" size="sm" className="gap-2" onClick={refreshPayments} disabled={loadingPayments}>
          <RefreshCw className={`w-4 h-4 ${loadingPayments ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={exportPlayers}>
          <FileDown className="w-4 h-4" />Exportar
        </Button>
      </div>
    </div>
  );

  const kpis = [
    { label: "Ingresos del mes", value: money(monthRevenue), icon: DollarSign, color: "kpi-green" },
    { label: "Saldo en mora", value: money(totalDebt), icon: AlertTriangle, color: "kpi-red" },
    { label: "Deportistas en mora", value: `${overdueCount} / ${players.length}`, icon: Wallet, color: "kpi-amber" },
    { label: `Sin matrícula ${currentYear}`, value: String(withoutEnrollment), icon: GraduationCap, color: "kpi-blue" },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-5">

        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold">Pagos</h1>
            <p className="text-muted-foreground mt-1">Membresías, matrículas y cobros personalizados · pagos vía Wompi</p>
          </div>
          <Button className="gap-2" onClick={() => setCustomOpen(true)}>
            <Plus className="w-4 h-4" /> Cobro personalizado
          </Button>
        </div>

        {/* Loading global */}
        {loading && (
          <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Cargando datos…</span>
          </div>
        )}

        {!loading && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {kpis.map((kpi) => (
                <Card key={kpi.label} className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                      <p className="text-lg sm:text-2xl font-bold mt-2 truncate">{kpi.value}</p>
                    </div>
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `hsl(var(--${kpi.color}) / 0.15)` }}
                    >
                      <kpi.icon className="w-4 h-4" style={{ color: `hsl(var(--${kpi.color}))` }} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Alerta mora */}
            {overdueCount > 0 && (
              <Card className="p-4 border-destructive/30 bg-destructive/5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{overdueCount} deportistas con mensualidades en mora</p>
                    <p className="text-xs text-muted-foreground">Total adeudado: {money(totalDebt)}</p>
                  </div>
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

              {/* ── MEMBRESÍAS ── */}
              <TabsContent value="memberships">
                <Card className="p-4 sm:p-6">
                  {filtersBar}
                  {filteredPlayers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-10">
                      No hay deportistas confirmados.
                    </p>
                  ) : (
                    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8" />
                            <TableHead>Deportista</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>Mensualidad</TableHead>
                            <TableHead>Próximo vencimiento</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPlayers.map((player) => {
                            const s = summaryOf(player.id);
                            return (
                              <TableRow key={player.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedIds.includes(player.id)}
                                    onCheckedChange={() => toggleSelect(player.id)}
                                    aria-label={`Seleccionar ${player.full_name}`}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {player.photo ? (
                                      <img src={player.photo} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                                    ) : (
                                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                                        {player.full_name.charAt(0)}
                                      </div>
                                    )}
                                    <div>
                                      <p className="font-medium leading-tight">{player.full_name}</p>
                                      <p className="text-xs text-muted-foreground">{player.document_id}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{player.category?.name ?? "—"}</Badge>
                                </TableCell>
                                <TableCell className="font-semibold">
                                  {player.category?.fee ? money(player.category.fee) : "—"}
                                </TableCell>
                                <TableCell className="text-sm whitespace-nowrap">
                                  {s?.overdue.length
                                    ? <span className="text-destructive">{s.overdue.length} mes(es) · {money(s.debt)}</span>
                                    : s?.next ? formatDate(s.next.dueDate) : "—"}
                                </TableCell>
                                <TableCell>{s ? paymentStateBadge(s.state) : null}</TableCell>
                                <TableCell className="text-right whitespace-nowrap">
                                  <Button
                                    variant="ghost" size="sm"
                                    aria-label={`Historial de ${player.full_name}`}
                                    onClick={() => setHistoryPlayer(player)}
                                  >
                                    <History className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" className="ml-1" onClick={() => openPayment(player)}>
                                    Cobrar
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </Card>
              </TabsContent>

              {/* ── MATRÍCULAS ── */}
              <TabsContent value="enrollments">
                <Card className="p-4 sm:p-6">
                  <div className="mb-4">
                    <h2 className="font-display font-semibold text-lg">Control de matrículas {currentYear}</h2>
                    <p className="text-sm text-muted-foreground">
                      Un deportista queda activo cuando su cobro de matrícula pasa a "aprobado" en Wompi.
                    </p>
                  </div>
                  {filtersBar}
                  <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Deportista</TableHead>
                          <TableHead>Categoría</TableHead>
                          <TableHead>Último cobro</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPlayers.map((player) => {
                          const s = summaryOf(player.id);
                          const lastEnroll = paymentsFor(player.id)
                            .filter((p) => p.type === "enrollment")
                            .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
                          return (
                            <TableRow key={player.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {player.photo ? (
                                    <img src={player.photo} alt="" className="w-7 h-7 rounded-full object-cover" />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                      {player.full_name.charAt(0)}
                                    </div>
                                  )}
                                  <span className="font-medium">{player.full_name}</span>
                                </div>
                              </TableCell>
                              <TableCell><Badge variant="outline">{player.category?.name ?? "—"}</Badge></TableCell>
                              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                {lastEnroll
                                  ? <>
                                    {lastEnroll.period} · {money(lastEnroll.amount)}
                                    {" · "}
                                    <Badge className={`text-[10px] ${statusColors[lastEnroll.status]}`}>
                                      {lastEnroll.status_display}
                                    </Badge>
                                  </>
                                  : "—"}
                              </TableCell>
                              <TableCell>{s ? enrollmentBadge(s.active) : null}</TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                {!s?.active && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setRenewPlayer(player);
                                      setRenewAmount(String(player.category?.fee ?? DEFAULT_ENROLLMENT_FEE));
                                    }}
                                  >
                                    Cobrar matrícula
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

              {/* ── PERSONALIZADOS ── */}
              <TabsContent value="custom">
                <Card className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <h2 className="font-display font-semibold text-lg">Cobros personalizados</h2>
                      <p className="text-sm text-muted-foreground">Uniformes, torneos, viajes y otros conceptos.</p>
                    </div>
                    <Button className="gap-2" onClick={() => setCustomOpen(true)}>
                      <Plus className="w-4 h-4" />Nuevo
                    </Button>
                  </div>
                  <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Concepto</TableHead>
                          <TableHead>Deportista</TableHead>
                          <TableHead>Monto</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Referencia</TableHead>
                          <TableHead className="text-right">Acción</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments
                          .filter((p) => p.type === "custom")
                          .map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-medium">{p.concept}</TableCell>
                              <TableCell>{p.player.full_name}</TableCell>
                              <TableCell className="font-semibold">{money(p.amount)}</TableCell>
                              <TableCell>
                                <Badge className={statusColors[p.status]}>{p.status_display}</Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">{p.reference}</TableCell>
                              <TableCell className="text-right">
                                {p.status === "pending" && (
                                  <Button
                                    size="sm" variant="outline" className="gap-1"
                                    onClick={async () => {
                                      const { data } = await api.get<CheckoutData>(`/payments/${p.id}/checkout/`);
                                      openWompiCheckout(data.checkout_url);
                                    }}
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />Pagar
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </TabsContent>

              {/* ── HISTORIAL ── */}
              <TabsContent value="history">
                <Card className="p-4 sm:p-6">
                  <div className="flex justify-end mb-4">
                    <Button variant="outline" className="gap-2" onClick={exportHistory}>
                      <FileDown className="w-4 h-4" />Exportar
                    </Button>
                  </div>
                  <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Referencia</TableHead>
                          <TableHead>Deportista</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Periodo</TableHead>
                          <TableHead>Monto</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Fecha pago</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...payments]
                          .sort((a, b) => b.created_at.localeCompare(a.created_at))
                          .map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-mono text-xs">{p.reference}</TableCell>
                              <TableCell className="font-medium">{p.player.full_name}</TableCell>
                              <TableCell><Badge variant="outline">{typeLabels[p.type]}</Badge></TableCell>
                              <TableCell className="text-sm">
                                {p.type === "monthly" && p.period ? periodLabel(p.period) : p.period || "—"}
                              </TableCell>
                              <TableCell className="font-semibold">{money(p.amount)}</TableCell>
                              <TableCell>
                                <Badge className={statusColors[p.status]}>{p.status_display}</Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                {p.paid_at ? formatDate(p.paid_at) : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* ── DIÁLOGO: cobro mensual ── */}
      <Dialog open={!!payPlayer} onOpenChange={(open) => { if (!open) { setPayPlayer(null); setCheckoutData(null); } }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          {payPlayer && !checkoutData && (
            <>
              <DialogHeader>
                <DialogTitle>Generar cobro mensual</DialogTitle>
                <DialogDescription>{payPlayer.full_name} · {payPlayer.category?.name ?? "Sin categoría"}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Meses a cobrar</Label>
                    <button
                      type="button"
                      className="text-xs text-primary"
                      onClick={() => {
                        const unpaid = summaryOf(payPlayer.id)?.schedule.filter((s) => !s.paid) ?? [];
                        setSelectedMonths(
                          selectedMonths.length === unpaid.length ? [] : unpaid.map((m) => m.period),
                        );
                      }}
                    >
                      {selectedMonths.length === (summaryOf(payPlayer.id)?.schedule.filter((s) => !s.paid).length ?? 0)
                        ? "Ninguno" : "Todos"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(summaryOf(payPlayer.id)?.schedule.filter((s) => !s.paid) ?? []).map((m) => (
                      <label
                        key={m.period}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-sm ${selectedMonths.includes(m.period) ? "border-primary bg-primary/10" : ""}`}
                      >
                        <Checkbox
                          checked={selectedMonths.includes(m.period)}
                          onCheckedChange={() =>
                            setSelectedMonths((prev) =>
                              prev.includes(m.period)
                                ? prev.filter((x) => x !== m.period)
                                : [...prev, m.period],
                            )}
                        />
                        <span className="flex-1 capitalize">{periodLabel(m.period)}</span>
                        {m.overdue && <span className="text-[10px] text-destructive font-semibold">MORA</span>}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-lg border text-center">
                  <p className="text-xs uppercase text-muted-foreground">Total · {selectedMonths.length} mes(es)</p>
                  <p className="text-3xl font-display font-bold mt-1">
                    {money(selectedMonths.length * (payPlayer.category?.fee ?? 0))}
                  </p>
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={createMonthlyCheckout}
                  disabled={checkoutLoading || !selectedMonths.length}
                >
                  {checkoutLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <CreditCard className="w-4 h-4" />}
                  Generar cobro
                </Button>
              </div>
            </>
          )}

          {payPlayer && checkoutData && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />Cobro generado
                </DialogTitle>
                <DialogDescription>
                  Referencia: <span className="font-mono">{checkoutData.reference}</span>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-4 rounded-lg border text-center">
                  <p className="text-xs uppercase text-muted-foreground">Total a pagar</p>
                  <p className="text-3xl font-display font-bold mt-1">
                    {money(checkoutData.amount_in_cents / 100)}
                  </p>
                </div>
                <Button
                  className="w-full gap-2"
                  onClick={() => openWompiCheckout(checkoutData.checkout_url)}
                >
                  <ExternalLink className="w-4 h-4" />Pagar con Wompi
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  El jugador/acudiente puede pagar con tarjeta, PSE, Nequi o Bancolombia.
                  El estado se actualiza automáticamente.
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── DIÁLOGO: historial del jugador ── */}
      <Dialog open={!!historyPlayer} onOpenChange={(open) => !open && setHistoryPlayer(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {historyPlayer && (
            <>
              <DialogHeader>
                <DialogTitle>{historyPlayer.full_name}</DialogTitle>
                <DialogDescription>
                  {historyPlayer.category?.name ?? "Sin categoría"} · {historyPlayer.document_id}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                {paymentsFor(historyPlayer.id).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Sin cobros registrados</p>
                )}
                {paymentsFor(historyPlayer.id)
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  .map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {p.type === "monthly" && p.period ? `Mensualidad ${periodLabel(p.period)}` : p.concept}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">{p.reference}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold">{money(p.amount)}</p>
                        <Badge className={`text-[10px] ${statusColors[p.status]}`}>{p.status_display}</Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── DIÁLOGO: matrícula ── */}
      <Dialog open={!!renewPlayer} onOpenChange={(open) => !open && setRenewPlayer(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cobrar matrícula {currentYear}</DialogTitle>
            <DialogDescription>{renewPlayer?.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Valor (COP)</Label>
              <Input
                type="number"
                value={renewAmount}
                onChange={(e) => setRenewAmount(e.target.value)}
                placeholder="250000"
              />
            </div>
            <Button className="w-full gap-2" onClick={confirmRenewal} disabled={checkoutLoading}>
              {checkoutLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <GraduationCap className="w-4 h-4" />}
              Generar cobro y abrir Wompi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DIÁLOGO: cobro personalizado ── */}
      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cobro personalizado</DialogTitle>
            <DialogDescription>Uniforme, torneo, viaje u otro concepto</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Deportista</Label>
              <Select value={customForm.playerId} onValueChange={(v) => setCustomForm({ ...customForm, playerId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                <SelectContent>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Concepto</Label>
              <Input
                placeholder="Ej. Uniforme, torneo, viaje"
                value={customForm.concept}
                onChange={(e) => setCustomForm({ ...customForm, concept: e.target.value })}
              />
            </div>
            <div>
              <Label>Monto (COP)</Label>
              <Input
                type="number"
                placeholder="120000"
                value={customForm.amount}
                onChange={(e) => setCustomForm({ ...customForm, amount: e.target.value })}
              />
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Input
                placeholder="Descripción adicional"
                value={customForm.notes}
                onChange={(e) => setCustomForm({ ...customForm, notes: e.target.value })}
              />
            </div>
            <Button className="w-full gap-2" onClick={saveCustomPayment} disabled={customLoading}>
              {customLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <CreditCard className="w-4 h-4" />}
              Crear cobro
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

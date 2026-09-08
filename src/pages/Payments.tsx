import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DollarSign, TrendingUp, AlertTriangle, CheckCircle2, Search,
  CreditCard, Download, Send, Crown, Star, Sparkles, CalendarClock,
  Receipt, FileDown, History, User,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

type Status = "paid" | "pending" | "overdue";

interface Invoice {
  id: string;
  athleteId: number;
  player: string;
  plan: string;
  amount: number;
  date: string;
  dueDate: string;
  status: Status;
  method?: string;
}

interface Athlete {
  id: number;
  name: string;
  category: string;
  plan: string;
  fee: number;
  nextDue: string;
  guardian: string;
}

const initialAthletes: Athlete[] = [
  { id: 1, name: "Mateo Rodríguez", category: "Sub-15", plan: "Mensual", fee: 180000, nextDue: "01 May 2026", guardian: "Claudia Rodríguez" },
  { id: 2, name: "Santiago López", category: "Sub-15", plan: "Semestral", fee: 950000, nextDue: "01 Sep 2026", guardian: "Jorge López" },
  { id: 3, name: "Diego Martínez", category: "Sub-13", plan: "Mensual", fee: 180000, nextDue: "20 Abr 2026", guardian: "Ana Martínez" },
  { id: 4, name: "Andrés Gómez", category: "Sub-17", plan: "Mensual", fee: 180000, nextDue: "28 Mar 2026", guardian: "Pedro Gómez" },
  { id: 5, name: "Juan Hernández", category: "Sub-15", plan: "Anual", fee: 1700000, nextDue: "15 Mar 2027", guardian: "Marta Hernández" },
  { id: 6, name: "Felipe Castro", category: "Sub-13", plan: "Mensual", fee: 180000, nextDue: "01 May 2026", guardian: "Luis Castro" },
  { id: 7, name: "Tomás Vargas", category: "Sub-17", plan: "Mensual", fee: 180000, nextDue: "28 Mar 2026", guardian: "Sonia Vargas" },
  { id: 8, name: "Sebastián Ruiz", category: "Sub-15", plan: "Semestral", fee: 950000, nextDue: "15 Sep 2026", guardian: "Iván Ruiz" },
];

const initialInvoices: Invoice[] = [
  { id: "INV-2026-0142", athleteId: 1, player: "Mateo Rodríguez", plan: "Mensual", amount: 180000, date: "01 Abr", dueDate: "05 Abr 2026", status: "paid", method: "Transferencia" },
  { id: "INV-2026-0141", athleteId: 2, player: "Santiago López", plan: "Semestral", amount: 950000, date: "01 Abr", dueDate: "05 Abr 2026", status: "paid", method: "Tarjeta" },
  { id: "INV-2026-0140", athleteId: 3, player: "Diego Martínez", plan: "Mensual", amount: 180000, date: "01 Abr", dueDate: "20 Abr 2026", status: "pending" },
  { id: "INV-2026-0139", athleteId: 4, player: "Andrés Gómez", plan: "Mensual", amount: 180000, date: "28 Mar", dueDate: "28 Mar 2026", status: "overdue" },
  { id: "INV-2026-0138", athleteId: 5, player: "Juan Hernández", plan: "Anual", amount: 1700000, date: "15 Mar", dueDate: "20 Mar 2026", status: "paid", method: "Efectivo" },
  { id: "INV-2026-0137", athleteId: 6, player: "Felipe Castro", plan: "Mensual", amount: 180000, date: "01 Abr", dueDate: "05 Abr 2026", status: "paid", method: "Transferencia" },
  { id: "INV-2026-0136", athleteId: 7, player: "Tomás Vargas", plan: "Mensual", amount: 180000, date: "28 Mar", dueDate: "28 Mar 2026", status: "overdue" },
  { id: "INV-2026-0135", athleteId: 8, player: "Sebastián Ruiz", plan: "Semestral", amount: 950000, date: "15 Mar", dueDate: "20 Mar 2026", status: "paid", method: "Tarjeta" },
  { id: "INV-2026-0128", athleteId: 1, player: "Mateo Rodríguez", plan: "Mensual", amount: 180000, date: "01 Mar", dueDate: "05 Mar 2026", status: "paid", method: "Transferencia" },
  { id: "INV-2026-0119", athleteId: 1, player: "Mateo Rodríguez", plan: "Mensual", amount: 180000, date: "01 Feb", dueDate: "05 Feb 2026", status: "paid", method: "Efectivo" },
  { id: "INV-2026-0121", athleteId: 4, player: "Andrés Gómez", plan: "Mensual", amount: 180000, date: "01 Feb", dueDate: "05 Feb 2026", status: "paid", method: "Transferencia" },
  { id: "INV-2026-0130", athleteId: 3, player: "Diego Martínez", plan: "Mensual", amount: 180000, date: "01 Mar", dueDate: "05 Mar 2026", status: "paid", method: "Tarjeta" },
];

const plans = [
  {
    name: "Básico", price: 180000, period: "mes", icon: Star, color: "kpi-blue",
    features: ["Entrenamientos regulares", "Acceso a estadísticas", "Reportes mensuales"],
    members: 64,
  },
  {
    name: "Premium", price: 950000, period: "semestre", icon: Sparkles, color: "kpi-amber", featured: true,
    features: ["Todo del Básico", "Análisis tácticos", "Sesiones individuales", "Acceso a videos premium"],
    members: 28,
  },
  {
    name: "Élite", price: 1700000, period: "año", icon: Crown, color: "kpi-green",
    features: ["Todo del Premium", "Asesoría nutricional", "Evaluación médica", "Acceso a torneos VIP"],
    members: 10,
  },
];

const statusBadge = (s: Status) => {
  if (s === "paid") return <Badge className="bg-primary/15 text-primary border-0">Pagado</Badge>;
  if (s === "pending") return <Badge className="bg-[hsl(var(--kpi-amber)/0.15)] text-[hsl(var(--kpi-amber))] border-0">Pendiente</Badge>;
  return <Badge variant="destructive">En mora</Badge>;
};

const money = (n: number) => `$${n.toLocaleString("es-CO")}`;

export default function Payments() {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [athletes] = useState<Athlete[]>(initialAthletes);
  const [search, setSearch] = useState("");
  const [athleteSearch, setAthleteSearch] = useState("");
  const [detail, setDetail] = useState<Athlete | null>(null);
  const [charge, setCharge] = useState<Athlete | null>(null);
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeDue, setChargeDue] = useState("");
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [payMethod, setPayMethod] = useState("Transferencia");

  const totalRevenue = invoices.filter((p) => p.status === "paid" && p.date.includes("Abr")).reduce((s, p) => s + p.amount, 0);
  const overdueList = invoices.filter((p) => p.status === "overdue");
  const outstanding = invoices.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0);

  const athleteState = (id: number): Status => {
    const open = invoices.filter((i) => i.athleteId === id && i.status !== "paid");
    if (open.some((i) => i.status === "overdue")) return "overdue";
    if (open.length) return "pending";
    return "paid";
  };

  const historyFor = (id: number) => invoices.filter((i) => i.athleteId === id);

  const filteredInvoices = useMemo(
    () => invoices.filter((p) => (p.player + p.id).toLowerCase().includes(search.toLowerCase())),
    [invoices, search]
  );
  const filteredAthletes = useMemo(
    () => athletes.filter((a) => (a.name + a.category).toLowerCase().includes(athleteSearch.toLowerCase())),
    [athletes, athleteSearch]
  );

  const openCharge = (a: Athlete) => {
    setCharge(a);
    setChargeAmount(String(a.fee));
    setChargeDue("");
  };

  const generateCharge = () => {
    if (!charge) return;
    const newInvoice: Invoice = {
      id: `INV-2026-${String(1000 + invoices.length).slice(1)}`,
      athleteId: charge.id,
      player: charge.name,
      plan: charge.plan,
      amount: Number(chargeAmount) || charge.fee,
      date: "Hoy",
      dueDate: chargeDue || charge.nextDue,
      status: "pending",
    };
    setInvoices((prev) => [newInvoice, ...prev]);
    setCharge(null);
    toast.success(`Cobro generado para ${newInvoice.player}`);
  };

  const confirmPayment = () => {
    if (!payInvoice) return;
    setInvoices((prev) => prev.map((i) => (i.id === payInvoice.id ? { ...i, status: "paid", method: payMethod } : i)));
    toast.success(`Pago registrado · ${payInvoice.id}`);
    setPayInvoice(null);
  };

  const exportCSV = () => {
    const rows = [
      ["Factura", "Deportista", "Plan", "Monto", "Emitida", "Vence", "Estado", "Método"],
      ...invoices.map((i) => [i.id, i.player, i.plan, i.amount, i.date, i.dueDate, i.status, i.method ?? ""]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "pagos-soccer-future.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Archivo exportado");
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold">Pagos y Membresías</h1>
            <p className="text-muted-foreground mt-1">Gestión de cobros, vencimientos y estado financiero</p>
          </div>
          <Button className="gap-2" onClick={() => openCharge(athletes[0])}>
            <CreditCard className="w-4 h-4" /> Generar cobro
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: "Ingresos del mes", value: `$${(totalRevenue / 1000000).toFixed(1)}M`, change: "+18%", icon: DollarSign, color: "kpi-green" },
            { label: "Pagos al día", value: `${invoices.filter((p) => p.status === "paid").length}`, change: "82%", icon: CheckCircle2, color: "kpi-blue" },
            { label: "Por cobrar", value: money(outstanding), change: `${overdueList.length} en mora`, icon: AlertTriangle, color: "kpi-red" },
            { label: "Tasa de cobro", value: "94%", change: "+3%", icon: TrendingUp, color: "kpi-amber" },
          ].map((k) => (
            <Card key={k.label} className="p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{k.label}</p>
                  <p className="text-xl sm:text-2xl font-bold mt-2 truncate">{k.value}</p>
                  <p className="text-xs mt-1" style={{ color: `hsl(var(--${k.color}))` }}>{k.change}</p>
                </div>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `hsl(var(--${k.color}) / 0.15)` }}>
                  <k.icon className="w-4 h-4" style={{ color: `hsl(var(--${k.color}))` }} />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {overdueList.length > 0 && (
          <Card className="p-4 border-destructive/30 bg-destructive/5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/15 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{overdueList.length} deportistas con pagos en mora</p>
                <p className="text-xs text-muted-foreground">
                  Total adeudado: {money(overdueList.reduce((s, i) => s + i.amount, 0))} • Promedio 18 días vencido
                </p>
              </div>
              <Button variant="destructive" size="sm" className="gap-2" onClick={() => toast.success("Recordatorios enviados")}>
                <Send className="w-3.5 h-3.5" /> Enviar recordatorios
              </Button>
            </div>
          </Card>
        )}

        <Tabs defaultValue="athletes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="athletes">Deportistas</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
            <TabsTrigger value="plans">Planes</TabsTrigger>
          </TabsList>

          {/* Athletes with due dates */}
          <TabsContent value="athletes">
            <Card className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Buscar deportista..." className="pl-9" value={athleteSearch} onChange={(e) => setAthleteSearch(e.target.value)} />
                </div>
                <Button variant="outline" className="gap-2 sm:ml-auto" onClick={exportCSV}>
                  <FileDown className="w-4 h-4" /> Exportar
                </Button>
              </div>

              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deportista</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Mensualidad</TableHead>
                      <TableHead>Próximo vencimiento</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAthletes.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell><Badge variant="outline">{a.category}</Badge></TableCell>
                        <TableCell className="text-sm">{a.plan}</TableCell>
                        <TableCell className="font-semibold">{money(a.fee)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          <span className="flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" />{a.nextDue}</span>
                        </TableCell>
                        <TableCell>{statusBadge(athleteState(a.id))}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button variant="ghost" size="sm" onClick={() => setDetail(a)}>Histórico</Button>
                          <Button variant="outline" size="sm" className="ml-2" onClick={() => openCharge(a)}>Cobrar</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* Invoice history */}
          <TabsContent value="history">
            <Card className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Buscar por jugador o factura..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Button variant="outline" className="gap-2 sm:ml-auto" onClick={exportCSV}>
                  <Download className="w-4 h-4" /> Exportar
                </Button>
              </div>

              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Factura</TableHead>
                      <TableHead>Deportista</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Vence</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.id}</TableCell>
                        <TableCell className="font-medium">{p.player}</TableCell>
                        <TableCell><Badge variant="outline">{p.plan}</Badge></TableCell>
                        <TableCell className="font-semibold">{money(p.amount)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{p.dueDate}</TableCell>
                        <TableCell>{statusBadge(p.status)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {p.status === "paid" ? (
                            <Button variant="ghost" size="sm" className="gap-1" onClick={() => toast.info(`Recibo ${p.id} · ${p.method}`)}>
                              <Receipt className="w-3.5 h-3.5" /> Recibo
                            </Button>
                          ) : (
                            <Button size="sm" onClick={() => { setPayInvoice(p); setPayMethod("Transferencia"); }}>
                              Efectuar pago
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

          <TabsContent value="plans">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <motion.div key={plan.name} whileHover={{ y: -4 }}>
                  <Card className={`p-6 h-full relative ${plan.featured ? "border-primary border-2" : ""}`}>
                    {plan.featured && (
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary">Más popular</Badge>
                    )}
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `hsl(var(--${plan.color}) / 0.15)` }}>
                      <plan.icon className="w-6 h-6" style={{ color: `hsl(var(--${plan.color}))` }} />
                    </div>
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <div className="my-4">
                      <span className="text-2xl sm:text-3xl font-display font-bold">${(plan.price / 1000).toLocaleString("es-CO")}K</span>
                      <span className="text-muted-foreground text-sm">/{plan.period}</span>
                    </div>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                    <div className="pt-4 border-t flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{plan.members} miembros</span>
                      <Button size="sm" variant={plan.featured ? "default" : "outline"}>Editar plan</Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Athlete history */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" />{detail.name}</DialogTitle>
                <DialogDescription>{detail.category} · Plan {detail.plan} · Acudiente: {detail.guardian}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-lg border">
                  <p className="text-[10px] uppercase text-muted-foreground">Mensualidad</p>
                  <p className="text-sm font-semibold mt-1">{money(detail.fee)}</p>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-[10px] uppercase text-muted-foreground">Vence</p>
                  <p className="text-sm font-semibold mt-1">{detail.nextDue}</p>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-[10px] uppercase text-muted-foreground">Estado</p>
                  <div className="mt-1 flex justify-center">{statusBadge(athleteState(detail.id))}</div>
                </div>
              </div>
              <p className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1 pt-1">
                <History className="w-3.5 h-3.5" /> Histórico de pagos
              </p>
              <div className="space-y-2">
                {historyFor(detail.id).map((i) => (
                  <div key={i.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                    <div className="min-w-0">
                      <p className="text-sm font-medium font-mono">{i.id}</p>
                      <p className="text-xs text-muted-foreground">Vence {i.dueDate}{i.method ? ` · ${i.method}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-semibold">{money(i.amount)}</span>
                      {statusBadge(i.status)}
                    </div>
                  </div>
                ))}
              </div>
              <Button className="w-full gap-2" onClick={() => { setDetail(null); openCharge(detail); }}>
                <CreditCard className="w-4 h-4" /> Generar nuevo cobro
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Generate charge */}
      <Dialog open={!!charge} onOpenChange={(o) => !o && setCharge(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generar cobro</DialogTitle>
            <DialogDescription>{charge?.name} · {charge?.category}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <Label>Concepto</Label>
              <Select defaultValue={charge?.plan ?? "Mensual"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mensual">Mensualidad</SelectItem>
                  <SelectItem value="Semestral">Semestre</SelectItem>
                  <SelectItem value="Anual">Anualidad</SelectItem>
                  <SelectItem value="Torneo">Inscripción a torneo</SelectItem>
                  <SelectItem value="Uniforme">Uniforme / kit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Monto (COP)</Label>
                <Input type="number" value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)} />
              </div>
              <div>
                <Label>Vencimiento</Label>
                <Input type="date" value={chargeDue} onChange={(e) => setChargeDue(e.target.value)} />
              </div>
            </div>
            <Button className="w-full" onClick={generateCharge}>Generar cobro</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Execute payment */}
      <Dialog open={!!payInvoice} onOpenChange={(o) => !o && setPayInvoice(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Efectuar pago</DialogTitle>
            <DialogDescription>{payInvoice?.player} · {payInvoice?.id}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="p-4 rounded-lg border text-center">
              <p className="text-xs uppercase text-muted-foreground">Total a pagar</p>
              <p className="text-3xl font-display font-bold mt-1">{money(payInvoice?.amount ?? 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">Vence {payInvoice?.dueDate}</p>
            </div>
            <div>
              <Label>Método de pago</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                  <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="PSE">PSE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full gap-2" onClick={confirmPayment}>
              <CheckCircle2 className="w-4 h-4" /> Confirmar pago
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

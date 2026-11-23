import { useEffect, useState } from "react";
import type { ComponentType, CSSProperties } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { FileDown, Plus, Scale, Search, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loadStoredPayments } from "@/pages/Payments";
import type { Payment } from "@/pages/Payments";

interface Expense {
  id: string;
  date: string;
  category: string;
  concept: string;
  amount: number;
  method: string;
  provider?: string;
}

const EXPENSES_STORAGE_KEY = "sf_expenses";
const EXPENSE_CATEGORIES = [
  "Nómina entrenadores", "Arriendo canchas", "Implementos", "Uniformes",
  "Transporte", "Torneos", "Servicios", "Marketing", "Otros",
];
const PAYMENT_METHODS = ["Transferencia", "Efectivo", "Tarjeta", "PSE", "Nequi"];
const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const CHART_COLORS = ["--kpi-green", "--kpi-blue", "--kpi-amber", "--kpi-red", "--primary", "--muted-foreground"];
const INCOME_TYPES = [
  { type: "monthly", label: "Mensualidades" },
  { type: "enrollment", label: "Matrículas" },
  { type: "custom", label: "Personalizados" },
] as const;

const tooltipStyle: CSSProperties = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
};

const pad = (n: number) => String(n).padStart(2, "0");
const money = (n: number) => `$${n.toLocaleString("es-CO")}`;
const compactMoney = (n: number) =>
  Math.abs(n) >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`;

const localDateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const buildSeedExpenses = (year: number, lastMonth: number): Expense[] => {
  const expenses: Expense[] = [];
  for (let month = 1; month <= lastMonth; month++) {
    expenses.push({
      id: `EG-${month}-1`, date: `${year}-${pad(month)}-01`, category: "Nómina entrenadores",
      concept: "Pago entrenadores", amount: 1800000, method: "Transferencia",
    });
    expenses.push({
      id: `EG-${month}-2`, date: `${year}-${pad(month)}-05`, category: "Arriendo canchas",
      concept: "Cancha sintética", amount: 600000, method: "Transferencia", provider: "Complejo El Golazo",
    });
    if (month % 3 === 0) {
      expenses.push({
        id: `EG-${month}-3`, date: `${year}-${pad(month)}-12`, category: "Implementos",
        concept: "Balones y conos", amount: 350000, method: "Tarjeta",
      });
    }
  }
  return expenses;
};

const loadExpenses = (year: number, lastMonth: number): Expense[] => {
  try {
    const raw = localStorage.getItem(EXPENSES_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Expense[];
  } catch { /* usa la semilla */ }
  return buildSeedExpenses(year, lastMonth);
};

const balanceFor = (prefix: string, payments: Payment[], expenses: Expense[]) => {
  const income = payments
    .filter((p) => p.status === "paid" && p.date.startsWith(prefix))
    .reduce((sum, p) => sum + p.amount, 0);
  const expense = expenses.filter((e) => e.date.startsWith(prefix)).reduce((sum, e) => sum + e.amount, 0);
  return { income, expenses: expense, net: income - expense };
};

const exportExpenses = (expenses: Expense[]) => {
  const rows: (string | number)[][] = [
    ["Fecha", "Categoría", "Concepto", "Proveedor", "Método", "Monto"],
    ...expenses.map((e) => [e.date, e.category, e.concept, e.provider ?? "", e.method, e.amount]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([String.fromCharCode(0xfeff), csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "egresos.csv";
  link.click();
  URL.revokeObjectURL(url);
};

interface KpiCardProps {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  color: string;
}

const KpiCard = ({ label, value, icon: Icon, color }: KpiCardProps) => (
  <Card className="p-5">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={`text-lg sm:text-2xl font-bold mt-2 truncate ${value < 0 ? "text-destructive" : ""}`}>{money(value)}</p>
      </div>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `hsl(var(${color}) / 0.15)` }}>
        <Icon className="w-4 h-4" style={{ color: `hsl(var(${color}))` }} />
      </div>
    </div>
  </Card>
);

export default function Finance() {
  const [today] = useState(() => new Date());
  const year = today.getFullYear();

  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses(year, today.getMonth() + 1));
  const [payments] = useState<Payment[]>(loadStoredPayments);

  useEffect(() => {
    localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(expenses));
  }, [expenses]);

  const [month, setMonth] = useState(`${year}-${pad(today.getMonth() + 1)}`);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    date: localDateKey(today),
    category: EXPENSE_CATEGORIES[0],
    concept: "",
    amount: "",
    method: PAYMENT_METHODS[0],
    provider: "",
  });
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const monthBalance = balanceFor(month, payments, expenses);
  const yearBalance = balanceFor(String(year), payments, expenses);

  const monthlyRows = MONTH_LABELS.map((label, index) => {
    const balance = balanceFor(`${year}-${pad(index + 1)}`, payments, expenses);
    return { label, Ingresos: balance.income, Egresos: balance.expenses, Neto: balance.net };
  });

  const expensesByCategory = EXPENSE_CATEGORIES
    .map((name) => ({
      name,
      value: expenses.filter((e) => e.date.startsWith(month) && e.category === name).reduce((sum, e) => sum + e.amount, 0),
    }))
    .filter((c) => c.value);

  const incomeByType = INCOME_TYPES.map(({ type, label }) => ({
    type,
    label,
    value: payments
      .filter((p) => p.status === "paid" && p.type === type && p.date.startsWith(month))
      .reduce((sum, p) => sum + p.amount, 0),
  }));

  const filteredExpenses = expenses
    .filter((e) => (e.concept + (e.provider ?? "")).toLowerCase().includes(search.toLowerCase())
      && (categoryFilter === "all" || e.category === categoryFilter))
    .sort((a, b) => b.date.localeCompare(a.date));

  const saveExpense = () => {
    if (!form.concept.trim() || !Number(form.amount)) {
      toast.error("Completa concepto y monto");
      return;
    }
    setExpenses((prev) => [{
      id: `EG-${Date.now()}`,
      ...form,
      concept: form.concept.trim(),
      amount: Number(form.amount),
      provider: form.provider.trim() || undefined,
    }, ...prev]);
    toast.success("Egreso registrado");
    setDialogOpen(false);
    setForm({ ...form, concept: "", amount: "", provider: "" });
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    toast.success("Egreso eliminado");
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold">Finanzas</h1>
            <p className="text-muted-foreground mt-1">Egresos y balance mensual y general del club</p>
          </div>
          <div className="flex gap-2">
            <Input type="month" aria-label="Mes" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="w-40" />
            <Button className="gap-2" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4" />Egreso
            </Button>
          </div>
        </div>

        <Tabs defaultValue="monthly" className="space-y-4">
          <TabsList>
            <TabsTrigger value="monthly">Balance mensual</TabsTrigger>
            <TabsTrigger value="general">Balance general</TabsTrigger>
            <TabsTrigger value="expenses">Egresos</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <KpiCard label="Ingresos del mes" value={monthBalance.income} icon={TrendingUp} color="--kpi-green" />
              <KpiCard label="Egresos del mes" value={monthBalance.expenses} icon={TrendingDown} color="--kpi-red" />
              <KpiCard label="Resultado del mes" value={monthBalance.net} icon={Scale} color="--kpi-blue" />
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <Card className="p-5">
                <h3 className="font-semibold mb-3">Ingresos por tipo</h3>
                {incomeByType.map((row) => (
                  <div key={row.type} className="flex justify-between py-2 border-b border-border/50 text-sm">
                    <span>{row.label}</span>
                    <span className="font-semibold">{money(row.value)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-3 text-sm font-bold">
                  <span>Total</span>
                  <span>{money(monthBalance.income)}</span>
                </div>
              </Card>
              <Card className="p-5">
                <h3 className="font-semibold mb-3">Egresos por categoría</h3>
                {expensesByCategory.length ? (
                  <div className="h-56">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={expensesByCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85}>
                          {expensesByCategory.map((entry, index) => (
                            <Cell key={entry.name} fill={`hsl(var(${CHART_COLORS[index % CHART_COLORS.length]}))`} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => money(Number(value))} contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-10 text-center">Sin egresos este mes</p>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="general" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <KpiCard label={`Ingresos ${year}`} value={yearBalance.income} icon={TrendingUp} color="--kpi-green" />
              <KpiCard label={`Egresos ${year}`} value={yearBalance.expenses} icon={TrendingDown} color="--kpi-red" />
              <KpiCard label={`Utilidad ${year}`} value={yearBalance.net} icon={Scale} color="--kpi-blue" />
            </div>
            <Card className="p-5">
              <h3 className="font-semibold mb-3">Ingresos vs egresos por mes</h3>
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={monthlyRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis tickFormatter={compactMoney} stroke="hsl(var(--muted-foreground))" fontSize={11} width={50} />
                    <Tooltip formatter={(value) => money(Number(value))} contentStyle={tooltipStyle} />
                    <Legend />
                    <Bar dataKey="Ingresos" fill="hsl(var(--kpi-green))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Egresos" fill="hsl(var(--kpi-red))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-4 sm:p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead className="text-right">Ingresos</TableHead>
                      <TableHead className="text-right">Egresos</TableHead>
                      <TableHead className="text-right">Resultado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyRows.filter((row) => row.Ingresos || row.Egresos).map((row) => (
                      <TableRow key={row.label}>
                        <TableCell>{row.label} {year}</TableCell>
                        <TableCell className="text-right">{money(row.Ingresos)}</TableCell>
                        <TableCell className="text-right">{money(row.Egresos)}</TableCell>
                        <TableCell className={`text-right font-semibold ${row.Neto < 0 ? "text-destructive" : "text-primary"}`}>
                          {money(row.Neto)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="expenses">
            <Card className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Buscar concepto o proveedor..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" className="gap-2 sm:ml-auto" onClick={() => exportExpenses(filteredExpenses)}>
                  <FileDown className="w-4 h-4" />Exportar
                </Button>
              </div>
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {new Date(`${expense.date}T00:00:00`).toLocaleDateString("es-CO")}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{expense.concept}</p>
                          {expense.provider && <p className="text-xs text-muted-foreground">{expense.provider}</p>}
                        </TableCell>
                        <TableCell><Badge variant="outline">{expense.category}</Badge></TableCell>
                        <TableCell className="text-sm">{expense.method}</TableCell>
                        <TableCell className="text-right font-semibold">{money(expense.amount)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" aria-label="Eliminar egreso" onClick={() => deleteExpense(expense.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar egreso</DialogTitle>
            <DialogDescription>Gastos del club</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <Label>Monto (COP)</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Categoría</Label>
              <Select value={form.category} onValueChange={(category) => setForm({ ...form, category })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Concepto</Label>
              <Input value={form.concept} placeholder="Ej. Arriendo cancha noviembre" onChange={(e) => setForm({ ...form, concept: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Proveedor</Label>
                <Input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
              </div>
              <div>
                <Label>Método</Label>
                <Select value={form.method} onValueChange={(method) => setForm({ ...form, method })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={saveExpense}>Guardar egreso</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

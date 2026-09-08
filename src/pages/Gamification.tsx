import { useRef, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { motion, PanInfo } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Gamepad2, Star, Shield, Zap, Crown, Flame, Medal,
  Download, Trash2, RotateCcw, Move, Plus,
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const formations = ["4-3-3", "4-4-2", "3-5-2", "4-2-3-1"];

interface FieldPlayer {
  id: number; num: number; name: string; position: string;
  rating: number; level: number; xp: number; x: number; y: number;
  stats: Record<string, number>;
}

const initialPlayers: FieldPlayer[] = [
  { id: 1, num: 1, name: "A. Gómez", position: "POR", rating: 71, level: 12, xp: 680, x: 50, y: 92, stats: { reflejos: 82, saque: 65, posición: 78 } },
  { id: 2, num: 3, name: "V. Cruz", position: "DFC", rating: 68, level: 10, xp: 520, x: 35, y: 78, stats: { defensa: 75, velocidad: 62, pase: 60 } },
  { id: 3, num: 2, name: "M. López", position: "DFC", rating: 78, level: 15, xp: 890, x: 65, y: 78, stats: { defensa: 82, velocidad: 70, pase: 72 } },
  { id: 4, num: 6, name: "P. Reyes", position: "LI", rating: 72, level: 11, xp: 600, x: 10, y: 70, stats: { defensa: 70, velocidad: 78, centro: 68 } },
  { id: 5, num: 4, name: "L. Vargas", position: "LD", rating: 74, level: 13, xp: 740, x: 90, y: 70, stats: { defensa: 72, velocidad: 80, centro: 71 } },
  { id: 6, num: 5, name: "C. Díaz", position: "MC", rating: 75, level: 14, xp: 810, x: 50, y: 55, stats: { pase: 85, visión: 80, defensa: 65 } },
  { id: 7, num: 8, name: "M. Herrera", position: "MCO", rating: 73, level: 12, xp: 660, x: 30, y: 48, stats: { pase: 78, tiro: 70, regate: 72 } },
  { id: 8, num: 7, name: "S. Ramírez", position: "MCO", rating: 85, level: 19, xp: 1200, x: 70, y: 48, stats: { pase: 88, tiro: 80, regate: 85 } },
  { id: 9, num: 10, name: "D. Torres", position: "EI", rating: 79, level: 16, xp: 950, x: 15, y: 28, stats: { velocidad: 88, regate: 82, tiro: 75 } },
  { id: 10, num: 9, name: "J. Pérez", position: "DC", rating: 82, level: 18, xp: 1100, x: 50, y: 22, stats: { tiro: 88, cabeza: 80, posición: 82 } },
  { id: 11, num: 11, name: "A. Mora", position: "ED", rating: 76, level: 14, xp: 780, x: 85, y: 28, stats: { velocidad: 85, regate: 78, centro: 72 } },
];

type ObjKind = "cone" | "hurdle" | "ball" | "goal" | "ladder" | "pole" | "rival";

const objCatalog: { kind: ObjKind; label: string; emoji: string }[] = [
  { kind: "cone", label: "Cono", emoji: "🔶" },
  { kind: "hurdle", label: "Valla", emoji: "🚧" },
  { kind: "ball", label: "Balón", emoji: "⚽" },
  { kind: "goal", label: "Mini arco", emoji: "🥅" },
  { kind: "ladder", label: "Escalera", emoji: "🪜" },
  { kind: "pole", label: "Pica", emoji: "📍" },
  { kind: "rival", label: "Rival", emoji: "🔴" },
];

interface FieldObject { id: number; kind: ObjKind; emoji: string; label: string; x: number; y: number }

const ratingColor = (r: number) => {
  if (r >= 85) return { bg: "hsl(var(--primary))", text: "hsl(0 0% 100%)" };
  if (r >= 78) return { bg: "hsl(var(--kpi-blue))", text: "hsl(0 0% 100%)" };
  if (r >= 72) return { bg: "hsl(var(--kpi-amber))", text: "hsl(0 0% 100%)" };
  return { bg: "hsl(var(--muted-foreground))", text: "hsl(0 0% 100%)" };
};

const levelIcon = (l: number) => {
  if (l >= 18) return <Crown className="w-3 h-3 text-[hsl(var(--kpi-amber))]" />;
  if (l >= 14) return <Flame className="w-3 h-3 text-destructive" />;
  return <Star className="w-3 h-3 text-muted-foreground" />;
};

const clamp = (n: number) => Math.min(97, Math.max(3, n));

const Gamification = () => {
  const [formation, setFormation] = useState("4-3-3");
  const [mode, setMode] = useState<"lineup" | "training">("lineup");
  const [players, setPlayers] = useState<FieldPlayer[]>(initialPlayers);
  const [objects, setObjects] = useState<FieldObject[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<FieldPlayer | null>(null);
  const [sessionName, setSessionName] = useState("Sesión de entrenamiento");
  const [exporting, setExporting] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);

  const teamOverall = Math.round(players.reduce((a, p) => a + p.rating, 0) / players.length);
  const leaderboard = [...players].sort((a, b) => b.xp - a.xp);

  const pointToPercent = (info: PanInfo) => {
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: clamp(((info.point.x - rect.left) / rect.width) * 100),
      y: clamp(((info.point.y - rect.top) / rect.height) * 100),
    };
  };

  const movePlayer = (id: number, info: PanInfo) => {
    const pos = pointToPercent(info);
    if (!pos) return;
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, ...pos } : p)));
  };

  const moveObject = (id: number, info: PanInfo) => {
    const pos = pointToPercent(info);
    if (!pos) return;
    setObjects((prev) => prev.map((o) => (o.id === id ? { ...o, ...pos } : o)));
  };

  const addObject = (kind: ObjKind) => {
    const item = objCatalog.find((o) => o.kind === kind)!;
    setObjects((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), kind, emoji: item.emoji, label: item.label, x: 50, y: 50 },
    ]);
    setMode("training");
  };

  const exportPDF = async () => {
    if (!fieldRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(fieldRef.current, { backgroundColor: "#25762a", scale: 2 });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      pdf.setFontSize(16);
      pdf.text(sessionName || "Sesión de entrenamiento", 15, 18);
      pdf.setFontSize(10);
      pdf.text(`Formación ${formation} · ${players.length} jugadores · ${objects.length} elementos`, 15, 25);
      const w = 180;
      const h = (canvas.height / canvas.width) * w;
      pdf.addImage(img, "PNG", 15, 32, w, Math.min(h, 200));
      let y = Math.min(h, 200) + 42;
      if (objects.length) {
        pdf.setFontSize(12);
        pdf.text("Materiales", 15, y);
        y += 6;
        pdf.setFontSize(10);
        const counts = objects.reduce<Record<string, number>>((acc, o) => {
          acc[o.label] = (acc[o.label] ?? 0) + 1;
          return acc;
        }, {});
        Object.entries(counts).forEach(([label, n]) => {
          pdf.text(`• ${label}: ${n}`, 18, y);
          y += 5;
        });
      }
      pdf.save(`${(sessionName || "actividad").replace(/\s+/g, "-").toLowerCase()}.pdf`);
      toast.success("PDF descargado");
    } catch {
      toast.error("No se pudo generar el PDF");
    } finally {
      setExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 max-w-[1400px]">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-display font-bold text-foreground">Squad Builder</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Alineaciones y pizarra de entrenamiento</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="glass-card px-4 py-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">OVR</span>
              <span className="text-xl font-bold text-foreground">{teamOverall}</span>
            </div>
          </div>
        </motion.div>

        {/* Mode + formation */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "lineup" | "training")}>
            <TabsList>
              <TabsTrigger value="lineup">Alineación</TabsTrigger>
              <TabsTrigger value="training">Entrenamiento</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex gap-2 overflow-x-auto">
            {formations.map((f) => (
              <button key={f} onClick={() => setFormation(f)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${formation === f ? "bg-primary text-primary-foreground shadow-md" : "glass-card text-muted-foreground hover:text-foreground"}`}>
                {f}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 sm:ml-auto">
            <Move className="w-3 h-3" /> Arrastra jugadores y objetos sobre la cancha
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Football Field */}
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
            className="lg:col-span-2 rounded-2xl overflow-hidden relative" style={{ background: "#1a1a1a" }}>
            <div className="relative w-full" style={{ paddingBottom: "140%" }}>
              {/* Green field area with margin */}
              <div ref={fieldRef} className="absolute inset-4 rounded-xl overflow-hidden" style={{ background: "linear-gradient(180deg, #2d8a2e, #25762a)" }}>
                {/* Grass stripes */}
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="absolute left-0 right-0" style={{ top: `${i * 8.33}%`, height: "8.33%", background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.06)" }} />
                ))}

                <div className="absolute inset-[4%] border-2 border-white/80 rounded-sm" />
                <div className="absolute left-[4%] right-[4%] top-1/2 h-0.5 bg-white/80" />
                <div className="absolute left-1/2 top-1/2 w-[22%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/80" />
                <div className="absolute left-1/2 top-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />

                <div className="absolute left-1/2 -translate-x-1/2 top-[4%] w-[52%] h-[16%] border-2 border-t-0 border-white/80" />
                <div className="absolute left-1/2 -translate-x-1/2 top-[4%] w-[28%] h-[8%] border-2 border-t-0 border-white/80" />
                <div className="absolute left-1/2 -translate-x-1/2 top-[1.5%] w-[14%] h-[2.5%] border-2 border-white/50 rounded-t-sm" />
                <svg className="absolute left-1/2 -translate-x-1/2 top-[18%] w-[18%] h-[4%]" viewBox="0 0 100 30" fill="none">
                  <path d="M 5 0 Q 50 35 95 0" stroke="rgba(255,255,255,0.8)" strokeWidth="2" fill="none" />
                </svg>
                <div className="absolute left-1/2 top-[15%] w-1 h-1 -translate-x-1/2 rounded-full bg-white/80" />

                <div className="absolute left-1/2 -translate-x-1/2 bottom-[4%] w-[52%] h-[16%] border-2 border-b-0 border-white/80" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-[4%] w-[28%] h-[8%] border-2 border-b-0 border-white/80" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-[1.5%] w-[14%] h-[2.5%] border-2 border-white/50 rounded-b-sm" />
                <svg className="absolute left-1/2 -translate-x-1/2 bottom-[18%] w-[18%] h-[4%]" viewBox="0 0 100 30" fill="none">
                  <path d="M 5 30 Q 50 -5 95 30" stroke="rgba(255,255,255,0.8)" strokeWidth="2" fill="none" />
                </svg>
                <div className="absolute left-1/2 bottom-[15%] w-1 h-1 -translate-x-1/2 rounded-full bg-white/80" />

                <svg className="absolute top-[4%] left-[4%] w-[4%] h-[3%]" viewBox="0 0 20 20"><path d="M 0 20 A 20 20 0 0 0 20 0" stroke="rgba(255,255,255,0.8)" strokeWidth="2" fill="none" /></svg>
                <svg className="absolute top-[4%] right-[4%] w-[4%] h-[3%]" viewBox="0 0 20 20"><path d="M 0 0 A 20 20 0 0 0 20 20" stroke="rgba(255,255,255,0.8)" strokeWidth="2" fill="none" /></svg>
                <svg className="absolute bottom-[4%] left-[4%] w-[4%] h-[3%]" viewBox="0 0 20 20"><path d="M 20 20 A 20 20 0 0 0 0 0" stroke="rgba(255,255,255,0.8)" strokeWidth="2" fill="none" /></svg>
                <svg className="absolute bottom-[4%] right-[4%] w-[4%] h-[3%]" viewBox="0 0 20 20"><path d="M 20 0 A 20 20 0 0 0 0 20" stroke="rgba(255,255,255,0.8)" strokeWidth="2" fill="none" /></svg>

                {/* Training objects */}
                {objects.map((o) => (
                  <motion.div
                    key={o.id}
                    drag
                    dragMomentum={false}
                    dragElastic={0}
                    onDragEnd={(_, info) => moveObject(o.id, info)}
                    onDoubleClick={() => setObjects((prev) => prev.filter((x) => x.id !== o.id))}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-grab active:cursor-grabbing select-none"
                    style={{ left: `${o.x}%`, top: `${o.y}%` }}
                    title={`${o.label} (doble clic para quitar)`}
                  >
                    <span className="text-2xl drop-shadow-md">{o.emoji}</span>
                  </motion.div>
                ))}

                {/* Players */}
                {players.map((p) => (
                  <motion.div
                    key={p.id}
                    drag
                    dragMomentum={false}
                    dragElastic={0}
                    onDragEnd={(_, info) => movePlayer(p.id, info)}
                    onClick={() => setSelectedPlayer(p)}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: p.id * 0.03, type: "spring", stiffness: 200 }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-grab active:cursor-grabbing z-10 select-none"
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg border-[3px] transition-transform group-hover:scale-110 ${selectedPlayer?.id === p.id ? "scale-110 ring-2 ring-white" : ""}`}
                        style={{ background: "#3b82f6", borderColor: "#60a5fa" }}
                      >
                        {p.num}
                      </div>
                      <span className="text-[10px] font-semibold text-white drop-shadow-md leading-tight">{p.name}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right Panel */}
          <div className="space-y-4">
            {mode === "training" ? (
              <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="glass-card-elevated p-4 space-y-4">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Nombre de la actividad</p>
                  <Input value={sessionName} onChange={(e) => setSessionName(e.target.value)} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Material</p>
                  <div className="grid grid-cols-2 gap-2">
                    {objCatalog.map((o) => (
                      <button key={o.kind} onClick={() => addObject(o.kind)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs hover:border-primary/50 hover:bg-muted/40 transition-colors">
                        <span className="text-base">{o.emoji}</span>
                        <span className="truncate">{o.label}</span>
                        <Plus className="w-3 h-3 ml-auto text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">Arrastra los elementos en la cancha. Doble clic para quitarlos.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1 flex-1" onClick={() => setObjects([])}>
                    <Trash2 className="w-3.5 h-3.5" /> Limpiar
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 flex-1" onClick={() => setPlayers(initialPlayers)}>
                    <RotateCcw className="w-3.5 h-3.5" /> Reiniciar
                  </Button>
                </div>
                <Button className="w-full gap-2" onClick={exportPDF} disabled={exporting}>
                  <Download className="w-4 h-4" /> {exporting ? "Generando..." : "Descargar PDF"}
                </Button>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
                className="glass-card-elevated overflow-hidden">
                {selectedPlayer ? (
                  <>
                    <div className="p-4 text-center" style={{ background: `linear-gradient(135deg, ${ratingColor(selectedPlayer.rating).bg}22, transparent)` }}>
                      <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl font-bold shadow-lg border-[3px] mb-2"
                        style={{ background: "#3b82f6", color: "#fff", borderColor: "#60a5fa" }}>
                        {selectedPlayer.num}
                      </div>
                      <h3 className="font-bold text-foreground">{selectedPlayer.name}</h3>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px]">{selectedPlayer.position}</Badge>
                        <Badge className="text-[10px] bg-primary/20 text-primary border-0">OVR {selectedPlayer.rating}</Badge>
                      </div>
                      <div className="flex items-center justify-center gap-3 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">{levelIcon(selectedPlayer.level)} Nv.{selectedPlayer.level}</span>
                        <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-[hsl(var(--kpi-amber))]" />{selectedPlayer.xp} XP</span>
                      </div>
                      <div className="mt-3 mx-4">
                        <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(selectedPlayer.xp % 200) / 2}%` }}
                            className="h-full rounded-full" style={{ background: "hsl(var(--kpi-amber))" }} />
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-1">{selectedPlayer.xp % 200}/200 XP al siguiente nivel</p>
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Atributos</p>
                      {Object.entries(selectedPlayer.stats).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground capitalize w-16">{key}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${val}%` }}
                              className="h-full rounded-full" style={{ background: val >= 80 ? "hsl(var(--primary))" : val >= 70 ? "hsl(var(--kpi-blue))" : "hsl(var(--kpi-amber))" }} />
                          </div>
                          <span className="text-[11px] font-bold text-foreground w-6 text-right">{val}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center">
                    <Gamepad2 className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Selecciona un jugador</p>
                    <p className="text-[11px] text-muted-foreground/60">Haz clic en la cancha para ver detalles</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Leaderboard */}
            <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
              className="glass-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <Medal className="w-4 h-4 text-[hsl(var(--kpi-amber))]" />
                <h3 className="font-semibold text-sm text-foreground">Tabla de XP</h3>
              </div>
              <div className="divide-y divide-border">
                {leaderboard.slice(0, 5).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => { setMode("lineup"); setSelectedPlayer(p); }}>
                    <span className={`text-xs font-bold w-4 ${i === 0 ? "text-[hsl(var(--kpi-amber))]" : i === 1 ? "text-muted-foreground" : "text-muted-foreground/60"}`}>{i + 1}</span>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                      style={{ background: "#3b82f6" }}>
                      {p.num}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.position} · Nv.{p.level}</p>
                    </div>
                    <span className="text-xs font-bold text-[hsl(var(--kpi-amber))]">{p.xp}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Gamification;

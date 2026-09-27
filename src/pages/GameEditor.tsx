import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { motion } from "framer-motion";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { DashboardLayout } from "@/components/DashboardLayout";
import { FieldDraggable } from "@/components/FieldDraggable";
import {
  ArrowLeft, Save, Download, Undo2, Redo2, Trash2, Eraser, Settings2,
  Minus, ArrowRight, Plus, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import api from "@/lib/api";
import { type BoardDetail, getBoard, updateBoard, uploadThumbnail } from "./Games";

// ---------------------------------------------------------------------------
// Tipos de la escena (guardada en `board.scene`, JSON libre en el backend)
// ---------------------------------------------------------------------------

type ObjKind =
  | "cone" | "hurdle" | "ring" | "ladder" | "pole" | "dummy" | "goal"
  | "ball" | "rival" | "text" | "shape" | "card_yellow" | "card_red" | "vest";

interface MarkerItem { id: string; type: "marker"; kind: ObjKind; x: number; y: number }
interface PlayerToken { id: string; type: "player"; team: "A" | "B"; number: string; name: string; playerId?: string; x: number; y: number }
type SceneItem = MarkerItem | PlayerToken;

type LineStyle = "solid" | "dashed";
interface SceneLine { id: string; x1: number; y1: number; x2: number; y2: number; style: LineStyle; arrow: boolean; color: string; thickness: number }

interface Scene { objects: SceneItem[]; lines: SceneLine[] }

interface PlayerSettings { size: number; showBall: boolean; showGridOnDrag: boolean; snapToGrid: boolean }

const DEFAULT_PLAYER_SETTINGS: PlayerSettings = { size: 40, showBall: true, showGridOnDrag: false, snapToGrid: false };

const OBJ_CATALOG: { kind: ObjKind; label: string; emoji: string }[] = [
  { kind: "cone", label: "Cono", emoji: "🔶" },
  { kind: "hurdle", label: "Valla", emoji: "🚧" },
  { kind: "ring", label: "Aro", emoji: "⭕" },
  { kind: "ladder", label: "Escalera", emoji: "🪜" },
  { kind: "pole", label: "Pica", emoji: "📍" },
  { kind: "dummy", label: "Muñeco barrera", emoji: "🥋" },
  { kind: "goal", label: "Mini arco", emoji: "🥅" },
  { kind: "ball", label: "Balón", emoji: "⚽" },
  { kind: "rival", label: "Rival", emoji: "🔴" },
  { kind: "shape", label: "Forma", emoji: "⬛" },
  { kind: "text", label: "Texto", emoji: "🔤" },
  { kind: "card_yellow", label: "Tarjeta amarilla", emoji: "🟨" },
  { kind: "card_red", label: "Tarjeta roja", emoji: "🟥" },
  { kind: "vest", label: "Chaleco", emoji: "🦺" },
];

const LINE_COLORS = [
  { value: "#111827", label: "Negro" },
  { value: "#ef4444", label: "Rojo" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#eab308", label: "Amarillo" },
];
const LINE_THICKNESS = [2, 3, 4, 5];

const COURT_TYPES: { value: BoardDetail["court_type"]; label: string }[] = [
  { value: "full", label: "Cancha completa" },
  { value: "half", label: "Media cancha" },
  { value: "free", label: "Campo libre" },
];

const FIELD_COLORS: { value: BoardDetail["field_color"]; label: string }[] = [
  { value: "green", label: "Verde clásico" },
  { value: "dark", label: "Negro/fosforescente" },
  { value: "gray", label: "Gris" },
];

const FIELD_THEME: Record<BoardDetail["field_color"], { bg: string; line: string }> = {
  green: { bg: "linear-gradient(180deg, #2d8a2e, #25762a)", line: "rgba(255,255,255,0.8)" },
  dark: { bg: "linear-gradient(180deg, #0c0c0c, #050505)", line: "hsl(var(--primary))" },
  gray: { bg: "linear-gradient(180deg, #3a3d42, #2a2c30)", line: "rgba(255,255,255,0.85)" },
};

const snapVal = (v: number, snap: boolean) => (snap ? Math.round(v / 5) * 5 : v);

// ---------------------------------------------------------------------------
// Marcado de la cancha: 3 tipos x 3 colores
// ---------------------------------------------------------------------------

const GoalBox = ({ side, line }: { side: "top" | "bottom"; line: string }) => {
  const s = side === "top" ? "top" : "bottom";
  const svgPath = side === "top" ? "M 5 0 Q 50 35 95 0" : "M 5 30 Q 50 -5 95 30";
  return (
    <>
      <div className={`absolute left-1/2 -translate-x-1/2 ${s}-[4%] w-[52%] h-[16%] border-2 border-${s === "top" ? "t" : "b"}-0`} style={{ borderColor: line }} />
      <div className={`absolute left-1/2 -translate-x-1/2 ${s}-[4%] w-[28%] h-[8%] border-2 border-${s === "top" ? "t" : "b"}-0`} style={{ borderColor: line }} />
      <div className={`absolute left-1/2 -translate-x-1/2 ${s}-[1.5%] w-[14%] h-[2.5%] border-2 rounded-${s === "top" ? "t" : "b"}-sm`} style={{ borderColor: line, opacity: 0.6 }} />
      <svg className={`absolute left-1/2 -translate-x-1/2 ${s}-[18%] w-[18%] h-[4%]`} viewBox="0 0 100 30" fill="none">
        <path d={svgPath} stroke={line} strokeWidth="2" fill="none" opacity={0.8} />
      </svg>
      <div className={`absolute left-1/2 ${s}-[15%] w-1 h-1 -translate-x-1/2 rounded-full`} style={{ background: line }} />
    </>
  );
};

const FieldMarkings = ({ courtType, mirrored, line }: { courtType: BoardDetail["court_type"]; mirrored: boolean; line: string }) => {
  if (courtType === "free") {
    return <div className="absolute inset-[4%] border-2 border-dashed rounded-sm" style={{ borderColor: line }} />;
  }

  const goalSide: "top" | "bottom" = mirrored ? "top" : "bottom";

  return (
    <>
      <div className="absolute inset-[4%] border-2 rounded-sm" style={{ borderColor: line }} />
      {courtType === "full" && (
        <>
          <div className="absolute left-[4%] right-[4%] top-1/2 h-0.5" style={{ background: line }} />
          <div className="absolute left-1/2 top-1/2 w-[22%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-2" style={{ borderColor: line }} />
          <div className="absolute left-1/2 top-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: line }} />
          <GoalBox side="top" line={line} />
          <GoalBox side="bottom" line={line} />
        </>
      )}
      {courtType === "half" && (
        <>
          <div
            className="absolute left-[4%] right-[4%] h-0.5"
            style={{ background: line, [goalSide === "bottom" ? "top" : "bottom"]: "4%" }}
          />
          <div
            className="absolute left-1/2 w-[36%] aspect-square -translate-x-1/2 rounded-full border-2"
            style={{ borderColor: line, [goalSide === "bottom" ? "top" : "bottom"]: "4%", transform: `translate(-50%, ${goalSide === "bottom" ? "-50%" : "50%"})` }}
          />
          <GoalBox side={goalSide} line={line} />
        </>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

const GameEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fieldRef = useRef<HTMLDivElement>(null);

  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [courtType, setCourtType] = useState<BoardDetail["court_type"]>("full");
  const [fieldColor, setFieldColor] = useState<BoardDetail["field_color"]>("green");
  const [mirrored, setMirrored] = useState(false);
  const [playerSettings, setPlayerSettings] = useState<PlayerSettings>(DEFAULT_PLAYER_SETTINGS);

  const [scene, setScene] = useState<Scene>({ objects: [], lines: [] });
  const [past, setPast] = useState<Scene[]>([]);
  const [future, setFuture] = useState<Scene[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawingLine, setDrawingLine] = useState(false);
  const [lineDraft, setLineDraft] = useState<{ x: number; y: number } | null>(null);
  const [lineColor, setLineColor] = useState(LINE_COLORS[0].value);
  const [lineStyle, setLineStyle] = useState<LineStyle>("solid");
  const [lineThickness, setLineThickness] = useState(3);
  const [lineArrow, setLineArrow] = useState(true);

  const [roster, setRoster] = useState<{ id: string; name: string; position: string }[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getBoard(id)
      .then((data) => {
        setBoard(data);
        setName(data.name);
        setCourtType(data.court_type || "full");
        setFieldColor(data.field_color || "green");
        setMirrored(!!data.mirrored);
        setPlayerSettings({ ...DEFAULT_PLAYER_SETTINGS, ...(data.player_settings as Partial<PlayerSettings>) });
        const loadedScene = data.scene as Partial<Scene>;
        setScene({ objects: loadedScene?.objects ?? [], lines: loadedScene?.lines ?? [] });
      })
      .catch((error) => {
        if (isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 403)) {
          setNotFound(true);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!board) return;
    const params: Record<string, string | number> = { status: "confirmed", page_size: 100 };
    if (board.group) params.group = board.group.id;
    else if (board.category) params.category = board.category.name;
    else return;
    api
      .get<{ results: { id: string; full_name: string; position: string }[] }>("/players/", { params })
      .then(({ data }) => setRoster(data.results.map((p) => ({ id: p.id, name: p.full_name, position: p.position }))))
      .catch(() => setRoster([]));
  }, [board]);

  const theme = FIELD_THEME[fieldColor];

  const pushHistory = useCallback(() => {
    setPast((p) => [...p, scene].slice(-50));
    setFuture([]);
  }, [scene]);

  const undo = () => {
    if (!past.length) return;
    const prev = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [scene, ...f]);
    setScene(prev);
    setSelectedId(null);
  };
  const redo = () => {
    if (!future.length) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, scene]);
    setScene(next);
    setSelectedId(null);
  };

  const addMarker = (kind: ObjKind) => {
    pushHistory();
    const item: MarkerItem = { id: `m-${Date.now()}-${Math.random()}`, type: "marker", kind, x: 50, y: 50 };
    setScene((s) => ({ ...s, objects: [...s.objects, item] }));
  };

  const addPlayerFromRoster = (player: { id: string; name: string }) => {
    pushHistory();
    const item: PlayerToken = {
      id: `p-${Date.now()}-${Math.random()}`, type: "player", team: "A",
      number: String(scene.objects.filter((o) => o.type === "player").length + 1),
      name: player.name, playerId: player.id, x: 50, y: 50,
    };
    setScene((s) => ({ ...s, objects: [...s.objects, item] }));
  };

  const moveItem = (itemId: string, pos: { x: number; y: number }) => {
    pushHistory();
    const snap = playerSettings.snapToGrid;
    setScene((s) => ({
      ...s,
      objects: s.objects.map((o) => (o.id === itemId ? { ...o, x: snapVal(pos.x, snap), y: snapVal(pos.y, snap) } : o)),
    }));
  };

  const updatePlayerToken = (itemId: string, patch: Partial<PlayerToken>) => {
    setScene((s) => ({
      ...s,
      objects: s.objects.map((o) => (o.id === itemId && o.type === "player" ? { ...o, ...patch } : o)),
    }));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    pushHistory();
    setScene((s) => ({
      objects: s.objects.filter((o) => o.id !== selectedId),
      lines: s.lines.filter((l) => l.id !== selectedId),
    }));
    setSelectedId(null);
  };

  const clearAll = () => {
    pushHistory();
    setScene({ objects: [], lines: [] });
    setSelectedId(null);
  };

  const fieldPointFromEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: snapVal(((e.clientX - rect.left) / rect.width) * 100, playerSettings.snapToGrid), y: snapVal(((e.clientY - rect.top) / rect.height) * 100, playerSettings.snapToGrid) };
  };

  const handleFieldClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawingLine) { setSelectedId(null); return; }
    const pt = fieldPointFromEvent(e);
    if (!pt) return;
    if (!lineDraft) {
      setLineDraft(pt);
    } else {
      pushHistory();
      const line: SceneLine = {
        id: `l-${Date.now()}-${Math.random()}`, x1: lineDraft.x, y1: lineDraft.y, x2: pt.x, y2: pt.y,
        style: lineStyle, arrow: lineArrow, color: lineColor, thickness: lineThickness,
      };
      setScene((s) => ({ ...s, lines: [...s.lines, line] }));
      setLineDraft(null);
      setDrawingLine(false);
    }
  };

  const moveLineEndpoint = (lineId: string, end: "1" | "2", pos: { x: number; y: number }) => {
    pushHistory();
    setScene((s) => ({
      ...s,
      lines: s.lines.map((l) => (l.id === lineId ? { ...l, [`x${end}`]: pos.x, [`y${end}`]: pos.y } : l)),
    }));
  };

  const updateSelectedLine = (patch: Partial<SceneLine>) => {
    if (!selectedId) return;
    setScene((s) => ({ ...s, lines: s.lines.map((l) => (l.id === selectedId ? { ...l, ...patch } : l)) }));
  };

  const selectedLine = scene.lines.find((l) => l.id === selectedId) ?? null;
  const selectedPlayerToken = scene.objects.find((o) => o.id === selectedId && o.type === "player") as PlayerToken | undefined;

  const captureThumbnail = async (): Promise<Blob | null> => {
    if (!fieldRef.current) return null;
    const canvas = await html2canvas(fieldRef.current, { backgroundColor: null, scale: 1.5 });
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png", 0.85));
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await updateBoard(id, {
        name: name.trim() || board?.name,
        court_type: courtType,
        field_color: fieldColor,
        mirrored,
        player_settings: playerSettings as unknown as Record<string, unknown>,
        scene,
      });
      setBoard(updated);
      const blob = await captureThumbnail();
      if (blob) await uploadThumbnail(id, blob);
      toast.success("Juego guardado");
    } catch {
      toast.error("No se pudo guardar el juego");
    } finally {
      setSaving(false);
    }
  };

  const exportPDF = async () => {
    if (!fieldRef.current || !board) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(fieldRef.current, { backgroundColor: "#111", scale: 2 });
      const img = canvas.toDataURL("image/png");
      const landscape = courtType === "half";
      const pdf = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "mm", format: "a4" });
      pdf.setFontSize(16);
      pdf.text(name || board.name, 15, 18);
      pdf.setFontSize(10);
      const meta = [board.category?.name, board.group?.name, new Date().toLocaleDateString("es-CO")].filter(Boolean).join(" · ");
      pdf.text(meta, 15, 25);
      const pageW = landscape ? 297 : 210;
      const pageH = landscape ? 210 : 297;
      const maxW = pageW - 30;
      const maxH = pageH - 45;
      const ratio = canvas.width / canvas.height;
      let w = maxW;
      let h = w / ratio;
      if (h > maxH) { h = maxH; w = h * ratio; }
      pdf.addImage(img, "PNG", 15 + (maxW - w) / 2, 32, w, h);
      pdf.save(`${(name || board.name).replace(/\s+/g, "-").toLowerCase()}.pdf`);
      toast.success("PDF descargado");
    } catch {
      toast.error("No se pudo generar el PDF");
    } finally {
      setExporting(false);
    }
  };

  if (notFound) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
          <Card className="p-6 text-sm text-muted-foreground">No se encontró este juego o no tienes permiso para verlo.</Card>
        </div>
      </DashboardLayout>
    );
  }

  if (loading || !board) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
          <Card className="p-6 text-sm text-muted-foreground">Cargando juego...</Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          onClick={() => navigate("/gamification")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Juegos
        </motion.button>

        {/* Header */}
        <div className="glass-card p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs" />
          <div className="flex items-center gap-1.5">
            {board.category && <Badge variant="secondary">{board.category.name}</Badge>}
            {board.group && <Badge variant="secondary">{board.group.name}</Badge>}
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <Button variant="outline" size="icon" onClick={() => setSettingsOpen(true)} title="Ajustes">
              <Settings2 className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="gap-2" onClick={exportPDF} disabled={exporting}>
              <Download className="w-4 h-4" /> {exporting ? "Generando..." : "PDF"}
            </Button>
            <Button className="gap-2" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Button variant="outline" size="icon" onClick={undo} disabled={!past.length} title="Deshacer"><Undo2 className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" onClick={redo} disabled={!future.length} title="Rehacer"><Redo2 className="w-4 h-4" /></Button>
          <Button
            variant={drawingLine ? "default" : "outline"}
            className="gap-2"
            onClick={() => { setDrawingLine((v) => !v); setLineDraft(null); }}
          >
            <Minus className="w-4 h-4" /> {drawingLine ? (lineDraft ? "Clic para terminar" : "Clic para empezar") : "Línea"}
          </Button>
          <Button variant="outline" size="icon" onClick={deleteSelected} disabled={!selectedId} title="Borrar seleccionado">
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="outline" className="gap-2" onClick={clearAll}>
            <Eraser className="w-4 h-4" /> Limpiar todo
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Field */}
          <div className="lg:col-span-2 rounded-2xl overflow-hidden relative" style={{ background: "#1a1a1a" }}>
            <div className="relative w-full" style={{ paddingBottom: "140%" }}>
              <div
                ref={fieldRef}
                onClick={handleFieldClick}
                className="absolute inset-4 rounded-xl overflow-hidden"
                style={{ background: theme.bg, cursor: drawingLine ? "crosshair" : "default" }}
              >
                <FieldMarkings courtType={courtType} mirrored={mirrored} line={theme.line} />

                {/* Grid overlay */}
                {playerSettings.showGridOnDrag && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" opacity={0.15}>
                    {[...Array(19)].map((_, i) => (
                      <line key={`v${i}`} x1={`${(i + 1) * 5}%`} y1="0" x2={`${(i + 1) * 5}%`} y2="100%" stroke={theme.line} strokeWidth={1} />
                    ))}
                    {[...Array(19)].map((_, i) => (
                      <line key={`h${i}`} x1="0" y1={`${(i + 1) * 5}%`} x2="100%" y2={`${(i + 1) * 5}%`} stroke={theme.line} strokeWidth={1} />
                    ))}
                  </svg>
                )}

                {/* Lines */}
                <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: drawingLine ? "none" : "auto" }}>
                  <defs>
                    {LINE_COLORS.map((c) => (
                      <marker key={c.value} id={`arrow-${c.value.replace("#", "")}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill={c.value} />
                      </marker>
                    ))}
                  </defs>
                  {scene.lines.map((l) => (
                    <line
                      key={l.id}
                      x1={`${l.x1}%`} y1={`${l.y1}%`} x2={`${l.x2}%`} y2={`${l.y2}%`}
                      stroke={l.color} strokeWidth={l.thickness}
                      strokeDasharray={l.style === "dashed" ? "8 6" : undefined}
                      markerEnd={l.arrow ? `url(#arrow-${l.color.replace("#", "")})` : undefined}
                      style={{ cursor: "pointer", pointerEvents: "stroke" }}
                      onClick={(e) => { e.stopPropagation(); setSelectedId(l.id); }}
                      opacity={selectedId === l.id ? 1 : 0.9}
                    />
                  ))}
                  {lineDraft && (
                    <circle cx={`${lineDraft.x}%`} cy={`${lineDraft.y}%`} r={4} fill={lineColor} />
                  )}
                </svg>

                {/* Line endpoint handles (only for selected line) */}
                {selectedLine && (
                  <>
                    <FieldDraggable fieldRef={fieldRef} x={selectedLine.x1} y={selectedLine.y1} onMove={(p) => moveLineEndpoint(selectedLine.id, "1", p)} className="absolute z-30 cursor-grab">
                      <div className="w-3 h-3 rounded-full bg-white border-2" style={{ borderColor: selectedLine.color }} />
                    </FieldDraggable>
                    <FieldDraggable fieldRef={fieldRef} x={selectedLine.x2} y={selectedLine.y2} onMove={(p) => moveLineEndpoint(selectedLine.id, "2", p)} className="absolute z-30 cursor-grab">
                      <div className="w-3 h-3 rounded-full bg-white border-2" style={{ borderColor: selectedLine.color }} />
                    </FieldDraggable>
                  </>
                )}

                {/* Objects + players */}
                {scene.objects.map((o) => (
                  <FieldDraggable
                    key={o.id}
                    fieldRef={fieldRef}
                    x={o.x}
                    y={o.y}
                    onMove={(pos) => moveItem(o.id, pos)}
                    onClick={() => setSelectedId(o.id)}
                    className={`absolute cursor-grab active:cursor-grabbing select-none ${selectedId === o.id ? "z-20" : "z-10"}`}
                  >
                    {o.type === "marker" ? (
                      <span className="text-2xl drop-shadow-md" style={{ filter: selectedId === o.id ? "drop-shadow(0 0 4px white)" : undefined }}>
                        {OBJ_CATALOG.find((c) => c.kind === o.kind)?.emoji ?? "❔"}
                      </span>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5">
                        <div
                          className={`rounded-full flex items-center justify-center font-bold text-white shadow-lg border-[3px] ${selectedId === o.id ? "ring-2 ring-white" : ""}`}
                          style={{
                            width: playerSettings.size, height: playerSettings.size, fontSize: playerSettings.size * 0.35,
                            background: o.team === "A" ? "#3b82f6" : "#ef4444",
                            borderColor: o.team === "A" ? "#60a5fa" : "#f87171",
                          }}
                        >
                          {o.number}
                        </div>
                        <span className="text-[10px] font-semibold text-white drop-shadow-md leading-tight">{o.name}</span>
                      </div>
                    )}
                  </FieldDraggable>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {selectedLine && (
              <div className="glass-card-elevated p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Línea seleccionada</p>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedId(null)}><X className="w-3.5 h-3.5" /></Button>
                </div>
                <div className="flex gap-1.5">
                  {LINE_COLORS.map((c) => (
                    <button key={c.value} onClick={() => updateSelectedLine({ color: c.value })}
                      className={`w-7 h-7 rounded-full border-2 ${selectedLine.color === c.value ? "border-white" : "border-transparent"}`}
                      style={{ background: c.value }} title={c.label} />
                  ))}
                </div>
                <div className="flex gap-1.5">
                  {LINE_THICKNESS.map((t) => (
                    <button key={t} onClick={() => updateSelectedLine({ thickness: t })}
                      className={`flex-1 h-8 rounded-lg glass-card flex items-center justify-center ${selectedLine.thickness === t ? "ring-1 ring-primary" : ""}`}>
                      <div style={{ width: 16, height: t, background: "currentColor", borderRadius: 2 }} />
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant={selectedLine.style === "solid" ? "default" : "outline"} className="flex-1" onClick={() => updateSelectedLine({ style: "solid" })}>Sólida</Button>
                  <Button size="sm" variant={selectedLine.style === "dashed" ? "default" : "outline"} className="flex-1" onClick={() => updateSelectedLine({ style: "dashed" })}>Punteada</Button>
                  <Button size="sm" variant={selectedLine.arrow ? "default" : "outline"} className="flex-1 gap-1" onClick={() => updateSelectedLine({ arrow: !selectedLine.arrow })}><ArrowRight className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            )}

            {selectedPlayerToken && (
              <div className="glass-card-elevated p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{selectedPlayerToken.name}</p>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedId(null)}><X className="w-3.5 h-3.5" /></Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={selectedPlayerToken.number}
                    onChange={(e) => updatePlayerToken(selectedPlayerToken.id, { number: e.target.value.slice(0, 2) })}
                    className="w-16" placeholder="#"
                  />
                  <Button size="sm" variant={selectedPlayerToken.team === "A" ? "default" : "outline"} className="flex-1" onClick={() => updatePlayerToken(selectedPlayerToken.id, { team: "A" })}>Equipo A</Button>
                  <Button size="sm" variant={selectedPlayerToken.team === "B" ? "default" : "outline"} className="flex-1" onClick={() => updatePlayerToken(selectedPlayerToken.id, { team: "B" })}>Equipo B</Button>
                </div>
              </div>
            )}

            <Tabs defaultValue="jugadores">
              <TabsList className="w-full">
                <TabsTrigger value="jugadores" className="flex-1">Jugadores</TabsTrigger>
                <TabsTrigger value="objetos" className="flex-1">Objetos</TabsTrigger>
              </TabsList>
              <TabsContent value="jugadores">
                <div className="glass-card divide-y divide-border max-h-[420px] overflow-y-auto">
                  {roster.length === 0 ? (
                    <p className="p-4 text-xs text-muted-foreground">No hay jugadores confirmados en este grupo.</p>
                  ) : (
                    roster.map((p) => (
                      <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground">{p.position}</p>
                        </div>
                        <Button size="icon" variant="outline" className="h-7 w-7 flex-shrink-0" aria-label={`Agregar ${p.name}`} onClick={() => addPlayerFromRoster(p)}>
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
              <TabsContent value="objetos">
                <div className="glass-card grid grid-cols-2 gap-2 p-3">
                  {OBJ_CATALOG.map((o) => (
                    <button key={o.kind} onClick={() => addMarker(o.kind)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs hover:border-primary/50 hover:bg-muted/40 transition-colors">
                      <span className="text-base">{o.emoji}</span>
                      <span className="truncate">{o.label}</span>
                    </button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Ajustes */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Ajustes</SheetTitle>
          </SheetHeader>
          <div className="space-y-6 mt-4">
            <div>
              <Label className="mb-2 block">Color de campo</Label>
              <div className="flex gap-2">
                {FIELD_COLORS.map((c) => (
                  <button key={c.value} onClick={() => setFieldColor(c.value)}
                    className={`flex-1 h-14 rounded-lg border-2 ${fieldColor === c.value ? "border-primary" : "border-transparent"}`}
                    style={{ background: FIELD_THEME[c.value].bg }} title={c.label} />
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Tipo de campo</Label>
              <div className="grid grid-cols-3 gap-2">
                {COURT_TYPES.map((c) => (
                  <button key={c.value} onClick={() => setCourtType(c.value)}
                    className={`px-2 py-3 rounded-lg border text-[11px] font-medium ${courtType === c.value ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            {courtType === "half" && (
              <div className="flex items-center justify-between">
                <Label>Portería a la izquierda/derecha (invertir)</Label>
                <Switch checked={mirrored} onCheckedChange={setMirrored} />
              </div>
            )}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Tamaño de jugadores</Label>
                <span className="text-xs text-muted-foreground">{playerSettings.size}px</span>
              </div>
              <Slider min={28} max={56} step={2} value={[playerSettings.size]} onValueChange={([v]) => setPlayerSettings((p) => ({ ...p, size: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Mostrar balón</Label>
              <Switch checked={playerSettings.showBall} onCheckedChange={(v) => setPlayerSettings((p) => ({ ...p, showBall: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Mostrar cuadrícula al arrastrar</Label>
              <Switch checked={playerSettings.showGridOnDrag} onCheckedChange={(v) => setPlayerSettings((p) => ({ ...p, showGridOnDrag: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Ajustar a la cuadrícula</Label>
              <Switch checked={playerSettings.snapToGrid} onCheckedChange={(v) => setPlayerSettings((p) => ({ ...p, snapToGrid: v }))} />
            </div>
            {drawingLine && (
              <div>
                <Label className="mb-2 block">Nueva línea</Label>
                <div className="flex gap-1.5 mb-2">
                  {LINE_COLORS.map((c) => (
                    <button key={c.value} onClick={() => setLineColor(c.value)}
                      className={`w-7 h-7 rounded-full border-2 ${lineColor === c.value ? "border-white" : "border-transparent"}`}
                      style={{ background: c.value }} />
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant={lineStyle === "solid" ? "default" : "outline"} className="flex-1" onClick={() => setLineStyle("solid")}>Sólida</Button>
                  <Button size="sm" variant={lineStyle === "dashed" ? "default" : "outline"} className="flex-1" onClick={() => setLineStyle("dashed")}>Punteada</Button>
                  <Button size="sm" variant={lineArrow ? "default" : "outline"} className="flex-1" onClick={() => setLineArrow((v) => !v)}>Flecha</Button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
};

export default GameEditor;

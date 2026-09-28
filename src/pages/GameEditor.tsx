import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { motion } from "framer-motion";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { DashboardLayout } from "@/components/DashboardLayout";
import { FieldDraggable } from "@/components/FieldDraggable";
import {
  ArrowLeft, Save, Download, Undo2, Redo2, Trash2, Eraser, Settings2, Plus, X, Pencil,
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
import { type BoardDetail, createBoard, getBoard, updateBoard, uploadThumbnail } from "./Games";

// ---------------------------------------------------------------------------
// Tipos de la escena (guardada en `board.scene`, JSON libre en el backend)
// ---------------------------------------------------------------------------

type ObjKind =
  | "cone" | "hurdle" | "ring" | "ladder" | "pole" | "dummy" | "goal"
  | "ball" | "rival" | "text" | "shape" | "card_yellow" | "card_red" | "vest";

interface MarkerItem { id: string; type: "marker"; kind: ObjKind; x: number; y: number }
interface PlayerToken { id: string; type: "player"; team: "A" | "B"; number: string; name: string; playerId?: string; x: number; y: number }
type SceneItem = MarkerItem | PlayerToken;

// Trazo (recta/zigzag/curva) x sólida-punteada x terminación — todas las
// combinaciones del spec se arman con estos 3 ejes independientes.
type LineShape = "straight" | "zigzag" | "curve";
type LineEnd = "none" | "arrow" | "x" | "t";
interface LineStyle { shape: LineShape; dashed: boolean; end: LineEnd; color: string; thickness: number }
interface SceneLine extends LineStyle { id: string; x1: number; y1: number; x2: number; y2: number }

interface Scene { objects: SceneItem[]; lines: SceneLine[] }

interface PlayerSettings { size: number; showBall: boolean; showGridOnDrag: boolean; snapToGrid: boolean }

const DEFAULT_PLAYER_SETTINGS: PlayerSettings = { size: 40, showBall: true, showGridOnDrag: false, snapToGrid: false };
const DEFAULT_LINE_STYLE: LineStyle = { shape: "straight", dashed: false, end: "arrow", color: "#111827", thickness: 3 };

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
const LINE_SHAPES: { value: LineShape; label: string }[] = [
  { value: "straight", label: "Recta" },
  { value: "zigzag", label: "Zigzag" },
  { value: "curve", label: "Curva" },
];
const LINE_ENDS: { value: LineEnd; label: string }[] = [
  { value: "none", label: "Ninguna" },
  { value: "arrow", label: "Flecha" },
  { value: "x", label: "X" },
  { value: "t", label: "T" },
];

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
const markerId = (l: LineStyle) => `end-${l.end}-${l.color.replace("#", "")}`;

/** Construye el `d` del path (viewBox 0-100) según la forma de la línea. */
const buildLinePath = (l: { x1: number; y1: number; x2: number; y2: number; shape: LineShape }) => {
  const { x1, y1, x2, y2, shape } = l;
  if (shape === "straight") return `M ${x1} ${y1} L ${x2} ${y2}`;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  if (shape === "curve") {
    const mx = (x1 + x2) / 2 + nx * len * 0.25;
    const my = (y1 + y2) / 2 + ny * len * 0.25;
    return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
  }
  const segments = 6;
  const amp = Math.min(len * 0.1, 4);
  let d = `M ${x1} ${y1}`;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    const off = i === segments ? 0 : (i % 2 === 0 ? -amp : amp);
    d += ` L ${px + nx * off} ${py + ny * off}`;
  }
  return d;
};

// ---------------------------------------------------------------------------
// Marcado de la cancha: 3 tipos x 3 colores
// ---------------------------------------------------------------------------

const GoalBox = ({ side, line }: { side: "top" | "bottom"; line: string }) => {
  const s = side;
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
          <div className="absolute left-[4%] right-[4%] h-0.5" style={{ background: line, [goalSide === "bottom" ? "top" : "bottom"]: "4%" }} />
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

/** Editor de estilo de línea, compartido entre "línea seleccionada" y "próxima línea a dibujar". */
const LineStyleEditor = ({ value, onChange }: { value: LineStyle; onChange: (patch: Partial<LineStyle>) => void }) => (
  <div className="space-y-2.5">
    <div className="flex gap-1.5">
      {LINE_COLORS.map((c) => (
        <button key={c.value} onClick={() => onChange({ color: c.value })}
          className={`w-7 h-7 rounded-full border-2 ${value.color === c.value ? "border-white" : "border-transparent"}`}
          style={{ background: c.value }} title={c.label} />
      ))}
    </div>
    <div className="flex gap-1.5">
      {LINE_THICKNESS.map((t) => (
        <button key={t} onClick={() => onChange({ thickness: t })}
          className={`flex-1 h-8 rounded-lg glass-card flex items-center justify-center ${value.thickness === t ? "ring-1 ring-primary" : ""}`}>
          <div style={{ width: 16, height: t, background: "currentColor", borderRadius: 2 }} />
        </button>
      ))}
    </div>
    <div className="grid grid-cols-3 gap-1.5">
      {LINE_SHAPES.map((s) => (
        <Button key={s.value} size="sm" variant={value.shape === s.value ? "default" : "outline"} onClick={() => onChange({ shape: s.value })}>{s.label}</Button>
      ))}
    </div>
    <div className="flex gap-1.5">
      <Button size="sm" variant={!value.dashed ? "default" : "outline"} className="flex-1" onClick={() => onChange({ dashed: false })}>Sólida</Button>
      <Button size="sm" variant={value.dashed ? "default" : "outline"} className="flex-1" onClick={() => onChange({ dashed: true })}>Punteada</Button>
    </div>
    <div className="grid grid-cols-4 gap-1.5">
      {LINE_ENDS.map((e) => (
        <Button key={e.value} size="sm" variant={value.end === e.value ? "default" : "outline"} onClick={() => onChange({ end: e.value })}>{e.label}</Button>
      ))}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

// Estado que trae `GameSetup.tsx` al navegar aquí desde
// `/gamification/entrenamiento/nuevo` (sin `:id`, sin `TacticBoard` en el backend).
interface TrainingSetupState {
  name: string;
  trainingSessionId: string;
  sessionTitle: string;
  sessionScheduledAt: string;
  category: { id: string; name: string } | null;
  group: { id: string; name: string } | null;
}

const GameEditor = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const fieldRef = useRef<HTMLDivElement>(null);

  // Sin `:id` en la ruta = sesión de entrenamiento: arranca solo en memoria,
  // sin `TacticBoard` real, hasta que se presiona "Guardar" (ver handleSave).
  const isTraining = !id;

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
  const [nextLineStyle, setNextLineStyle] = useState<LineStyle>(DEFAULT_LINE_STYLE);
  const [lineDraft, setLineDraft] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  const [roster, setRoster] = useState<{ id: string; name: string; position: string }[]>([]);
  const [trainingSessionId, setTrainingSessionId] = useState<string | null>(null);

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
        if (isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 403)) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!isTraining) return;
    const state = (location.state as TrainingSetupState | null) ?? null;
    const now = new Date().toISOString();
    setBoard({
      id: "training",
      name: state?.name || "Sesión de entrenamiento",
      board_type: "training",
      category: state?.category ?? null,
      group: state?.group ?? null,
      training_session: state?.trainingSessionId
        ? { id: state.trainingSessionId, title: state.sessionTitle || "", event_type: "training", scheduled_at: state.sessionScheduledAt || now }
        : null,
      thumbnail: null,
      created_by_name: "",
      created_at: now,
      updated_at: now,
      court_type: "full",
      field_color: "green",
      mirrored: false,
      player_settings: {},
      scene: { objects: [], lines: [] },
    });
    setTrainingSessionId(state?.trainingSessionId ?? null);
    setName(state?.name || "Sesión de entrenamiento");
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTraining]);

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
    setScene((s) => ({ ...s, objects: s.objects.map((o) => (o.id === itemId && o.type === "player" ? { ...o, ...patch } : o)) }));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    pushHistory();
    setScene((s) => ({ objects: s.objects.filter((o) => o.id !== selectedId), lines: s.lines.filter((l) => l.id !== selectedId) }));
    setSelectedId(null);
  };

  const clearAll = () => {
    pushHistory();
    setScene({ objects: [], lines: [] });
    setSelectedId(null);
  };

  // -------------------------------------------------------------------------
  // Dibujo de líneas: arrastrar con el dedo o el mouse (Pointer Events cubre
  // ambos con la misma lógica) — press, move, release, no clic-a-clic.
  // -------------------------------------------------------------------------

  const pointFromEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: snapVal(((e.clientX - rect.left) / rect.width) * 100, playerSettings.snapToGrid),
      y: snapVal(((e.clientY - rect.top) / rect.height) * 100, playerSettings.snapToGrid),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drawingLine) { setSelectedId(null); return; }
    const pt = pointFromEvent(e);
    if (!pt) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setLineDraft({ x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drawingLine || !lineDraft) return;
    const pt = pointFromEvent(e);
    if (!pt) return;
    setLineDraft((d) => (d ? { ...d, x2: pt.x, y2: pt.y } : d));
  };

  const handlePointerUp = () => {
    if (!drawingLine || !lineDraft) return;
    const dist = Math.hypot(lineDraft.x2 - lineDraft.x1, lineDraft.y2 - lineDraft.y1);
    if (dist > 1.5) {
      pushHistory();
      const line: SceneLine = { id: `l-${Date.now()}-${Math.random()}`, ...lineDraft, ...nextLineStyle };
      setScene((s) => ({ ...s, lines: [...s.lines, line] }));
    }
    setLineDraft(null);
  };

  const moveLineEndpoint = (lineId: string, end: "1" | "2", pos: { x: number; y: number }) => {
    pushHistory();
    setScene((s) => ({ ...s, lines: s.lines.map((l) => (l.id === lineId ? { ...l, [`x${end}`]: pos.x, [`y${end}`]: pos.y } : l)) }));
  };

  const updateSelectedLine = (patch: Partial<LineStyle>) => {
    if (!selectedId) return;
    setScene((s) => ({ ...s, lines: s.lines.map((l) => (l.id === selectedId ? { ...l, ...patch } : l)) }));
  };

  const selectedLine = scene.lines.find((l) => l.id === selectedId) ?? null;
  const selectedPlayerToken = scene.objects.find((o) => o.id === selectedId && o.type === "player") as PlayerToken | undefined;

  const allMarkers = useCallback(() => {
    const ends = new Set<LineEnd>(scene.lines.map((l) => l.end).filter((e) => e !== "none"));
    ends.add(nextLineStyle.end);
    const colors = new Set(scene.lines.map((l) => l.color));
    colors.add(nextLineStyle.color);
    return { ends, colors };
  }, [scene.lines, nextLineStyle]);

  const captureThumbnail = async (): Promise<Blob | null> => {
    if (!fieldRef.current) return null;
    const canvas = await html2canvas(fieldRef.current, { backgroundColor: null, scale: 1.5 });
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png", 0.85));
  };

  const handleSave = async () => {
    // Sesión de entrenamiento sin guardar todavía: primer "Guardar" la
    // convierte en un `TacticBoard` real (igual que crear un juego), y de
    // ahí en adelante se edita como cualquier juego guardado.
    if (isTraining) {
      if (!trainingSessionId) {
        toast.error("No se puede guardar: vuelve a crear la sesión eligiendo el entrenamiento del calendario");
        return;
      }
      setSaving(true);
      try {
        const created = await createBoard({
          name: name.trim() || board?.name || "Sesión de entrenamiento",
          training_session_id: trainingSessionId,
        });
        await updateBoard(created.id, {
          court_type: courtType,
          field_color: fieldColor,
          mirrored,
          player_settings: playerSettings as unknown as Record<string, unknown>,
          scene,
        });
        const blob = await captureThumbnail();
        if (blob) await uploadThumbnail(created.id, blob);
        toast.success("Sesión guardada");
        navigate(`/gamification/${created.id}`, { replace: true });
      } catch (error) {
        const detail = isAxiosError(error)
          ? (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message
          : null;
        toast.error(detail || "No se pudo guardar la sesión");
      } finally {
        setSaving(false);
      }
      return;
    }

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
          <Card className="p-6 text-sm text-muted-foreground">
            {isTraining ? "Cargando sesión..." : "Cargando juego..."}
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Para el link "Volver": una sesión sin guardar (`isTraining`) o un juego
  // ya guardado con `board_type: "training"` (reabierto desde el historial)
  // vuelven a la pestaña Entrenamiento, no a Juegos.
  const isTrainingView = isTraining || board.board_type === "training";

  const { ends: markerEnds, colors: markerColors } = allMarkers();

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          onClick={() => navigate(isTrainingView ? "/gamification?tab=training" : "/gamification")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {isTrainingView ? "Volver a Entrenamiento" : "Volver a Juegos"}
        </motion.button>

        {/* Header */}
        <div className="glass-card p-3 sm:p-4 mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs" />
          <div className="flex items-center gap-1.5 flex-wrap">
            {board.category && <Badge variant="secondary">{board.category.name}</Badge>}
            {board.group && <Badge variant="secondary">{board.group.name}</Badge>}
            {board.training_session && (
              <Badge variant="outline">
                {new Date(board.training_session.scheduled_at).toLocaleString("es-CO", {
                  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                })}
              </Badge>
            )}
            {isTraining && <Badge variant="outline">Sin guardar</Badge>}
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
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
          <Button variant="outline" size="icon" onClick={undo} disabled={!past.length} title="Deshacer"><Undo2 className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" onClick={redo} disabled={!future.length} title="Rehacer"><Redo2 className="w-4 h-4" /></Button>
          <Button
            variant={drawingLine ? "default" : "outline"}
            className="gap-1.5 sm:gap-2"
            onClick={() => { setDrawingLine((v) => !v); setLineDraft(null); setSelectedId(null); }}
          >
            <Pencil className="w-4 h-4" />
            {drawingLine ? (
              <>
                <span className="sm:hidden">Dibujando…</span>
                <span className="hidden sm:inline">Dibujando… (clic en el lápiz para terminar)</span>
              </>
            ) : "Línea"}
          </Button>
          <Button variant="outline" size="icon" onClick={deleteSelected} disabled={!selectedId} title="Borrar seleccionado">
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="outline" className="gap-1.5 sm:gap-2" onClick={clearAll} title="Limpiar todo">
            <Eraser className="w-4 h-4" /> <span className="hidden sm:inline">Limpiar todo</span><span className="sm:hidden">Limpiar</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {/* Field */}
          <div className="lg:col-span-2 rounded-2xl overflow-hidden relative" style={{ background: "#1a1a1a" }}>
            <div className="relative w-full" style={{ paddingBottom: "140%" }}>
              <div
                ref={fieldRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="absolute inset-4 rounded-xl overflow-hidden"
                style={{ background: theme.bg, cursor: drawingLine ? "crosshair" : "default", touchAction: drawingLine ? "none" : "auto" }}
              >
                <FieldMarkings courtType={courtType} mirrored={mirrored} line={theme.line} />

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

                {/* Líneas */}
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" style={{ pointerEvents: drawingLine ? "none" : "auto" }}>
                  <defs>
                    {[...markerColors].flatMap((color) =>
                      [...markerEnds].map((end) => {
                        if (end === "none") return null;
                        const id = markerId({ ...DEFAULT_LINE_STYLE, end, color });
                        if (end === "arrow") return (
                          <marker key={id} id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
                          </marker>
                        );
                        if (end === "x") return (
                          <marker key={id} id={id} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                            <path d="M 1 1 L 9 9 M 9 1 L 1 9" stroke={color} strokeWidth="1.6" />
                          </marker>
                        );
                        return (
                          <marker key={id} id={id} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                            <path d="M 5 0 L 5 10" stroke={color} strokeWidth="1.8" />
                          </marker>
                        );
                      })
                    )}
                  </defs>
                  {scene.lines.map((l) => (
                    <path
                      key={l.id}
                      d={buildLinePath(l)}
                      stroke={l.color}
                      strokeWidth={l.thickness}
                      strokeDasharray={l.dashed ? "3 2.5" : undefined}
                      markerEnd={l.end !== "none" ? `url(#${markerId(l)})` : undefined}
                      fill="none"
                      vectorEffect="non-scaling-stroke"
                      style={{ cursor: "pointer" }}
                      onClick={(e) => { e.stopPropagation(); setSelectedId(l.id); }}
                      opacity={selectedId === l.id ? 1 : 0.9}
                    />
                  ))}
                  {lineDraft && (
                    <path d={buildLinePath({ ...lineDraft, shape: nextLineStyle.shape })} stroke={nextLineStyle.color} strokeWidth={nextLineStyle.thickness}
                      strokeDasharray={nextLineStyle.dashed ? "3 2.5" : undefined} fill="none" vectorEffect="non-scaling-stroke" opacity={0.7} />
                  )}
                </svg>

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

                {/* Objetos y jugadores — se desactiva su drag mientras se dibuja una línea */}
                <div className="contents" style={{ pointerEvents: drawingLine ? "none" : undefined }}>
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
          </div>

          {/* Right panel */}
          <div className="space-y-2 sm:space-y-3 lg:space-y-4">
            {(selectedLine || drawingLine) && (
              <div className="glass-card-elevated p-2.5 sm:p-4 space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {selectedLine ? "Línea seleccionada" : "Próxima línea"}
                  </p>
                  {selectedLine && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedId(null)}><X className="w-3.5 h-3.5" /></Button>}
                </div>
                <LineStyleEditor value={selectedLine ?? nextLineStyle} onChange={selectedLine ? updateSelectedLine : (p) => setNextLineStyle((s) => ({ ...s, ...p }))} />
              </div>
            )}

            {selectedPlayerToken && (
              <div className="glass-card-elevated p-2.5 sm:p-4 space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{selectedPlayerToken.name}</p>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedId(null)}><X className="w-3.5 h-3.5" /></Button>
                </div>
                <div className="flex gap-1.5 sm:gap-2">
                  <Input value={selectedPlayerToken.number} onChange={(e) => updatePlayerToken(selectedPlayerToken.id, { number: e.target.value.slice(0, 2) })} className="w-14" placeholder="#" />
                  <Button size="sm" variant={selectedPlayerToken.team === "A" ? "default" : "outline"} className="flex-1 px-1" onClick={() => updatePlayerToken(selectedPlayerToken.id, { team: "A" })}>
                    <span className="sm:hidden">A</span><span className="hidden sm:inline">Equipo A</span>
                  </Button>
                  <Button size="sm" variant={selectedPlayerToken.team === "B" ? "default" : "outline"} className="flex-1 px-1" onClick={() => updatePlayerToken(selectedPlayerToken.id, { team: "B" })}>
                    <span className="sm:hidden">B</span><span className="hidden sm:inline">Equipo B</span>
                  </Button>
                </div>
              </div>
            )}

            <Tabs defaultValue="jugadores">
              <TabsList className="w-full">
                <TabsTrigger value="jugadores" className="flex-1">Jugadores</TabsTrigger>
                <TabsTrigger value="objetos" className="flex-1">Objetos</TabsTrigger>
              </TabsList>
              <TabsContent value="jugadores">
                <div className="glass-card divide-y divide-border max-h-[45vh] sm:max-h-[420px] overflow-y-auto">
                  {roster.length === 0 ? (
                    <p className="p-3 text-xs text-muted-foreground">No hay jugadores confirmados en este grupo.</p>
                  ) : (
                    roster.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-sm">
                        <p className="min-w-0 truncate">
                          <span className="font-medium text-foreground">{p.name}</span>{" "}
                          <span className="text-[10px] text-muted-foreground">{p.position}</span>
                        </p>
                        <Button size="icon" variant="outline" className="h-6 w-6 flex-shrink-0" aria-label={`Agregar ${p.name}`} onClick={() => addPlayerFromRoster(p)}>
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
              <TabsContent value="objetos">
                <div className="glass-card grid grid-cols-3 sm:grid-cols-2 gap-1.5 p-2 sm:p-3">
                  {OBJ_CATALOG.map((o) => (
                    <button key={o.kind} onClick={() => addMarker(o.kind)} title={o.label}
                      className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border text-[10px] sm:text-xs hover:border-primary/50 hover:bg-muted/40 transition-colors">
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
          </div>
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
};

export default GameEditor;

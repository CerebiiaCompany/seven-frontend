import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import api from "@/lib/api";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Video, Play, Lock, Search, Upload, Eye, Trash2,
  FileVideo, Check, Zap, Shield, Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";

// ---------------------------------------------------------------------------
// Tipos + fetchers de "Contenido" (biblioteca de videos, backend en S3)
// ---------------------------------------------------------------------------

type MediaCategory = "tecnica" | "tactica" | "fisico" | "partidos" | "salud";

interface MediaAsset {
  id: string;
  title: string;
  description: string;
  category: MediaCategory;
  video: string | null;
  premium: boolean;
  views: number;
  uploaded_by_name: string | null;
  created_at: string;
}

const CATEGORY_OPTIONS: { value: MediaCategory; label: string }[] = [
  { value: "tecnica", label: "Técnica" },
  { value: "tactica", label: "Táctica" },
  { value: "fisico", label: "Físico" },
  { value: "partidos", label: "Partidos" },
  { value: "salud", label: "Salud" },
];

const CATEGORY_LABEL: Record<MediaCategory, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((c) => [c.value, c.label]),
) as Record<MediaCategory, string>;

const categoryPills = ["Todos", ...CATEGORY_OPTIONS.map((c) => c.label)];

const listMediaAssets = async () => {
  const { data } = await api.get<MediaAsset[]>("/content/videos/");
  return data;
};

const createMediaAsset = async (payload: {
  title: string;
  description: string;
  category: MediaCategory;
  premium: boolean;
  video: File;
}) => {
  const formData = new FormData();
  formData.append("title", payload.title);
  formData.append("description", payload.description);
  formData.append("category", payload.category);
  formData.append("premium", String(payload.premium));
  formData.append("video", payload.video);
  const { data } = await api.post<MediaAsset>("/content/videos/", formData, {
    headers: { "Content-Type": undefined },
  });
  return data;
};

const deleteMediaAsset = async (id: string) => {
  await api.delete(`/content/videos/${id}/`);
};

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined;
    const firstField = data && Object.values(data).find((v) => Array.isArray(v) || typeof v === "string");
    if (Array.isArray(firstField)) return String(firstField[0]);
    if (typeof firstField === "string") return firstField;
  }
  return fallback;
}

export default function Content() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [activeTab, setActiveTab] = useState("all");

  const [selectedItem, setSelectedItem] = useState<MediaAsset | null>(null);
  const [playingItem, setPlayingItem] = useState<MediaAsset | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "tecnica" as MediaCategory,
    premium: false,
    video: null as File | null,
  });

  const loadAssets = async () => {
    try {
      const data = await listMediaAssets();
      setAssets(data);
    } catch {
      toast({ title: "No se pudo cargar el contenido", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const filtered = assets.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "Todos" || CATEGORY_LABEL[item.category] === activeCategory;
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "premium" && item.premium) ||
      (activeTab === "free" && !item.premium);
    return matchesSearch && matchesCategory && matchesTab;
  });

  const totalViews = assets.reduce((sum, a) => sum + a.views, 0);
  const premiumCount = assets.filter((a) => a.premium).length;

  const resetForm = () => {
    setForm({ title: "", description: "", category: "tecnica", premium: false, video: null });
  };

  const handleUpload = async () => {
    if (!form.title.trim()) {
      toast({ title: "El título es obligatorio", variant: "destructive" });
      return;
    }
    if (!form.video) {
      toast({ title: "Selecciona un archivo de video", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      await createMediaAsset({ ...form, video: form.video });
      toast({ title: "Video subido correctamente" });
      setUploadOpen(false);
      resetForm();
      loadAssets();
    } catch (error) {
      toast({ title: errorMessage(error, "No se pudo subir el video"), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMediaAsset(id);
      setAssets((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "Video eliminado" });
    } catch {
      toast({ title: "No se pudo eliminar el video", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground sm:text-3xl">Contenido</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">Biblioteca de videos y material deportivo</p>
          </div>
          <Button className="min-h-11 w-full gap-2 font-semibold sm:w-auto" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" />
            Subir Contenido
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2 xl:grid-cols-4 xl:gap-4">
          {[
            { label: "Total Contenido", value: String(assets.length), icon: Video },
            { label: "Videos Premium", value: String(premiumCount), icon: Lock },
            { label: "Videos Gratis", value: String(assets.length - premiumCount), icon: FileVideo },
            { label: "Vistas Totales", value: totalViews.toLocaleString("es-CO"), icon: Eye },
          ].map((stat) => (
            <Card key={stat.label} className="min-w-0 border-border/90 bg-card/80">
              <CardContent className="flex items-center gap-3 p-4 sm:gap-4 sm:p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary shadow-[0_0_18px_hsl(var(--primary)/0.18)] sm:h-12 sm:w-12">
                  <stat.icon className="h-5 w-5 text-primary-foreground sm:h-6 sm:w-6" strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold text-foreground sm:text-2xl">{stat.value}</p>
                  <p className="text-xs font-medium leading-4 text-muted-foreground sm:text-sm">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar contenido..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-h-11 pl-10 placeholder:text-muted-foreground"
            />
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList className="grid min-h-11 w-full grid-cols-3 md:flex md:w-auto">
              <TabsTrigger className="min-h-9" value="all">Todos</TabsTrigger>
              <TabsTrigger className="min-h-9" value="free">Gratis</TabsTrigger>
              <TabsTrigger className="min-h-9" value="premium">Premium</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Category pills */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {categoryPills.map((cat) => (
            <Button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              variant={activeCategory === cat ? "default" : "secondary"}
              size="sm"
              className="min-h-10 shrink-0 rounded-full px-5 font-semibold"
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Content Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card
                  className="group h-full cursor-pointer overflow-hidden border-border/90 bg-card/80 transition-all hover:border-primary/40 hover:shadow-[var(--shadow-elevated)]"
                  onClick={() => (item.premium ? setSelectedItem(item) : setPlayingItem(item))}
                >
                  {/* Thumbnail area */}
                  <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-primary/95">
                    <FileVideo className="h-10 w-10 text-primary-foreground/70" strokeWidth={1.5} />
                    {item.premium && (
                      <div className="absolute top-2 right-2">
                        <Badge className="gap-1 border border-primary/30 bg-background text-foreground shadow-md">
                          <Lock className="w-3 h-3" />
                          Premium
                        </Badge>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="absolute top-2 left-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-destructive opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                      aria-label="Eliminar video"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <div className="absolute inset-0 flex items-center justify-center bg-background/0 transition-colors group-hover:bg-background/15">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-background text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        {item.premium ? <Lock className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>
                  <CardContent className="space-y-2 p-4 sm:p-5">
                    <p className="line-clamp-2 text-base font-semibold leading-snug text-foreground">{item.title}</p>
                    <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                    <div className="flex items-center justify-between pt-1">
                      <Badge variant="outline" className="text-xs text-foreground">{CATEGORY_LABEL[item.category]}</Badge>
                      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <Eye className="w-3 h-3" />
                        {item.views}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Video className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No se encontró contenido</p>
            <p className="text-sm">Intenta con otros filtros o sube el primer video</p>
          </div>
        )}

        {/* Dialog: subir contenido */}
        <Dialog
          open={uploadOpen}
          onOpenChange={(open) => {
            setUploadOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <Upload className="w-5 h-5 text-primary" />
                Subir Contenido
              </DialogTitle>
              <DialogDescription>El video se sube directo a S3, en una carpeta por categoría</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ej. Técnica de pase largo"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Descripción</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Opcional"
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Categoría</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v as MediaCategory }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Archivo de video</Label>
                <Input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
                  onChange={(e) => setForm((f) => ({ ...f, video: e.target.files?.[0] ?? null }))}
                />
                <p className="text-xs text-muted-foreground">MP4, MOV, WEBM o MKV. Máximo 500 MB.</p>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Contenido premium</p>
                  <p className="text-xs text-muted-foreground">Solo visible para suscriptores</p>
                </div>
                <Switch
                  checked={form.premium}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, premium: v }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleUpload} disabled={uploading} className="w-full gap-2">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Subiendo..." : "Subir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: reproducir video (contenido no premium) */}
        <Dialog open={!!playingItem} onOpenChange={(open) => !open && setPlayingItem(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-foreground">{playingItem?.title}</DialogTitle>
              <DialogDescription>{playingItem?.description}</DialogDescription>
            </DialogHeader>
            {playingItem?.video && (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={playingItem.video} controls autoPlay className="w-full rounded-lg bg-black" />
            )}
          </DialogContent>
        </Dialog>

        {/* Premium Unlock Dialog */}
        <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <Lock className="w-5 h-5 text-primary" />
                Contenido Premium
              </DialogTitle>
              <DialogDescription>
                Desbloquea acceso completo a todo el contenido exclusivo
              </DialogDescription>
            </DialogHeader>

            {selectedItem && (
              <div className="space-y-4">
                {/* Selected content preview */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-accent">
                  <FileVideo className="h-6 w-6 text-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{selectedItem.title}</p>
                    <p className="text-xs text-muted-foreground">{CATEGORY_LABEL[selectedItem.category]}</p>
                  </div>
                  <Badge className="bg-accent-foreground text-primary-foreground border-0 text-[10px]">
                    <Lock className="w-3 h-3 mr-1" />
                    Premium
                  </Badge>
                </div>

                {/* Plans */}
                <div className="space-y-3">
                  {[
                    { name: "Mensual", price: "$29.900", period: "/mes", popular: false },
                    { name: "Semestral", price: "$24.900", period: "/mes", popular: true, save: "Ahorra 17%" },
                    { name: "Anual", price: "$19.900", period: "/mes", popular: false, save: "Ahorra 33%" },
                  ].map((plan) => (
                    <button
                      key={plan.name}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${
                        plan.popular
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                          {plan.popular && (
                            <Badge className="text-[10px] py-0">Popular</Badge>
                          )}
                        </div>
                        {plan.save && (
                          <p className="text-[10px] text-primary font-medium">{plan.save}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-foreground">{plan.price}</span>
                        <span className="text-xs text-muted-foreground">{plan.period}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Features */}
                <div className="space-y-2 py-2">
                  {[
                    "Acceso a todos los videos premium",
                    "Análisis tácticos exclusivos",
                    "Rutinas de entrenamiento avanzadas",
                    "Soporte prioritario",
                  ].map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>

                <Button className="w-full gap-2" size="lg">
                  <Zap className="w-4 h-4" />
                  Suscribirse Ahora
                </Button>

                <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                  <Shield className="w-3 h-3" />
                  Pago seguro · Cancela cuando quieras
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

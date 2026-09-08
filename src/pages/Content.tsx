import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Video, Play, Lock, Search, Upload, Eye, Clock,
  Star, Crown, FileVideo, BookOpen, Dumbbell, Check, Zap, Shield
} from "lucide-react";
import { motion } from "framer-motion";

type ContentItem = {
  id: string;
  title: string;
  description: string;
  type: "video" | "document" | "exercise";
  category: string;
  duration: string;
  thumbnail: string;
  premium: boolean;
  views: number;
  rating: number;
  date: string;
};

const contentItems: ContentItem[] = [
  { id: "1", title: "Técnica de Pase Largo", description: "Fundamentos del pase largo con precisión y potencia", type: "video", category: "Técnica", duration: "12:30", thumbnail: "🎯", premium: false, views: 342, rating: 4.8, date: "2025-03-15" },
  { id: "2", title: "Tácticas Defensivas 4-4-2", description: "Análisis táctico del sistema defensivo en formación 4-4-2", type: "video", category: "Táctica", duration: "18:45", thumbnail: "🛡️", premium: true, views: 189, rating: 4.9, date: "2025-03-12" },
  { id: "3", title: "Rutina de Calentamiento Pre-Partido", description: "Ejercicios de activación muscular y movilidad articular", type: "exercise", category: "Físico", duration: "08:00", thumbnail: "🔥", premium: false, views: 567, rating: 4.6, date: "2025-03-10" },
  { id: "4", title: "Análisis: Final Sub-17", description: "Desglose completo del partido final de la categoría Sub-17", type: "video", category: "Partidos", duration: "45:20", thumbnail: "⚽", premium: true, views: 98, rating: 4.7, date: "2025-03-08" },
  { id: "5", title: "Guía de Nutrición Deportiva", description: "Plan alimenticio para deportistas en formación", type: "document", category: "Salud", duration: "15 págs", thumbnail: "🥗", premium: true, views: 234, rating: 4.5, date: "2025-03-05" },
  { id: "6", title: "Control de Balón con Ambos Pies", description: "Ejercicios progresivos para mejorar el control bilateral", type: "video", category: "Técnica", duration: "10:15", thumbnail: "👟", premium: false, views: 421, rating: 4.7, date: "2025-03-01" },
  { id: "7", title: "Circuito de Fuerza Explosiva", description: "Entrenamiento de potencia para sprints y saltos", type: "exercise", category: "Físico", duration: "20:00", thumbnail: "💪", premium: false, views: 312, rating: 4.4, date: "2025-02-28" },
  { id: "8", title: "Posicionamiento en Ataque", description: "Movimientos sin balón y desmarques ofensivos", type: "video", category: "Táctica", duration: "14:50", thumbnail: "📐", premium: true, views: 156, rating: 4.8, date: "2025-02-25" },
];

const categories = ["Todos", "Técnica", "Táctica", "Físico", "Partidos", "Salud"];

const typeIcon = {
  video: FileVideo,
  document: BookOpen,
  exercise: Dumbbell,
};

export default function Content() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);

  const filtered = contentItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "Todos" || item.category === activeCategory;
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "premium" && item.premium) ||
      (activeTab === "free" && !item.premium);
    return matchesSearch && matchesCategory && matchesTab;
  });

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground sm:text-3xl">Contenido</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">Biblioteca de videos, ejercicios y material deportivo</p>
          </div>
          <Button className="min-h-11 w-full gap-2 font-semibold sm:w-auto">
            <Upload className="h-4 w-4" />
            Subir Contenido
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2 xl:grid-cols-4 xl:gap-4">
          {[
            { label: "Total Contenido", value: "48", icon: Video },
            { label: "Videos Premium", value: "18", icon: Crown },
            { label: "Vistas Totales", value: "12.4K", icon: Eye },
            { label: "Horas de Video", value: "36h", icon: Clock },
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
          {categories.map((cat) => (
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((item, i) => {
            const TypeIcon = typeIcon[item.type];
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card
                  className="group h-full cursor-pointer overflow-hidden border-border/90 bg-card/80 transition-all hover:border-primary/40 hover:shadow-[var(--shadow-elevated)]"
                  onClick={() => item.premium ? setSelectedItem(item) : null}
                >
                  {/* Thumbnail area */}
                  <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-primary/95">
                    <span className="text-4xl">{item.thumbnail}</span>
                    {item.premium && (
                      <div className="absolute top-2 right-2">
                        <Badge className="gap-1 border border-primary/30 bg-background text-foreground shadow-md">
                          <Crown className="w-3 h-3" />
                          Premium
                        </Badge>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-background/0 transition-colors group-hover:bg-background/15">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-background text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        {item.premium ? <Lock className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-2">
                      <Badge className="gap-1 border border-foreground/15 bg-background/90 text-xs text-foreground shadow-md">
                        <TypeIcon className="w-3 h-3" />
                        {item.duration}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="space-y-2 p-4 sm:p-5">
                    <p className="line-clamp-2 text-base font-semibold leading-snug text-foreground">{item.title}</p>
                    <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                    <div className="flex items-center justify-between pt-1">
                      <Badge variant="outline" className="text-xs text-foreground">{item.category}</Badge>
                      <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 text-primary fill-primary" />
                          {item.rating}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Eye className="w-3 h-3" />
                          {item.views}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Video className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No se encontró contenido</p>
            <p className="text-sm">Intenta con otros filtros o términos de búsqueda</p>
          </div>
        )}

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
                  <span className="text-2xl">{selectedItem.thumbnail}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{selectedItem.title}</p>
                    <p className="text-xs text-muted-foreground">{selectedItem.duration} · {selectedItem.category}</p>
                  </div>
                  <Badge className="bg-accent-foreground text-primary-foreground border-0 text-[10px]">
                    <Crown className="w-3 h-3 mr-1" />
                    Premium
                  </Badge>
                </div>

                {/* Plans */}
                <div className="space-y-3">
                  {[
                    {
                      name: "Mensual",
                      price: "$29.900",
                      period: "/mes",
                      popular: false,
                    },
                    {
                      name: "Semestral",
                      price: "$24.900",
                      period: "/mes",
                      popular: true,
                      save: "Ahorra 17%",
                    },
                    {
                      name: "Anual",
                      price: "$19.900",
                      period: "/mes",
                      popular: false,
                      save: "Ahorra 33%",
                    },
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

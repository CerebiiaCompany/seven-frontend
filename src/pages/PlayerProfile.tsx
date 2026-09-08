import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ArrowLeft, Calendar, MapPin, Award, TrendingUp, Video, Upload, Play, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

type PlayerVideo = { id: string; name: string; url: string; createdAt: string };

const playerData = {
  id: 1, name: "Juan Pérez", age: 16, category: "Sub-17", position: "Delantero",
  rating: 82, status: "active", goals: 12, assists: 8, minutes: 1240,
  birthdate: "2010-03-15", city: "Bogotá",
  observations: [
    { date: "15 Mar", text: "Excelente desempeño en práctica táctica. Mejora notable en la lectura de juego." },
    { date: "10 Mar", text: "Debe mejorar pie izquierdo. Buen trabajo en definición." },
  ],
};

const radarData = [
  { skill: "Técnica", value: 82 },
  { skill: "Velocidad", value: 75 },
  { skill: "Táctica", value: 78 },
  { skill: "Resistencia", value: 70 },
  { skill: "Definición", value: 85 },
  { skill: "Pase", value: 72 },
];

const evolutionData = [
  { month: "Oct", rating: 72 },
  { month: "Nov", rating: 74 },
  { month: "Dic", rating: 75 },
  { month: "Ene", rating: 78 },
  { month: "Feb", rating: 80 },
  { month: "Mar", rating: 82 },
];

const PlayerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const player = playerData;
  const videosKey = `sf_player_videos_${id || "default"}`;
  const [videos, setVideos] = useState<PlayerVideo[]>([]);
  const [playing, setPlaying] = useState<PlayerVideo | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { setVideos(JSON.parse(localStorage.getItem(videosKey) || "[]")); } catch {}
  }, [videosKey]);

  const persist = (v: PlayerVideo[]) => { setVideos(v); localStorage.setItem(videosKey, JSON.stringify(v)); };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const added: PlayerVideo[] = [];
    Array.from(files).forEach((f) => {
      if (!f.type.startsWith("video/")) return;
      added.push({ id: `v-${Date.now()}-${Math.random()}`, name: f.name, url: URL.createObjectURL(f), createdAt: new Date().toISOString() });
    });
    if (added.length === 0) { toast({ title: "Solo se permiten videos", variant: "destructive" }); return; }
    persist([...added, ...videos]);
    toast({ title: `${added.length} video(s) agregado(s)` });
  };

  const removeVideo = (vid: string) => persist(videos.filter((v) => v.id !== vid));

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        {/* Back */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => navigate("/players")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a deportistas
        </motion.button>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-xl font-display font-bold text-primary">
              JP
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-display font-bold text-foreground">{player.name}</h1>
                <Badge>Activo</Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {player.age} años</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {player.city}</span>
                <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5" /> {player.category} — {player.position}</span>
              </div>
            </div>
            <div className="text-center px-4">
              <p className="text-4xl font-display font-bold text-primary">{player.rating}</p>
              <p className="text-xs text-muted-foreground mt-1">Rating General</p>
            </div>
          </div>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Goles", value: player.goals },
            { label: "Asistencias", value: player.assists },
            { label: "Minutos", value: player.minutes.toLocaleString() },
            { label: "Partidos", value: "18" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="kpi-card text-center"
            >
              <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5">
            <h3 className="font-display font-semibold text-foreground mb-4">Perfil de Habilidades</h3>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(214, 20%, 90%)" />
                <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: "hsl(215, 12%, 50%)" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name="Habilidades" dataKey="value" stroke="hsl(153, 60%, 38%)" fill="hsl(153, 60%, 38%)" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card p-5">
            <h3 className="font-display font-semibold text-foreground mb-1">Evolución del Rating</h3>
            <p className="text-xs text-muted-foreground mb-4">Últimos 6 meses</p>
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(215, 12%, 50%)" />
                <YAxis domain={[60, 100]} tick={{ fontSize: 12 }} stroke="hsl(215, 12%, 50%)" />
                <Tooltip contentStyle={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(214,20%,90%)", borderRadius: "8px", fontSize: "12px" }} />
                <Line type="monotone" dataKey="rating" stroke="hsl(153, 60%, 38%)" strokeWidth={2.5} dot={{ fill: "hsl(153, 60%, 38%)", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Observations */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-display font-semibold text-foreground">Observaciones del Entrenador</h3>
          </div>
          <div className="space-y-3">
            {player.observations.map((obs, i) => (
              <div key={i} className="flex gap-4 py-3 border-b border-border/50 last:border-0">
                <span className="text-xs text-muted-foreground font-medium whitespace-nowrap pt-0.5">{obs.date}</span>
                <p className="text-sm text-foreground">{obs.text}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Video gallery */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass-card p-5 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-primary" />
              <h3 className="font-display font-semibold text-foreground">Galería de Videos</h3>
              <Badge variant="secondary" className="text-[10px]">{videos.length}</Badge>
            </div>
            <input ref={fileRef} type="file" accept="video/*" multiple className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
            <Button size="sm" onClick={() => fileRef.current?.click()}><Upload className="w-3.5 h-3.5" />Subir videos</Button>
          </div>
          {videos.length === 0 ? (
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
              className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <Video className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-foreground font-medium">Arrastra videos aquí o haz clic</p>
              <p className="text-xs text-muted-foreground mt-1">MP4, MOV, WebM</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {videos.map((v) => (
                <div key={v.id} className="group relative rounded-xl overflow-hidden border border-border bg-muted/40 aspect-video">
                  <video src={v.url} className="w-full h-full object-cover" muted preload="metadata" />
                  <button onClick={() => setPlaying(v)} className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-4 h-4 text-foreground ml-0.5" />
                    </div>
                  </button>
                  <button onClick={() => removeVideo(v.id)} className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="absolute bottom-0 inset-x-0 px-2 py-1 bg-gradient-to-t from-black/70 to-transparent">
                    <p className="text-[10px] text-white truncate">{v.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <Dialog open={!!playing} onOpenChange={(o) => !o && setPlaying(null)}>
          <DialogContent className="max-w-3xl p-2">
            {playing && <video src={playing.url} controls autoPlay className="w-full rounded-lg" />}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default PlayerProfile;

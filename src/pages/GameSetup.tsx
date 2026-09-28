import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";
import { createBoard } from "./Games";

interface EventOption {
  id: string;
  title: string;
  scheduled_at: string;
  category: string | null;
  category_id: string | null;
  group: string | null;
  group_id: string | null;
}

const formatEventLabel = (e: EventOption) => {
  const dt = new Date(e.scheduled_at);
  const date = dt.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
  const time = dt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });
  const team = e.category ? ` · ${e.category}${e.group ? ` ${e.group}` : ""}` : "";
  return `${date} ${time} — ${e.title}${team}`;
};

// El juego/sesión siempre nace ligado a un evento real del calendario:
// "Juegos" elige entre los partidos creados, "Entrenamiento" entre los
// entrenamientos — categoría, grupo y jugadores se heredan de ese evento
// (relación FK con `TrainingSession`), nunca se piden aparte.
const GameSetup = () => {
  const navigate = useNavigate();
  const isTraining = useLocation().pathname.startsWith("/gamification/entrenamiento");
  const [name, setName] = useState(isTraining ? "Sesión de entrenamiento" : "Nuevo juego");
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [creating, setCreating] = useState(false);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    setEventsError(false);
    try {
      const { data } = await api.get<{ results: EventOption[] }>("/training-sessions/", {
        params: { event_type: isTraining ? "training" : "match", page_size: 100 },
      });
      setEvents(data.results);
    } catch {
      setEventsError(true);
      toast.error(isTraining ? "No se pudieron cargar los entrenamientos" : "No se pudieron cargar los partidos");
    } finally {
      setEventsLoading(false);
    }
  }, [isTraining]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const selectedEvent = useMemo(() => events.find((e) => e.id === sessionId) ?? null, [events, sessionId]);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error(isTraining ? "Ponle un nombre a la sesión" : "Ponle un nombre al juego"); return; }
    if (!sessionId) { toast.error(isTraining ? "Selecciona el entrenamiento" : "Selecciona el partido"); return; }

    if (isTraining) {
      navigate("/gamification/entrenamiento", {
        state: {
          name: name.trim(),
          trainingSessionId: sessionId,
          sessionTitle: selectedEvent?.title ?? "",
          sessionScheduledAt: selectedEvent?.scheduled_at ?? "",
          category: selectedEvent?.category_id ? { id: selectedEvent.category_id, name: selectedEvent.category! } : null,
          group: selectedEvent?.group_id ? { id: selectedEvent.group_id, name: selectedEvent.group! } : null,
        },
      });
      return;
    }

    setCreating(true);
    try {
      const board = await createBoard({ name: name.trim(), training_session_id: sessionId });
      navigate(`/gamification/${board.id}`);
    } catch {
      toast.error("No se pudo crear el juego");
    } finally {
      setCreating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          onClick={() => navigate(isTraining ? "/gamification?tab=training" : "/gamification")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {isTraining ? "Volver a Entrenamiento" : "Volver a Juegos"}
        </motion.button>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <Gamepad2 className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-display font-bold text-foreground">
                {isTraining ? "Nueva sesión de entrenamiento" : "Nuevo juego"}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {isTraining
                ? "Elige el entrenamiento del calendario: categoría, grupo y jugadores se cargan de ahí."
                : "Elige el partido del calendario: categoría, grupo y jugadores se cargan de ahí."}
            </p>

            <div className="space-y-4">
              <div>
                <Label>{isTraining ? "Nombre de la sesión" : "Nombre del juego"}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
              </div>

              <div>
                <Label>{isTraining ? "Entrenamiento" : "Partido"}</Label>
                <Select
                  value={sessionId}
                  onValueChange={setSessionId}
                  disabled={eventsLoading || events.length === 0}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue
                      placeholder={eventsLoading ? "Cargando..." : isTraining ? "Selecciona un entrenamiento" : "Selecciona un partido"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((e) => <SelectItem key={e.id} value={e.id}>{formatEventLabel(e)}</SelectItem>)}
                  </SelectContent>
                </Select>
                {eventsError ? (
                  <p className="text-xs text-destructive mt-1.5">
                    No se pudieron cargar los eventos.{" "}
                    <button type="button" className="underline" onClick={loadEvents}>Reintentar</button>
                  </p>
                ) : !eventsLoading && events.length === 0 ? (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {isTraining
                      ? "No hay entrenamientos creados. Créalos primero desde el Calendario."
                      : "No hay partidos creados. Créalos primero desde el Calendario."}
                  </p>
                ) : null}
              </div>
            </div>

            <Button className="w-full mt-6" onClick={handleCreate} disabled={creating || eventsLoading || events.length === 0}>
              {creating ? "Creando..." : isTraining ? "Abrir editor" : "Crear y abrir editor"}
            </Button>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default GameSetup;

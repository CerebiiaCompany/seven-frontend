import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Gamepad2, Dumbbell, Trash2, Plus, Clock, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { type BoardListItem, listBoards, deleteBoard } from "./Games";

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * "Juegos" (pizarra táctica) y "Entrenamiento" comparten el mismo modelo y
 * editor (GameSetup → GameEditor); lo único que los distingue es
 * `TacticBoard.board_type` ("game" | "training"), así que cada pestaña
 * aquí es el mismo historial filtrado por ese campo.
 */
const Gamification = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"lineup" | "training">(
    searchParams.get("tab") === "training" ? "training" : "lineup",
  );
  const isTrainingMode = mode === "training";
  const navigate = useNavigate();

  const [boards, setBoards] = useState<BoardListItem[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [boardsDenied, setBoardsDenied] = useState(false);

  const loadBoards = useCallback(async () => {
    setBoardsLoading(true);
    try {
      const { results } = await listBoards({ board_type: isTrainingMode ? "training" : "game" });
      setBoardsDenied(false);
      setBoards(results);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 403) setBoardsDenied(true);
    } finally {
      setBoardsLoading(false);
    }
  }, [isTrainingMode]);

  useEffect(() => { loadBoards(); }, [loadBoards]);

  const handleDeleteBoard = async (id: string) => {
    try {
      await deleteBoard(id);
      toast.success(isTrainingMode ? "Sesión eliminada" : "Juego eliminado");
      setBoards((prev) => prev.filter((b) => b.id !== id));
    } catch {
      toast.error(isTrainingMode ? "No se pudo eliminar la sesión" : "No se pudo eliminar el juego");
    }
  };

  const createPath = isTrainingMode ? "/gamification/entrenamiento/nuevo" : "/gamification/nuevo";
  const createLabel = isTrainingMode ? "Crear sesión" : "Crear";
  const deniedLabel = isTrainingMode ? "Entrenamiento" : "Juegos";
  const emptyTitle = isTrainingMode ? "Todavía no hay sesiones guardadas" : "Todavía no hay juegos guardados";
  const emptyHint = isTrainingMode
    ? "Crea una eligiendo categoría y grupo, y guárdala cuando quieras desde el editor."
    : "Crea el primero eligiendo una categoría y un grupo.";

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 max-w-[1400px]">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-display font-bold text-foreground">Squad Builder</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Pizarra táctica y sesiones de entrenamiento</p>
        </motion.div>

        {/* Mode */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as "lineup" | "training")} className="mb-4">
          <TabsList>
            <TabsTrigger value="lineup">Juegos</TabsTrigger>
            <TabsTrigger value="training">Entrenamiento</TabsTrigger>
          </TabsList>
        </Tabs>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} key={mode}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {boardsLoading
                ? "Cargando..."
                : isTrainingMode
                  ? `${boards.length} sesión(es) guardada(s)`
                  : `${boards.length} juego(s) guardado(s)`}
            </p>
            <Button className="gap-2" onClick={() => navigate(createPath)}>
              <Plus className="w-4 h-4" /> {createLabel}
            </Button>
          </div>

          {boardsDenied ? (
            <div className="glass-card p-6 text-sm text-muted-foreground">
              Tu cuenta no tiene permiso para ver "{deniedLabel}". Pide al administrador del club que te asigne el rol de entrenador o administrador.
            </div>
          ) : boardsLoading ? (
            <div className="glass-card p-10 text-center text-sm text-muted-foreground">Cargando...</div>
          ) : boards.length === 0 ? (
            <div className="glass-card p-10 text-center">
              {isTrainingMode ? (
                <Dumbbell className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              ) : (
                <Gamepad2 className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              )}
              <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">{emptyHint}</p>
              <Button className="gap-2" onClick={() => navigate(createPath)}>
                <Plus className="w-4 h-4" /> {createLabel}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {boards.map((board, i) => (
                <motion.div
                  key={board.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="glass-card overflow-hidden group"
                >
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => navigate(`/gamification/${board.id}`)}
                      className="block w-full aspect-[4/3] bg-muted/40 overflow-hidden"
                    >
                      {board.thumbnail ? (
                        <img src={board.thumbnail} alt={board.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageOff className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline" size="icon"
                          className="absolute top-1.5 right-1.5 h-7 w-7 bg-background/80 backdrop-blur-sm text-destructive hover:text-destructive"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Eliminar ${board.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar "{board.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteBoard(board.id)}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <div className="p-3">
                    <button type="button" onClick={() => navigate(`/gamification/${board.id}`)} className="text-left w-full">
                      <p className="text-sm font-semibold text-foreground truncate">{board.name}</p>
                    </button>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {board.category && <Badge variant="secondary" className="text-[10px]">{board.category.name}</Badge>}
                      {board.group && <Badge variant="secondary" className="text-[10px]">{board.group.name}</Badge>}
                    </div>
                    <div className="mt-2 space-y-0.5">
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Creado: {formatDateTime(board.created_at)}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Modificado: {formatDateTime(board.updated_at)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Gamification;

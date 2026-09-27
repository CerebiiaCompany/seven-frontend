import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ArrowLeft, Gamepad2, Save, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type BoardDetail, getBoard, updateBoard } from "./Games";

const GameEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getBoard(id)
      .then((data) => { setBoard(data); setName(data.name); })
      .catch((error) => {
        if (isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 403)) {
          setNotFound(true);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSaveName = async () => {
    if (!id || !name.trim()) return;
    setSaving(true);
    try {
      const updated = await updateBoard(id, { name: name.trim() });
      setBoard(updated);
      toast.success("Guardado");
    } catch {
      toast.error("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  if (notFound) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
          <Card className="p-6 text-sm text-muted-foreground">
            No se encontró este juego o no tienes permiso para verlo.
          </Card>
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => navigate("/gamification")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Juegos
        </motion.button>

        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 flex items-center gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-sm" />
              <Button size="icon" variant="outline" onClick={handleSaveName} disabled={saving || name.trim() === board.name}>
                <Save className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1.5">
              {board.category && <Badge variant="secondary">{board.category.name}</Badge>}
              {board.group && <Badge variant="secondary">{board.group.name}</Badge>}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-10 text-center">
            <Wrench className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-foreground flex items-center justify-center gap-2">
              <Gamepad2 className="w-4 h-4 text-primary" /> El editor de la pizarra está en construcción
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Cancha, objetos, líneas y exportar a PDF llegan en las próximas fases. El juego ya quedó guardado y aparece en el historial.
            </p>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default GameEditor;

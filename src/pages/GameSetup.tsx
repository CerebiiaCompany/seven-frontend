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

interface NamedRef { id: string; name: string }
interface CategoryOption { id: string; name: string; groups: NamedRef[] }

// Selección previa obligatoria antes de entrar al editor: sin categoría (y
// grupo, si la categoría tiene) no hay de dónde cargar los jugadores del
// equipo. Mismo catálogo y patrón que el formulario de eventos de Calendar.tsx.
//
// "Entrenamiento" (`/gamification/entrenamiento/nuevo`) usa esta misma
// pantalla y el mismo editor (GameEditor), pero nunca crea un `TacticBoard`
// en el backend — la sesión vive solo en memoria del navegador.
const GameSetup = () => {
  const navigate = useNavigate();
  const isTraining = useLocation().pathname.startsWith("/gamification/entrenamiento");
  const [name, setName] = useState(isTraining ? "Sesión de entrenamiento" : "Nuevo juego");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [creating, setCreating] = useState(false);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError(false);
    try {
      const { data } = await api.get<CategoryOption[]>("/categories/");
      setCategories(data);
    } catch {
      setCategoriesError(true);
      toast.error("No se pudieron cargar las categorías");
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId]
  );

  const handleCreate = async () => {
    if (!name.trim()) { toast.error(isTraining ? "Ponle un nombre a la sesión" : "Ponle un nombre al juego"); return; }
    if (!categoryId) { toast.error("Selecciona la categoría"); return; }
    if (selectedCategory && selectedCategory.groups.length > 0 && !groupId) {
      toast.error("Selecciona el grupo");
      return;
    }

    if (isTraining) {
      const group = groupId ? selectedCategory?.groups.find((g) => g.id === groupId) ?? null : null;
      navigate("/gamification/entrenamiento", {
        state: {
          name: name.trim(),
          category: selectedCategory ? { id: selectedCategory.id, name: selectedCategory.name } : null,
          group: group ? { id: group.id, name: group.name } : null,
        },
      });
      return;
    }

    setCreating(true);
    try {
      const board = await createBoard({
        name: name.trim(),
        category_id: categoryId,
        ...(groupId ? { group_id: groupId } : {}),
      });
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
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
                ? "Elige la categoría y el grupo para cargar sus jugadores. Puedes guardarla como juego cuando quieras desde el editor."
                : "Elige la categoría y el grupo: sus jugadores quedarán disponibles en la pizarra."}
            </p>

            <div className="space-y-4">
              <div>
                <Label>{isTraining ? "Nombre de la sesión" : "Nombre del juego"}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
              </div>

              <div>
                <Label>Categoría</Label>
                <Select
                  value={categoryId}
                  onValueChange={(v) => { setCategoryId(v); setGroupId(""); }}
                  disabled={categoriesLoading || categories.length === 0}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder={categoriesLoading ? "Cargando categorías..." : "Selecciona una categoría"} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {categoriesError ? (
                  <p className="text-xs text-destructive mt-1.5">
                    No se pudieron cargar las categorías.{" "}
                    <button type="button" className="underline" onClick={loadCategories}>Reintentar</button>
                  </p>
                ) : !categoriesLoading && categories.length === 0 ? (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    No hay categorías creadas. Crea una desde Configuración del club.
                  </p>
                ) : null}
              </div>

              <div>
                <Label>Grupo</Label>
                {!selectedCategory ? (
                  <Select disabled>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecciona primero una categoría" /></SelectTrigger>
                  </Select>
                ) : selectedCategory.groups.length === 0 ? (
                  <p className="text-xs text-muted-foreground mt-1.5">Esta categoría no tiene grupos creados.</p>
                ) : (
                  <Select value={groupId} onValueChange={setGroupId}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecciona un grupo" /></SelectTrigger>
                    <SelectContent>
                      {selectedCategory.groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <Button className="w-full mt-6" onClick={handleCreate} disabled={creating}>
              {creating ? "Creando..." : isTraining ? "Abrir editor" : "Crear y abrir editor"}
            </Button>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default GameSetup;

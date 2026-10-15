export interface ApiExercise {
  id: string;
  name: string;
  category: string;
  intensity: string;
  duration_minutes: number;
  players: string;
  description: string;
}

// Las 4 áreas de metodología del club — deben coincidir con `Exercise.Category` en el backend.
export const EXERCISE_CATEGORIES = [
  { value: "tecnica", label: "Técnica" },
  { value: "fisico", label: "Físico" },
  { value: "psicologico", label: "Psicológico" },
  { value: "competencia_tactico", label: "Competencia (Táctico)" },
];

export const INTENSITIES = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
];

export const categoryLabel = (value: string) => EXERCISE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
export const intensityLabel = (value: string) => INTENSITIES.find((i) => i.value === value)?.label ?? value;

export const intensityColor = (i: string) =>
  i === "alta" ? "text-destructive" : i === "media" ? "text-[hsl(var(--kpi-amber))]" : "text-[hsl(var(--primary))]";

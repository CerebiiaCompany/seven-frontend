import api from "@/lib/api";

// ---------------------------------------------------------------------------
// Tipos + fetchers de "Juegos" (pizarra táctica), compartidos entre el
// historial embebido en Gamification.tsx (pestaña "Juegos") y las páginas
// GameSetup.tsx / GameEditor.tsx.
// ---------------------------------------------------------------------------

export interface BoardCategory { id: string; name: string }
export interface BoardGroup { id: string; name: string }

export interface BoardListItem {
  id: string;
  name: string;
  category: BoardCategory | null;
  group: BoardGroup | null;
  thumbnail: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface BoardScene {
  objects: unknown[];
  lines: unknown[];
}

export interface BoardDetail extends BoardListItem {
  court_type: "full" | "half" | "free";
  field_color: "green" | "dark" | "gray";
  mirrored: boolean;
  player_settings: Record<string, unknown>;
  scene: BoardScene;
}

export const listBoards = async (params?: { category?: string; group?: string }) => {
  const { data } = await api.get<{ results: BoardListItem[]; count: number }>("/boards/", { params });
  return data;
};

export const getBoard = async (id: string) => {
  const { data } = await api.get<BoardDetail>(`/boards/${id}/`);
  return data;
};

export const createBoard = async (payload: { name: string; category_id: string; group_id?: string }) => {
  const { data } = await api.post<BoardDetail>("/boards/", payload);
  return data;
};

export type BoardUpdatePayload = Partial<{
  name: string;
  court_type: BoardDetail["court_type"];
  field_color: BoardDetail["field_color"];
  mirrored: boolean;
  player_settings: Record<string, unknown>;
  scene: BoardScene;
}>;

export const updateBoard = async (id: string, payload: BoardUpdatePayload) => {
  const { data } = await api.patch<BoardDetail>(`/boards/${id}/`, payload);
  return data;
};

export const duplicateBoard = async (id: string) => {
  const { data } = await api.post<BoardListItem>(`/boards/${id}/duplicate/`);
  return data;
};

export const deleteBoard = async (id: string) => {
  await api.delete(`/boards/${id}/`);
};

export const uploadThumbnail = async (id: string, blob: Blob) => {
  const formData = new FormData();
  formData.append("thumbnail", blob, "thumbnail.png");
  await api.put(`/boards/${id}/thumbnail/`, formData, { headers: { "Content-Type": undefined } });
};

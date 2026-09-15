import api from "@/lib/api";

export type FormFieldType = "text" | "email" | "phone" | "number" | "date" | "select" | "textarea";

export type FormField = {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
};

export type SubmissionStatus = "new" | "contacted" | "enrolled" | "discarded";

/** Formulario tal como lo ve el administrador (panel de Formularios). */
export type FormDef = {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  success_message: string;
  is_open: boolean;
  created_by_name: string;
  submissions_count: number;
  created_at: string;
  updated_at: string;
};

/** Formulario tal como lo ve un visitante anónimo en el link público. */
export type PublicForm = {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  is_open: boolean;
  success_message: string;
};

/** Una respuesta guardada, con las respuestas del usuario + el contexto técnico del envío. */
export type Submission = {
  id: string;
  form: string;
  form_title: string;
  answers: Record<string, string>;
  form_snapshot: { title: string; description: string; fields: FormField[] };
  status: SubmissionStatus;
  duration_seconds: number | null;
  ip_address: string | null;
  user_agent: string;
  device_type: string;
  device_name: string;
  operating_system: string;
  browser: string;
  referrer: string;
  accept_language: string;
  location_country: string;
  location_region: string;
  location_city: string;
  location_source: string;
  created_at: string;
};

type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

// ---------------------------------------------------------------------------
// Administración (requiere sesión de entrenador/admin)
// ---------------------------------------------------------------------------

export async function listForms(): Promise<FormDef[]> {
  const { data } = await api.get<Paginated<FormDef>>("/forms/", { params: { page_size: 100 } });
  return data.results;
}

export async function createForm(payload: {
  title: string;
  description: string;
  fields: FormField[];
}): Promise<FormDef> {
  const { data } = await api.post<FormDef>("/forms/", payload);
  return data;
}

export async function deleteForm(id: string): Promise<void> {
  await api.delete(`/forms/${id}/`);
}

export async function listSubmissions(formId?: string): Promise<Submission[]> {
  const { data } = await api.get<Paginated<Submission>>("/form-submissions/", {
    params: { page_size: 200, ...(formId ? { form: formId } : {}) },
  });
  return data.results;
}

export async function updateSubmissionStatus(id: string, status: SubmissionStatus): Promise<Submission> {
  const { data } = await api.patch<Submission>(`/form-submissions/${id}/`, { status });
  return data;
}

// ---------------------------------------------------------------------------
// Público (sin autenticación — link compartido)
// ---------------------------------------------------------------------------

export async function getPublicForm(id: string): Promise<PublicForm> {
  const { data } = await api.get<PublicForm>(`/forms/${id}/public/`);
  return data;
}

export async function submitPublicForm(
  id: string,
  payload: { answers: Record<string, string>; duration_seconds: number },
): Promise<{ id: string }> {
  const { data } = await api.post<{ id: string }>(`/forms/${id}/public/submit/`, payload);
  return data;
}

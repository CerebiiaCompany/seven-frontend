import { useRef, useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, Zap, Camera } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api, { saveSession } from "@/lib/api";
import { useAuth, type AuthUser } from "@/contexts/AuthContext";

type Mode = "login" | "signup";

const RELATIONSHIPS = [
  { value: "madre", label: "Madre" },
  { value: "padre", label: "Padre" },
  { value: "abuelo", label: "Abuelo/a" },
  { value: "tio", label: "Tío/a" },
  { value: "hermano", label: "Hermano/a" },
  { value: "tutor_legal", label: "Tutor legal" },
  { value: "otro", label: "Otro" },
];

const DOCUMENT_TYPES = [
  { value: "CC", label: "Cédula de ciudadanía" },
  { value: "TI", label: "Tarjeta de identidad" },
  { value: "CE", label: "Cédula de extranjería" },
  { value: "PA", label: "Pasaporte" },
  { value: "RC", label: "Registro civil" },
  { value: "otro", label: "Otro" },
];

const MODALITIES = [
  { value: "futbol_7", label: "Fútbol 7" },
  { value: "futbol_11", label: "Fútbol 11" },
  { value: "futsal", label: "Fútbol sala / Futsal" },
  { value: "otro", label: "Otra" },
];

const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "6", "8", "10", "12", "14", "16"];

type AthleteForm = {
  birth_date: string;
  sex: string;
  document_type: string;
  document_id: string;
  phone: string;
  city: string;
  address: string;
  weight_kg: string;
  height_cm: string;
  shirt_size: string;
  has_previous_club: string; // "true" | "false" | ""
  previous_club: string;
  modality: string;
  guardian_name: string;
  guardian_relationship: string;
  guardian_phone: string;
  guardian_email: string;
  guardian_document_type: string;
  guardian_document_id: string;
  emergency_contact: string;
  has_medical_insurance: string; // "true" | "false" | ""
  medical_has_illness_or_accident: string;
  medical_has_respiratory_disease: string;
  medical_is_healthy_and_fit: string;
  medical_notes: string;
};

const emptyForm: AthleteForm = {
  birth_date: "",
  sex: "",
  document_type: "",
  document_id: "",
  phone: "",
  city: "",
  address: "",
  weight_kg: "",
  height_cm: "",
  shirt_size: "",
  has_previous_club: "",
  previous_club: "",
  modality: "",
  guardian_name: "",
  guardian_relationship: "",
  guardian_phone: "",
  guardian_email: "",
  guardian_document_type: "",
  guardian_document_id: "",
  emergency_contact: "",
  has_medical_insurance: "",
  medical_has_illness_or_accident: "",
  medical_has_respiratory_disease: "",
  medical_is_healthy_and_fit: "",
  medical_notes: "",
};

const REQUIRED_ATHLETE_FIELDS: { key: keyof AthleteForm; label: string }[] = [
  { key: "birth_date", label: "Fecha de nacimiento" },
  { key: "sex", label: "Sexo" },
  { key: "document_type", label: "Tipo de documento" },
  { key: "document_id", label: "Documento de identidad" },
  { key: "phone", label: "Teléfono" },
  { key: "city", label: "Ciudad" },
  { key: "address", label: "Dirección" },
  { key: "guardian_name", label: "Nombre del acudiente" },
  { key: "guardian_relationship", label: "Parentesco" },
  { key: "guardian_phone", label: "Teléfono del acudiente" },
  { key: "guardian_email", label: "Correo del acudiente" },
  { key: "emergency_contact", label: "Contacto de emergencia" },
];

type TokenResponse = { access: string; refresh: string; user: AuthUser };

function extractErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { error?: { message?: string } } | undefined;
    if (data?.error?.message) return data.error.message;
  }
  return fallback;
}

export default function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [displayName, setDisplayName] = useState("");
  const [form, setForm] = useState<AthleteForm>(emptyForm);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { user, loading, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = (location.state as { from?: string } | null)?.from ?? "/";

  useEffect(() => {
    if (user) navigate(destination, { replace: true });
  }, [destination, navigate, user]);

  if (!loading && user) return <Navigate to={destination} replace />;

  const set = (key: keyof AthleteForm, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handlePhotoFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["png", "jpg", "jpeg", "webp"].includes(ext)) {
      toast.error("Formato no soportado. Usa PNG, JPG o WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La foto no puede superar 5 MB.");
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const login = async (loginEmail: string, loginPassword: string) => {
    const { data } = await api.post<TokenResponse>("/auth/token/", {
      email: loginEmail,
      password: loginPassword,
    });
    saveSession(data.access, data.refresh, data.user);
    setUser(data.user);
    navigate(destination, { replace: true });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      toast.error("Correo y contraseña son obligatorios");
      return;
    }

    if (mode === "signup") {
      const nameParts = displayName.trim().split(/\s+/).filter(Boolean);
      if (nameParts.length < 2) {
        toast.error("Ingresa tu nombre completo (nombre y apellido)");
        return;
      }
      if (!passwordConfirm) {
        toast.error("Confirma tu contraseña");
        return;
      }
      if (password !== passwordConfirm) {
        toast.error("Las contraseñas no coinciden");
        return;
      }
      const missing = REQUIRED_ATHLETE_FIELDS.filter(({ key }) => !form[key].trim());
      if (missing.length > 0) {
        toast.error("Todos los campos son obligatorios");
        return;
      }

      setBusy(true);
      try {
        const first_name = nameParts.slice(0, -1).join(" ");
        const last_name = nameParts[nameParts.length - 1];

        await api.post("/auth/register/", {
          email: trimmedEmail,
          password,
          password_confirm: passwordConfirm,
          first_name,
          last_name,
          phone_number: form.phone.trim(),
          role: "player",
          birth_date: form.birth_date,
          sex: form.sex,
          document_type: form.document_type,
          document_id: form.document_id.trim(),
          city: form.city.trim(),
          address: form.address.trim(),
          weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
          height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
          shirt_size: form.shirt_size,
          has_previous_club: form.has_previous_club === "" ? null : form.has_previous_club === "true",
          previous_club: form.previous_club.trim(),
          modality: form.modality,
          guardian_name: form.guardian_name.trim(),
          guardian_relationship: form.guardian_relationship,
          guardian_phone: form.guardian_phone.trim(),
          guardian_email: form.guardian_email.trim(),
          guardian_document_type: form.guardian_document_type,
          guardian_document_id: form.guardian_document_id.trim(),
          emergency_contact: form.emergency_contact.trim(),
          has_medical_insurance: form.has_medical_insurance === "" ? null : form.has_medical_insurance === "true",
          medical_has_illness_or_accident: form.medical_has_illness_or_accident === "" ? null : form.medical_has_illness_or_accident === "true",
          medical_has_respiratory_disease: form.medical_has_respiratory_disease === "" ? null : form.medical_has_respiratory_disease === "true",
          medical_is_healthy_and_fit: form.medical_is_healthy_and_fit === "" ? null : form.medical_is_healthy_and_fit === "true",
          medical_notes: form.medical_notes.trim(),
        });
        // Si el usuario seleccionó una foto, obtener tokens temporales y subirla
        if (photoFile) {
          try {
            const { data: tokenData } = await api.post<TokenResponse>("/auth/token/", {
              email: trimmedEmail,
              password,
            });
            const formData = new FormData();
            formData.append("photo", photoFile);
            await api.put("/auth/me/photo/", formData, {
              headers: {
                Authorization: `Bearer ${tokenData.access}`,
                "Content-Type": undefined,
              },
            });
          } catch {
            // La foto falla silenciosamente; el jugador puede cambiarla después desde su perfil
          }
        }
        toast.success("Cuenta creada correctamente");
        await login(trimmedEmail, password);
      } catch (error) {
        toast.error(extractErrorMessage(error, "No se pudo crear la cuenta"));
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    try {
      await login(trimmedEmail, password);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Credenciales inválidas"));
    } finally {
      setBusy(false);
    }
  };

  const title = mode === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta";
  const description = mode === "login"
    ? "Ingresa al centro de gestión de Seven Soccer Club"
    : "Únete al equipo y empieza a gestionar tu progreso";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 sm:px-6">
      <div className="absolute inset-0 auth-grid opacity-30" aria-hidden="true" />
      <div className={`relative z-10 w-full ${mode === "signup" ? "max-w-2xl" : "max-w-md"}`}>
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary shadow-[0_0_30px_hsl(var(--primary)/0.28)]">
            <Zap className="h-7 w-7 text-primary-foreground" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">Soccer Future</p>
          <p className="mt-1 text-xs font-semibold uppercase text-primary">Seven Soccer Club</p>
        </div>

        <section className="glass-card-elevated p-5 sm:p-7" aria-labelledby="auth-title">
          <div className="mb-6">
            <h1 id="auth-title" className="text-2xl font-bold text-foreground">{title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>

          <form className="space-y-4" onSubmit={submit}>
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="display-name">Nombre completo</Label>
                <Input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Tu nombre" autoComplete="name" required />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" className="h-11 pl-10" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@club.com" autoComplete="email" required />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="password">Contraseña</Label>
              </div>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" className="h-11 px-10" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 8 caracteres" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required />
                <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-1/2 min-h-11 min-w-11 -translate-y-1/2" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </div>

            {mode === "signup" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password-confirm">Confirmar contraseña</Label>
                  <Input id="password-confirm" className="h-11" type={showPassword ? "text" : "password"} value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} placeholder="Repite tu contraseña" autoComplete="new-password" minLength={8} required />
                </div>

                {/* ── Foto de perfil ── */}
                <div className="pt-2 flex flex-col items-center gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary self-start">Foto de perfil <span className="normal-case font-normal text-muted-foreground">(opcional)</span></p>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="relative w-20 h-20 rounded-full border-2 border-dashed border-primary/40 hover:border-primary flex items-center justify-center overflow-hidden bg-primary/5 transition-colors group"
                    aria-label="Seleccionar foto de perfil"
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt="Vista previa" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-7 h-7 text-primary/50 group-hover:text-primary transition-colors" />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-full" />
                  </button>
                  {photoPreview && (
                    <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                      Quitar foto
                    </button>
                  )}
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handlePhotoFile(f); }}
                  />
                </div>

                {/* ── Datos del deportista ── */}
                <div className="pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Datos del deportista</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="birth-date">Fecha de nacimiento</Label>
                    <Input id="birth-date" className="h-11" type="date" value={form.birth_date} onChange={(event) => set("birth_date", event.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sex">Sexo</Label>
                    <Select value={form.sex} onValueChange={(value) => set("sex", value)}>
                      <SelectTrigger id="sex" className="h-11"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="femenino">Femenino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="document-type">Tipo de documento</Label>
                    <Select value={form.document_type} onValueChange={(value) => set("document_type", value)}>
                      <SelectTrigger id="document-type" className="h-11"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="document-id">Número de documento</Label>
                    <Input id="document-id" className="h-11" value={form.document_id} onChange={(event) => set("document_id", event.target.value)} placeholder="1234567890" maxLength={30} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" className="h-11" type="tel" value={form.phone} onChange={(event) => set("phone", event.target.value)} placeholder="300 000 0000" maxLength={25} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Ciudad</Label>
                    <Input id="city" className="h-11" value={form.city} onChange={(event) => set("city", event.target.value)} placeholder="Bogotá" maxLength={80} required />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Input id="address" className="h-11" value={form.address} onChange={(event) => set("address", event.target.value)} placeholder="Calle 00 #00-00" maxLength={140} required />
                  </div>
                </div>

                {/* ── Datos físicos ── */}
                <div className="pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Datos físicos</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="weight-kg">Peso (kg)</Label>
                    <Input id="weight-kg" className="h-11" type="number" min="0" max="500" step="0.1" value={form.weight_kg} onChange={(event) => set("weight_kg", event.target.value)} placeholder="65.5" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height-cm">Altura (cm)</Label>
                    <Input id="height-cm" className="h-11" type="number" min="0" max="300" step="0.1" value={form.height_cm} onChange={(event) => set("height_cm", event.target.value)} placeholder="170" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shirt-size">Talla de camiseta</Label>
                    <Select value={form.shirt_size} onValueChange={(value) => set("shirt_size", value)}>
                      <SelectTrigger id="shirt-size" className="h-11"><SelectValue placeholder="Talla" /></SelectTrigger>
                      <SelectContent>
                        {SHIRT_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* ── Historial deportivo ── */}
                <div className="pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Historial deportivo</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="modality">Modalidad</Label>
                    <Select value={form.modality} onValueChange={(value) => set("modality", value)}>
                      <SelectTrigger id="modality" className="h-11"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                      <SelectContent>
                        {MODALITIES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>¿Ha participado en otro club?</Label>
                    <div className="flex gap-3 pt-1">
                      {[{ val: "true", label: "Sí" }, { val: "false", label: "No" }].map(({ val, label }) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => set("has_previous_club", val)}
                          className={`flex-1 h-11 rounded-md border text-sm font-medium transition-colors ${form.has_previous_club === val ? "bg-primary text-primary-foreground border-primary" : "border-input bg-background hover:bg-accent"}`}
                        >{label}</button>
                      ))}
                    </div>
                  </div>
                  {form.has_previous_club === "true" && (
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="previous-club">Nombre del club anterior</Label>
                      <Input id="previous-club" className="h-11" value={form.previous_club} onChange={(event) => set("previous_club", event.target.value)} placeholder="Nombre del club" maxLength={120} />
                    </div>
                  )}
                </div>

                {/* ── Datos del acudiente ── */}
                <div className="pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Datos del acudiente</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="guardian-name">Nombre del acudiente</Label>
                    <Input id="guardian-name" className="h-11" value={form.guardian_name} onChange={(event) => set("guardian_name", event.target.value)} placeholder="Nombre completo" maxLength={120} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guardian-relationship">Parentesco</Label>
                    <Select value={form.guardian_relationship} onValueChange={(value) => set("guardian_relationship", value)}>
                      <SelectTrigger id="guardian-relationship" className="h-11"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                      <SelectContent>
                        {RELATIONSHIPS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guardian-phone">Teléfono del acudiente</Label>
                    <Input id="guardian-phone" className="h-11" type="tel" value={form.guardian_phone} onChange={(event) => set("guardian_phone", event.target.value)} placeholder="300 000 0000" maxLength={25} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guardian-doc-type">Tipo de doc. del acudiente</Label>
                    <Select value={form.guardian_document_type} onValueChange={(value) => set("guardian_document_type", value)}>
                      <SelectTrigger id="guardian-doc-type" className="h-11"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guardian-doc-id">N.º de doc. del acudiente</Label>
                    <Input id="guardian-doc-id" className="h-11" value={form.guardian_document_id} onChange={(event) => set("guardian_document_id", event.target.value)} placeholder="CC / TI del acudiente" maxLength={30} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="guardian-email">Correo del acudiente</Label>
                    <Input id="guardian-email" className="h-11" type="email" value={form.guardian_email} onChange={(event) => set("guardian_email", event.target.value)} placeholder="acudiente@correo.com" maxLength={255} required />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="emergency">Contacto de emergencia</Label>
                    <Input id="emergency" className="h-11" value={form.emergency_contact} onChange={(event) => set("emergency_contact", event.target.value)} placeholder="Nombre y teléfono" maxLength={140} required />
                  </div>
                </div>

                {/* ── Información médica ── */}
                <div className="pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Información médica</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      { key: "has_medical_insurance" as const, label: "¿Tiene seguro médico?" },
                      { key: "medical_has_illness_or_accident" as const, label: "¿Ha tenido enfermedad / accidente?" },
                      { key: "medical_has_respiratory_disease" as const, label: "¿Tiene enfermedad respiratoria?" },
                      { key: "medical_is_healthy_and_fit" as const, label: "¿Sano y apto para practicar deporte?" },
                    ] as { key: keyof AthleteForm; label: string }[]
                  ).map(({ key, label }) => (
                    <div key={key} className="space-y-2">
                      <Label>{label}</Label>
                      <div className="flex gap-3">
                        {[{ val: "true", label: "Sí" }, { val: "false", label: "No" }].map(({ val, label: btnLabel }) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => set(key, val)}
                            className={`flex-1 h-10 rounded-md border text-sm font-medium transition-colors ${form[key] === val ? "bg-primary text-primary-foreground border-primary" : "border-input bg-background hover:bg-accent"}`}
                          >{btnLabel}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="medical-notes">Descripción médica</Label>
                    <textarea
                      id="medical-notes"
                      rows={3}
                      value={form.medical_notes}
                      onChange={(event) => set("medical_notes", event.target.value)}
                      placeholder="Alergias, medicamentos, condiciones especiales, etc."
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                    />
                  </div>
                </div>
              </>
            )}

            <Button type="submit" className="h-11 w-full font-semibold" disabled={busy}>
              {busy && <LoaderCircle className="animate-spin" />}
              {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login"
              ? <>¿No tienes cuenta? <button className="font-semibold text-primary hover:underline" onClick={() => setMode("signup")}>Crear cuenta</button></>
              : <>¿Ya tienes cuenta? <button className="font-semibold text-primary hover:underline" onClick={() => setMode("login")}>Iniciar sesión</button></>}
          </div>
        </section>
      </div>
    </main>
  );
}

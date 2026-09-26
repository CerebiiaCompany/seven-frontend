import { useEffect, useRef, useState, type DragEvent } from "react";
import { isAxiosError } from "axios";
import { Camera, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

function validatePhotoFile(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    return "Formato no soportado. Usa PNG, JPG o WEBP.";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return "El archivo no puede superar 5 MB.";
  }
  return null;
}

interface AvatarPhotoUploaderProps {
  photoUrl: string | null;
  initials: string;
  onUploaded: (photoUrl: string | null) => void | Promise<void>;
}

/** Foto de perfil propia: click o drag & drop sobre el avatar, sube a `/auth/me/photo/`. */
export function AvatarPhotoUploader({ photoUrl, initials, onUploaded }: AvatarPhotoUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const handleFile = async (file: File) => {
    const validationError = validatePhotoFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const { data } = await api.put<{ photo: string | null }>("/auth/me/photo/", formData, {
        headers: { "Content-Type": undefined },
      });
      await onUploaded(data.photo);
    } catch (err) {
      const detail = isAxiosError(err)
        ? (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message
        : null;
      setError(detail || "No se pudo subir la foto");
    } finally {
      setUploading(false);
    }
  };

  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void handleFile(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const displaySrc = preview ?? photoUrl;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        role="button"
        tabIndex={0}
        aria-label="Subir foto de perfil"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        className={cn(
          "group relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-xl font-display font-bold flex-shrink-0 overflow-hidden cursor-pointer border-2 border-dashed transition-colors",
          displaySrc ? "bg-transparent" : "bg-primary/10 text-primary",
          dragActive ? "border-primary" : "border-transparent",
          error && "border-destructive",
        )}
      >
        {displaySrc ? (
          <img src={displaySrc} alt="Foto de perfil" className="w-full h-full object-cover" />
        ) : (
          initials
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-colors">
          {uploading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Camera className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={onInputChange}
        />
      </div>
      {error && <p className="text-[10px] text-destructive text-center max-w-[100px]">{error}</p>}
    </div>
  );
}

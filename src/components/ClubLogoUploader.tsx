import { useEffect, useRef, useState, type DragEvent } from "react";
import { isAxiosError } from "axios";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

const ALLOWED_EXTENSIONS = ["png", "svg", "jpg", "jpeg", "webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

function validateLogoFile(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    return "Formato no soportado. Usa PNG, SVG, JPG o WEBP.";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return "El archivo no puede superar 5 MB.";
  }
  return null;
}

interface ClubLogoUploaderProps {
  logoUrl: string | null;
  shortName: string;
  onUploaded: (logoUrl: string | null) => void | Promise<void>;
}

/** Uploader del escudo del club: click o drag & drop, preview inmediato y subida a `/club/settings/logo/`. */
export function ClubLogoUploader({ logoUrl, shortName, onUploaded }: ClubLogoUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const handleFile = async (file: File) => {
    const validationError = validateLogoFile(file);
    if (validationError) {
      setError(validationError);
      toast({ title: validationError, variant: "destructive" });
      return;
    }

    setError(null);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const { data } = await api.put<{ logo: string | null }>("/club/settings/logo/", formData, {
        headers: { "Content-Type": undefined },
      });
      await onUploaded(data.logo);
      toast({ title: "Logo actualizado correctamente" });
    } catch (err) {
      const detail = isAxiosError(err)
        ? (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message
        : null;
      const message = detail || "No se pudo subir el logo";
      setError(message);
      toast({ title: message, variant: "destructive" });
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

  const displaySrc = preview ?? logoUrl;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
      <div
        role="button"
        tabIndex={0}
        aria-label="Subir escudo del club"
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
          "relative w-16 h-16 rounded-2xl flex items-center justify-center text-primary font-display font-bold text-xl overflow-hidden cursor-pointer border-2 border-dashed transition-colors flex-shrink-0",
          displaySrc ? "bg-transparent" : "bg-primary/10",
          dragActive ? "border-primary" : "border-transparent",
          error && "border-destructive",
        )}
      >
        {displaySrc ? (
          <img src={displaySrc} alt="Escudo del club" className="w-full h-full object-cover" />
        ) : (
          shortName.slice(0, 3).toUpperCase() || "SF"
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".png,.svg,.jpg,.jpeg,.webp,image/png,image/svg+xml,image/jpeg,image/webp"
          className="hidden"
          onChange={onInputChange}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold">Escudo del club</p>
        <p className="text-xs text-muted-foreground">PNG, SVG, JPG o WEBP — máximo 5MB</p>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
      <Button
        type="button"
        variant="outline"
        className="gap-2 w-full sm:w-auto"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {uploading ? "Subiendo..." : "Subir logo"}
      </Button>
    </div>
  );
}

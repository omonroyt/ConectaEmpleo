import { useId, useState, type ChangeEvent, type DragEvent } from "react";
import { AlertCircle, File as FileIcon, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useSurfaceTone, type SurfaceTone } from "@/components/ui/Surface";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  file?: File | null;
  /** 0-100. Si se define, muestra una barra de progreso de subida. */
  progress?: number;
  /** Error controlado externamente (ej. respuesta del servidor). */
  error?: string;
  onClear?: () => void;
  /** Texto de privacidad opcional, ej. "Usaremos tu archivo para...". */
  privacyNote?: string;
  /** Fuerza la paleta; por defecto la hereda del panel (`Surface`/`Card`). */
  tone?: SurfaceTone;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

const ICON_BADGE_CLASS =
  "flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-cta text-white shadow-[0_10px_28px_-10px_rgba(74,69,255,.8)]";

const DROPZONE_CLASS: Record<SurfaceTone, { idle: string; hover: string; dragOver: string }> = {
  dark: {
    idle: "border-border-glass bg-white/[0.03]",
    hover: "hover:border-white/30 hover:bg-white/[0.06]",
    dragOver: "!border-solid !border-primary-2 !bg-primary-2/[0.12] shadow-[0_0_0_4px_rgba(74,69,255,.18)]",
  },
  light: {
    idle: "border-border bg-surface-soft",
    hover: "hover:border-primary-2/40 hover:bg-surface-tint",
    dragOver: "!border-solid !border-primary-2 !bg-primary/[.06] shadow-[0_0_0_4px_rgba(74,69,255,.12)]",
  },
};

const LINK_CLASS: Record<SurfaceTone, string> = {
  dark: "text-primary-on-dark",
  light: "text-primary",
};

const BODY_TEXT_CLASS: Record<SurfaceTone, string> = {
  dark: "text-text-on-dark-secondary",
  light: "text-text-secondary",
};

const HINT_TEXT_CLASS: Record<SurfaceTone, string> = {
  dark: "text-text-on-dark-tertiary",
  light: "text-text-tertiary",
};

const FILE_PANEL_CLASS: Record<SurfaceTone, string> = {
  dark: "border-border-glass bg-white/[0.04]",
  light: "border-border bg-surface",
};

const FILE_NAME_CLASS: Record<SurfaceTone, string> = {
  dark: "text-text-on-dark",
  light: "text-text-primary",
};

const FILE_ICON_CLASS: Record<SurfaceTone, string> = {
  dark: "text-primary-on-dark",
  light: "text-primary",
};

const CLEAR_BUTTON_CLASS: Record<SurfaceTone, string> = {
  dark: "text-text-on-dark-tertiary hover:bg-white/10 hover:text-text-on-dark",
  light: "text-text-tertiary hover:bg-surface-soft hover:text-text-primary",
};

const ERROR_TEXT_CLASS: Record<SurfaceTone, string> = {
  dark: "text-danger-on-dark",
  light: "text-danger",
};

/** Drag & drop + selector nativo. PDF/DOCX/PNG/JPG hasta 10 MB. */
export function FileUploader({
  onFileSelect,
  file,
  progress,
  error,
  onClear,
  privacyNote,
  tone,
  className,
}: FileUploaderProps) {
  const inputId = useId();
  const resolved = useSurfaceTone(tone);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const validate = (candidate: File): string | null => {
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      return "No pudimos procesar este archivo. Prueba con un PDF, DOCX, PNG o JPG de hasta 10 MB.";
    }
    if (candidate.size > MAX_SIZE_BYTES) {
      return "El archivo pesa más de 10 MB. Prueba con uno más ligero.";
    }
    return null;
  };

  const handleFiles = (files: FileList | null) => {
    const candidate = files?.[0];
    if (!candidate) return;
    const validationError = validate(candidate);
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    setLocalError(null);
    onFileSelect(candidate);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    handleFiles(event.dataTransfer.files);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
  };

  const shownError = error ?? localError;
  const dropzone = DROPZONE_CLASS[resolved];

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {!file ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors duration-fast ease-standard",
            dropzone.idle,
            dropzone.hover,
            dragOver && dropzone.dragOver,
          )}
        >
          <span className={ICON_BADGE_CLASS} aria-hidden="true">
            <UploadCloud className="size-6" />
          </span>
          <p className={cn("text-sm", BODY_TEXT_CLASS[resolved])}>
            <label
              htmlFor={inputId}
              className={cn("cursor-pointer font-semibold underline-offset-2 hover:underline", LINK_CLASS[resolved])}
            >
              Sube un archivo
            </label>{" "}
            o arrástralo aquí
          </p>
          <p className={cn("text-xs", HINT_TEXT_CLASS[resolved])}>PDF, DOCX, PNG o JPG · máx. 10 MB</p>
          <input
            id={inputId}
            type="file"
            accept=".pdf,.docx,.png,.jpg,.jpeg"
            onChange={handleChange}
            className="sr-only"
          />
        </div>
      ) : (
        <div className={cn("flex items-center gap-3 rounded-lg border p-4", FILE_PANEL_CLASS[resolved])}>
          <FileIcon className={cn("size-6 shrink-0", FILE_ICON_CLASS[resolved])} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className={cn("truncate text-sm font-medium", FILE_NAME_CLASS[resolved])}>{file.name}</p>
            <p className={cn("text-xs", BODY_TEXT_CLASS[resolved])}>{formatBytes(file.size)}</p>
            {typeof progress === "number" && (
              <ProgressBar value={progress} tone={resolved} className="mt-2" />
            )}
          </div>
          {onClear && (
            <button
              type="button"
              aria-label="Quitar archivo"
              onClick={onClear}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-fast ease-standard focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2",
                CLEAR_BUTTON_CLASS[resolved],
              )}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
      {shownError && (
        <p className={cn("flex items-center gap-1.5 text-sm", ERROR_TEXT_CLASS[resolved])} role="alert">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {shownError}
        </p>
      )}
      {privacyNote && <p className={cn("text-xs", HINT_TEXT_CLASS[resolved])}>{privacyNote}</p>}
    </div>
  );
}

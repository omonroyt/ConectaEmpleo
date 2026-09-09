import { useId, useState, type ChangeEvent, type DragEvent } from "react";
import { AlertCircle, File as FileIcon, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { ProgressBar } from "@/components/ui/ProgressBar";

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
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** Drag & drop + selector nativo. PDF/DOCX/PNG/JPG hasta 10 MB. */
export function FileUploader({
  onFileSelect,
  file,
  progress,
  error,
  onClear,
  privacyNote,
  className,
}: FileUploaderProps) {
  const inputId = useId();
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
            dragOver ? "border-primary-2 bg-primary/[.04]" : "border-border bg-surface-soft",
          )}
        >
          <UploadCloud className="size-8 text-text-tertiary" aria-hidden="true" />
          <p className="text-sm text-text-secondary">
            <label
              htmlFor={inputId}
              className="cursor-pointer font-medium text-primary underline-offset-2 hover:underline"
            >
              Sube un archivo
            </label>{" "}
            o arrástralo aquí
          </p>
          <p className="text-xs text-text-tertiary">PDF, DOCX, PNG o JPG · máx. 10 MB</p>
          <input
            id={inputId}
            type="file"
            accept=".pdf,.docx,.png,.jpg,.jpeg"
            onChange={handleChange}
            className="sr-only"
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
          <FileIcon className="size-6 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-primary">{file.name}</p>
            <p className="text-xs text-text-secondary">{formatBytes(file.size)}</p>
            {typeof progress === "number" && <ProgressBar value={progress} className="mt-2" />}
          </div>
          {onClear && (
            <button
              type="button"
              aria-label="Quitar archivo"
              onClick={onClear}
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-tertiary transition-colors duration-fast ease-standard hover:bg-surface-soft hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
      {shownError && (
        <p className="flex items-center gap-1.5 text-sm text-danger" role="alert">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {shownError}
        </p>
      )}
      {privacyNote && <p className="text-xs text-text-tertiary">{privacyNote}</p>}
    </div>
  );
}

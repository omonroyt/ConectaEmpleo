import { useState, type ChangeEvent } from "react";
import { GraduationCap } from "lucide-react";
import { Button, EvidenceBadge, FileUploader, FormField, Reveal, RevealGroup, Select, useToast } from "@/components/ui";
import { useSkillsCatalog, useUploadCertification } from "@/api/hooks";
import { ApiClientError } from "@/api/client";
import type { DocumentRef } from "@/api/types";

interface UploadedCertification extends DocumentRef {
  skillName: string | null;
}

/**
 * C11 — sección Certificaciones. Sube un documento (`documents.uploadCertification`)
 * ligado opcionalmente a una skill. El contrato no expone un endpoint para listar
 * certificaciones existentes, así que esta lista solo refleja lo subido en la sesión
 * actual (ver bitácora de F5). Toda certificación queda `pending`: el frontend
 * nunca la marca como verificada por sí mismo.
 */
export function CertificationUploader() {
  const { data: skills } = useSkillsCatalog();
  const upload = useUploadCertification();
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [skillCode, setSkillCode] = useState("");
  const [items, setItems] = useState<UploadedCertification[]>([]);
  const [error, setError] = useState<string | null>(null);

  const skillOptions = (skills ?? []).map((skill) => ({ value: skill.code, label: skill.name }));

  const handleSkillChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSkillCode(event.target.value);
  };

  const handleUpload = async () => {
    if (!file) return;
    setError(null);
    try {
      const doc = await upload.mutateAsync({ file, skillCode: skillCode || undefined });
      const skillName = skillOptions.find((option) => option.value === skillCode)?.label ?? null;
      setItems((current) => [{ ...doc, skillName }, ...current]);
      setFile(null);
      setSkillCode("");
      showToast({
        title: "Certificación subida",
        description: "Se revisará para marcarla como verificada.",
        tone: "success",
      });
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "No pudimos subir tu certificación. Prueba con un PDF, DOCX, PNG o JPG de hasta 10 MB.",
      );
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <FormField
        label="Habilidad que respalda (opcional)"
        htmlFor="cert-skill"
        hint="Elige la habilidad que esta certificación demuestra."
      >
        <Select
          options={skillOptions}
          placeholder="Selecciona una habilidad"
          value={skillCode}
          onChange={handleSkillChange}
        />
      </FormField>

      <FileUploader
        file={file}
        onFileSelect={setFile}
        onClear={() => setFile(null)}
        error={error ?? undefined}
        privacyNote="Usaremos este documento únicamente para validar la habilidad seleccionada."
      />

      <Button
        variant="secondary"
        size="md"
        disabled={!file}
        loading={upload.isPending}
        onClick={() => void handleUpload()}
        className="self-start"
      >
        Subir certificación
      </Button>

      {items.length > 0 && (
        <RevealGroup as="ul" className="flex flex-col gap-3" stagger={0.06}>
          {items.map((doc) => (
            <Reveal as="li" key={doc.id}>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <GraduationCap className="size-5 shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{doc.original_filename}</p>
                    {doc.skillName && <p className="text-xs text-text-secondary">{doc.skillName}</p>}
                  </div>
                </div>
                <EvidenceBadge level="pending" size="sm" />
              </div>
            </Reveal>
          ))}
        </RevealGroup>
      )}
      <p className="text-xs text-text-tertiary">Se revisará para marcarla como verificada.</p>
    </div>
  );
}

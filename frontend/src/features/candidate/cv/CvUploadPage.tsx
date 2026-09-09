import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { ImmersiveLayout } from "@/components/layout";
import { Button, Card, FileUploader, ProcessingStatus } from "@/components/ui";
import { useJob, useUploadCV } from "@/api/hooks";
import { useMotionSafe } from "@/lib/motion";

function messageForProgress(progress: number): string {
  if (progress < 34) return "Leyendo experiencia";
  if (progress < 67) return "Identificando habilidades";
  return "Organizando tu perfil";
}

/** C5 — Carga de CV `/candidate/cv/upload`. */
export function Component() {
  const navigate = useNavigate();
  const { fadeUp, pageSequence } = useMotionSafe();

  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const uploadCV = useUploadCV();
  const jobQuery = useJob(jobId, {
    onDone: () => navigate("/candidate/cv/review"),
    onFailed: () => setFailed(true),
  });

  const handleSelect = (selected: File) => {
    setFile(selected);
    setFailed(false);
    uploadCV.mutate(selected, {
      onSuccess: (ref) => setJobId(ref.job_id),
      onError: () => setFailed(true),
    });
  };

  const reset = () => {
    setFile(null);
    setJobId(null);
    setFailed(false);
  };

  const progress = jobQuery.data?.progress ?? 0;
  const isProcessing = Boolean(jobId) && !failed && jobQuery.data?.status !== "FAILED";

  return (
    <ImmersiveLayout onClose={() => navigate("/candidate")}>
      <motion.div initial="hidden" animate="visible" variants={pageSequence} className="flex flex-col gap-6">
        <motion.div variants={fadeUp}>
          <h1 className="text-2xl font-semibold text-text-on-dark sm:text-3xl">Sube tu CV</h1>
          <p className="mt-2 text-sm text-text-on-dark-secondary">
            Extraemos tu experiencia, estudios y habilidades para armar tu perfil.
          </p>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card padding="lg">
            {failed ? (
              <div className="flex flex-col items-start gap-4 text-center sm:text-left">
                <p className="text-sm text-danger">
                  No pudimos procesar este archivo. Prueba con un PDF o DOCX de hasta 10 MB.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={reset}>
                    Intentar de nuevo
                  </Button>
                  <Button variant="ghost" onClick={() => navigate("/candidate/cv/build")}>
                    Crear desde cero
                  </Button>
                </div>
              </div>
            ) : isProcessing ? (
              <ProcessingStatus messages={[messageForProgress(progress)]} progress={progress} />
            ) : (
              <FileUploader
                file={file}
                onFileSelect={handleSelect}
                onClear={reset}
                progress={uploadCV.isPending ? 0 : undefined}
                privacyNote="Usaremos tu archivo para estructurar tu perfil y preparar la entrevista."
              />
            )}
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Button variant="ghost" onClick={() => navigate("/candidate/cv/build")}>
            Prefiero construirlo desde cero
          </Button>
        </motion.div>
      </motion.div>
    </ImmersiveLayout>
  );
}

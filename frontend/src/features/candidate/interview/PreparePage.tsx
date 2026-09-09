import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  AlertCircle,
  Check,
  Clock,
  Keyboard,
  Mic,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  useCandidateMe,
  useCandidateStatus,
  useCompetencies,
  useCreateInterview,
} from "@/api/hooks";
import type { InterviewMode } from "@/api/types";
import { ImmersiveLayout } from "@/components/layout";
import { BrandBackground } from "@/components/brand/BrandBackground";
import { Badge, Button, Skeleton, useToast } from "@/components/ui";
import { useMicrophone } from "@/voice";
import { useMotionSafe } from "@/lib/motion";
import { cn } from "@/lib/cn";

const CHECKLIST = [
  "Busca un lugar tranquilo, sin mucho ruido alrededor.",
  "Ten en mente un ejemplo concreto de tu trabajo del día a día.",
  "Responde con calma: no hay respuestas correctas o incorrectas.",
  "Puedes pausar o cambiar a texto en cualquier momento.",
];

function voiceSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window && navigator.mediaDevices?.getUserMedia != null;
}

/** C8 — Preparación de entrevista `/candidate/interview/prepare`. */
export function Component() {
  const navigate = useNavigate();
  const safe = useMotionSafe();
  const { showToast } = useToast();

  const candidateQuery = useCandidateMe();
  const statusQuery = useCandidateStatus();
  const competenciesQuery = useCompetencies(candidateQuery.data?.job_family_id);
  const createInterview = useCreateInterview();
  const microphone = useMicrophone();

  const [supported] = useState<boolean>(voiceSupported);
  const [mode, setMode] = useState<InterviewMode>(supported ? "VOICE" : "TEXT");
  const [micTested, setMicTested] = useState(false);
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // El micrófono de la prueba se libera al salir de la pantalla.
  useEffect(() => microphone.stop, [microphone.stop]);

  const coreCompetencies = (competenciesQuery.data ?? []).filter((c) => c.is_core);
  const resumingId = statusQuery.data?.interview_session_id ?? null;
  const micDenied = microphone.error != null;

  const testMicrophone = async () => {
    setMicTested(true);
    await microphone.request();
  };

  const start = async () => {
    const chosen: InterviewMode = supported && mode === "VOICE" ? "VOICE" : "TEXT";
    try {
      microphone.stop();
      const session = await createInterview.mutateAsync(chosen);
      navigate(`/candidate/interview/${session.id}`);
    } catch {
      showToast({
        title: "No pudimos abrir la entrevista",
        description: "Revisa tu conexión e inténtalo de nuevo.",
        tone: "danger",
      });
    }
  };

  const modeOptions: { value: InterviewMode; label: string; description: string; icon: typeof Mic }[] = [
    {
      value: "VOICE",
      label: "Con voz (recomendado)",
      description: "Escuchas la pregunta y respondes hablando. Siempre puedes cambiar a texto.",
      icon: Mic,
    },
    {
      value: "TEXT",
      label: "Por texto",
      description: "Lees la pregunta y escribes tu respuesta con calma.",
      icon: Keyboard,
    },
  ];

  return (
    <ImmersiveLayout onClose={() => navigate("/candidate")}>
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[38vh] overflow-hidden" aria-hidden="true">
        <BrandBackground asset="interview" presence="support" overlay="bottom" position="center" />
      </div>

      <motion.div
        variants={safe.pageSequence}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex w-full flex-col gap-8 py-4"
      >
        <motion.header variants={safe.fadeUp} className="flex flex-col gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[.18em] text-accent-soft">
            Antes de empezar
          </span>
          <h1 className="text-3xl font-semibold leading-tight text-text-on-dark sm:text-4xl md:text-5xl">
            Tu entrevista con IA
          </h1>
          <p className="max-w-[56ch] text-base text-text-on-dark-secondary">
            Una conversación para conocer mejor tu experiencia y cómo resuelves situaciones reales.
          </p>
        </motion.header>

        {/* Panel destacado: duración, formato, micrófono, conexión */}
        <motion.section
          variants={safe.fadeUp}
          className="grid gap-4 rounded-xl border border-border-dark bg-white/[0.04] p-6 sm:grid-cols-2"
        >
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 size-5 shrink-0 text-primary-2" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-text-on-dark">Duración estimada</p>
              <p className="text-sm text-text-on-dark-secondary">Alrededor de 8 minutos, 6 preguntas.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            {mode === "VOICE" ? (
              <Mic className="mt-0.5 size-5 shrink-0 text-primary-2" aria-hidden="true" />
            ) : (
              <Keyboard className="mt-0.5 size-5 shrink-0 text-primary-2" aria-hidden="true" />
            )}
            <div>
              <p className="text-sm font-medium text-text-on-dark">Formato</p>
              <p className="text-sm text-text-on-dark-secondary">
                {mode === "VOICE" ? "Conversación por voz, con opción de texto." : "Conversación por texto."}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mic className="mt-0.5 size-5 shrink-0 text-primary-2" aria-hidden="true" />
            <div className="w-full">
              <p className="text-sm font-medium text-text-on-dark">Micrófono</p>
              {!supported ? (
                <p className="text-sm text-text-on-dark-secondary">
                  Este navegador no permite audio: la entrevista será por texto.
                </p>
              ) : micDenied ? (
                <p className="text-sm text-warning">
                  Sin acceso al micrófono. Puedes continuar por texto sin problema.
                </p>
              ) : (
                <>
                  <div
                    className="mt-2 h-2 w-full overflow-hidden rounded-pill bg-white/10"
                    role="progressbar"
                    aria-label="Nivel del micrófono"
                    aria-valuenow={Math.round(microphone.level * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-pill bg-gradient-cta transition-[width] duration-fast ease-standard"
                      style={{ width: `${Math.min(100, Math.round(microphone.level * 140))}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void testMicrophone()}
                    className="mt-2 text-sm font-medium text-accent-soft underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2"
                  >
                    {micTested ? "Probar de nuevo" : "Probar micrófono"}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            {online ? (
              <Wifi className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <WifiOff className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
            )}
            <div>
              <p className="text-sm font-medium text-text-on-dark">Conexión</p>
              <p className="text-sm text-text-on-dark-secondary">
                {online ? "Estable. Todo listo para comenzar." : "Sin conexión. Reconéctate para empezar."}
              </p>
            </div>
          </div>
        </motion.section>

        {/* Qué evaluaremos */}
        <motion.section variants={safe.fadeUp} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-text-on-dark">Qué evaluaremos</h2>
          {competenciesQuery.isLoading ? (
            <div className="flex gap-2">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-7 w-28" />
            </div>
          ) : coreCompetencies.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {coreCompetencies.map((competency) => (
                <li key={competency.id}>
                  <Badge tone="info">{competency.name}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-on-dark-secondary">
              Exploraremos las competencias clave de tu área con ejemplos de tu experiencia.
            </p>
          )}
        </motion.section>

        {/* Checklist previo */}
        <motion.section variants={safe.fadeUp} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-text-on-dark">Antes de comenzar</h2>
          <motion.ul variants={safe.staggerContainer(0.07, 0.1)} className="flex flex-col gap-2.5">
            {CHECKLIST.map((item) => (
              <motion.li
                key={item}
                variants={safe.scaleIn}
                className="flex items-start gap-3 text-sm text-text-on-dark-secondary"
              >
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary-2">
                  <Check className="size-3.5" aria-hidden="true" />
                </span>
                {item}
              </motion.li>
            ))}
          </motion.ul>
        </motion.section>

        {/* Selector de modo */}
        <motion.section variants={safe.fadeUp} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-text-on-dark">¿Cómo prefieres responder?</h2>
          <div role="radiogroup" aria-label="Modo de la entrevista" className="grid gap-3 sm:grid-cols-2">
            {modeOptions.map((option) => {
              const disabled = option.value === "VOICE" && !supported;
              const selected = mode === option.value;
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={disabled}
                  onClick={() => setMode(option.value)}
                  className={cn(
                    "flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors duration-fast ease-standard focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2",
                    selected
                      ? "border-primary-2 bg-primary/15"
                      : "border-border-dark bg-white/[0.03] hover:border-white/25",
                    disabled && "cursor-not-allowed opacity-40",
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-text-on-dark">
                    <Icon className="size-4" aria-hidden="true" />
                    {option.label}
                  </span>
                  <span className="text-sm text-text-on-dark-secondary">{option.description}</span>
                </button>
              );
            })}
          </div>
          {!supported && (
            <p className="flex items-start gap-2 text-sm text-text-on-dark-secondary">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              Tu navegador no permite la entrevista por voz. La haremos por texto: el contenido y la
              evaluación son exactamente los mismos.
            </p>
          )}
        </motion.section>

        <motion.div variants={safe.fadeUp} className="flex flex-col gap-3">
          <Button
            size="lg"
            arrow
            loading={createInterview.isPending}
            disabled={!online || candidateQuery.isLoading}
            onClick={() => void start()}
          >
            {resumingId ? "Continuar entrevista" : "Comenzar entrevista"}
          </Button>
          <p className="text-xs text-text-on-dark-secondary/80">
            Tu evaluación se basa en tus respuestas y la evidencia disponible. Puedes pausar y
            retomar cuando quieras.
          </p>
        </motion.div>
      </motion.div>
    </ImmersiveLayout>
  );
}

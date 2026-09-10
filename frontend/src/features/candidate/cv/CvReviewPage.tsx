import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import {
  Award,
  Briefcase,
  Check,
  GraduationCap,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { ImmersiveLayout, LightSurface } from "@/components/layout";
import { BrandBackground } from "@/components/brand/BrandBackground";
import {
  Badge,
  Button,
  EmptyState,
  EvidenceBadge,
  FormField,
  Input,
  Modal,
  Skeleton,
  Switch,
  Textarea,
  useToast,
} from "@/components/ui";
import { useConfirmExtraction, useExtraction } from "@/api/hooks";
import { FIRST_JOB_STATEMENT } from "@/api/mock/engine/cvNormalize";
import { useMotionSafe } from "@/lib/motion";
import { cn } from "@/lib/cn";
import type {
  Claim,
  CVExtraction,
  EducationItem,
  ExperienceItem,
} from "@/api/types";

type SkillDraft = CVExtraction["skills"][number];
type CertificationDraft = CVExtraction["certifications"][number];

/**
 * Valores que el backend usa hoy como marcador de "dato que la persona no dio"
 * en el CV conversacional (`cv_builder/service.py::_build_parts`). La pantalla
 * los trata como ausencia, no como contenido: un placeholder nunca debe
 * leerse como si fuera un dato real del candidato. Cuando el backend deje de
 * enviarlos (normalización del borrador de CV), la cadena vacía basta y esta
 * lista se puede vaciar sin tocar nada más.
 */
const PLACEHOLDER_VALUES = new Set(["por confirmar", "sin especificar"]);

function isMissing(value: string | null | undefined): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "" || PLACEHOLDER_VALUES.has(normalized);
}

type ConfidenceLevel = "alta" | "media" | "baja";

function confidenceLabel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return "alta";
  if (confidence >= 0.5) return "media";
  return "baja";
}

const confidenceCopy: Record<ConfidenceLevel, string> = {
  alta: "Entendimos bien casi todo. Da un vistazo rápido y sigue.",
  media: "Hay cosas que quizá no entendimos del todo. Revísalas antes de continuar.",
  baja: "Nos costó entender parte de lo que contaste. Vale la pena que lo corrijas aquí.",
};

const confidenceDotClass: Record<ConfidenceLevel, string> = {
  alta: "bg-success",
  media: "bg-warning",
  baja: "bg-danger",
};

function emptyExperience(): ExperienceItem {
  return {
    id: `exp-${Date.now()}`,
    company: "",
    position: "",
    start_date: "",
    end_date: null,
    is_current: false,
    description: "",
    skills: [],
  };
}

function emptyEducation(): EducationItem {
  return {
    id: `edu-${Date.now()}`,
    institution: "",
    degree: "",
    start_year: new Date().getFullYear(),
    end_year: null,
  };
}

/** Texto de un campo que puede venir vacío: se marca como pendiente, no se inventa. */
function FieldValue({
  value,
  fallback,
  className,
}: {
  value: string | null | undefined;
  fallback: string;
  className?: string;
}) {
  if (isMissing(value)) {
    return <span className={cn("italic text-text-tertiary", className)}>{fallback}</span>;
  }
  return <span className={className}>{value}</span>;
}

/**
 * Sección de la revisión: número, título, contador y acción de agregar.
 * Sustituye al patrón "cuatro bloques idénticos" que hacía ilegible la jerarquía.
 */
function ReviewSection({
  index,
  icon: Icon,
  title,
  description,
  count,
  action,
  children,
}: {
  index: number;
  icon: typeof Briefcase;
  title: string;
  description?: string;
  count?: number;
  action?: { label: string; onClick: () => void };
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/[.08] text-primary"
          >
            <Icon className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-[-0.01em] text-text-primary">
                <span className="mr-2 text-sm font-medium tabular-nums text-text-tertiary">
                  {String(index).padStart(2, "0")}
                </span>
                {title}
              </h2>
              {count != null && count > 0 && (
                <Badge tone="neutral">
                  <span className="tabular-nums">{count}</span>
                </Badge>
              )}
            </div>
            {description && (
              <p className="mt-1 max-w-[54ch] text-sm text-pretty text-text-secondary">{description}</p>
            )}
          </div>
        </div>
        {action && (
          <Button variant="ghost" size="md" onClick={action.onClick} className="shrink-0">
            <Plus className="size-4" aria-hidden="true" /> {action.label}
          </Button>
        )}
      </div>
      {children}
    </section>
  );
}

/**
 * Fila editable con acciones que aparecen al hover/focus en desktop y quedan
 * siempre visibles en touch. Eliminar pide confirmación en la misma fila: es
 * destructivo e irreversible, y un modal para borrar un renglón es ruido.
 */
function EditableRow({
  children,
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
}: {
  children: ReactNode;
  onEdit?: () => void;
  onDelete: () => void;
  /** Solo requerido cuando hay `onEdit`: es el nombre accesible de ese botón. */
  editLabel?: string;
  deleteLabel: string;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div
      className={cn(
        "group relative flex items-start justify-between gap-4 rounded-md border bg-surface-soft/70 px-4 py-4",
        "transition-[background-color,border-color] duration-fast ease-standard",
        confirming
          ? "border-danger/40 bg-danger-soft/50"
          : "border-transparent hover:border-border hover:bg-surface-soft",
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>

      {confirming ? (
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-sm text-text-secondary sm:inline">¿Eliminar?</span>
          <button
            type="button"
            onClick={onDelete}
            className="flex h-9 items-center gap-1 rounded-pill bg-danger px-3 text-sm font-medium text-white transition-colors duration-fast ease-standard hover:bg-danger/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
          >
            <Check className="size-4" aria-hidden="true" /> Sí
          </button>
          <button
            type="button"
            aria-label="Cancelar"
            onClick={() => setConfirming(false)}
            className="flex size-9 items-center justify-center rounded-full text-text-secondary transition-colors duration-fast ease-standard hover:bg-surface hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div
          className={cn(
            "flex shrink-0 gap-1 transition-opacity duration-fast ease-standard",
            "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
          )}
        >
          {onEdit && (
            <button
              type="button"
              aria-label={editLabel}
              onClick={onEdit}
              className="flex size-9 items-center justify-center rounded-full text-text-tertiary transition-colors duration-fast ease-standard hover:bg-surface hover:text-primary focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2"
            >
              <Pencil className="size-4" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            aria-label={deleteLabel}
            onClick={() => setConfirming(true)}
            className="flex size-9 items-center justify-center rounded-full text-text-tertiary transition-colors duration-fast ease-standard hover:bg-danger-soft hover:text-danger focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

function ReviewSkeleton() {
  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-2xl bg-bg-dark-soft px-6 pb-14 pt-10 sm:px-8">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-4 h-10 w-3/4" />
        <Skeleton className="mt-3 h-4 w-2/3" />
        <div className="mt-7 flex gap-2">
          <Skeleton className="h-7 w-28 rounded-pill" />
          <Skeleton className="h-7 w-24 rounded-pill" />
          <Skeleton className="h-7 w-32 rounded-pill" />
        </div>
      </div>
      <div className="-mt-8 rounded-2xl bg-surface px-6 pb-10 pt-8 sm:px-8">
        {[0, 1].map((section) => (
          <div key={section} className={cn("flex flex-col gap-4", section > 0 && "mt-10")}>
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-md" />
              <Skeleton className="h-5 w-40" />
            </div>
            <Skeleton className="h-24 w-full rounded-md" />
            <Skeleton className="h-24 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** C7 — Revisión de claims `/candidate/cv/review`. */
export function Component() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { fadeUp, pageSequence, staggerContainer, cardEntrance } = useMotionSafe();

  const { data: extraction, isLoading, isError, refetch } = useExtraction();
  const confirmExtraction = useConfirmExtraction();

  const initialized = useRef(false);
  const [experience, setExperience] = useState<ExperienceItem[]>([]);
  const [education, setEducation] = useState<EducationItem[]>([]);
  const [skills, setSkills] = useState<SkillDraft[]>([]);
  const [certifications, setCertifications] = useState<CertificationDraft[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);

  const [experienceModal, setExperienceModal] = useState<ExperienceItem | null>(null);
  const [educationModal, setEducationModal] = useState<EducationItem | null>(null);
  const [newCert, setNewCert] = useState({ name: "", issuer: "" });

  useEffect(() => {
    if (!extraction || initialized.current) return;
    initialized.current = true;
    setExperience(extraction.experience);
    setEducation(extraction.education);
    setSkills(extraction.skills);
    setCertifications(extraction.certifications);
    setClaims(extraction.claims);
  }, [extraction]);

  const pendingClaims = useMemo(() => claims.filter((claim) => claim.needs_validation), [claims]);

  /**
   * El normalizador emite este claim (sin validación pendiente) cuando la
   * persona dijo que no ha trabajado. Es lo que convierte "no no estuve en
   * otros trabajos" en un estado legible del CV en vez de un puesto falso.
   */
  const seeksFirstJob = useMemo(
    () => claims.some((claim) => claim.statement === FIRST_JOB_STATEMENT),
    [claims],
  );

  const saveExperience = (item: ExperienceItem) => {
    setExperience((current) => {
      const exists = current.some((entry) => entry.id === item.id);
      return exists ? current.map((entry) => (entry.id === item.id ? item : entry)) : [...current, item];
    });
    setExperienceModal(null);
  };

  const saveEducation = (item: EducationItem) => {
    setEducation((current) => {
      const exists = current.some((entry) => entry.id === item.id);
      return exists ? current.map((entry) => (entry.id === item.id ? item : entry)) : [...current, item];
    });
    setEducationModal(null);
  };

  const setSkillLevel = (code: string, level: 1 | 2 | 3 | 4) => {
    setSkills((current) => current.map((skill) => (skill.code === code ? { ...skill, level } : skill)));
  };

  const removeSkill = (code: string) => {
    setSkills((current) => current.filter((skill) => skill.code !== code));
  };

  const addCertification = () => {
    if (!newCert.name.trim()) return;
    setCertifications((current) => [
      ...current,
      { name: newCert.name.trim(), issuer: newCert.issuer.trim() || null, year: null },
    ]);
    setNewCert({ name: "", issuer: "" });
  };

  const removeCertification = (index: number) => {
    setCertifications((current) => current.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    confirmExtraction.mutate(
      { experience, education, skills, certifications },
      {
        onSuccess: () => {
          showToast({ title: "Perfil confirmado", tone: "success" });
          navigate("/candidate/interview/prepare");
        },
        onError: () =>
          showToast({
            title: "No pudimos guardar tu confirmación",
            description: "Revisa tu conexión e inténtalo de nuevo.",
            tone: "danger",
          }),
      },
    );
  };

  const confidence = extraction ? confidenceLabel(extraction.confidence) : "media";

  return (
    <ImmersiveLayout onClose={() => navigate("/candidate")}>
      <main className="w-full pb-32">
        {isLoading ? (
          <ReviewSkeleton />
        ) : isError || !extraction ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border-dark bg-bg-dark-soft px-6 py-16 text-center">
            <h1 className="text-2xl font-semibold text-text-on-dark">
              No pudimos cargar tu información
            </h1>
            <p className="max-w-[46ch] text-sm text-text-on-dark-secondary">
              Tus respuestas están guardadas. Vuelve a intentarlo en un momento.
            </p>
            <Button variant="secondary" onClick={() => void refetch()} className="mt-2">
              Reintentar
            </Button>
          </div>
        ) : (
          <motion.div initial="hidden" animate="visible" variants={pageSequence} className="w-full">
            {/* Hero: contexto y estado de la extracción, sobre fondo de marca */}
            <section className="relative overflow-hidden rounded-2xl px-6 pb-16 pt-10 sm:px-8">
              <BrandBackground asset="onboarding" presence="support" overlay="bottom" position="70% 30%" />
              <div className="relative z-10 flex flex-col items-start">
                <motion.p
                  variants={fadeUp}
                  className="text-[11px] font-semibold uppercase tracking-[.2em] text-accent-soft"
                >
                  Revisa tu información
                </motion.p>
                <motion.h1
                  variants={fadeUp}
                  className="mt-3 max-w-[18ch] text-balance text-3xl font-semibold leading-[1.08] tracking-[-0.025em] text-text-on-dark sm:text-[2.75rem]"
                >
                  Así entendimos tu experiencia
                </motion.h1>
                <motion.p
                  variants={fadeUp}
                  className="mt-4 max-w-[56ch] text-pretty text-base leading-relaxed text-text-on-dark-secondary"
                >
                  Esto es un borrador hecho con lo que nos contaste. Corrige, agrega o quita lo que
                  quieras: nada se guarda hasta que confirmes.
                </motion.p>

                <motion.div variants={fadeUp} className="mt-7 flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-8 items-center gap-2 rounded-pill border border-border-dark bg-white/[.06] px-3 text-xs font-medium text-text-on-dark backdrop-blur">
                    <span
                      aria-hidden="true"
                      className={cn("size-1.5 rounded-full", confidenceDotClass[confidence])}
                    />
                    Confianza {confidence}
                  </span>
                  {[
                    { one: "experiencia", many: "experiencias", value: experience.length },
                    { one: "estudio", many: "estudios", value: education.length },
                    { one: "habilidad", many: "habilidades", value: skills.length },
                    { one: "certificación", many: "certificaciones", value: certifications.length },
                  ]
                    .filter((chip) => chip.value > 0)
                    .map((chip) => (
                      <span
                        key={chip.one}
                        className="inline-flex h-8 items-center gap-1.5 rounded-pill border border-border-dark bg-white/[.04] px-3 text-xs text-text-on-dark-secondary"
                      >
                        <span className="font-semibold tabular-nums text-text-on-dark">{chip.value}</span>
                        {chip.value === 1 ? chip.one : chip.many}
                      </span>
                    ))}
                </motion.div>

                <motion.p
                  variants={fadeUp}
                  className="mt-4 max-w-[56ch] text-sm text-text-on-dark-secondary/80"
                >
                  {confidenceCopy[confidence]}
                </motion.p>
              </div>
            </section>

            {/* Panel claro: el borrador editable, superpuesto al hero */}
            <LightSurface className="rounded-2xl px-6 pb-12 pt-10 sm:px-8">
              <motion.div variants={staggerContainer(0.08, 0.05)} className="flex flex-col gap-12">
                <motion.div variants={cardEntrance}>
                  <ReviewSection
                    index={1}
                    icon={Briefcase}
                    title="Experiencia"
                    count={experience.length}
                    action={{ label: "Agregar", onClick: () => setExperienceModal(emptyExperience()) }}
                  >
                    {experience.length === 0 ? (
                      <EmptyState
                        icon={Briefcase}
                        title={
                          seeksFirstJob ? FIRST_JOB_STATEMENT : "Sin experiencia registrada"
                        }
                        description={
                          seeksFirstJob
                            ? "Así lo entendimos de lo que nos contaste. No es un problema: la entrevista se centrará en cómo resuelves situaciones, no en cuántos años llevas."
                            : "Si estás buscando tu primer empleo, puedes dejar esta sección vacía y continuar."
                        }
                        cta={{
                          label: "Agregar experiencia",
                          onClick: () => setExperienceModal(emptyExperience()),
                        }}
                      />
                    ) : (
                      <div className="flex flex-col gap-3">
                        {experience.map((item) => (
                          <EditableRow
                            key={item.id}
                            editLabel={`Editar ${item.position || "experiencia"}`}
                            deleteLabel={`Eliminar ${item.position || "experiencia"}`}
                            onEdit={() => setExperienceModal(item)}
                            onDelete={() =>
                              setExperience((current) => current.filter((e) => e.id !== item.id))
                            }
                          >
                            <p className="text-pretty font-medium leading-snug text-text-primary">
                              <FieldValue value={item.position} fallback="Puesto por definir" />
                            </p>
                            {/* Sin separador "·": al envolverse en móvil quedaba
                                colgando al inicio de la línea siguiente. */}
                            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-text-secondary">
                              <FieldValue value={item.company} fallback="Empresa por definir" />
                              {item.is_current && <Badge tone="info">Trabajo actual</Badge>}
                            </p>
                            {item.description && (
                              <p className="mt-2 max-w-[68ch] text-pretty text-sm leading-relaxed text-text-tertiary">
                                {item.description}
                              </p>
                            )}
                          </EditableRow>
                        ))}
                      </div>
                    )}
                  </ReviewSection>
                </motion.div>

                <motion.div variants={cardEntrance}>
                  <ReviewSection
                    index={2}
                    icon={GraduationCap}
                    title="Estudios"
                    count={education.length}
                    action={{ label: "Agregar", onClick: () => setEducationModal(emptyEducation()) }}
                  >
                    {education.length === 0 ? (
                      <EmptyState
                        icon={GraduationCap}
                        title="Sin estudios registrados"
                        description="Cuenta cualquier estudio o curso, formal o no. Todo suma."
                        cta={{
                          label: "Agregar estudios",
                          onClick: () => setEducationModal(emptyEducation()),
                        }}
                      />
                    ) : (
                      <div className="flex flex-col gap-3">
                        {education.map((item) => (
                          <EditableRow
                            key={item.id}
                            editLabel={`Editar ${item.degree || "estudio"}`}
                            deleteLabel={`Eliminar ${item.degree || "estudio"}`}
                            onEdit={() => setEducationModal(item)}
                            onDelete={() =>
                              setEducation((current) => current.filter((e) => e.id !== item.id))
                            }
                          >
                            <p className="text-pretty font-medium leading-snug text-text-primary">
                              <FieldValue value={item.degree} fallback="Grado por definir" />
                            </p>
                            <p className="mt-1 text-sm text-text-secondary">
                              <FieldValue value={item.institution} fallback="Institución por definir" />
                            </p>
                          </EditableRow>
                        ))}
                      </div>
                    )}
                  </ReviewSection>
                </motion.div>

                <motion.div variants={cardEntrance}>
                  <ReviewSection
                    index={3}
                    icon={Wrench}
                    title="Habilidades"
                    description="Marca qué tanto dominas cada una: 1 es que apenas la conoces y 4 que puedes enseñarla."
                    count={skills.length}
                  >
                    {skills.length === 0 ? (
                      <EmptyState
                        icon={Wrench}
                        title="Sin habilidades registradas"
                        description="Las herramientas, máquinas o sistemas que mencionaste aparecerán aquí."
                      />
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {skills.map((skill) => (
                          <li
                            key={skill.code}
                            className="group flex flex-wrap items-center gap-x-4 gap-y-3 rounded-md border border-transparent bg-surface-soft/70 px-4 py-3 transition-[background-color,border-color] duration-fast ease-standard hover:border-border hover:bg-surface-soft"
                          >
                            {/* En móvil el nombre ocupa su propia línea: truncarlo a
                                "OFFIC..." para dejar sitio a los niveles era ilegible. */}
                            <span className="min-w-0 basis-full truncate text-sm font-medium text-text-primary sm:flex-1 sm:basis-auto">
                              {skill.name}
                            </span>
                            <div
                              className="flex gap-1"
                              role="radiogroup"
                              aria-label={`Nivel de ${skill.name}`}
                            >
                              {([1, 2, 3, 4] as const).map((level) => (
                                <button
                                  key={level}
                                  type="button"
                                  role="radio"
                                  aria-checked={skill.level === level}
                                  onClick={() => setSkillLevel(skill.code, level)}
                                  className={cn(
                                    "flex size-8 items-center justify-center rounded-pill text-sm font-medium tabular-nums",
                                    "transition-[background-color,color,transform] duration-fast ease-standard active:scale-95",
                                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2",
                                    skill.level === level
                                      ? "bg-primary text-white shadow-sm"
                                      : "bg-surface text-text-secondary hover:bg-primary/10 hover:text-primary",
                                  )}
                                >
                                  {level}
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              aria-label={`Eliminar ${skill.name}`}
                              onClick={() => removeSkill(skill.code)}
                              className="flex size-8 items-center justify-center rounded-full text-text-tertiary transition-[background-color,color,opacity] duration-fast ease-standard hover:bg-danger-soft hover:text-danger focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </ReviewSection>
                </motion.div>

                <motion.div variants={cardEntrance}>
                  <ReviewSection
                    index={4}
                    icon={Award}
                    title="Certificaciones"
                    description="Cursos, licencias o constancias. Podrás subir el documento más adelante para que queden verificadas."
                    count={certifications.length}
                  >
                    {certifications.length > 0 && (
                      <ul className="flex flex-col gap-2">
                        {certifications.map((cert, index) => (
                          <li key={`${cert.name}-${index}`}>
                            <EditableRow
                              deleteLabel={`Eliminar ${cert.name}`}
                              onDelete={() => removeCertification(index)}
                            >
                              <p className="text-pretty text-sm font-medium text-text-primary">
                                {cert.name}
                              </p>
                              {cert.issuer && (
                                <p className="mt-1 text-sm text-text-secondary">{cert.issuer}</p>
                              )}
                            </EditableRow>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="rounded-md border border-dashed border-border bg-surface-soft/40 p-4">
                      {/* `basis-full` en móvil: con `flex-1 min-w-0` los tres
                          controles se comprimían en una sola fila ilegible a 390px. */}
                      <div className="flex flex-wrap items-end gap-3">
                        <label className="flex min-w-0 basis-full flex-col gap-1.5 sm:flex-1 sm:basis-0">
                          <span className="text-xs font-medium text-text-secondary">
                            Nombre de la certificación
                          </span>
                          <Input
                            value={newCert.name}
                            placeholder="Ej. Licencia de manejo tipo B"
                            onChange={(event) => setNewCert((v) => ({ ...v, name: event.target.value }))}
                          />
                        </label>
                        <label className="flex min-w-0 basis-full flex-col gap-1.5 sm:flex-1 sm:basis-0">
                          <span className="text-xs font-medium text-text-secondary">
                            Institución (opcional)
                          </span>
                          <Input
                            value={newCert.issuer}
                            placeholder="Ej. SCT"
                            onChange={(event) =>
                              setNewCert((v) => ({ ...v, issuer: event.target.value }))
                            }
                          />
                        </label>
                        <Button
                          variant="secondary"
                          onClick={addCertification}
                          disabled={newCert.name.trim() === ""}
                          className="max-sm:w-full"
                        >
                          Agregar
                        </Button>
                      </div>
                    </div>
                  </ReviewSection>
                </motion.div>

                {pendingClaims.length > 0 && (
                  <motion.div variants={cardEntrance}>
                    <ReviewSection
                      index={5}
                      icon={Sparkles}
                      title="Por confirmar en tu entrevista"
                      description="No lo damos por hecho: son cosas que mencionaste y que exploraremos contigo en la conversación."
                      count={pendingClaims.length}
                    >
                      <ul className="flex flex-col gap-2">
                        {pendingClaims.map((claim) => (
                          <li
                            key={claim.id}
                            className="flex flex-col gap-3 rounded-md border border-dashed border-border bg-surface-soft/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <p className="min-w-0 flex-1 text-pretty text-sm text-text-secondary">
                              {claim.statement}
                            </p>
                            <div className="flex shrink-0 items-center gap-2">
                              <EvidenceBadge level="pending" size="sm" />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </ReviewSection>
                  </motion.div>
                )}
              </motion.div>
            </LightSurface>
          </motion.div>
        )}
      </main>

      {extraction && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-dark bg-bg-dark/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
          <div className="mx-auto flex max-w-[760px] flex-wrap items-center justify-between gap-3 px-6 py-4">
            <p className="hidden max-w-[38ch] text-sm text-text-on-dark-secondary sm:block">
              Podrás editar tu perfil cuando quieras, también después de la entrevista.
            </p>
            <Button
              size="lg"
              arrow
              loading={confirmExtraction.isPending}
              onClick={handleConfirm}
              className="max-sm:w-full"
            >
              Confirmar y continuar
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={experienceModal != null}
        onClose={() => setExperienceModal(null)}
        title="Experiencia"
      >
        {experienceModal && (
          <ExperienceForm
            item={experienceModal}
            onCancel={() => setExperienceModal(null)}
            onSave={saveExperience}
          />
        )}
      </Modal>

      <Modal open={educationModal != null} onClose={() => setEducationModal(null)} title="Estudios">
        {educationModal && (
          <EducationForm item={educationModal} onCancel={() => setEducationModal(null)} onSave={saveEducation} />
        )}
      </Modal>
    </ImmersiveLayout>
  );
}

function ExperienceForm({
  item,
  onSave,
  onCancel,
}: {
  item: ExperienceItem;
  onSave: (item: ExperienceItem) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(item);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(value);
      }}
      className="flex flex-col gap-4"
    >
      <FormField label="Puesto" htmlFor="exp-position" hint="Cómo se llamaba tu puesto, en pocas palabras.">
        <Input
          value={value.position}
          placeholder="Ej. Auxiliar administrativo"
          onChange={(event) => setValue((v) => ({ ...v, position: event.target.value }))}
        />
      </FormField>
      <FormField label="Empresa" htmlFor="exp-company">
        <Input
          value={isMissing(value.company) ? "" : value.company}
          placeholder="Ej. Distribuidora del Bajío"
          onChange={(event) => setValue((v) => ({ ...v, company: event.target.value }))}
        />
      </FormField>
      <FormField
        label="Descripción"
        htmlFor="exp-description"
        hint="Qué hacías día a día. Con dos o tres frases basta."
      >
        <Textarea
          autoResize
          value={value.description}
          onChange={(event) => setValue((v) => ({ ...v, description: event.target.value }))}
        />
      </FormField>
      <Switch
        checked={value.is_current}
        onCheckedChange={(checked) => setValue((v) => ({ ...v, is_current: checked }))}
        label="Es mi trabajo actual"
      />
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Guardar</Button>
      </div>
    </form>
  );
}

function EducationForm({
  item,
  onSave,
  onCancel,
}: {
  item: EducationItem;
  onSave: (item: EducationItem) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(item);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(value);
      }}
      className="flex flex-col gap-4"
    >
      <FormField
        label="Grado / título"
        htmlFor="edu-degree"
        hint="Ej. Licenciatura en Administración, Bachillerato, Curso de manejo de montacargas."
      >
        <Input
          value={value.degree}
          onChange={(event) => setValue((v) => ({ ...v, degree: event.target.value }))}
        />
      </FormField>
      <FormField label="Institución" htmlFor="edu-institution">
        <Input
          value={isMissing(value.institution) ? "" : value.institution}
          placeholder="Ej. Universidad de Guanajuato"
          onChange={(event) => setValue((v) => ({ ...v, institution: event.target.value }))}
        />
      </FormField>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Guardar</Button>
      </div>
    </form>
  );
}

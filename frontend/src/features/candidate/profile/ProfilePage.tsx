import type { ReactNode } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { AlertCircle, Download, ExternalLink, MapPin, Pencil, Sparkles } from "lucide-react";
import {
  AIInsightCard,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  EvidenceBadge,
  ProgressBar,
  ProgressRing,
  ScoreBadge,
  Skeleton,
  SkeletonCard,
  SkillChip,
  Tabs,
  evidenceDescriptions,
  type TabItem,
} from "@/components/ui";
import type { EvidenceLevel } from "@/components/ui";
import { LightSurface, PageContainer } from "@/components/layout";
import { BrandBackground } from "@/components/brand/BrandBackground";
import {
  useCandidateMe,
  useCandidateSkills,
  useJobFamilies,
  useLearningPath,
  useTalentProfile,
} from "@/api/hooks";
import { ApiClientError } from "@/api/client";
import type {
  CandidateProfile,
  CandidateSkill,
  CompetencyEvaluation,
  EducationItem,
  ExperienceItem,
  LearningPath,
  TalentProfile,
} from "@/api/types";
import { useMotionSafe } from "@/lib/motion";
import { formatDate } from "@/lib/format";
import { availabilityLabels, confidenceLabel, evidenceLevelForSkill } from "./profile.utils";
import { CertificationUploader } from "./CertificationUploader";

/** C11 — Perfil de Talento Verificado `/candidate/profile`. */
export function Component() {
  const me = useCandidateMe();
  const talent = useTalentProfile();
  const jobFamilies = useJobFamilies();
  const isEvaluated = talent.isSuccess;
  const skills = useCandidateSkills(isEvaluated);
  const learningPath = useLearningPath(isEvaluated);

  if (me.isLoading) return <ProfileSkeleton />;
  if (me.isError || !me.data) {
    return <PageLevelError onRetry={() => void me.refetch()} />;
  }

  const profile = me.data;
  const familyName = jobFamilies.data?.find((f) => f.id === profile.job_family_id)?.name ?? null;
  const notEvaluated =
    talent.isError && talent.error instanceof ApiClientError && talent.error.code === "NOT_EVALUATED";

  return (
    <div>
      <ProfileHero profile={profile} familyName={familyName} showInterviewBadge={isEvaluated} />
      {talent.isLoading ? (
        <BodySkeleton />
      ) : isEvaluated && talent.data ? (
        <EvaluatedBody
          profile={profile}
          talentProfile={talent.data}
          skills={skills.data}
          skillsLoading={skills.isLoading}
          learningPath={learningPath.data}
          learningPathLoading={learningPath.isLoading}
        />
      ) : notEvaluated ? (
        <ConstructionBody />
      ) : (
        <TalentError onRetry={() => void talent.refetch()} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero (idéntico en ambas variantes; el badge de entrevista solo aparece cuando
// ya existe un Perfil de Talento Verificado).
// ---------------------------------------------------------------------------

function ProfileHero({
  profile,
  familyName,
  showInterviewBadge,
}: {
  profile: CandidateProfile;
  familyName: string | null;
  showInterviewBadge: boolean;
}) {
  const navigate = useNavigate();
  const { fadeUp, staggerContainer } = useMotionSafe();

  return (
    <div className="relative overflow-hidden bg-bg-dark px-6 pb-20 pt-10 md:px-8 md:pt-14">
      <BrandBackground asset="profile" presence="support" overlay="left" ambient />
      <PageContainer className="relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer(0.08, 0.05)}
          className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between"
        >
          <motion.div variants={fadeUp} className="flex items-start gap-4">
            <Avatar name={profile.full_name} src={profile.photo_url ?? undefined} size="lg" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-accent-soft">
                Perfil verificado
              </p>
              <h1 className="mt-1 text-3xl font-semibold text-text-on-dark sm:text-4xl">
                Tu talento habla por ti.
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-text-on-dark-secondary">
                <span className="font-medium text-text-on-dark">{profile.full_name}</span>
                {familyName && <span>· {familyName}</span>}
                {profile.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    {profile.location.city}, {profile.location.state}
                  </span>
                )}
                {profile.availability && <span>· {availabilityLabels[profile.availability]}</span>}
              </div>
              {showInterviewBadge && (
                <div className="mt-3">
                  <Badge tone="success">Entrevista con IA completada</Badge>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-lg border border-border-dark bg-white/5 px-4 py-2">
              <ProgressRing value={profile.completion_percent} size={52} stroke={5} tone="dark" />
              <span className="text-sm text-text-on-dark-secondary">Perfil completo</span>
            </div>
            <Button variant="secondary" size="md" onClick={() => navigate("/candidate/profile/edit")}>
              <Pencil className="size-4" aria-hidden="true" />
              Editar perfil
            </Button>
            <Button variant="secondary" size="md" href="/demo/cv-ejemplo.pdf" target="_blank" rel="noopener noreferrer">
              <Download className="size-4" aria-hidden="true" />
              Descargar CV
            </Button>
          </motion.div>
        </motion.div>
      </PageContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variante evaluada
// ---------------------------------------------------------------------------

function EvaluatedBody({
  profile,
  talentProfile,
  skills,
  skillsLoading,
  learningPath,
  learningPathLoading,
}: {
  profile: CandidateProfile;
  talentProfile: TalentProfile;
  skills: CandidateSkill[] | undefined;
  skillsLoading: boolean;
  learningPath: LearningPath | undefined;
  learningPathLoading: boolean;
}) {
  const { fadeUp } = useMotionSafe();
  const navigate = useNavigate();

  const tabs: TabItem[] = [
    {
      value: "about",
      label: "Sobre mí",
      content: <AboutSection profile={profile} talentProfile={talentProfile} onEdit={() => navigate("/candidate/profile/edit")} />,
    },
    {
      value: "skills",
      label: "Habilidades",
      content: <SkillsSection skills={skills} loading={skillsLoading} />,
    },
    {
      value: "evidence",
      label: "Evidencias",
      content: <EvidenceSection evaluations={talentProfile.evaluations} />,
    },
    {
      value: "experience",
      label: "Experiencia",
      content: <ExperienceSection items={profile.experience} />,
    },
    {
      value: "education",
      label: "Estudios",
      content: <EducationSection items={profile.education} />,
    },
    {
      value: "certifications",
      label: "Certificaciones",
      content: <CertificationUploader />,
    },
    {
      value: "learning",
      label: "Ruta de desarrollo",
      content: <LearningPathSection learningPath={learningPath} loading={learningPathLoading} />,
    },
  ];

  return (
    <LightSurface>
      <PageContainer>
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>
          <Tabs items={tabs} aria-label="Secciones del perfil" />
        </motion.div>
      </PageContainer>
    </LightSurface>
  );
}

function SectionCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <Card padding="lg" className="flex flex-col gap-4">
      {title && <h3 className="text-lg font-semibold text-text-primary">{title}</h3>}
      {children}
    </Card>
  );
}

function AboutSection({
  profile,
  talentProfile,
  onEdit,
}: {
  profile: CandidateProfile;
  talentProfile: TalentProfile;
  onEdit: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <SectionCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ScoreBadge score={talentProfile.overall_score} label={talentProfile.overall_label} />
          <Button variant="ghost" size="md" onClick={onEdit}>
            <Pencil className="size-4" aria-hidden="true" />
            Editar biografía
          </Button>
        </div>
        {profile.bio ? (
          <p className="text-base text-text-primary">{profile.bio}</p>
        ) : talentProfile.summary_text ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-text-tertiary">
              Resumen generado por IA
            </p>
            <p className="mt-1 text-base text-text-primary">{talentProfile.summary_text}</p>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">
            Aún no agregaste una biografía. Cuéntales a las empresas quién eres en un par de líneas.
          </p>
        )}
      </SectionCard>
      {talentProfile.strengths.length > 0 && (
        <AIInsightCard
          title="Fortaleza principal"
          why={talentProfile.strengths.slice(0, 3)}
          missing={talentProfile.evidence_gaps.slice(0, 2)}
        />
      )}
    </div>
  );
}

function EvidenceLegend() {
  const levels: EvidenceLevel[] = ["declared", "evaluated", "verified"];
  return (
    <div className="flex flex-wrap gap-4 rounded-lg border border-border bg-surface-soft/60 p-4">
      {levels.map((level) => (
        <div key={level} className="flex items-center gap-2 text-sm text-text-secondary">
          <EvidenceBadge level={level} size="sm" />
          <span>{evidenceDescriptions[level]}</span>
        </div>
      ))}
    </div>
  );
}

function SkillsSection({ skills, loading }: { skills: CandidateSkill[] | undefined; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-32 rounded-pill" />
        ))}
      </div>
    );
  }
  if (!skills || skills.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Aún no hay habilidades registradas"
        description="Tus habilidades aparecerán aquí conforme confirmes tu CV y avances en la entrevista."
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <EvidenceLegend />
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <SkillChip
            key={skill.skill_code}
            name={skill.skill_name}
            evidence={evidenceLevelForSkill(skill)}
          />
        ))}
      </div>
    </div>
  );
}

function EvidenceSection({ evaluations }: { evaluations: CompetencyEvaluation[] }) {
  if (evaluations.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Aún no hay evidencia registrada"
        description="Las evidencias de tu entrevista aparecerán aquí."
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {evaluations.map((evaluation, index) => (
        <SectionCard key={evaluation.competency_code}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-medium text-text-primary">{evaluation.competency_name}</h4>
            {evaluation.rubric_source === "PROVISIONAL" && <Badge tone="warning">Rúbrica provisional</Badge>}
          </div>
          <ProgressBar value={evaluation.score} showValue delay={index * 80} />
          <p className="text-sm text-text-secondary">
            {confidenceLabel(evaluation.confidence)} · {evaluation.justification}
          </p>
          {evaluation.limitations && (
            <p className="text-xs text-text-tertiary">{evaluation.limitations}</p>
          )}
        </SectionCard>
      ))}
    </div>
  );
}

function ExperienceSection({ items }: { items: ExperienceItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Aún no hay experiencia registrada"
        description="Sube o construye tu CV para agregar tu experiencia laboral."
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <SectionCard key={item.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-medium text-text-primary">{item.position}</h4>
            {item.is_current && <Badge tone="info">Actual</Badge>}
          </div>
          <p className="text-sm text-text-secondary">{item.company}</p>
          <p className="text-xs text-text-tertiary">
            {formatDate(item.start_date)} — {item.end_date ? formatDate(item.end_date) : "Actualidad"}
          </p>
          {item.description && <p className="text-sm text-text-primary">{item.description}</p>}
        </SectionCard>
      ))}
    </div>
  );
}

function EducationSection({ items }: { items: EducationItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Aún no hay estudios registrados"
        description="Sube o construye tu CV para agregar tu formación académica."
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <SectionCard key={item.id}>
          <h4 className="font-medium text-text-primary">{item.degree}</h4>
          {item.institution && <p className="text-sm text-text-secondary">{item.institution}</p>}
          {/* Sin años declarados no se muestra el renglón: antes se rellenaba
              con años inventados por el CV conversacional. */}
          {item.start_year != null && (
            <p className="text-xs text-text-tertiary">
              {item.start_year} — {item.end_year ?? "actualidad"}
            </p>
          )}
        </SectionCard>
      ))}
    </div>
  );
}

function LearningPathSection({
  learningPath,
  loading,
}: {
  learningPath: LearningPath | undefined;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <SkeletonCard /> <SkeletonCard />
      </div>
    );
  }
  const gaps = learningPath?.gaps.slice(0, 3) ?? [];
  if (gaps.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No detectamos brechas relevantes por ahora"
        description="Buen trabajo: tu evidencia actual cubre bien las competencias evaluadas."
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {gaps.map((gap) => (
        <SectionCard key={gap.competency_code} title={gap.competency_name}>
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Badge tone="neutral">Nivel actual {gap.current_level}</Badge>
            <Badge tone="info">Meta {gap.target_level}</Badge>
          </div>
          <p className="text-sm text-text-secondary">{gap.why_it_matters}</p>
          {gap.recommendations.length > 0 && (
            <ul className="flex flex-col gap-2">
              {gap.recommendations.map((rec) => (
                <li
                  key={`${rec.provider}-${rec.title}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-soft/60 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text-primary">{rec.title}</p>
                    <p className="text-xs text-text-secondary">
                      {rec.provider} · {rec.estimated_effort}
                    </p>
                  </div>
                  {rec.url && (
                    <a
                      href={rec.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Ver <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variante "en construcción" (candidate.talentProfile → 404 NOT_EVALUATED)
// ---------------------------------------------------------------------------

function ConstructionBody() {
  const navigate = useNavigate();
  const { fadeUp } = useMotionSafe();
  return (
    <LightSurface>
      <PageContainer>
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>
          <Card padding="lg" className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="size-6" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Tu perfil se está construyendo</h2>
                <p className="mt-1 max-w-xl text-sm text-text-secondary">
                  Aún no generamos tu Perfil de Talento Verificado. Completa tu entrevista con IA para que la
                  evidencia de tus respuestas alimente tu perfil.
                </p>
              </div>
            </div>
            <Button arrow onClick={() => navigate("/candidate/interview/prepare")} className="shrink-0">
              Continuar a mi entrevista
            </Button>
          </Card>
        </motion.div>
      </PageContainer>
    </LightSurface>
  );
}

// ---------------------------------------------------------------------------
// Loading / error
// ---------------------------------------------------------------------------

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-8 p-6 md:p-8">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-7 w-1/2" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

function BodySkeleton() {
  return (
    <LightSurface>
      <PageContainer className="grid gap-4 sm:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </PageContainer>
    </LightSurface>
  );
}

function PageLevelError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <EmptyState
        icon={AlertCircle}
        title="No pudimos cargar tu perfil"
        description="Revisa tu conexión e inténtalo de nuevo."
        cta={{ label: "Reintentar", onClick: onRetry }}
      />
    </div>
  );
}

function TalentError({ onRetry }: { onRetry: () => void }) {
  return (
    <LightSurface>
      <PageContainer>
        <EmptyState
          icon={AlertCircle}
          title="No pudimos cargar tu evidencia"
          description="Ocurrió un problema al generar tu Perfil de Talento Verificado. Intenta de nuevo."
          cta={{ label: "Reintentar", onClick: onRetry }}
        />
      </PageContainer>
    </LightSurface>
  );
}

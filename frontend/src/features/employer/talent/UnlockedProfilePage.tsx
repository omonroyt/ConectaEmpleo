import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { motion } from "motion/react";
import {
  AlertCircle,
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  Copy,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { ApiClientError } from "@/api/client";
import { useFullProfile } from "@/api/hooks";
import { BrandBackground } from "@/components/brand/BrandBackground";
import { LightSurface, PageContainer } from "@/components/layout";
import {
  AIInsightCard,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  SectionHeader,
  SkeletonCard,
  useToast,
} from "@/components/ui";
import { useReducedMotion } from "@/lib/a11y";
import { durations, easings } from "@/lib/motion";
import { formatDate } from "@/lib/format";
import { CandidateEvidenceSections } from "./components/CandidateEvidenceSections";
import { MatchScoreCard } from "./components/MatchScoreCard";
import { AI_SUPPORT_NOTICE, anonDisplayCode, jobFamilyLabels } from "./talentLabels";

/** E12 — Perfil desbloqueado `/employer/candidates/:matchResultId/full` (04 §E12). */
export function Component() {
  const { matchResultId } = useParams<{ matchResultId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const reduced = useReducedMotion();

  const profileQuery = useFullProfile(matchResultId);
  const profile = profileQuery.data;

  const [copied, setCopied] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  // El contrato no expone la fecha del desbloqueo: se sella al abrir la pantalla.
  const unlockedAt = useMemo(() => new Date().toISOString(), []);

  // 403 UNLOCK_REQUIRED → volver al detalle anónimo con aviso.
  const error = profileQuery.error;
  useEffect(() => {
    if (!(error instanceof ApiClientError) || error.code !== "UNLOCK_REQUIRED") return;
    showToast({
      title: "Necesitas desbloquear la identidad",
      description: "Confirma el desbloqueo desde el perfil anónimo para ver estos datos.",
      tone: "warning",
    });
    navigate(`/employer/candidates/${matchResultId}`, { replace: true });
  }, [error, matchResultId, navigate, showToast]);

  const copyEmail = useCallback(async () => {
    if (!profile) return;
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast({
        title: "No pudimos copiar el correo",
        description: "Selecciónalo y cópialo manualmente.",
        tone: "danger",
      });
    }
  }, [profile, showToast]);

  if (profileQuery.isLoading) {
    return (
      <PageContainer className="flex flex-col gap-4 py-10">
        <SkeletonCard />
        <SkeletonCard />
      </PageContainer>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <PageContainer className="py-16">
        <EmptyState
          icon={AlertCircle}
          title="No pudimos cargar el perfil completo"
          description="Vuelve al perfil anónimo e inténtalo de nuevo."
          cta={{
            label: "Volver al perfil anónimo",
            onClick: () => navigate(`/employer/candidates/${matchResultId}`),
          }}
        />
      </PageContainer>
    );
  }

  const inviteTemplate = `Hola ${profile.full_name.split(" ")[0] ?? ""}:

Revisamos tu Perfil de Talento Verificado en Conecta Empleo y nos gustaría conversar contigo sobre una vacante en nuestro equipo.

¿Tendrías disponibilidad esta semana para una entrevista presencial de 30 minutos?

Quedamos atentos,
Equipo de reclutamiento`;

  return (
    <div className="min-h-full bg-bg-light">
      <header className="relative overflow-hidden bg-bg-dark pb-20 pt-8">
        <BrandBackground asset="profile" presence="support" overlay="left" />
        <PageContainer className="relative z-10">
          <Button
            variant="ghost"
            size="md"
            onClick={() => navigate(`/employer/candidates/${matchResultId}`)}
            className="-ml-4 text-text-on-dark"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Ver perfil anónimo
          </Button>

          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
            {/* Transición de desbloqueo: borroso → nítido. */}
            <motion.div
              initial={reduced ? { opacity: 1 } : { filter: "blur(14px)", scale: 0.94, opacity: 0.4 }}
              animate={{ filter: "blur(0px)", scale: 1, opacity: 1 }}
              transition={
                reduced ? { duration: 0 } : { duration: durations.slow, ease: easings.outSmooth }
              }
            >
              <Avatar name={profile.full_name} src={profile.photo_url ?? undefined} size="lg" />
            </motion.div>

            <motion.div
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={
                reduced
                  ? { duration: 0.15 }
                  : { duration: durations.slow, ease: easings.outSmooth, delay: 0.25 }
              }
            >
              <Badge tone="success">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                Identidad desbloqueada · {formatDate(unlockedAt)}
              </Badge>
              <h1 className="mt-2 text-3xl font-semibold text-text-on-dark sm:text-4xl">
                {profile.full_name}
              </h1>
              <p className="mt-1 text-sm text-text-on-dark-secondary">
                {jobFamilyLabels[profile.job_family_code]} ·{" "}
                {anonDisplayCode(profile.anon_code)} · posición #{profile.rank_position} del ranking
              </p>
            </motion.div>
          </div>
        </PageContainer>
      </header>

      <LightSurface>
        <PageContainer className="flex flex-col gap-12">
          {/* Contacto */}
          <Card padding="lg" className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-text-tertiary">
                  <Mail className="size-3.5" aria-hidden="true" />
                  Correo
                </dt>
                <dd className="mt-1 break-all text-sm font-medium text-text-primary">
                  {profile.email}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-text-tertiary">
                  <Phone className="size-3.5" aria-hidden="true" />
                  Teléfono
                </dt>
                <dd className="mt-1 text-sm font-medium text-text-primary">
                  {profile.phone ?? "No proporcionado"}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-text-tertiary">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  Ubicación
                </dt>
                <dd className="mt-1 text-sm font-medium text-text-primary">
                  {[profile.location.city, profile.location.state].filter(Boolean).join(", ") ||
                    "No especificada"}
                </dd>
              </div>
            </dl>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="secondary" size="md" onClick={() => void copyEmail()}>
                {copied ? (
                  <Check className="size-4 text-success" aria-hidden="true" />
                ) : (
                  <Copy className="size-4" aria-hidden="true" />
                )}
                {copied ? "Correo copiado" : "Copiar correo"}
              </Button>
              <Button variant="primary" size="md" onClick={() => setInviteOpen(true)}>
                Invitar a entrevista
              </Button>
            </div>
          </Card>

          {/* Score, desglose y explicación (mismo bloque que E9) */}
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
            <MatchScoreCard card={profile} />
            <div className="flex flex-col gap-4">
              <AIInsightCard
                title="Por qué es compatible"
                body={profile.explanation_text ?? undefined}
                why={profile.strengths}
                missing={profile.gaps}
                loading={profile.explanation_text == null}
              />
              {profile.company_note && (
                <AIInsightCard
                  title="Qué convendría verificar en una entrevista presencial"
                  body={profile.company_note}
                  why={[]}
                  missing={[]}
                />
              )}
              <p className="text-sm text-text-tertiary">{AI_SUPPORT_NOTICE}</p>
            </div>
          </div>

          {/* Evidencia (mismo bloque que E9) */}
          <CandidateEvidenceSections card={profile} />

          {/* Experiencia */}
          <section>
            <SectionHeader title="Experiencia" />
            {profile.experience.length === 0 ? (
              <p className="mt-4 text-sm text-text-secondary">Sin experiencia registrada.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {profile.experience.map((item) => (
                  <li key={item.id}>
                    <Card padding="md" className="flex gap-3">
                      <BriefcaseBusiness
                        className="mt-0.5 size-5 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {item.position} · {item.company}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          {formatDate(item.start_date)} —{" "}
                          {item.is_current || !item.end_date ? "Actualidad" : formatDate(item.end_date)}
                        </p>
                        {item.description && (
                          <p className="mt-1.5 text-sm text-text-secondary">{item.description}</p>
                        )}
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Estudios */}
          <section>
            <SectionHeader title="Estudios" />
            {profile.education.length === 0 ? (
              <p className="mt-4 text-sm text-text-secondary">Sin estudios registrados.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {profile.education.map((item) => (
                  <li key={item.id}>
                    <Card padding="md" className="flex gap-3">
                      <GraduationCap
                        className="mt-0.5 size-5 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-sm font-medium text-text-primary">{item.degree}</p>
                        {(item.institution || item.start_year != null) && (
                          <p className="text-xs text-text-tertiary">
                            {[
                              item.institution || null,
                              item.start_year != null
                                ? `${item.start_year}–${item.end_year ?? "en curso"}`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Documentos */}
          <section>
            <SectionHeader
              title="Documentos"
              description="Archivos que la persona subió a su perfil verificado."
            />
            {profile.documents.length === 0 ? (
              <p className="mt-4 text-sm text-text-secondary">Sin documentos cargados.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {profile.documents.map((doc) => (
                  <li key={doc.id}>
                    <Card padding="md" className="flex items-center gap-3">
                      <FileText className="size-5 shrink-0 text-primary" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {doc.original_filename}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          {doc.type} · subido el {formatDate(doc.uploaded_at)}
                        </p>
                      </div>
                      {doc.url ? (
                        <Button variant="ghost" size="md" href={doc.url}>
                          Abrir
                        </Button>
                      ) : (
                        <Badge tone="neutral">Sin vista previa</Badge>
                      )}
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </PageContainer>
      </LightSurface>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invitar a entrevista">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            Esta es una plantilla sugerida. En esta versión de la demo el mensaje no se envía: cópialo
            y mándalo por tu canal habitual.
          </p>
          <pre className="whitespace-pre-wrap rounded-md bg-surface-soft p-4 text-sm text-text-primary">
            {inviteTemplate}
          </pre>
          <div className="flex justify-end">
            <Button variant="secondary" size="md" onClick={() => setInviteOpen(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

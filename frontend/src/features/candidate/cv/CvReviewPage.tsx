import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import { ImmersiveLayout, LightSurface } from "@/components/layout";
import {
  Button,
  Card,
  EvidenceBadge,
  FormField,
  Input,
  Modal,
  PageHeader,
  SectionHeader,
  Skeleton,
  Textarea,
  useToast,
} from "@/components/ui";
import { useConfirmExtraction, useExtraction } from "@/api/hooks";
import { useMotionSafe } from "@/lib/motion";
import type {
  Claim,
  CVExtraction,
  EducationItem,
  ExperienceItem,
} from "@/api/types";

type SkillDraft = CVExtraction["skills"][number];
type CertificationDraft = CVExtraction["certifications"][number];

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return "alta";
  if (confidence >= 0.5) return "media";
  return "baja";
}

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

  return (
    <ImmersiveLayout onClose={() => navigate("/candidate")}>
      <div className="pb-24">
        {isLoading ? (
          <div className="flex flex-col gap-4 pt-6">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : isError || !extraction ? (
          <Card padding="lg" className="mt-6 flex flex-col items-start gap-3">
            <p className="text-sm text-text-secondary">No pudimos cargar tu información.</p>
            <Button variant="secondary" onClick={() => refetch()}>
              Reintentar
            </Button>
          </Card>
        ) : (
          <motion.div initial="hidden" animate="visible" variants={pageSequence} className="flex flex-col gap-8 pt-4">
            <motion.div variants={fadeUp}>
              <PageHeader
                eyebrow="REVISA TU INFORMACIÓN"
                title="Así entendimos tu experiencia"
                subtitle={`Extracción con confianza ${confidenceLabel(extraction.confidence)}. Ajusta lo que haga falta antes de continuar.`}
                className="text-text-on-dark [&_h1]:text-text-on-dark [&_p]:text-text-on-dark-secondary"
              />
            </motion.div>

            <LightSurface className="px-1 pb-0 pt-6 sm:px-1">
              <motion.div variants={staggerContainer(0.08, 0.05)} className="flex flex-col gap-8 px-5 sm:px-6">
                {/* Experiencia */}
                <motion.section variants={cardEntrance} className="flex flex-col gap-3">
                  <SectionHeader
                    title="Experiencia"
                    actions={
                      <Button variant="ghost" size="md" onClick={() => setExperienceModal(emptyExperience())}>
                        <Plus className="mr-1 size-4" aria-hidden="true" /> Agregar
                      </Button>
                    }
                  />
                  <div className="flex flex-col gap-3">
                    {experience.length === 0 && (
                      <p className="text-sm text-text-secondary">Aún no tienes experiencia registrada.</p>
                    )}
                    {experience.map((item) => (
                      <Card key={item.id} padding="md" className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium text-text-primary">{item.position || "Puesto sin nombre"}</p>
                          <p className="text-sm text-text-secondary">
                            {item.company || "Empresa por confirmar"}
                            {item.is_current ? " · Actual" : ""}
                          </p>
                          {item.description && (
                            <p className="mt-1 text-sm text-text-tertiary">{item.description}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            aria-label="Editar experiencia"
                            onClick={() => setExperienceModal(item)}
                            className="flex size-9 items-center justify-center rounded-full text-text-tertiary hover:bg-surface-soft hover:text-text-primary"
                          >
                            <Pencil className="size-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            aria-label="Eliminar experiencia"
                            onClick={() => setExperience((current) => current.filter((e) => e.id !== item.id))}
                            className="flex size-9 items-center justify-center rounded-full text-text-tertiary hover:bg-danger-soft hover:text-danger"
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </motion.section>

                {/* Estudios */}
                <motion.section variants={cardEntrance} className="flex flex-col gap-3">
                  <SectionHeader
                    title="Estudios"
                    actions={
                      <Button variant="ghost" size="md" onClick={() => setEducationModal(emptyEducation())}>
                        <Plus className="mr-1 size-4" aria-hidden="true" /> Agregar
                      </Button>
                    }
                  />
                  <div className="flex flex-col gap-3">
                    {education.length === 0 && (
                      <p className="text-sm text-text-secondary">Aún no tienes estudios registrados.</p>
                    )}
                    {education.map((item) => (
                      <Card key={item.id} padding="md" className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <GraduationCap className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                          <div>
                            <p className="font-medium text-text-primary">{item.degree || "Grado sin especificar"}</p>
                            <p className="text-sm text-text-secondary">{item.institution || "Institución por confirmar"}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            aria-label="Editar estudio"
                            onClick={() => setEducationModal(item)}
                            className="flex size-9 items-center justify-center rounded-full text-text-tertiary hover:bg-surface-soft hover:text-text-primary"
                          >
                            <Pencil className="size-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            aria-label="Eliminar estudio"
                            onClick={() => setEducation((current) => current.filter((e) => e.id !== item.id))}
                            className="flex size-9 items-center justify-center rounded-full text-text-tertiary hover:bg-danger-soft hover:text-danger"
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </motion.section>

                {/* Habilidades */}
                <motion.section variants={cardEntrance} className="flex flex-col gap-3">
                  <SectionHeader title="Habilidades" description="Toca un nivel del 1 al 4 para ajustarlo." />
                  <div className="flex flex-col gap-2">
                    {skills.length === 0 && (
                      <p className="text-sm text-text-secondary">Aún no tienes habilidades registradas.</p>
                    )}
                    {skills.map((skill) => (
                      <div
                        key={skill.code}
                        className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface px-4 py-3"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                          {skill.name}
                        </span>
                        <div className="flex gap-1" role="radiogroup" aria-label={`Nivel de ${skill.name}`}>
                          {([1, 2, 3, 4] as const).map((level) => (
                            <button
                              key={level}
                              type="button"
                              role="radio"
                              aria-checked={skill.level === level}
                              onClick={() => setSkillLevel(skill.code, level)}
                              className={
                                skill.level === level
                                  ? "flex size-8 items-center justify-center rounded-pill bg-primary text-sm font-medium text-white"
                                  : "flex size-8 items-center justify-center rounded-pill bg-surface-soft text-sm font-medium text-text-secondary hover:bg-primary/10"
                              }
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          aria-label={`Eliminar ${skill.name}`}
                          onClick={() => removeSkill(skill.code)}
                          className="flex size-8 items-center justify-center rounded-full text-text-tertiary hover:bg-danger-soft hover:text-danger"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.section>

                {/* Certificaciones */}
                <motion.section variants={cardEntrance} className="flex flex-col gap-3">
                  <SectionHeader title="Certificaciones" />
                  <div className="flex flex-col gap-2">
                    {certifications.map((cert, index) => (
                      <div
                        key={`${cert.name}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text-primary">{cert.name}</p>
                          {cert.issuer && <p className="text-sm text-text-secondary">{cert.issuer}</p>}
                        </div>
                        <button
                          type="button"
                          aria-label={`Eliminar ${cert.name}`}
                          onClick={() => removeCertification(index)}
                          className="flex size-8 shrink-0 items-center justify-center rounded-full text-text-tertiary hover:bg-danger-soft hover:text-danger"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <Input
                      placeholder="Nombre de la certificación"
                      value={newCert.name}
                      onChange={(event) => setNewCert((v) => ({ ...v, name: event.target.value }))}
                      className="max-w-xs"
                    />
                    <Input
                      placeholder="Institución (opcional)"
                      value={newCert.issuer}
                      onChange={(event) => setNewCert((v) => ({ ...v, issuer: event.target.value }))}
                      className="max-w-xs"
                    />
                    <Button variant="secondary" onClick={addCertification}>
                      Agregar
                    </Button>
                  </div>
                </motion.section>

                {/* Claims pendientes de validar */}
                {claims.some((claim) => claim.needs_validation) && (
                  <motion.section variants={cardEntrance} className="flex flex-col gap-3">
                    <SectionHeader title="Por confirmar en tu entrevista" />
                    <div className="flex flex-col gap-2">
                      {claims
                        .filter((claim) => claim.needs_validation)
                        .map((claim) => (
                          <div
                            key={claim.id}
                            className="flex items-start justify-between gap-3 rounded-md border border-dashed border-border bg-surface-soft/60 px-4 py-3"
                          >
                            <p className="min-w-0 flex-1 text-sm text-text-secondary">{claim.statement}</p>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <EvidenceBadge level="pending" size="sm" />
                              <span className="text-xs text-text-tertiary">Lo exploraremos en la entrevista</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </motion.section>
                )}
              </motion.div>
            </LightSurface>
          </motion.div>
        )}
      </div>

      {extraction && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-dark bg-bg-dark/95 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-[760px] items-center justify-end">
            <Button size="lg" arrow loading={confirmExtraction.isPending} onClick={handleConfirm}>
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
      <FormField label="Puesto" htmlFor="exp-position">
        <Input
          value={value.position}
          onChange={(event) => setValue((v) => ({ ...v, position: event.target.value }))}
        />
      </FormField>
      <FormField label="Empresa" htmlFor="exp-company">
        <Input value={value.company} onChange={(event) => setValue((v) => ({ ...v, company: event.target.value }))} />
      </FormField>
      <FormField label="Descripción" htmlFor="exp-description">
        <Textarea
          autoResize
          value={value.description}
          onChange={(event) => setValue((v) => ({ ...v, description: event.target.value }))}
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
      <FormField label="Grado / título" htmlFor="edu-degree">
        <Input value={value.degree} onChange={(event) => setValue((v) => ({ ...v, degree: event.target.value }))} />
      </FormField>
      <FormField label="Institución" htmlFor="edu-institution">
        <Input
          value={value.institution}
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

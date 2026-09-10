import { useEffect, useState } from "react";
import { z } from "zod";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { ClipboardList, FileText, HardHat, Sparkles, Warehouse } from "lucide-react";
import { BrandBackground } from "@/components/brand/BrandBackground";
import { ImmersiveLayout } from "@/components/layout";
import {
  Button,
  Card,
  Chip,
  Eyebrow,
  FormField,
  Input,
  ProgressSteps,
  Reveal,
  RevealGroup,
  Select,
  Skeleton,
  Slider,
  RadioCards,
  useToast,
} from "@/components/ui";
import { useCandidateMe, useJobFamilies, useSetJobFamily, useUpdateCandidate } from "@/api/hooks";
import { useMotionSafe } from "@/lib/motion";
import { formatMXN } from "@/lib/format";
import { fieldErrorsFrom } from "@/features/auth/auth.schemas";
import { MEXICO_STATES } from "@/features/candidate/onboarding/mexicoStates";
import type { Availability, JobFamilyCode } from "@/api/types";

const familyIconByCode: Record<JobFamilyCode, typeof ClipboardList> = {
  ADMIN_ASSISTANT: ClipboardList,
  HEAVY_MACHINERY_OPERATOR: HardHat,
  WAREHOUSE_SUPERVISOR: Warehouse,
};

const availabilityOptions: { value: Availability; label: string }[] = [
  { value: "IMMEDIATE", label: "Inmediata" },
  { value: "TWO_WEEKS", label: "2 semanas" },
  { value: "ONE_MONTH", label: "1 mes" },
];

const aboutSchema = z
  .object({
    fullName: z.string().min(2, "Escribe tu nombre completo."),
    phone: z.string().optional(),
    city: z.string().min(1, "Escribe tu ciudad."),
    state: z.string().min(1, "Elige tu estado."),
    availability: z.enum(["IMMEDIATE", "TWO_WEEKS", "ONE_MONTH"], {
      message: "Elige tu disponibilidad.",
    }),
    salaryMin: z.number().positive("Escribe una expectativa salarial válida."),
    salaryMax: z.number().positive("Escribe una expectativa salarial válida."),
  })
  .refine((data) => data.salaryMax >= data.salaryMin, {
    message: "El máximo debe ser mayor o igual al mínimo.",
    path: ["salaryMax"],
  });

type AboutValues = {
  fullName: string;
  phone: string;
  city: string;
  state: string;
  availability: Availability | null;
  salaryMin: number;
  salaryMax: number;
};

const TOTAL_STEPS = 3;

const STEP_NAMES: Record<1 | 2 | 3, string> = {
  1: "Tipo de puesto",
  2: "Sobre ti",
  3: "Tu perfil",
};

/** C3 — Onboarding candidato `/candidate/onboarding`, wizard de 3 pasos. */
export function Component() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { fadeUp, pageSequence, slideInRight, slideInLeft } = useMotionSafe();

  const { data: me } = useCandidateMe();
  const { data: families, isLoading: familiesLoading, isError: familiesError, refetch: refetchFamilies } =
    useJobFamilies();
  const setJobFamily = useSetJobFamily();
  const updateCandidate = useUpdateCandidate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [jobFamilyId, setJobFamilyId] = useState<string | null>(null);
  const [about, setAbout] = useState<AboutValues>({
    fullName: "",
    phone: "",
    city: "",
    state: "",
    availability: null,
    salaryMin: 10000,
    salaryMax: 18000,
  });
  const [aboutErrors, setAboutErrors] = useState<Record<string, string>>({});

  // Precarga con los datos ya guardados (persistencia entre recargas, mock).
  useEffect(() => {
    if (!me) return;
    setJobFamilyId((current) => current ?? me.job_family_id);
    setAbout((current) => ({
      fullName: current.fullName || me.full_name || "",
      phone: current.phone || me.phone || "",
      city: current.city || me.location?.city || "",
      state: current.state || me.location?.state || "",
      availability: current.availability ?? me.availability,
      salaryMin: me.salary_expectation_min ?? current.salaryMin,
      salaryMax: me.salary_expectation_max ?? current.salaryMax,
    }));
  }, [me]);

  const goTo = (next: 1 | 2 | 3) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const handleFamilyContinue = () => {
    if (!jobFamilyId) return;
    setJobFamily.mutate(jobFamilyId, {
      onSuccess: () => goTo(2),
      onError: () =>
        showToast({
          title: "No pudimos guardar tu elección",
          description: "Revisa tu conexión e inténtalo de nuevo.",
          tone: "danger",
        }),
    });
  };

  const handleAboutContinue = () => {
    const parsed = aboutSchema.safeParse(about);
    if (!parsed.success) {
      setAboutErrors(fieldErrorsFrom(parsed.error));
      return;
    }
    setAboutErrors({});
    updateCandidate.mutate(
      {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone || null,
        location: { city: parsed.data.city, state: parsed.data.state },
        availability: parsed.data.availability,
        salary_expectation_min: parsed.data.salaryMin,
        salary_expectation_max: parsed.data.salaryMax,
      },
      {
        onSuccess: () => {
          showToast({ title: "Guardado", tone: "success" });
          goTo(3);
        },
        onError: () =>
          showToast({
            title: "No pudimos guardar tus datos",
            description: "Revisa tu conexión e inténtalo de nuevo.",
            tone: "danger",
          }),
      },
    );
  };

  const stepVariants = direction === 1 ? slideInRight : slideInLeft;

  return (
    <ImmersiveLayout>
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 overflow-hidden rounded-b-[28px]">
          <BrandBackground asset="onboarding" presence="support" overlay="bottom" />
        </div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="pt-6">
          <ProgressSteps total={TOTAL_STEPS} current={step} stepName={STEP_NAMES[step]} />
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={stepVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="mt-8"
          >
            {step === 1 && (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={pageSequence}
                className="flex flex-col gap-8"
              >
                <motion.div variants={fadeUp} className="max-w-[46ch]">
                  <Eyebrow tone="dark">Antes de empezar</Eyebrow>
                  <h1 className="mt-3 text-balance text-3xl font-semibold leading-[1.08] tracking-[-0.03em] text-text-on-dark sm:text-4xl">
                    ¿Qué tipo de puesto buscas?
                  </h1>
                  <p className="mt-3 text-pretty text-sm leading-relaxed text-text-on-dark-secondary sm:text-base">
                    Usaremos esto para preparar tu entrevista y buscarte oportunidades relevantes.
                  </p>
                </motion.div>

                <motion.div variants={fadeUp}>
                  {familiesLoading ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Skeleton className="h-28 w-full skeleton-shimmer--dark" />
                      <Skeleton className="h-28 w-full skeleton-shimmer--dark" />
                      <Skeleton className="h-28 w-full skeleton-shimmer--dark" />
                    </div>
                  ) : familiesError ? (
                    <Card variant="glass" padding="md" className="flex flex-col items-start gap-3">
                      <p className="text-sm text-text-on-dark-secondary">
                        No pudimos cargar las opciones. Revisa tu conexión.
                      </p>
                      <Button variant="secondary" onClick={() => refetchFamilies()}>
                        Reintentar
                      </Button>
                    </Card>
                  ) : (
                    <RadioCards
                      name="job-family"
                      tone="dark"
                      columns={2}
                      value={jobFamilyId}
                      onChange={setJobFamilyId}
                      options={(families ?? []).map((family) => ({
                        value: family.id,
                        label: family.name,
                        description: family.role_objective,
                        icon: familyIconByCode[family.code],
                      }))}
                    />
                  )}
                </motion.div>

                <motion.div variants={fadeUp} className="flex justify-end">
                  <Button
                    size="lg"
                    arrow
                    disabled={!jobFamilyId}
                    loading={setJobFamily.isPending}
                    onClick={handleFamilyContinue}
                  >
                    Continuar
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={pageSequence}
                className="flex flex-col gap-8"
              >
                <motion.div variants={fadeUp} className="max-w-[46ch]">
                  <Eyebrow tone="dark">Sobre ti</Eyebrow>
                  <h1 className="mt-3 text-balance text-3xl font-semibold leading-[1.08] tracking-[-0.03em] text-text-on-dark sm:text-4xl">
                    Cuéntanos sobre ti.
                  </h1>
                  <p className="mt-3 text-pretty text-sm leading-relaxed text-text-on-dark-secondary sm:text-base">
                    Esta información nos ayuda a mostrarte oportunidades acordes a ti.
                  </p>
                </motion.div>

                <motion.div variants={fadeUp}>
                <Card variant="glass" padding="lg" className="flex flex-col gap-4">
                  <FormField label="Nombre completo" htmlFor="ob-name" error={aboutErrors.fullName}>
                    <Input
                      value={about.fullName}
                      onChange={(event) => setAbout((v) => ({ ...v, fullName: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Teléfono (opcional)" htmlFor="ob-phone">
                    <Input
                      type="tel"
                      value={about.phone}
                      onChange={(event) => setAbout((v) => ({ ...v, phone: event.target.value }))}
                    />
                  </FormField>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Ciudad" htmlFor="ob-city" error={aboutErrors.city}>
                      <Input
                        value={about.city}
                        onChange={(event) => setAbout((v) => ({ ...v, city: event.target.value }))}
                      />
                    </FormField>
                    <FormField label="Estado" htmlFor="ob-state" error={aboutErrors.state}>
                      <Select
                        placeholder="Elige un estado"
                        options={MEXICO_STATES}
                        value={about.state}
                        onChange={(event) => setAbout((v) => ({ ...v, state: event.target.value }))}
                      />
                    </FormField>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-text-on-dark">Disponibilidad</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {availabilityOptions.map((option) => (
                        <Chip
                          key={option.value}
                          selected={about.availability === option.value}
                          onClick={() => setAbout((v) => ({ ...v, availability: option.value }))}
                        >
                          {option.label}
                        </Chip>
                      ))}
                    </div>
                    {aboutErrors.availability && (
                      <p className="mt-1.5 text-sm text-danger-on-dark">{aboutErrors.availability}</p>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Slider
                      label="Expectativa salarial mínima"
                      min={6000}
                      max={80000}
                      step={500}
                      value={about.salaryMin}
                      valueFormatter={formatMXN}
                      onChange={(value) => setAbout((v) => ({ ...v, salaryMin: value }))}
                    />
                    <Slider
                      label="Expectativa salarial máxima"
                      min={6000}
                      max={80000}
                      step={500}
                      value={about.salaryMax}
                      valueFormatter={formatMXN}
                      onChange={(value) => setAbout((v) => ({ ...v, salaryMax: value }))}
                    />
                  </div>
                  {aboutErrors.salaryMax && (
                    <p className="text-sm text-danger-on-dark">{aboutErrors.salaryMax}</p>
                  )}
                </Card>
                </motion.div>

                <motion.div variants={fadeUp} className="flex items-center justify-between">
                  <Button variant="ghost" onClick={() => goTo(1)}>
                    Volver
                  </Button>
                  <Button size="lg" arrow loading={updateCandidate.isPending} onClick={handleAboutContinue}>
                    Continuar
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={pageSequence}
                className="flex flex-col gap-8"
              >
                <motion.div variants={fadeUp} className="max-w-[46ch]">
                  <Eyebrow tone="dark">Último paso</Eyebrow>
                  <h1 className="mt-3 text-balance text-3xl font-semibold leading-[1.08] tracking-[-0.03em] text-text-on-dark sm:text-4xl">
                    ¿Cómo quieres construir tu perfil?
                  </h1>
                  <p className="mt-3 text-pretty text-sm leading-relaxed text-text-on-dark-secondary sm:text-base">
                    Elige la forma que te resulte más cómoda; puedes ajustar todo después.
                  </p>
                </motion.div>

                <RevealGroup className="grid gap-4 sm:grid-cols-2">
                  <Reveal>
                    <Card
                      variant="glass"
                      spotlight
                      interactive
                      padding="lg"
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate("/candidate/cv/upload")}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") navigate("/candidate/cv/upload");
                      }}
                      className="flex h-full flex-col"
                    >
                      <span className="flex size-12 items-center justify-center rounded-md bg-gradient-cta text-white shadow-[0_6px_20px_-6px_rgba(74,69,255,.9)]">
                        <FileText className="size-5" aria-hidden="true" />
                      </span>
                      <h3 className="mt-5 text-lg font-semibold tracking-[-0.01em] text-text-on-dark">
                        Subir mi CV
                      </h3>
                      <p className="mt-2 text-pretty text-sm leading-relaxed text-text-on-dark-secondary">
                        Extraemos tu información con IA para ahorrarte tiempo.
                      </p>
                    </Card>
                  </Reveal>
                  <Reveal>
                    <Card
                      variant="glass"
                      spotlight
                      interactive
                      padding="lg"
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate("/candidate/cv/build")}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") navigate("/candidate/cv/build");
                      }}
                      className="flex h-full flex-col"
                    >
                      <span className="flex size-12 items-center justify-center rounded-md bg-gradient-cta text-white shadow-[0_6px_20px_-6px_rgba(74,69,255,.9)]">
                        <Sparkles className="size-5" aria-hidden="true" />
                      </span>
                      <h3 className="mt-5 text-lg font-semibold tracking-[-0.01em] text-text-on-dark">
                        Crear desde cero
                      </h3>
                      <p className="mt-2 text-pretty text-sm leading-relaxed text-text-on-dark-secondary">
                        Construye tu perfil paso a paso, conversando con Sofía.
                      </p>
                    </Card>
                  </Reveal>
                </RevealGroup>

                <motion.div variants={fadeUp}>
                  <Button variant="ghost" onClick={() => goTo(2)}>
                    Volver
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </ImmersiveLayout>
  );
}

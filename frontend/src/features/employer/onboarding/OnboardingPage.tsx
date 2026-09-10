import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { BrandBackground } from "@/components/brand/BrandBackground";
import { ImmersiveLayout } from "@/components/layout";
import { Button, Card, Eyebrow, FormField, Input, ProgressSteps, Select, Textarea, useToast } from "@/components/ui";
import { useUpdateCompany } from "@/api/hooks";
import type { Company, WorkMode } from "@/api/types";
import { useMotionSafe } from "@/lib/motion";
import { ChipGroup } from "@/features/employer/company/ChipGroup";
import { COMPANY_SIZE_OPTIONS, INDUSTRY_OPTIONS, WORK_MODE_OPTIONS } from "@/features/employer/company/company.constants";
import { fieldErrorsFrom, identitySchema, locationSchema } from "@/features/employer/onboarding/onboarding.schemas";

interface FormState {
  trade_name: string;
  legal_name: string;
  industry: string;
  size: Company["size"] | null;
  logo_url: string;
  city: string;
  state: string;
  work_mode: WorkMode | null;
  description: string;
}

const INITIAL_STATE: FormState = {
  trade_name: "",
  legal_name: "",
  industry: "",
  size: null,
  logo_url: "",
  city: "",
  state: "",
  work_mode: null,
  description: "",
};

const STEP_NAMES = ["Identidad", "Ubicación y modalidad", "Equipo y cultura"];

/** Botón `ghost`/`secondary` pensado para paneles claros: sobre el `Card
 * variant="glass"` de esta pantalla necesita su propia paleta oscura. */
const GHOST_ON_DARK =
  "!border-white/20 !bg-white/[0.06] !text-text-on-dark hover:!border-white/35 hover:!bg-white/[0.1]";

/** E1 — Onboarding empresa `/employer/onboarding`. Tres pasos, `ImmersiveLayout`. */
export function OnboardingPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const updateCompany = useUpdateCompany();
  const { fadeUp } = useMotionSafe();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function goToStep2() {
    const result = identitySchema.safeParse(form);
    if (!result.success) {
      setErrors(fieldErrorsFrom(result.error));
      return;
    }
    setErrors({});
    setStep(2);
  }

  function goToStep3() {
    const result = locationSchema.safeParse(form);
    if (!result.success) {
      setErrors(fieldErrorsFrom(result.error));
      return;
    }
    setErrors({});
    setStep(3);
  }

  async function handleFinish() {
    try {
      await updateCompany.mutateAsync({
        trade_name: form.trade_name,
        legal_name: form.legal_name,
        industry: form.industry,
        size: form.size ?? "1-10",
        logo_url: form.logo_url.trim() || null,
        location: { city: form.city, state: form.state },
        work_mode: form.work_mode ?? "ONSITE",
        description: form.description.trim() || null,
      });
      showToast({ title: "Perfil creado", tone: "success" });
      navigate("/employer", { replace: true });
    } catch {
      showToast({
        title: "No pudimos guardar tu perfil",
        description: "Intenta de nuevo en unos segundos.",
        tone: "danger",
      });
    }
  }

  return (
    <ImmersiveLayout>
      <div className="relative w-full">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 overflow-hidden rounded-b-[28px]">
          <BrandBackground asset="employer" presence="support" overlay="bottom" />
        </div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex flex-col gap-6 pt-6">
          <div>
            <Eyebrow>Cuenta de empresa</Eyebrow>
            <h1 className="mt-2 text-balance text-3xl font-semibold tracking-[-0.03em] text-text-on-dark sm:text-4xl">
              Conozcamos tu empresa
            </h1>
            <p className="mt-2 max-w-[52ch] text-pretty text-text-on-dark-secondary">
              Estos datos ayudan a candidatos y al matching a entender quién eres.
            </p>
          </div>

          <ProgressSteps total={3} current={step} stepName={STEP_NAMES[step - 1]} />
        </motion.div>

        <Card variant="glass" padding="lg" className="mt-8">
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <h2 className="text-lg font-semibold text-text-on-dark">Identidad</h2>
              <FormField label="Nombre comercial" htmlFor="trade_name" required error={errors.trade_name}>
                <Input
                  value={form.trade_name}
                  onChange={(e) => set("trade_name", e.target.value)}
                  placeholder="Ej. Logística del Bajío"
                />
              </FormField>
              <FormField label="Razón social" htmlFor="legal_name" required error={errors.legal_name}>
                <Input
                  value={form.legal_name}
                  onChange={(e) => set("legal_name", e.target.value)}
                  placeholder="Ej. Logística del Bajío S.A. de C.V."
                />
              </FormField>
              <FormField label="Industria" htmlFor="industry" required error={errors.industry}>
                <Select
                  options={INDUSTRY_OPTIONS}
                  placeholder="Elige una industria"
                  value={form.industry}
                  onChange={(e) => set("industry", e.target.value)}
                />
              </FormField>
              <ChipGroup
                label="Tamaño de la empresa"
                options={COMPANY_SIZE_OPTIONS}
                value={form.size}
                onChange={(value) => set("size", value)}
                error={errors.size}
              />
              <FormField label="URL de tu logo (opcional)" htmlFor="logo_url" hint="Podrás agregarlo o cambiarlo después.">
                <Input
                  value={form.logo_url}
                  onChange={(e) => set("logo_url", e.target.value)}
                  placeholder="https://…"
                />
              </FormField>
              <div className="flex justify-end pt-2">
                <Button variant="primary" size="lg" arrow onClick={goToStep2}>
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-5">
              <h2 className="text-lg font-semibold text-text-on-dark">Ubicación y modalidad</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Ciudad" htmlFor="city" required error={errors.city}>
                  <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Ej. León" />
                </FormField>
                <FormField label="Estado" htmlFor="state" required error={errors.state}>
                  <Input value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="Ej. Guanajuato" />
                </FormField>
              </div>
              <ChipGroup
                label="Modalidad predominante"
                options={WORK_MODE_OPTIONS}
                value={form.work_mode}
                onChange={(value) => set("work_mode", value)}
                error={errors.work_mode}
              />
              <div className="flex justify-between pt-2">
                <Button variant="secondary" size="lg" className={GHOST_ON_DARK} onClick={() => setStep(1)}>
                  Atrás
                </Button>
                <Button variant="primary" size="lg" arrow onClick={goToStep3}>
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-5">
              <h2 className="text-lg font-semibold text-text-on-dark">Equipo y cultura</h2>
              <FormField
                label="Descripción corta (opcional)"
                htmlFor="description"
                hint="Cuéntanos en unas líneas cómo es trabajar en tu equipo."
              >
                <Textarea
                  autoResize
                  rows={4}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Ej. Somos un equipo de operaciones que valora la puntualidad y el trabajo en equipo…"
                />
              </FormField>
              <div className="flex justify-between pt-2">
                <Button variant="secondary" size="lg" className={GHOST_ON_DARK} onClick={() => setStep(2)}>
                  Atrás
                </Button>
                <Button variant="primary" size="lg" arrow loading={updateCompany.isPending} onClick={handleFinish}>
                  Terminar
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </ImmersiveLayout>
  );
}

export { OnboardingPage as Component };

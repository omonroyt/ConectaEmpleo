import { useState } from "react";
import { useNavigate } from "react-router";
import { ImmersiveLayout } from "@/components/layout";
import {
  Button,
  Card,
  Eyebrow,
  FormField,
  Input,
  ProgressSteps,
  RadioCards,
  Stepper,
  Textarea,
  useToast,
} from "@/components/ui";
import { useCreateVacancy, useJobFamilies } from "@/api/hooks";
import type { WorkMode } from "@/api/types";
import { ChipGroup } from "@/features/employer/company/ChipGroup";
import { WORK_MODE_OPTIONS } from "@/features/employer/company/company.constants";
import { fieldErrorsFrom, vacancyFormSchema } from "@/features/employer/vacancies/vacancy.schemas";

/** E4 — Nueva vacante `/employer/vacancies/new`. `ImmersiveLayout`, columna centrada. */
export function NewVacancyPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const jobFamiliesQuery = useJobFamilies();
  const createVacancy = useCreateVacancy();

  const [title, setTitle] = useState("");
  const [jobFamilyId, setJobFamilyId] = useState<string | null>(null);
  const [workMode, setWorkMode] = useState<WorkMode | null>(null);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [description, setDescription] = useState("");
  const [positions, setPositions] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit() {
    const result = vacancyFormSchema.safeParse({
      title,
      job_family_id: jobFamilyId ?? "",
      work_mode: workMode ?? "",
      city,
      state,
      salary_min: salaryMin,
      salary_max: salaryMax,
      description,
      positions_count: positions,
    });
    if (!result.success) {
      setErrors(fieldErrorsFrom(result.error));
      return;
    }
    setErrors({});
    try {
      const vacancy = await createVacancy.mutateAsync({
        job_family_id: jobFamilyId as string,
        title,
        description,
        location: { city, state },
        work_mode: workMode as WorkMode,
        salary_min: salaryMin.trim() ? Number(salaryMin) : null,
        salary_max: salaryMax.trim() ? Number(salaryMax) : null,
        positions_count: positions,
      });
      navigate(`/employer/vacancies/${vacancy.id}/ideal-profile`);
    } catch {
      showToast({
        title: "No pudimos crear la vacante",
        description: "Intenta de nuevo en unos segundos.",
        tone: "danger",
      });
    }
  }

  const familyOptions = (jobFamiliesQuery.data ?? []).map((family) => ({
    value: family.id,
    label: family.name,
    description: family.role_objective,
  }));

  return (
    <ImmersiveLayout onClose={() => navigate("/employer/vacancies")}>
      <div className="flex flex-col gap-6">
        <div>
          <Eyebrow>Nueva vacante</Eyebrow>
          <h1 className="mt-1 text-balance text-2xl font-semibold tracking-[-0.03em] text-text-on-dark sm:text-3xl">
            Define lo esencial
          </h1>
          <p className="mt-2 max-w-[52ch] text-pretty text-text-on-dark-secondary">
            El perfil ideal detallado lo armamos en el siguiente paso.
          </p>
        </div>
        <ProgressSteps total={2} current={1} stepName="Datos de la vacante" />

        <Card variant="glass" padding="lg">
          <div className="flex flex-col gap-5">
            <FormField label="Título del puesto" htmlFor="vacancy_title" required error={errors.title}>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Auxiliar administrativo" />
            </FormField>

            <div>
              <p className="mb-2 text-sm font-medium text-text-on-dark">Familia de puesto</p>
              <RadioCards name="job_family" options={familyOptions} value={jobFamilyId} onChange={setJobFamilyId} />
              {errors.job_family_id && <p className="mt-1.5 text-sm text-danger-on-dark">{errors.job_family_id}</p>}
            </div>

            <ChipGroup
              label="Modalidad"
              options={WORK_MODE_OPTIONS}
              value={workMode}
              onChange={setWorkMode}
              error={errors.work_mode}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Ciudad" htmlFor="vacancy_city" required error={errors.city}>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ej. León" />
              </FormField>
              <FormField label="Estado" htmlFor="vacancy_state" required error={errors.state}>
                <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="Ej. Guanajuato" />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Salario mínimo (MXN)" htmlFor="salary_min" hint="Opcional" error={errors.salary_min}>
                <Input
                  type="number"
                  min={0}
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                  placeholder="9500"
                />
              </FormField>
              <FormField label="Salario máximo (MXN)" htmlFor="salary_max" hint="Opcional" error={errors.salary_max}>
                <Input
                  type="number"
                  min={0}
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value)}
                  placeholder="12500"
                />
              </FormField>
            </div>

            <FormField
              label="Describe qué necesitas"
              htmlFor="description"
              required
              error={errors.description}
              hint="Esto lo usaremos para sugerir el perfil ideal en el siguiente paso."
            >
              <Textarea
                autoResize
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe qué necesitas: p. ej. que sepa manejar montacargas y llevar control de inventario en Excel"
              />
            </FormField>

            <Stepper label="Número de posiciones" value={positions} onChange={setPositions} min={1} max={20} />

            <div className="flex justify-end pt-2">
              <Button variant="primary" size="lg" arrow loading={createVacancy.isPending} onClick={handleSubmit}>
                Definir perfil ideal
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </ImmersiveLayout>
  );
}

export { NewVacancyPage as Component };

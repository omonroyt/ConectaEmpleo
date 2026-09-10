import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { ImmersiveLayout } from "@/components/layout";
import {
  Badge,
  Button,
  Card,
  Chip,
  Eyebrow,
  Input,
  ProcessingStatus,
  ProgressSteps,
  SegmentedControl,
  Select,
  Slider,
  Stepper,
  useToast,
} from "@/components/ui";
import {
  useCompetencies,
  useResolveRequirements,
  useRunMatch,
  useSetRequirements,
  useSetWeights,
  useSkillsCatalog,
  useUpdateVacancy,
  useVacancy,
} from "@/api/hooks";
import type { RequirementInput, RequirementKind, VacancyWeights } from "@/api/types";
import {
  REQUIREMENT_KIND_OPTIONS,
  WEIGHT_COMPONENT_ORDER,
  WEIGHT_LABELS,
  normalizeWeightsProportional,
  priorityForWeight,
  sumWeights,
} from "@/features/employer/vacancies/vacancies.shared";
import { cn } from "@/lib/cn";

interface RequirementRow {
  _key: string;
  competency_code: string | null;
  skill_code: string | null;
  label: string;
  kind: RequirementKind;
  min_level: 1 | 2 | 3 | 4;
}

function makeKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `k_${Math.random().toString(36).slice(2)}`;
}

/** Botón `ghost`/`secondary` sobre el panel `glass` de esta pantalla. */
const GHOST_ON_DARK =
  "!border-white/20 !bg-white/[0.06] !text-text-on-dark hover:!border-white/35 hover:!bg-white/[0.1]";

/** Espacio reservado (nbsp) para que las filas no salten cuando no hay texto de ayuda. */
const HINT_PLACEHOLDER = " ";

/**
 * Alto fijo del hint de "Competencia" (2 líneas de texto-xs/leading-tight):
 * así las tres filas miden lo mismo, tenga o no tenga texto de ayuda esa
 * fila en particular — la reserva no puede depender del contenido real.
 */
const HINT_SLOT_CLASS = "h-9 overflow-hidden text-xs leading-tight text-text-on-dark-tertiary [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]";

/** E5 — Perfil ideal `/employer/vacancies/:id/ideal-profile`. Requisitos (A) + pesos (B). */
export function IdealProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const vacancyQuery = useVacancy(id);
  const competenciesQuery = useCompetencies(vacancyQuery.data?.job_family_id);
  const skillsQuery = useSkillsCatalog();
  const resolveRequirements = useResolveRequirements();
  const setRequirements = useSetRequirements();
  const setWeights = useSetWeights();
  const updateVacancy = useUpdateVacancy();
  const runMatch = useRunMatch();

  const [initialized, setInitialized] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [rows, setRows] = useState<RequirementRow[]>([]);
  const [unmapped, setUnmapped] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<{ text: string; reason: string }[]>([]);
  const [weights, setWeightsState] = useState<VacancyWeights | null>(null);
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);

  useEffect(() => {
    const vacancy = vacancyQuery.data;
    if (!vacancy || initialized || resolving) return;

    if (vacancy.requirements.length > 0) {
      setRows(
        vacancy.requirements.map((r) => ({
          _key: r.id,
          competency_code: r.competency_code,
          skill_code: r.skill_code,
          label: r.label,
          kind: r.kind,
          min_level: r.min_level,
        })),
      );
      setWeightsState(vacancy.weights);
      setInitialized(true);
      return;
    }

    setResolving(true);
    resolveRequirements.mutate(
      { vacancyId: vacancy.id, freeText: vacancy.description },
      {
        onSuccess: (result) => {
          setRows(result.mapped.map((r) => ({ _key: makeKey(), ...r })));
          setUnmapped(result.unmapped);
          setWarnings(result.warnings);
          setWeightsState(result.suggested_weights);
          setInitialized(true);
          setResolving(false);
        },
        onError: () => {
          setWeightsState(vacancy.weights);
          setInitialized(true);
          setResolving(false);
          showToast({ title: "No pudimos interpretar la descripción automáticamente.", tone: "warning" });
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vacancyQuery.data, initialized, resolving]);

  function updateRow(key: string, patch: Partial<RequirementRow>) {
    setRows((current) => current.map((r) => (r._key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((r) => r._key !== key));
  }

  function addRow() {
    setRows((current) => [
      ...current,
      { _key: makeKey(), competency_code: null, skill_code: null, label: "", kind: "MANDATORY", min_level: 2 },
    ]);
  }

  function assignUnmapped(index: number, competencyCode: string) {
    if (!competencyCode) return;
    const text = unmapped[index];
    setUnmapped((current) => current.filter((_, i) => i !== index));
    setRows((current) => [
      ...current,
      { _key: makeKey(), competency_code: competencyCode, skill_code: null, label: text, kind: "DESIRABLE", min_level: 2 },
    ]);
  }

  function removeUnmapped(index: number) {
    setUnmapped((current) => current.filter((_, i) => i !== index));
  }

  function setWeight(component: keyof VacancyWeights, value: number) {
    setWeightsState((current) => (current ? { ...current, [component]: value } : current));
  }

  function handleNormalize() {
    setWeightsState((current) => (current ? normalizeWeightsProportional(current) : current));
  }

  function buildRequirementsPayload(): RequirementInput[] {
    return rows
      .filter((r) => r.label.trim().length > 0)
      .map((r) => ({
        competency_code: r.competency_code,
        skill_code: r.skill_code,
        label: r.label,
        kind: r.kind,
        min_level: r.min_level,
        weight: 0,
      }));
  }

  async function persistRequirementsAndWeights() {
    if (!id || !weights) return;
    await setRequirements.mutateAsync({ vacancyId: id, requirements: buildRequirementsPayload() });
    await setWeights.mutateAsync({ vacancyId: id, weights });
  }

  async function handleSaveDraft() {
    if (!id) return;
    setSaving("draft");
    try {
      await persistRequirementsAndWeights();
      showToast({ title: "Borrador guardado", tone: "success" });
      navigate("/employer/vacancies");
    } catch {
      showToast({ title: "No pudimos guardar los cambios", description: "Intenta de nuevo.", tone: "danger" });
    } finally {
      setSaving(null);
    }
  }

  async function handleSaveAndSearch() {
    if (!id) return;
    if (buildRequirementsPayload().length === 0) {
      showToast({ title: "Agrega al menos un requisito antes de continuar.", tone: "warning" });
      return;
    }
    setSaving("publish");
    try {
      await persistRequirementsAndWeights();
      await updateVacancy.mutateAsync({ id, patch: { status: "OPEN" } });
      const jobRef = await runMatch.mutateAsync(id);
      navigate(`/employer/vacancies/${id}/talent?job=${jobRef.job_id}`);
    } catch {
      showToast({ title: "No pudimos guardar los cambios", description: "Intenta de nuevo.", tone: "danger" });
    } finally {
      setSaving(null);
    }
  }

  const competencyOptions = (competenciesQuery.data ?? []).map((c) => ({ value: c.code, label: c.name }));
  const skillNameByCode = useMemo(
    () => Object.fromEntries((skillsQuery.data ?? []).map((s) => [s.code, s.name])),
    [skillsQuery.data],
  );
  const sum = weights ? sumWeights(weights) : 0;
  const isBusy = saving !== null;
  const showForm = !(vacancyQuery.isLoading || (resolving && !initialized)) && !(vacancyQuery.isError || !vacancyQuery.data);

  return (
    <ImmersiveLayout onClose={() => navigate("/employer/vacancies")}>
      <div className="flex flex-col gap-6">
        <div>
          <Eyebrow>Nueva vacante</Eyebrow>
          <h1 className="mt-1 text-balance text-2xl font-semibold tracking-[-0.03em] text-text-on-dark sm:text-3xl">
            Define el perfil ideal
          </h1>
          <p className="mt-2 max-w-[56ch] text-pretty text-text-on-dark-secondary">
            Ajusta los requisitos y las prioridades que usará el matching para esta vacante.
          </p>
        </div>

        <ProgressSteps total={2} current={2} stepName="Perfil ideal" />

        <Card variant={showForm ? "glass" : "light"} padding="lg">
          {vacancyQuery.isLoading || (resolving && !initialized) ? (
            <ProcessingStatus messages={["Interpretando tus requisitos…"]} />
          ) : vacancyQuery.isError || !vacancyQuery.data ? (
            <p className="text-sm text-danger">No pudimos cargar esta vacante. Intenta recargar la página.</p>
          ) : (
            <div className="flex flex-col gap-10">
              <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-text-on-dark">Requisitos</h2>
                  <Button variant="secondary" size="md" className={GHOST_ON_DARK} onClick={addRow}>
                    <Plus className="size-4" aria-hidden="true" />
                    Agregar requisito
                  </Button>
                </div>

                {warnings.length > 0 && (
                  <div className="flex flex-col gap-2 rounded-md border border-warning-on-dark/30 bg-warning/10 p-4">
                    {warnings.map((warning, index) => (
                      <p key={`${warning.text}-${index}`} className="flex items-start gap-2 text-sm text-warning-on-dark">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <span>
                          Este requisito podría ser discriminatorio y no se usará en el matching: «{warning.text}»
                        </span>
                      </p>
                    ))}
                  </div>
                )}

                <div className="flex flex-col">
                  {rows.map((row, index) => {
                    const hint =
                      row.skill_code && !row.competency_code
                        ? `Basado en la habilidad ${skillNameByCode[row.skill_code] ?? row.skill_code}.`
                        : null;
                    return (
                      <div
                        key={row._key}
                        className={cn(
                          "flex flex-col gap-4 border-b border-white/10 py-5",
                          index === 0 && "pt-0",
                          index === rows.length - 1 && "border-b-0 pb-0",
                        )}
                      >
                        {/* Fila superior: Requisito y Competencia son las columnas anchas —
                            un valor típico debe leerse completo, nunca truncado. */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-text-on-dark" htmlFor={`label-${row._key}`}>
                              Requisito
                            </label>
                            <Input
                              id={`label-${row._key}`}
                              value={row.label}
                              onChange={(e) => updateRow(row._key, { label: e.target.value })}
                            />
                            {/* Mismo alto fijo que el hint de Competencia: las dos columnas
                                de la fila superior terminan a la misma altura. */}
                            <p className={HINT_SLOT_CLASS} aria-hidden="true">
                              {HINT_PLACEHOLDER}
                            </p>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-text-on-dark" htmlFor={`comp-${row._key}`}>
                              Competencia
                            </label>
                            <Select
                              id={`comp-${row._key}`}
                              options={competencyOptions}
                              placeholder="Elige una competencia"
                              value={row.competency_code ?? ""}
                              onChange={(e) => updateRow(row._key, { competency_code: e.target.value, skill_code: null })}
                            />
                            {/* Alto fijo (2 líneas): con o sin hint real, esta fila mide
                                siempre lo mismo que sus hermanas. */}
                            <p className={HINT_SLOT_CLASS}>{hint ?? HINT_PLACEHOLDER}</p>
                          </div>
                        </div>

                        {/* Fila inferior: Tipo, Nivel y borrar ocupan solo lo que necesitan. */}
                        <div className="flex flex-wrap items-end gap-4">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-sm font-medium text-text-on-dark">Tipo</span>
                            <SegmentedControl
                              aria-label={`Tipo de requisito: ${row.label || "sin nombre"}`}
                              tone="dark"
                              options={REQUIREMENT_KIND_OPTIONS}
                              value={row.kind}
                              onChange={(value) => updateRow(row._key, { kind: value as RequirementKind })}
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <span className="text-sm font-medium text-text-on-dark">Nivel</span>
                            <Stepper
                              value={row.min_level}
                              onChange={(value) => updateRow(row._key, { min_level: value as 1 | 2 | 3 | 4 })}
                              min={1}
                              max={4}
                            />
                          </div>

                          <button
                            type="button"
                            aria-label="Eliminar requisito"
                            onClick={() => removeRow(row._key)}
                            className="ml-auto flex size-11 shrink-0 items-center justify-center rounded-full text-text-on-dark-tertiary transition-colors duration-fast ease-standard hover:bg-danger/15 hover:text-danger-on-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2"
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {rows.length === 0 && (
                    <p className="text-sm text-text-on-dark-secondary">Aún no hay requisitos. Agrega el primero.</p>
                  )}
                </div>

                {unmapped.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-text-on-dark">Frases que no pudimos mapear</p>
                    {unmapped.map((text, index) => (
                      <div
                        key={`${text}-${index}`}
                        className="flex flex-wrap items-center gap-3 rounded-md bg-white/[0.04] p-3"
                      >
                        <Chip onRemove={() => removeUnmapped(index)}>{text}</Chip>
                        <Select
                          options={competencyOptions}
                          placeholder="Elige una competencia"
                          value=""
                          onChange={(e) => assignUnmapped(index, e.target.value)}
                          className="w-56"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {weights && (
                <section className="flex flex-col gap-5">
                  <h2 className="text-lg font-semibold text-text-on-dark">Prioridades</h2>
                  {WEIGHT_COMPONENT_ORDER.map((component) => (
                    <div key={component} className="flex flex-col gap-1.5">
                      <Slider
                        label={WEIGHT_LABELS[component]}
                        value={weights[component]}
                        onChange={(value) => setWeight(component, value)}
                        valueFormatter={(v) => `${v}%`}
                      />
                      <Badge tone="neutral" className="w-fit">
                        Prioridad {priorityForWeight(weights[component])}
                      </Badge>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-sm font-medium text-text-on-dark">
                      Suma actual:{" "}
                      <span className={sum === 100 ? "text-success-on-dark" : "text-warning-on-dark"}>{sum}%</span>
                    </p>
                    <Button
                      variant="secondary"
                      size="md"
                      className={GHOST_ON_DARK}
                      onClick={handleNormalize}
                      disabled={sum === 100}
                    >
                      Normalizar a 100
                    </Button>
                  </div>
                  <p className="text-sm text-text-on-dark-secondary">La IA apoya tu decisión; no la reemplaza.</p>
                </section>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-between">
                <Button
                  variant="ghost"
                  size="lg"
                  className="!text-text-on-dark hover:!bg-white/[0.08]"
                  onClick={handleSaveDraft}
                  loading={saving === "draft"}
                  disabled={isBusy}
                >
                  Guardar borrador
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  arrow
                  onClick={handleSaveAndSearch}
                  loading={saving === "publish"}
                  disabled={isBusy}
                >
                  Guardar y buscar talento
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </ImmersiveLayout>
  );
}

export { IdealProfilePage as Component };

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { PageContainer } from "@/components/layout";
import {
  Button,
  Card,
  EmptyState,
  Eyebrow,
  FormField,
  Input,
  Reveal,
  RevealGroup,
  Select,
  SkeletonCard,
  Textarea,
  useToast,
} from "@/components/ui";
import { useCompanyMe, useUpdateCompany, useVerification } from "@/api/hooks";
import type { Company, WorkMode } from "@/api/types";
import { ChipGroup } from "@/features/employer/company/ChipGroup";
import { COMPANY_SIZE_OPTIONS, INDUSTRY_OPTIONS, WORK_MODE_OPTIONS } from "@/features/employer/company/company.constants";
import { VerificationCard } from "@/features/employer/company/VerificationCard";

interface FormState {
  trade_name: string;
  legal_name: string;
  industry: string;
  size: Company["size"];
  logo_url: string;
  city: string;
  state: string;
  work_mode: WorkMode;
  description: string;
}

function stateFromCompany(company: Company): FormState {
  return {
    trade_name: company.trade_name,
    legal_name: company.legal_name,
    industry: company.industry,
    size: company.size,
    logo_url: company.logo_url ?? "",
    city: company.location?.city ?? "",
    state: company.location?.state ?? "",
    work_mode: company.work_mode ?? "ONSITE",
    description: company.description ?? "",
  };
}

/** E3 — Perfil de empresa `/employer/company`. Formulario por secciones + bloque de verificación. */
export function CompanyProfilePage() {
  const companyQuery = useCompanyMe();
  const verificationQuery = useVerification();
  const updateCompany = useUpdateCompany();
  const { showToast } = useToast();

  const [form, setForm] = useState<FormState | null>(null);

  useEffect(() => {
    if (companyQuery.data && !form) {
      setForm(stateFromCompany(companyQuery.data));
    }
  }, [companyQuery.data, form]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSubmit() {
    if (!form) return;
    try {
      await updateCompany.mutateAsync({
        trade_name: form.trade_name,
        legal_name: form.legal_name,
        industry: form.industry,
        size: form.size,
        logo_url: form.logo_url.trim() || null,
        location: { city: form.city, state: form.state },
        work_mode: form.work_mode,
        description: form.description.trim() || null,
      });
      showToast({ title: "Cambios guardados", tone: "success" });
    } catch {
      showToast({
        title: "No pudimos guardar los cambios",
        description: "Intenta de nuevo en unos segundos.",
        tone: "danger",
      });
    }
  }

  if (companyQuery.isLoading || !form) {
    return (
      <PageContainer className="py-10">
        <SkeletonCard />
      </PageContainer>
    );
  }

  if (companyQuery.isError || !companyQuery.data) {
    return (
      <PageContainer className="py-10">
        <EmptyState icon={Building2} title="No pudimos cargar tu empresa" description="Intenta recargar la página." />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="py-10">
      <div>
        <Eyebrow>Empresa</Eyebrow>
        <h1 className="mt-1 text-balance text-3xl font-semibold tracking-[-0.03em] text-text-on-dark sm:text-4xl">
          Perfil de empresa
        </h1>
        <p className="mt-2 max-w-[60ch] text-pretty text-text-on-dark-secondary">
          Esta información la ven los candidatos y ayuda al matching.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <RevealGroup className="flex flex-col gap-6 lg:col-span-2" as="div">
          <Reveal>
            <Card variant="light" padding="lg">
              <h2 className="text-base font-semibold text-text-primary">Identidad</h2>
              <div className="mt-4 flex flex-col gap-4">
                <FormField label="Nombre comercial" htmlFor="trade_name" required>
                  <Input value={form.trade_name} onChange={(e) => set("trade_name", e.target.value)} />
                </FormField>
                <FormField label="Razón social" htmlFor="legal_name" required>
                  <Input value={form.legal_name} onChange={(e) => set("legal_name", e.target.value)} />
                </FormField>
                <FormField label="Industria" htmlFor="industry" required>
                  <Select
                    options={INDUSTRY_OPTIONS}
                    value={form.industry}
                    onChange={(e) => set("industry", e.target.value)}
                  />
                </FormField>
                <ChipGroup
                  label="Tamaño de la empresa"
                  options={COMPANY_SIZE_OPTIONS}
                  value={form.size}
                  onChange={(value) => set("size", value)}
                />
                <FormField label="URL de tu logo (opcional)" htmlFor="logo_url">
                  <Input value={form.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://…" />
                </FormField>
              </div>
            </Card>
          </Reveal>

          <Reveal>
            <Card variant="soft" padding="lg">
              <h2 className="text-base font-semibold text-text-primary">Ubicación y modalidad</h2>
              <div className="mt-4 flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Ciudad" htmlFor="city" required>
                    <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
                  </FormField>
                  <FormField label="Estado" htmlFor="state" required>
                    <Input value={form.state} onChange={(e) => set("state", e.target.value)} />
                  </FormField>
                </div>
                <ChipGroup
                  label="Modalidad predominante"
                  options={WORK_MODE_OPTIONS}
                  value={form.work_mode}
                  onChange={(value) => set("work_mode", value)}
                />
              </div>
            </Card>
          </Reveal>

          <Reveal>
            <Card variant="light" padding="lg">
              <h2 className="text-base font-semibold text-text-primary">Equipo y cultura</h2>
              <div className="mt-4">
                <FormField label="Descripción corta (opcional)" htmlFor="description">
                  <Textarea
                    autoResize
                    rows={4}
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                  />
                </FormField>
              </div>
            </Card>
          </Reveal>

          <div className="flex justify-end">
            <Button variant="primary" size="lg" loading={updateCompany.isPending} onClick={handleSubmit}>
              Guardar cambios
            </Button>
          </div>
        </RevealGroup>

        <RevealGroup>
          <Reveal>
            <VerificationCard verification={verificationQuery.data} loading={verificationQuery.isLoading} />
          </Reveal>
        </RevealGroup>
      </div>
    </PageContainer>
  );
}

export { CompanyProfilePage as Component };

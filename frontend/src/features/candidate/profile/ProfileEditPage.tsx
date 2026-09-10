import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { AlertCircle, ArrowLeft, ImagePlus } from "lucide-react";
import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  Eyebrow,
  FormField,
  Input,
  Reveal,
  RevealGroup,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from "@/components/ui";
import { LightSurface, PageContainer } from "@/components/layout";
import { BrandBackground } from "@/components/brand/BrandBackground";
import { useCandidateMe, useUpdateCandidate } from "@/api/hooks";
import { ApiClientError } from "@/api/client";
import type { Availability, CandidateProfile, CandidateProfilePatch } from "@/api/types";
import { availabilityOptions, MEXICO_STATES } from "./profile.utils";

/** C12 — Editar perfil `/candidate/profile/edit`. Formulario por secciones, guardado independiente. */
export function Component() {
  const me = useCandidateMe();
  const navigate = useNavigate();

  if (me.isLoading) return <EditSkeleton />;
  if (me.isError || !me.data) {
    return (
      <PageContainer className="flex min-h-[70vh] items-center justify-center py-10">
        <EmptyState
          icon={AlertCircle}
          title="No pudimos cargar tu perfil"
          description="Revisa tu conexión e inténtalo de nuevo."
          cta={{ label: "Reintentar", onClick: () => void me.refetch() }}
        />
      </PageContainer>
    );
  }

  const profile = me.data;

  return (
    <div>
      <div className="relative overflow-hidden bg-bg-dark px-6 pb-20 pt-10 md:px-8 md:pt-14">
        <BrandBackground asset="profile" presence="support" overlay="left" />
        <PageContainer className="relative z-10 flex flex-col gap-4">
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate("/candidate/profile")}
            className="w-fit"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver a mi perfil
          </Button>
          <div>
            <Eyebrow tone="accent">Tu perfil</Eyebrow>
            <h1 className="mt-1 text-balance text-3xl font-semibold text-text-on-dark sm:text-4xl">
              Editar perfil
            </h1>
            <p className="mt-2 max-w-2xl text-pretty text-base text-text-on-dark-secondary">
              Cada sección se guarda por separado. Los cambios se reflejan de inmediato en tu Perfil de
              Talento Verificado.
            </p>
          </div>
        </PageContainer>
      </div>

      <LightSurface>
        <PageContainer>
          <RevealGroup className="flex flex-col gap-6" stagger={0.06}>
            <Reveal>
              <BasicInfoSection profile={profile} variant="light" />
            </Reveal>
            <Reveal>
              <PhotoSection profile={profile} variant="soft" />
            </Reveal>
            <Reveal>
              <LocationSection profile={profile} variant="light" />
            </Reveal>
            <Reveal>
              <AvailabilitySection profile={profile} variant="soft" />
            </Reveal>
            <Reveal>
              <SalarySection profile={profile} variant="light" />
            </Reveal>
            <Reveal>
              <BioSection profile={profile} variant="soft" />
            </Reveal>
          </RevealGroup>
        </PageContainer>
      </LightSurface>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Envoltorio de sección con guardado independiente
// ---------------------------------------------------------------------------

function useSectionSave() {
  const update = useUpdateCandidate();
  const { showToast } = useToast();

  const save = async (patch: CandidateProfilePatch, successMessage: string) => {
    try {
      await update.mutateAsync(patch);
      showToast({ title: successMessage, tone: "success" });
      return true;
    } catch (err) {
      showToast({
        title: "No pudimos guardar los cambios",
        description: err instanceof ApiClientError ? err.message : "Intenta de nuevo en unos segundos.",
        tone: "danger",
      });
      return false;
    }
  };

  return { save, isPending: update.isPending };
}

function FormSectionCard({
  title,
  description,
  onSubmit,
  isPending,
  children,
  variant = "light",
}: {
  title: string;
  description?: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
  children: ReactNode;
  variant?: "light" | "soft";
}) {
  return (
    <Card variant={variant} padding="lg" className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        {description && <p className="mt-1 text-pretty text-sm text-text-secondary">{description}</p>}
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {children}
        <Button type="submit" variant="secondary" size="md" loading={isPending} className="self-start">
          Guardar
        </Button>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Secciones
// ---------------------------------------------------------------------------

function BasicInfoSection({
  profile,
  variant,
}: {
  profile: CandidateProfile;
  variant?: "light" | "soft";
}) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const { save, isPending } = useSectionSave();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void save({ full_name: fullName.trim(), phone: phone.trim() || null }, "Datos básicos actualizados");
  };

  return (
    <FormSectionCard title="Datos básicos" onSubmit={handleSubmit} isPending={isPending} variant={variant}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nombre completo" htmlFor="edit-full-name" required>
          <Input
            id="edit-full-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
        </FormField>
        <FormField label="Teléfono (opcional)" htmlFor="edit-phone" hint="10 dígitos, sin espacios.">
          <Input
            id="edit-phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </FormField>
      </div>
      <p className="text-xs text-text-tertiary">
        Tu nombre y foto solo se muestran a empresas después de que te seleccionen.
      </p>
    </FormSectionCard>
  );
}

function PhotoSection({
  profile,
  variant,
}: {
  profile: CandidateProfile;
  variant?: "light" | "soft";
}) {
  const [photoUrl, setPhotoUrl] = useState(profile.photo_url ?? "");
  const { save, isPending } = useSectionSave();

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPhotoUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void save({ photo_url: photoUrl.trim() || null }, "Foto actualizada");
  };

  return (
    <FormSectionCard
      title="Foto de perfil (opcional)"
      description="Puedes pegar una URL o subir una imagen desde tu equipo."
      onSubmit={handleSubmit}
      isPending={isPending}
      variant={variant}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <Avatar name={profile.full_name} src={photoUrl || undefined} size="lg" />
        <div className="flex flex-1 flex-col gap-2">
          <FormField label="URL de tu foto" htmlFor="edit-photo-url">
            <Input
              id="edit-photo-url"
              value={photoUrl}
              onChange={(event) => setPhotoUrl(event.target.value)}
              placeholder="https://…"
            />
          </FormField>
          <label className="inline-flex w-fit cursor-pointer items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ImagePlus className="size-4" aria-hidden="true" />
            Subir desde mi equipo
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>
        </div>
      </div>
      <p className="text-xs text-text-tertiary">
        Tu nombre y foto solo se muestran a empresas después de que te seleccionen.
      </p>
    </FormSectionCard>
  );
}

function LocationSection({
  profile,
  variant,
}: {
  profile: CandidateProfile;
  variant?: "light" | "soft";
}) {
  const [city, setCity] = useState(profile.location?.city ?? "");
  const [state, setState] = useState(profile.location?.state ?? "");
  const { save, isPending } = useSectionSave();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedCity = city.trim();
    void save(
      { location: trimmedCity && state ? { city: trimmedCity, state } : null },
      "Ubicación actualizada",
    );
  };

  return (
    <FormSectionCard title="Ubicación" onSubmit={handleSubmit} isPending={isPending} variant={variant}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Ciudad" htmlFor="edit-city">
          <Input id="edit-city" value={city} onChange={(event) => setCity(event.target.value)} />
        </FormField>
        <FormField label="Estado" htmlFor="edit-state">
          <Select
            id="edit-state"
            options={MEXICO_STATES.map((s) => ({ value: s, label: s }))}
            placeholder="Selecciona un estado"
            value={state}
            onChange={(event) => setState(event.target.value)}
          />
        </FormField>
      </div>
    </FormSectionCard>
  );
}

function AvailabilitySection({
  profile,
  variant,
}: {
  profile: CandidateProfile;
  variant?: "light" | "soft";
}) {
  const [availability, setAvailability] = useState<Availability | null>(profile.availability);
  const { save, isPending } = useSectionSave();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void save({ availability }, "Disponibilidad actualizada");
  };

  return (
    <FormSectionCard title="Disponibilidad" onSubmit={handleSubmit} isPending={isPending} variant={variant}>
      <div className="flex flex-wrap gap-2">
        {availabilityOptions.map((option) => (
          <Chip
            key={option.value}
            selected={availability === option.value}
            onClick={() => setAvailability(option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </div>
    </FormSectionCard>
  );
}

function SalarySection({
  profile,
  variant,
}: {
  profile: CandidateProfile;
  variant?: "light" | "soft";
}) {
  const [min, setMin] = useState(profile.salary_expectation_min?.toString() ?? "");
  const [max, setMax] = useState(profile.salary_expectation_max?.toString() ?? "");
  const { save, isPending } = useSectionSave();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedMin = min.trim() ? Number(min) : null;
    const parsedMax = max.trim() ? Number(max) : null;
    void save(
      { salary_expectation_min: parsedMin, salary_expectation_max: parsedMax },
      "Expectativa salarial actualizada",
    );
  };

  return (
    <FormSectionCard
      title="Expectativa salarial mensual"
      description="En pesos mexicanos (MXN), bruto mensual."
      onSubmit={handleSubmit}
      isPending={isPending}
      variant={variant}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Mínimo" htmlFor="edit-salary-min">
          <Input id="edit-salary-min" type="number" min={0} step={500} value={min} onChange={(event) => setMin(event.target.value)} />
        </FormField>
        <FormField label="Máximo" htmlFor="edit-salary-max">
          <Input id="edit-salary-max" type="number" min={0} step={500} value={max} onChange={(event) => setMax(event.target.value)} />
        </FormField>
      </div>
    </FormSectionCard>
  );
}

function BioSection({
  profile,
  variant,
}: {
  profile: CandidateProfile;
  variant?: "light" | "soft";
}) {
  const [bio, setBio] = useState(profile.bio ?? "");
  const { save, isPending } = useSectionSave();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void save({ bio: bio.trim() || null }, "Biografía actualizada");
  };

  return (
    <FormSectionCard
      title="Sobre mí"
      description="Un par de líneas que las empresas verán en tu Perfil de Talento Verificado."
      onSubmit={handleSubmit}
      variant={variant}
      isPending={isPending}
    >
      <FormField label="Biografía" htmlFor="edit-bio">
        <Textarea
          id="edit-bio"
          autoResize
          rows={3}
          maxLength={600}
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          placeholder="Cuéntanos brevemente quién eres y qué buscas."
        />
      </FormField>
    </FormSectionCard>
  );
}

function EditSkeleton() {
  return (
    <PageContainer className="flex flex-col gap-6 py-8 md:py-10">
      <Skeleton className="h-8 w-48 skeleton-shimmer--dark" />
      <Skeleton className="h-32 w-full skeleton-shimmer--dark" />
      <Skeleton className="h-32 w-full skeleton-shimmer--dark" />
      <Skeleton className="h-32 w-full skeleton-shimmer--dark" />
    </PageContainer>
  );
}

import { useState, type FormEvent, type ReactNode } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { AlertCircle, ArrowLeft, ImagePlus } from "lucide-react";
import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  FormField,
  Input,
  PageHeader,
  Select,
  SkeletonCard,
  Textarea,
  useToast,
} from "@/components/ui";
import { PageContainer } from "@/components/layout";
import { useCandidateMe, useUpdateCandidate } from "@/api/hooks";
import { ApiClientError } from "@/api/client";
import type { Availability, CandidateProfile, CandidateProfilePatch } from "@/api/types";
import { useMotionSafe } from "@/lib/motion";
import { availabilityOptions, MEXICO_STATES } from "./profile.utils";

/** C12 — Editar perfil `/candidate/profile/edit`. Formulario por secciones, guardado independiente. */
export function Component() {
  const me = useCandidateMe();
  const navigate = useNavigate();

  if (me.isLoading) return <EditSkeleton />;
  if (me.isError || !me.data) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6">
        <EmptyState
          icon={AlertCircle}
          title="No pudimos cargar tu perfil"
          description="Revisa tu conexión e inténtalo de nuevo."
          cta={{ label: "Reintentar", onClick: () => void me.refetch() }}
        />
      </div>
    );
  }

  const profile = me.data;
  const { fadeUp, staggerContainer } = useMotionSafe();

  return (
    <PageContainer className="flex flex-col gap-8 py-8 md:py-10">
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="md" onClick={() => navigate("/candidate/profile")} className="w-fit -ml-4">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver a mi perfil
        </Button>
        <PageHeader
          eyebrow="TU PERFIL"
          title="Editar perfil"
          subtitle="Cada sección se guarda por separado. Los cambios se reflejan de inmediato en tu Perfil de Talento Verificado."
        />
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer(0.06, 0.05)}
        className="flex flex-col gap-8"
      >
        <motion.div variants={fadeUp}>
          <BasicInfoSection profile={profile} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <PhotoSection profile={profile} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <LocationSection profile={profile} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <AvailabilitySection profile={profile} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <SalarySection profile={profile} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <BioSection profile={profile} />
        </motion.div>
      </motion.div>
    </PageContainer>
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
}: {
  title: string;
  description?: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
  children: ReactNode;
}) {
  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
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

function BasicInfoSection({ profile }: { profile: CandidateProfile }) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const { save, isPending } = useSectionSave();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void save({ full_name: fullName.trim(), phone: phone.trim() || null }, "Datos básicos actualizados");
  };

  return (
    <FormSectionCard title="Datos básicos" onSubmit={handleSubmit} isPending={isPending}>
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

function PhotoSection({ profile }: { profile: CandidateProfile }) {
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

function LocationSection({ profile }: { profile: CandidateProfile }) {
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
    <FormSectionCard title="Ubicación" onSubmit={handleSubmit} isPending={isPending}>
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

function AvailabilitySection({ profile }: { profile: CandidateProfile }) {
  const [availability, setAvailability] = useState<Availability | null>(profile.availability);
  const { save, isPending } = useSectionSave();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void save({ availability }, "Disponibilidad actualizada");
  };

  return (
    <FormSectionCard title="Disponibilidad" onSubmit={handleSubmit} isPending={isPending}>
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

function SalarySection({ profile }: { profile: CandidateProfile }) {
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

function BioSection({ profile }: { profile: CandidateProfile }) {
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
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </PageContainer>
  );
}

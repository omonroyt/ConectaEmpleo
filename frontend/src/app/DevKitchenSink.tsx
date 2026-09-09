import { useRef, useState, type ReactNode } from "react";
import {
  Award,
  Briefcase,
  FileText,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import {
  AIInsightCard,
  Avatar,
  Badge,
  BottomSheet,
  Button,
  CandidateAnonymousCard,
  CandidateUnlockedCard,
  Card,
  Checkbox,
  Chip,
  Divider,
  Drawer,
  EmptyState,
  EvidenceBadge,
  FileUploader,
  FilterPills,
  FormField,
  Input,
  JobCard,
  MetricCard,
  Modal,
  PageHeader,
  ProcessingStatus,
  ProgressBar,
  ProgressRing,
  ProgressSteps,
  Radio,
  RadioCards,
  ScoreBadge,
  SectionHeader,
  SegmentedControl,
  Select,
  Skeleton,
  SkeletonCard,
  SkillChip,
  Slider,
  Stepper,
  Switch,
  Tabs,
  Textarea,
  Tooltip,
  useToast,
  type EvidenceLevel,
} from "@/components/ui";
import {
  AuthLayout,
  CandidateShell,
  EmployerShell,
  ImmersiveLayout,
  LightSurface,
  PageContainer,
} from "@/components/layout";
import { BrandBackground } from "@/components/brand/BrandBackground";
import { cn } from "@/lib/cn";

const evidenceLevels: EvidenceLevel[] = ["declared", "evaluated", "verified", "partial", "pending"];

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-8 first:border-t-0 first:pt-0">
      <SectionHeader title={title} description={description} />
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function PreviewFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-[.14em] text-text-tertiary">{label}</p>
      <div className="relative h-[480px] overflow-hidden rounded-lg border border-border">
        {children}
      </div>
    </div>
  );
}

/**
 * Ruta de verificación visual del design system (`/dev/ui`, solo DEV).
 * Renderiza todos los componentes de `components/ui` y `components/layout`
 * con datos de ejemplo, variantes dark/light y estados loading/empty/error.
 */
export function DevKitchenSink() {
  const { showToast } = useToast();
  const fileInputDemoRef = useRef<File | null>(null);

  const [checked, setChecked] = useState(true);
  const [radioValue, setRadioValue] = useState("email");
  const [radioCardValue, setRadioCardValue] = useState<string | null>("candidate");
  const [switchOn, setSwitchOn] = useState(true);
  const [sliderValue, setSliderValue] = useState(60);
  const [stepperValue, setStepperValue] = useState(2);
  const [segmentedValue, setSegmentedValue] = useState("candidate");
  const [filterValue, setFilterValue] = useState("all");
  const [tabsValue, setTabsValue] = useState("resumen");
  const [file, setFile] = useState<File | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [compareSelected, setCompareSelected] = useState(false);
  const [shortlisted, setShortlisted] = useState(false);

  return (
    <PageContainer className="flex flex-col gap-10 bg-bg-light py-10 text-text-primary">
      <PageHeader
        eyebrow="Solo desarrollo"
        title="Design system — Conecta Empleo"
        subtitle="Muestra de todos los componentes de components/ui y components/layout con datos de ejemplo."
        actions={<Badge tone="info">/dev/ui</Badge>}
      />

      <Section title="Button" description="Variants, tamaños, loading y flecha animada.">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" arrow>
            Continuar
          </Button>
          <Button variant="secondary">Secundario</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger-ghost">Eliminar</Button>
          <Button variant="primary" size="lg" arrow>
            Grande
          </Button>
          <Button variant="primary" loading>
            Cargando
          </Button>
          <Button variant="primary" disabled>
            Deshabilitado
          </Button>
          <Button variant="secondary" href="https://example.com" target="_blank" rel="noreferrer">
            Como enlace
          </Button>
        </div>
      </Section>

      <Section title="Formularios" description="Input, Textarea, Select, FormField, Checkbox, Radio, RadioCards, Switch, Slider, Stepper, SegmentedControl.">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Correo" htmlFor="demo-email" required hint="Usaremos este correo para tu cuenta.">
            <Input id="demo-email" type="email" placeholder="tu@correo.com" />
          </FormField>
          <FormField label="Contraseña" htmlFor="demo-password" error="La contraseña debe tener al menos 8 caracteres.">
            <Input id="demo-password" type="password" />
          </FormField>
          <FormField label="Cuéntanos sobre tu experiencia" htmlFor="demo-textarea" hint="1 a 4 líneas, crece automáticamente.">
            <Textarea id="demo-textarea" autoResize placeholder="Cuéntanos…" />
          </FormField>
          <FormField label="Modalidad" htmlFor="demo-select">
            <Select
              id="demo-select"
              placeholder="Selecciona una opción"
              options={[
                { value: "remoto", label: "Remoto" },
                { value: "hibrido", label: "Híbrido" },
                { value: "presencial", label: "Presencial" },
              ]}
            />
          </FormField>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <Checkbox label="Acepto el aviso de privacidad" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          <div className="flex items-center gap-4">
            <Radio name="demo-radio" label="Correo" checked={radioValue === "email"} onChange={() => setRadioValue("email")} />
            <Radio name="demo-radio" label="Teléfono" checked={radioValue === "phone"} onChange={() => setRadioValue("phone")} />
          </div>
          <Switch checked={switchOn} onCheckedChange={setSwitchOn} label="Recibir notificaciones" />
        </div>

        <RadioCards
          name="demo-account-type"
          value={radioCardValue}
          onChange={setRadioCardValue}
          columns={2}
          options={[
            { value: "candidate", label: "Soy candidato", description: "Busco mi siguiente oportunidad.", icon: Users },
            { value: "employer", label: "Soy empresa", description: "Busco talento verificado.", icon: Briefcase },
          ]}
        />

        <div className="grid gap-6 sm:grid-cols-3">
          <Slider label="Peso del criterio" value={sliderValue} onChange={setSliderValue} valueFormatter={(v) => `${v}%`} />
          <Stepper label="Años de experiencia" value={stepperValue} onChange={setStepperValue} />
          <SegmentedControl
            aria-label="Tipo de cuenta"
            value={segmentedValue}
            onChange={setSegmentedValue}
            options={[
              { value: "candidate", label: "Candidato" },
              { value: "employer", label: "Empresa" },
            ]}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FileUploader
            file={file}
            onFileSelect={(f) => {
              fileInputDemoRef.current = f;
              setFile(f);
            }}
            onClear={() => setFile(null)}
            privacyNote="Usaremos tu archivo para estructurar tu perfil y preparar la entrevista."
          />
          <FileUploader file={null} onFileSelect={() => {}} error="No pudimos procesar este archivo. Prueba con un PDF o DOCX de hasta 10 MB." />
        </div>
      </Section>

      <Section title="Cards, chips y evidencia">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card variant="light" padding="md">
            <p className="font-semibold text-text-primary">Card clara</p>
            <p className="mt-1 text-sm text-text-secondary">variant=&quot;light&quot;, padding=&quot;md&quot;</p>
          </Card>
          <Card variant="dark" padding="md" background={{ asset: "matching", presence: "accent" }}>
            <p className="font-semibold text-text-on-dark">Card oscura + acento de marca</p>
            <p className="mt-1 text-sm text-text-on-dark-secondary">variant=&quot;dark&quot;</p>
          </Card>
          <Card interactive padding="md" onClick={() => showToast({ title: "Card interactiva presionada" })}>
            <p className="font-semibold text-text-primary">Interactiva</p>
            <p className="mt-1 text-sm text-text-secondary">Hover eleva 2-4px.</p>
          </Card>
          <Card selected padding="md">
            <p className="font-semibold text-text-primary">Seleccionada</p>
            <p className="mt-1 text-sm text-text-secondary">selected=true (halo)</p>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Chip selected>Frontend</Chip>
          <Chip>Backend</Chip>
          <Chip onClick={() => showToast({ title: "Chip clickeado" })}>Clickeable</Chip>
          <Chip onRemove={() => showToast({ title: "Chip removido" })}>Con remove</Chip>
        </div>

        <FilterPills
          aria-label="Filtrar por estado"
          value={filterValue}
          onChange={setFilterValue}
          options={[
            { value: "all", label: "Todas" },
            { value: "active", label: "Activas" },
            { value: "closed", label: "Cerradas" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <SkillChip name="React" level="Avanzado" evidence="verified" />
          <SkillChip name="Node.js" level="Intermedio" evidence="evaluated" />
          <SkillChip name="Liderazgo" evidence="declared" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {evidenceLevels.map((level) => (
            <EvidenceBadge key={level} level={level} />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ScoreBadge score={92} label="alta compatibilidad" />
          <ScoreBadge score={68} label="compatibilidad media" size="sm" />
        </div>
      </Section>

      <Section title="Progreso y métricas">
        <div className="grid gap-6 sm:grid-cols-2">
          <ProgressBar value={72} label="Perfil completo" showValue />
          <ProgressSteps total={4} current={2} />
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <ProgressRing value={84} label="Compatibilidad" />
          <ProgressRing value={45} size={88} stroke={8} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard icon={Users} value={128} label="Candidatos evaluados" delta={{ value: 12, direction: "up" }} />
          <MetricCard icon={Briefcase} value={6} label="Vacantes activas" />
          <MetricCard icon={Award} value={34} label="Contactos desbloqueados" suffix="%" delta={{ value: 4, direction: "down" }} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <AIInsightCard
            title="Por qué esta persona destaca"
            body="Su experiencia declarada coincide con los requisitos esenciales de la vacante."
            why={["3 años en proyectos similares", "Evidencia verificada en SQL"]}
            missing={["Sin evidencia evaluada de liderazgo"]}
            cta={{ label: "Ver evidencia", onClick: () => showToast({ title: "Abrir evidencia" }) }}
          />
          <AIInsightCard title="Explicación en curso" why={[]} missing={[]} loading />
        </div>
      </Section>

      <Section title="Feedback, overlays y estado">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name="Laura Méndez" />
          <Avatar name="Laura Méndez" seed="laura" />
          <Avatar anonymous seed="A47" />
          <Badge tone="neutral">Neutral</Badge>
          <Badge tone="info">Info</Badge>
          <Badge tone="success">Success</Badge>
          <Badge tone="warning">Warning</Badge>
        </div>
        <Divider />
        <Tabs
          aria-label="Secciones de ejemplo"
          value={tabsValue}
          onChange={setTabsValue}
          items={[
            { value: "resumen", label: "Resumen", content: <p className="text-sm text-text-secondary">Contenido de resumen.</p> },
            { value: "detalle", label: "Detalle", content: <p className="text-sm text-text-secondary">Contenido de detalle.</p> },
          ]}
        />
        <div className="flex flex-wrap items-center gap-4">
          <Tooltip content="Explicación breve del elemento">
            <Badge tone="info">Con tooltip</Badge>
          </Tooltip>
          <Button variant="secondary" onClick={() => showToast({ title: "Cambios guardados", description: "Tu perfil se actualizó correctamente.", tone: "success" })}>
            Disparar Toast
          </Button>
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Abrir Modal
          </Button>
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>
            Abrir BottomSheet
          </Button>
          <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
            Abrir Drawer
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <EmptyState
            icon={FileText}
            title="Aún no hay vacantes"
            description="Crea tu primera vacante para empezar a recibir candidatos."
            cta={{ label: "Nueva vacante", onClick: () => showToast({ title: "Nueva vacante" }) }}
          />
          <ProcessingStatus
            progress={54}
            messages={["Leyendo tu CV…", "Estructurando tu experiencia…", "Preparando tu perfil…"]}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SkeletonCard />
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-6">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </Section>

      <Section title="Cards de dominio">
        <div className="grid gap-4 sm:grid-cols-2">
          <JobCard
            title="Desarrollador/a Backend Pl"
            company="Nimbus Tech"
            companyVerified
            location="Ciudad de México (remoto)"
            modality="Remoto"
            salaryText="$28–34 mil MXN"
            compatibility={{ score: 88, label: "alta compatibilidad" }}
            applied
          />
          <JobCard
            title="Diseñador/a UX/UI"
            company="Estudio Norte"
            location="Guadalajara"
            modality="Híbrido"
            salaryText="$22–26 mil MXN"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <CandidateAnonymousCard
            anonCode="Candidato #A47"
            familyName="Perfil de desarrollo backend"
            geoLabel="Ciudad de México"
            availabilityLabel="Disponibilidad inmediata"
            yearsExperience={4}
            score={91}
            scoreLabel="alta compatibilidad"
            skills={[
              { name: "Node.js", level: "Avanzado" },
              { name: "PostgreSQL", level: "Intermedio" },
            ]}
            evidence={{ declared: 6, evaluated: 3, verified: 2 }}
            selected={compareSelected}
            onToggleCompare={() => setCompareSelected((v) => !v)}
            onView={() => showToast({ title: "Ver perfil anónimo" })}
            onShortlist={() => setShortlisted((v) => !v)}
            shortlisted={shortlisted}
          />
          <CandidateUnlockedCard
            name="Laura Méndez"
            email="laura.mendez@correo.com"
            phone="+52 55 1234 5678"
            geoLabel="Ciudad de México"
            availabilityLabel="Disponibilidad inmediata"
            yearsExperience={4}
            score={91}
            scoreLabel="alta compatibilidad"
            skills={[
              { name: "Node.js", level: "Avanzado" },
              { name: "PostgreSQL", level: "Intermedio" },
            ]}
            evidence={{ declared: 6, evaluated: 3, verified: 2 }}
          />
        </div>
      </Section>

      <Section title="Layouts" description="Vista previa recortada (los layouts reales ocupan toda la pantalla).">
        <div className="grid gap-6 lg:grid-cols-2">
          <PreviewFrame label="AuthLayout">
            <AuthLayout heroTitle="Tu siguiente paso empieza aquí" heroSubtitle="Cuéntanos quién eres para personalizar tu experiencia.">
              <div className="flex flex-col gap-4">
                <FormField label="Correo" htmlFor="preview-email">
                  <Input id="preview-email" type="email" />
                </FormField>
                <Button variant="primary" arrow>
                  Continuar
                </Button>
              </div>
            </AuthLayout>
          </PreviewFrame>

          <PreviewFrame label="ImmersiveLayout">
            <ImmersiveLayout onClose={() => showToast({ title: "Cerrar focus mode" })}>
              <div className="flex flex-col items-center gap-4 text-center">
                <Sparkles className="size-10 text-accent" aria-hidden="true" />
                <h2 className="text-2xl font-semibold text-text-on-dark">Pregunta de la entrevista</h2>
                <p className="max-w-md text-sm text-text-on-dark-secondary">
                  Cuéntanos sobre un reto técnico reciente y cómo lo resolviste.
                </p>
              </div>
            </ImmersiveLayout>
          </PreviewFrame>

          <PreviewFrame label="CandidateShell">
            <CandidateShell user={{ name: "Laura Méndez", email: "laura@correo.com" }} onLogout={() => showToast({ title: "Cerrar sesión" })} />
          </PreviewFrame>

          <PreviewFrame label="EmployerShell">
            <EmployerShell user={{ name: "Nimbus Tech", email: "rh@nimbus.com" }} onLogout={() => showToast({ title: "Cerrar sesión" })} />
          </PreviewFrame>
        </div>

        <PreviewFrame label="LightSurface sobre BrandBackground">
          <div className={cn("relative h-full")}>
            <div className="relative h-40 overflow-hidden">
              <BrandBackground asset="onboarding" presence="support" />
            </div>
            <LightSurface className="px-6">
              <p className="text-sm text-text-secondary">
                Contenido claro superpuesto al hero con radio superior.
              </p>
            </LightSurface>
          </div>
        </PreviewFrame>
      </Section>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Confirmar acción">
        <p className="text-sm text-text-secondary">
          La IA apoya tu decisión; no la reemplaza. ¿Deseas continuar?
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setModalOpen(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => setModalOpen(false)}>
            Confirmar
          </Button>
        </div>
      </Modal>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Opciones">
        <div className="flex flex-col gap-2">
          <Button variant="secondary" onClick={() => setSheetOpen(false)}>
            Opción A
          </Button>
          <Button variant="ghost" onClick={() => setSheetOpen(false)}>
            Opción B
          </Button>
        </div>
      </BottomSheet>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Detalle">
        <p className="text-sm text-text-secondary">Contenido lateral de ejemplo (desktop).</p>
      </Drawer>

      <div className="flex items-center gap-2 pb-16 text-xs text-text-tertiary">
        <ShieldCheck className="size-4" aria-hidden="true" />
        La identidad del candidato se mantiene oculta en el primer filtro.
      </div>
    </PageContainer>
  );
}

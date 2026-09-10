import { useState, type ReactNode } from "react";
import {
  Award,
  Briefcase,
  FileText,
  RefreshCcw,
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
  Eyebrow,
  FileUploader,
  FilterPills,
  FormField,
  Input,
  JobCard,
  MetricCard,
  Modal,
  ProcessingStatus,
  ProgressBar,
  ProgressRing,
  ProgressSteps,
  Radio,
  RadioCards,
  Reveal,
  RevealGroup,
  ScoreBadge,
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

const movementItems: Array<{
  id: string;
  icon: typeof Users;
  title: string;
  description: string;
}> = [
  { id: "1", icon: Users, title: "Candidatos", description: "Ranking anónimo, comparación y finalistas." },
  { id: "2", icon: Briefcase, title: "Vacantes", description: "Perfil ideal, publicación y seguimiento." },
  { id: "3", icon: Award, title: "Evidencia", description: "Declarada, evaluada y verificada." },
  { id: "4", icon: Sparkles, title: "Entrevista con IA", description: "Preguntas adaptativas, sin juicio final." },
  { id: "5", icon: ShieldCheck, title: "Anonimato", description: "Estructural: nunca viaja nombre ni foto." },
  { id: "6", icon: FileText, title: "Perfil verificado", description: "Solo por evidencia documental aceptada." },
];

/** Título de sección: antetítulo + display + apoyo opcional, con acciones a la derecha. */
function Section({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <RevealGroup
      as="section"
      className="flex flex-col gap-6 border-t border-border-glass pt-12 first:border-t-0 first:pt-0"
    >
      <Reveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-2xl flex-col gap-2">
          <Eyebrow tone="dark">{eyebrow}</Eyebrow>
          <h2 className="text-balance text-2xl font-semibold tracking-[-0.02em] text-text-on-dark sm:text-3xl">
            {title}
          </h2>
          {description && (
            <p className="max-w-[65ch] text-pretty text-sm text-text-on-dark-secondary sm:text-base">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
      </Reveal>
      <Reveal className="flex flex-col gap-6">{children}</Reveal>
    </RevealGroup>
  );
}

function PreviewFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-[.14em] text-text-on-dark-tertiary">{label}</p>
      <div className="relative h-[480px] overflow-hidden rounded-lg border border-border-glass">
        {children}
      </div>
    </div>
  );
}

function ColorTile({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className={cn("h-16 w-full rounded-md border border-border-glass", className)} aria-hidden="true" />
      <p className="font-mono text-xs text-text-on-dark-tertiary">{name}</p>
    </div>
  );
}

function TextTokenRow({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border-glass bg-white/[0.03] px-4 py-3">
      <span className={cn("text-sm font-medium", className)}>Texto de ejemplo</span>
      <span className="font-mono text-xs text-text-on-dark-tertiary">{name}</span>
    </div>
  );
}

const surfaceTiles = [
  { name: "bg-dark", className: "bg-bg-dark" },
  { name: "surface-dark", className: "bg-surface-dark" },
  { name: "surface-dark-2", className: "bg-surface-dark-2" },
  { name: "surface (light)", className: "bg-surface" },
  { name: "surface-soft", className: "bg-surface-soft" },
  { name: "surface-tint", className: "bg-surface-tint" },
];

const accentTiles = [
  { name: "primary", className: "bg-primary" },
  { name: "primary-2", className: "bg-primary-2" },
  { name: "accent", className: "bg-accent" },
  { name: "success", className: "bg-success" },
  { name: "warning", className: "bg-warning" },
  { name: "danger", className: "bg-danger" },
];

const onDarkTextTokens = [
  { name: "text-on-dark", className: "text-text-on-dark" },
  { name: "text-on-dark-secondary", className: "text-text-on-dark-secondary" },
  { name: "text-on-dark-tertiary", className: "text-text-on-dark-tertiary" },
  { name: "primary-on-dark", className: "text-primary-on-dark" },
  { name: "success-on-dark", className: "text-success-on-dark" },
  { name: "warning-on-dark", className: "text-warning-on-dark" },
  { name: "danger-on-dark", className: "text-danger-on-dark" },
];

const onLightTextTokens = [
  { name: "text-primary", className: "text-text-primary" },
  { name: "text-secondary", className: "text-text-secondary" },
  { name: "text-tertiary", className: "text-text-tertiary" },
  { name: "primary", className: "text-primary" },
  { name: "success", className: "text-success" },
  { name: "warning", className: "text-warning" },
  { name: "danger", className: "text-danger" },
];

/**
 * Ruta de verificación visual del design system (`/dev/ui`).
 * Prueba visual del sistema completo: superficies, tipografía, color,
 * controles (en ambos tonos), datos animados, superposiciones y movimiento.
 */
export function DevKitchenSink() {
  const { showToast } = useToast();

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
  const [lightModalOpen, setLightModalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [compareSelected, setCompareSelected] = useState(false);
  const [shortlisted, setShortlisted] = useState(false);
  const [replayKey, setReplayKey] = useState(0);

  function renderFormControls(tone: "light" | "dark") {
    return (
      <div className="flex flex-col gap-6">
        <Eyebrow tone={tone === "light" ? "light" : "dark"}>
          {tone === "light" ? "Sobre panel claro" : "Sobre vidrio oscuro"}
        </Eyebrow>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Correo"
            htmlFor={`demo-email-${tone}`}
            required
            hint="Usaremos este correo para tu cuenta."
          >
            <Input id={`demo-email-${tone}`} type="email" placeholder="tu@correo.com" />
          </FormField>
          <FormField label="Modalidad" htmlFor={`demo-select-${tone}`}>
            <Select
              id={`demo-select-${tone}`}
              placeholder="Selecciona una opción"
              options={[
                { value: "remoto", label: "Remoto" },
                { value: "hibrido", label: "Híbrido" },
                { value: "presencial", label: "Presencial" },
              ]}
            />
          </FormField>
        </div>
        <FormField
          label="Cuéntanos sobre tu experiencia"
          htmlFor={`demo-textarea-${tone}`}
          hint="1 a 4 líneas, crece automáticamente."
        >
          <Textarea id={`demo-textarea-${tone}`} autoResize placeholder="Cuéntanos…" />
        </FormField>
        <div className="flex flex-wrap items-center gap-6">
          <Checkbox
            label="Acepto el aviso de privacidad"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <Radio
            name={`demo-radio-${tone}`}
            label="Correo"
            checked={radioValue === "email"}
            onChange={() => setRadioValue("email")}
          />
          <Radio
            name={`demo-radio-${tone}`}
            label="Teléfono"
            checked={radioValue === "phone"}
            onChange={() => setRadioValue("phone")}
          />
          <Switch
            id={`demo-switch-${tone}`}
            checked={switchOn}
            onCheckedChange={setSwitchOn}
            label="Notificaciones"
          />
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          <Slider
            tone={tone}
            label="Peso del criterio"
            value={sliderValue}
            onChange={setSliderValue}
            valueFormatter={(v) => `${v}%`}
          />
          <Stepper label="Años de experiencia" value={stepperValue} onChange={setStepperValue} />
          <SegmentedControl
            tone={tone}
            aria-label={`Tipo de cuenta (panel ${tone})`}
            value={segmentedValue}
            onChange={setSegmentedValue}
            options={[
              { value: "candidate", label: "Candidato" },
              { value: "employer", label: "Empresa" },
            ]}
          />
        </div>
        <RadioCards
          tone={tone}
          name={`demo-account-type-${tone}`}
          value={radioCardValue}
          onChange={setRadioCardValue}
          columns={2}
          options={[
            { value: "candidate", label: "Soy candidato", description: "Busco mi siguiente oportunidad.", icon: Users },
            { value: "employer", label: "Soy empresa", description: "Busco talento verificado.", icon: Briefcase },
          ]}
        />
        <FileUploader
          file={file}
          onFileSelect={(f) => setFile(f)}
          onClear={() => setFile(null)}
          privacyNote="Usaremos tu archivo para estructurar tu perfil y preparar la entrevista."
        />
      </div>
    );
  }

  return (
    <div className="app-canvas min-h-dvh text-text-on-dark">
      <PageContainer className="relative z-[1] flex flex-col gap-16 py-16 sm:py-20">
        <header className="flex flex-col gap-4">
          <Eyebrow tone="accent">Design system</Eyebrow>
          <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-[-0.03em] text-text-on-dark sm:text-5xl">
            Componentes y fundamentos de Conecta Empleo
          </h1>
          <p className="max-w-[65ch] text-pretty text-base text-text-on-dark-secondary">
            Catálogo vivo de superficies, tipografía, color, controles y movimiento — la referencia
            visual para construir cualquier pantalla del producto.
          </p>
        </header>

        <Section
          eyebrow="Interacción"
          title="Button"
          description="Variantes, tamaños, estados de carga y flecha animada. Cada variante resuelve su paleta según el tono del panel."
        >
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
          <Card variant="light" padding="lg" className="flex flex-wrap items-center gap-3">
            {(["primary", "secondary", "ghost", "danger-ghost"] as const).map((variant) => (
              <Button key={variant} variant={variant} tone="light">
                {variant}
              </Button>
            ))}
          </Card>
        </Section>

        <Section
          eyebrow="Superficies"
          title="Card"
          description="Las cuatro familias de superficie de la dirección visual: pásalas siempre con `variant` explícito."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card variant="glass" padding="md">
              <p className="font-semibold text-text-on-dark">Glass</p>
              <p className="mt-1 text-sm text-text-on-dark-secondary">
                Vidrio oscuro. Default de la app logueada.
              </p>
            </Card>
            <Card variant="light" padding="md">
              <p className="font-semibold text-text-primary">Light</p>
              <p className="mt-1 text-sm text-text-secondary">Panel claro. Contenido denso.</p>
            </Card>
            <Card variant="soft" padding="md">
              <p className="font-semibold text-text-primary">Soft</p>
              <p className="mt-1 text-sm text-text-secondary">Tintado frío, alterna dentro de un panel claro.</p>
            </Card>
            <Card variant="dark" padding="md">
              <p className="font-semibold text-text-on-dark">Dark</p>
              <p className="mt-1 text-sm text-text-on-dark-secondary">Sólido, para anidar dentro de glass.</p>
            </Card>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card
              variant="glass"
              padding="md"
              interactive
              onClick={() => showToast({ title: "Card interactiva presionada" })}
            >
              <p className="font-semibold text-text-on-dark">Interactiva</p>
              <p className="mt-1 text-sm text-text-on-dark-secondary">Hover eleva 2-4px.</p>
            </Card>
            <Card variant="glass" padding="md" selected>
              <p className="font-semibold text-text-on-dark">Seleccionada</p>
              <p className="mt-1 text-sm text-text-on-dark-secondary">selected=true (halo)</p>
            </Card>
            <Card variant="glass" padding="md" spotlight interactive onClick={() => {}}>
              <p className="font-semibold text-text-on-dark">Spotlight</p>
              <p className="mt-1 text-sm text-text-on-dark-secondary">Borde que sigue al cursor.</p>
            </Card>
          </div>
        </Section>

        <Section
          eyebrow="Tipografía"
          title="Escala"
          description="Displays con tracking negativo y `text-balance`; párrafos con `text-pretty`. Cifras siempre `tabular-nums`."
        >
          <div className="flex flex-col gap-4">
            <p className="text-balance text-5xl font-semibold tracking-[-0.03em] text-text-on-dark sm:text-6xl">
              Display 56/64
            </p>
            <p className="text-balance text-4xl font-semibold tracking-[-0.03em] text-text-on-dark">
              Título 36
            </p>
            <p className="text-2xl font-semibold tracking-[-0.02em] text-text-on-dark">Encabezado 24</p>
            <p className="text-lg font-medium text-text-on-dark">Subtítulo 18</p>
            <p className="max-w-[65ch] text-pretty text-base text-text-on-dark-secondary">
              Cuerpo 16 — el texto de apoyo se lee sobre <code>text-on-dark-secondary</code>, con un
              ancho de lectura máximo de unos 65 caracteres para no perder al lector en líneas
              demasiado largas.
            </p>
            <p className="text-sm text-text-on-dark-secondary">Cuerpo pequeño 14</p>
            <p className="text-xs uppercase tracking-[0.14em] text-text-on-dark-tertiary">Caption 12</p>
            <p className="text-2xl font-semibold tabular-nums text-text-on-dark">$28,450.00 MXN</p>
          </div>
        </Section>

        <Section
          eyebrow="Color"
          title="Tokens"
          description="Superficies, acentos y las variantes `*-on-dark` que garantizan contraste AA sobre el lienzo."
        >
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            {surfaceTiles.map((tile) => (
              <ColorTile key={tile.name} {...tile} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            {accentTiles.map((tile) => (
              <ColorTile key={tile.name} {...tile} />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Eyebrow tone="dark">Texto sobre oscuro</Eyebrow>
              <div className="flex flex-col gap-2">
                {onDarkTextTokens.map((token) => (
                  <TextTokenRow key={token.name} {...token} />
                ))}
              </div>
            </div>
            <Card variant="light" padding="lg" className="flex flex-col gap-2">
              <Eyebrow tone="light">Texto sobre claro</Eyebrow>
              <div className="flex flex-col gap-2">
                {onLightTextTokens.map((token) => (
                  <div
                    key={token.name}
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-soft px-4 py-3"
                  >
                    <span className={cn("text-sm font-medium", token.className)}>Texto de ejemplo</span>
                    <span className="font-mono text-xs text-text-tertiary">{token.name}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Section>

        <Section
          eyebrow="Formularios"
          title="Controles en ambos tonos"
          description="Input, Textarea, Select, FormField, Checkbox, Radio, Switch, Stepper eligen su paleta solos según el `Surface` que los envuelve. Slider, SegmentedControl y RadioCards reciben `tone` por prop."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <Card variant="light" padding="lg">
              {renderFormControls("light")}
            </Card>
            <Card variant="glass" padding="lg">
              {renderFormControls("dark")}
            </Card>
          </div>
        </Section>

        <Section
          eyebrow="Datos"
          title="Progreso y métricas"
          description="Todo score, anillo y barra se llena de 0 al valor cuando entra en pantalla, en ~1.8s, con la cifra contando a la par."
          actions={
            <Button variant="secondary" size="md" onClick={() => setReplayKey((k) => k + 1)}>
              <RefreshCcw className="size-4" aria-hidden="true" />
              Reproducir animaciones
            </Button>
          }
        >
          <div key={replayKey} className="flex flex-col gap-8">
            <div className="flex flex-wrap items-end gap-10">
              <ProgressRing value={92} size={168} label="Compatibilidad" />
              <ProgressRing value={84} size={132} label="Evidencia verificada" />
              <ProgressRing value={61} size={96} stroke={8} />
              <ProgressRing value={45} size={72} stroke={7} />
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <ProgressBar value={72} label="Perfil completo" showValue />
              <ProgressBar value={88} label="Evidencia sólida" showValue delay={90} />
              <ProgressBar value={54} label="Node.js" showValue delay={180} />
              <ProgressBar value={31} label="Liderazgo" showValue delay={270} />
            </div>
            <ProgressSteps total={4} current={2} stepName="Datos de la vacante" />
          </div>
        </Section>

        <Section
          eyebrow="Superposiciones"
          title="Modal, Drawer, BottomSheet, Toast y Tooltip"
          description="Vidrio oscuro con desenfoque por default; Modal, Drawer y BottomSheet también aceptan `tone=&quot;light&quot;` para contenido denso."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Tooltip content="Explicación breve del elemento">
              <Badge tone="info">Con tooltip</Badge>
            </Tooltip>
            <Button
              variant="secondary"
              onClick={() =>
                showToast({
                  title: "Cambios guardados",
                  description: "Tu perfil se actualizó correctamente.",
                  tone: "success",
                })
              }
            >
              Disparar Toast
            </Button>
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              Abrir Modal
            </Button>
            <Button variant="secondary" onClick={() => setLightModalOpen(true)}>
              Abrir Modal claro
            </Button>
            <Button variant="secondary" onClick={() => setSheetOpen(true)}>
              Abrir BottomSheet
            </Button>
            <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
              Abrir Drawer
            </Button>
          </div>
        </Section>

        <Section
          eyebrow="Superficies densas"
          title="Cards, chips y evidencia"
          description="Piezas que asumen panel claro: viven dentro de `Card variant=&quot;light&quot;`, nunca a sangre sobre el lienzo."
        >
          <Card variant="light" padding="lg" className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name="Laura Méndez" />
              <Avatar name="Laura Méndez" seed="laura" />
              <Avatar anonymous seed="A47" />
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
                {
                  value: "resumen",
                  label: "Resumen",
                  content: <p className="text-sm text-text-secondary">Contenido de resumen.</p>,
                },
                {
                  value: "detalle",
                  label: "Detalle",
                  content: <p className="text-sm text-text-secondary">Contenido de detalle.</p>,
                },
              ]}
            />
          </Card>
        </Section>

        <Section
          eyebrow="Estados"
          title="Vacío, error y procesamiento"
          description="Cada pantalla conserva sus estados loading / vacío / error."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <EmptyState
              icon={FileText}
              title="Aún no hay vacantes"
              description="Crea tu primera vacante para empezar a recibir candidatos."
              cta={{ label: "Nueva vacante", onClick: () => showToast({ title: "Nueva vacante" }) }}
            />
            <Card variant="light" padding="lg">
              <ProcessingStatus
                progress={54}
                messages={["Leyendo tu CV…", "Estructurando tu experiencia…", "Preparando tu perfil…"]}
              />
            </Card>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SkeletonCard />
            <Card variant="light" padding="lg" className="flex flex-col gap-2">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
          </div>
        </Section>

        <Section
          eyebrow="Tarjetas de dominio"
          title="AI insight, métricas y candidatos"
          description="Datos de ejemplo para MetricCard, AIInsightCard, JobCard y las cards de candidato."
        >
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
          <div className="flex items-center gap-2 text-xs text-text-on-dark-tertiary">
            <ShieldCheck className="size-4" aria-hidden="true" />
            La identidad del candidato se mantiene oculta en el primer filtro.
          </div>
        </Section>

        <Section
          eyebrow="Layouts"
          title="Shells y layouts"
          description="Vista previa recortada — los layouts reales ocupan toda la pantalla."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <PreviewFrame label="AuthLayout">
              <AuthLayout
                heroTitle="Tu siguiente paso empieza aquí"
                heroSubtitle="Cuéntanos quién eres para personalizar tu experiencia."
              >
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
              <CandidateShell
                user={{ name: "Laura Méndez", email: "laura@correo.com" }}
                onLogout={() => showToast({ title: "Cerrar sesión" })}
              />
            </PreviewFrame>

            <PreviewFrame label="EmployerShell">
              <EmployerShell
                user={{ name: "Nimbus Tech", email: "rh@nimbus.com" }}
                onLogout={() => showToast({ title: "Cerrar sesión" })}
              />
            </PreviewFrame>
          </div>

          <PreviewFrame label="LightSurface sobre BrandBackground">
            <div className="relative h-full">
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

        <Section
          eyebrow="Movimiento"
          title="Entrada escalonada"
          description="Toda grilla o lista de tarjetas se envuelve en RevealGroup/Reveal: cada card entra dentro de su propio contenedor, una tras otra."
        >
          <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {movementItems.map((item) => (
              <Reveal key={item.id}>
                <Card variant="glass" padding="md" className="flex h-full flex-col gap-3">
                  <span className="flex size-10 items-center justify-center rounded-md bg-gradient-cta text-white">
                    <item.icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-semibold text-text-on-dark">{item.title}</p>
                    <p className="mt-1 text-sm text-text-on-dark-secondary">{item.description}</p>
                  </div>
                </Card>
              </Reveal>
            ))}
          </RevealGroup>
        </Section>
      </PageContainer>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Confirmar acción">
        <p className="text-sm text-text-on-dark-secondary">
          Esta explicación se apoya en la evidencia disponible; la decisión final sigue siendo tuya.
          ¿Deseas continuar?
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

      <Modal
        open={lightModalOpen}
        onClose={() => setLightModalOpen(false)}
        title="Modal sobre panel claro"
        tone="light"
      >
        <p className="text-sm text-text-secondary">
          Para contenido denso (revisión de CV, formularios largos) el modal también acepta
          <code className="mx-1">tone=&quot;light&quot;</code>.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" tone="light" onClick={() => setLightModalOpen(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => setLightModalOpen(false)}>
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
        <p className="text-sm text-text-on-dark-secondary">Contenido lateral de ejemplo (desktop).</p>
      </Drawer>
    </div>
  );
}

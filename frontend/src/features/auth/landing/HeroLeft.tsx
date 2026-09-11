import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { BarChart3, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useMotionSafe } from "@/lib/motion";
import { signUpPath } from "@/lib/registration";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Matching inteligente",
    description: "Conecta con el mejor talento para tu equipo.",
  },
  {
    icon: ShieldCheck,
    title: "Perfiles verificados",
    description: "Talento con habilidades y experiencia validadas.",
  },
  {
    icon: BarChart3,
    title: "Evaluación con IA",
    description: "Decisiones basadas en datos, no en suposiciones.",
  },
];

/** Columna izquierda del hero — 07_LANDING_HERO.md §4. */
export function HeroLeft() {
  const navigate = useNavigate();
  const { fadeUp } = useMotionSafe();

  return (
    <>
      {/* En portátiles de poca altura la columna de texto es la que empuja el
          hero fuera del viewport. Se compacta el titular y el ritmo vertical
          en lugar de recortar contenido. */}
      <style>{`
        @media (min-width: 1024px) and (max-height: 820px) {
          .hero-left { gap: 1rem; }
          .hero-left h1 { font-size: 46px; line-height: 1.04; }
          .hero-left .hero-left__features { padding-top: .5rem; gap: 1rem; }
          .hero-left .hero-left__footnote { padding-top: .75rem; }
        }
      `}</style>
      <div className="hero-left flex flex-col items-start gap-6 text-left lg:w-[42%] lg:shrink-0">
      <motion.p
        variants={fadeUp}
        className="text-[11px] font-semibold uppercase tracking-[.22em] text-text-on-dark-secondary/70 sm:text-xs"
      >
        Para empresas que construyen el mañana
      </motion.p>

      <motion.h1
        variants={fadeUp}
        className="text-[38px] font-semibold leading-[1.05] text-text-on-dark sm:text-5xl lg:text-[64px] lg:leading-[1.02]"
      >
        Encuentra talento con{" "}
        <span
          className="whitespace-nowrap bg-clip-text text-transparent"
          style={{ backgroundImage: "var(--gradient-brand)" }}
        >
          evidencia real
        </span>
      </motion.h1>

      <motion.p variants={fadeUp} className="max-w-[46ch] text-[17px] text-text-on-dark-secondary sm:text-lg">
        Evalúa, verifica y compara candidatos con inteligencia artificial. Toma mejores decisiones y
        construye equipos de alto impacto.
      </motion.p>

      <motion.div variants={fadeUp} className="flex w-full flex-wrap items-center gap-3 pt-1 sm:w-auto">
        <Button
          size="lg"
          arrow
          onClick={() => navigate(signUpPath("COMPANY"))}
          className="w-full sm:w-auto"
        >
          Publicar vacante
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => navigate(signUpPath("CANDIDATE"))}
          className="!w-full !border-white/25 !bg-transparent !text-text-on-dark hover:!border-white/50 hover:!bg-white/[.06] sm:!w-auto"
        >
          Ver talento verificado
        </Button>
      </motion.div>

      {/* Móvil: icono junto al texto (hay ancho de sobra). Desktop: icono encima,
          porque la columna izquierda ocupa el 42 % y en fila el texto se
          comprimía a ~110 px, partiendo cada descripción en cuatro líneas. */}
      <motion.div variants={fadeUp} className="hero-left__features grid w-full grid-cols-1 gap-5 pt-5 sm:grid-cols-3 sm:gap-6">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="flex items-start gap-3 sm:flex-col sm:gap-3">
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-md border border-white/10"
              style={{ backgroundColor: "rgba(74,69,255,.14)" }}
            >
              <feature.icon className="size-5 text-accent-soft" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-snug text-text-on-dark">{feature.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-text-on-dark-secondary">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="hero-left__footnote flex items-center gap-3 pt-6 text-[10px] font-medium uppercase tracking-[.3em] text-text-on-dark-secondary/40"
      >
        <span aria-hidden="true" className="h-px w-8 bg-text-on-dark-secondary/30" />
        <p className="leading-[1.7]">
          Personas
          <br />
          Ideas
          <br />
          Resultados reales
        </p>
      </motion.div>
      </div>
    </>
  );
}

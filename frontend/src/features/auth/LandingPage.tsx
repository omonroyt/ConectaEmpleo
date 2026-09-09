import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { BadgeCheck, ScanSearch, ShieldCheck } from "lucide-react";
import { BrandBackground } from "@/components/brand/BrandBackground";
import { Logo } from "@/components/brand/Logo";
import { LightSurface, PageContainer } from "@/components/layout";
import { Button, Card } from "@/components/ui";
import { useMotionSafe } from "@/lib/motion";

const principles = [
  {
    icon: ShieldCheck,
    title: "Evidencia sobre declaraciones",
    description: "No basta con decir que sabes hacer algo: lo demuestras y quedas respaldado por evidencia real.",
  },
  {
    icon: ScanSearch,
    title: "Matching explicable",
    description: "Cada compatibilidad viene con una explicación clara de por qué encajas, nunca una caja negra.",
  },
  {
    icon: BadgeCheck,
    title: "Primer filtro sin sesgos",
    description: "Las empresas conocen tus capacidades antes que tu nombre, tu foto o tu edad.",
  },
];

/** C0 — Landing `/`. Hero de marca + CTAs de acceso + principios sobre superficie clara. */
export function Component() {
  const navigate = useNavigate();
  const { fadeUp, pageSequence, staggerContainer, cardEntrance } = useMotionSafe();

  return (
    <div className="min-h-dvh bg-bg-dark">
      <div className="relative overflow-hidden px-6 pb-28 pt-8 sm:px-10 sm:pb-36 sm:pt-10">
        <BrandBackground asset="brand-main" presence="hero" overlay="full" priority ambient />
        <motion.div
          initial="hidden"
          animate="visible"
          variants={pageSequence}
          className="relative z-10 mx-auto flex max-w-3xl flex-col items-start gap-6 text-left"
        >
          <motion.div variants={fadeUp}>
            <Logo variant="light" size="md" />
          </motion.div>
          <motion.p
            variants={fadeUp}
            className="text-xs font-semibold uppercase tracking-[.18em] text-accent-soft"
          >
            Marketplace de talento verificado
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="text-4xl font-semibold leading-[1.05] text-text-on-dark sm:text-5xl lg:text-6xl"
          >
            No hacemos match entre vacantes y currículums. Hacemos match entre vacantes y capacidades
            demostradas.
          </motion.h1>
          <motion.p variants={fadeUp} className="max-w-xl text-lg text-text-on-dark-secondary">
            Conecta Empleo evalúa lo que las personas realmente saben hacer y lo explica con evidencia, para
            que empresas y candidatos avancen con confianza.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3 pt-2">
            <Button size="lg" arrow onClick={() => navigate("/register?role=CANDIDATE")}>
              Soy candidato
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate("/register?role=COMPANY")}
            >
              Soy empresa
            </Button>
            <Button variant="ghost" size="lg" onClick={() => navigate("/login")}>
              Ya tengo cuenta
            </Button>
          </motion.div>
        </motion.div>
      </div>

      <LightSurface>
        <PageContainer>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer(0.08, 0.05)}
            className="grid gap-4 sm:grid-cols-3"
          >
            {principles.map((principle) => (
              <motion.div key={principle.title} variants={cardEntrance}>
                <Card padding="lg" className="h-full">
                  <span className="flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <principle.icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-text-primary">{principle.title}</h3>
                  <p className="mt-2 text-sm text-text-secondary">{principle.description}</p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </PageContainer>
      </LightSurface>
    </div>
  );
}

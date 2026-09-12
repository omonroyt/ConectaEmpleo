import { forwardRef } from "react";
import { motion } from "motion/react";
import { ChevronUp, FileText, Mic, ClipboardCheck, BadgeCheck, ListOrdered, KeyRound } from "lucide-react";
import { Card, Eyebrow } from "@/components/ui";
import { useMotionSafe } from "@/lib/motion";

export interface HowItWorksProps {
  onHide: () => void;
}

const PASOS = [
  {
    icon: FileText,
    titulo: "Su CV, como lo tenga",
    texto: "Sube el que ya tiene o lo construye conversando con Sofía, que le pregunta lo que falta.",
  },
  {
    icon: Mic,
    titulo: "Una entrevista que escucha",
    texto: "Preguntas que se adaptan a cada respuesta, por voz o por escrito, con repreguntas cuando falta detalle.",
  },
  {
    icon: ClipboardCheck,
    titulo: "Evaluación con rúbricas",
    texto: "Cada competencia se califica con los mismos criterios para todas las personas, no a ojo.",
  },
  {
    icon: BadgeCheck,
    titulo: "Perfil de Talento Verificado",
    texto: "Qué demostró, con qué evidencia lo respalda y qué le falta para el siguiente nivel.",
  },
  {
    icon: ListOrdered,
    titulo: "Ranking anónimo",
    texto: "La empresa ve compatibilidad y evidencia, sin nombre ni foto, y con la explicación de cada porcentaje.",
  },
  {
    icon: KeyRound,
    titulo: "Desbloqueo al final",
    texto: "La identidad aparece solo cuando la empresa decide avanzar con esa persona en su proceso.",
  },
];

const REGLAS = [
  {
    titulo: "Anonimato en el primer filtro",
    texto: "Nombre, foto, edad y género no viajan en la tarjeta anónima ni llegan a la IA. Lo impiden los tipos de datos, no un ajuste de pantalla.",
  },
  {
    titulo: "La IA apoya, no decide",
    texto: "Ningún porcentaje aparece sin su explicación, y en ningún lado se lee «apto» o «reprobado». La decisión es de la empresa.",
  },
  {
    titulo: "Un número que se puede auditar",
    texto: "La compatibilidad la calcula código determinista sobre la evidencia; la IA solo redacta por qué salió ese número.",
  },
];

/**
 * Sección "Cómo funciona" de la landing. **No se renderiza por defecto**: la
 * monta `LandingPage` cuando se pulsa el enlace de la barra superior, para que
 * la portada siga cabiendo en una pantalla sin barra de desplazamiento.
 */
export const HowItWorks = forwardRef<HTMLElement, HowItWorksProps>(function HowItWorks({ onHide }, ref) {
  const { fadeUp, staggerContainer } = useMotionSafe();

  return (
    <motion.section
      ref={ref}
      id="como-funciona"
      aria-label="Cómo funciona"
      initial="hidden"
      animate="visible"
      variants={staggerContainer(0.06, 0.05)}
      data-seccion="como-funciona"
      className="relative z-10 mx-auto flex w-full max-w-[1440px] scroll-mt-16 flex-col gap-10 px-6 pb-16 pt-8 sm:px-8 sm:pb-20 lg:px-10"
    >
      <motion.div variants={fadeUp} className="flex flex-col gap-3">
        <Eyebrow tone="accent">Cómo funciona</Eyebrow>
        <h2 className="max-w-[22ch] text-balance text-3xl font-semibold tracking-[-0.03em] text-text-on-dark sm:text-4xl lg:text-5xl">
          De un currículum a evidencia, en seis pasos
        </h2>
        <p className="max-w-[60ch] text-pretty text-base text-text-on-dark-secondary sm:text-lg">
          La persona candidata demuestra lo que sabe una sola vez. La empresa recibe un ranking que
          puede explicar, sin datos que inviten a prejuzgar.
        </p>
      </motion.div>

      <motion.ol variants={staggerContainer(0.05, 0)} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PASOS.map((paso, indice) => (
          <motion.li key={paso.titulo} variants={fadeUp}>
            <Card variant="glass" padding="md" className="flex h-full flex-col gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-md border border-white/10"
                  style={{ backgroundColor: "rgba(74,69,255,.14)" }}
                >
                  <paso.icon className="size-5 text-accent-soft" aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-[.18em] text-text-on-dark-tertiary">
                  Paso {indice + 1}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-lg font-semibold leading-snug text-text-on-dark">{paso.titulo}</h3>
                <p className="text-sm leading-relaxed text-text-on-dark-secondary">{paso.texto}</p>
              </div>
            </Card>
          </motion.li>
        ))}
      </motion.ol>

      <motion.div variants={fadeUp} className="flex flex-col gap-4">
        <h3 className="text-xl font-semibold tracking-[-0.02em] text-text-on-dark sm:text-2xl">
          Lo que no negociamos
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {REGLAS.map((regla) => (
            <div key={regla.titulo} className="flex flex-col gap-1.5 border-l-2 border-primary-2/50 pl-4">
              <p className="text-[15px] font-semibold text-text-on-dark">{regla.titulo}</p>
              <p className="text-sm leading-relaxed text-text-on-dark-secondary">{regla.texto}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="flex justify-center">
        <button
          type="button"
          onClick={onHide}
          className="inline-flex items-center gap-2 rounded-pill border border-white/15 px-4 py-2 text-sm font-medium text-text-on-dark-secondary transition-colors duration-fast ease-standard hover:border-white/35 hover:text-text-on-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2"
        >
          <ChevronUp className="size-4" aria-hidden="true" />
          Ocultar y volver arriba
        </button>
      </motion.div>
    </motion.section>
  );
});

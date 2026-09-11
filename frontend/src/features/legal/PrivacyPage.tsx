import type { ReactNode } from "react";
import { Link } from "react-router";
import { BrandBackground } from "@/components/brand/BrandBackground";
import { Logo } from "@/components/brand/Logo";
import { Button, Card, Eyebrow } from "@/components/ui";

/**
 * Aviso de privacidad integral (LFPDPPP, México). Ruta pública `/privacidad`,
 * enlazada desde la landing y desde las pantallas de acceso.
 *
 * Solo afirma lo que el producto hace de verdad: la anonimización estructural
 * del primer filtro, qué recibe la IA y qué proveedores intervienen. Si cambia
 * alguna de esas piezas, hay que actualizar también esta página y su fecha.
 */

const UPDATED_AT = "11 de septiembre de 2026";
const CONTACT_EMAIL = "privacidad@conectaempleo.xyz";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold tracking-[-0.02em] text-text-primary sm:text-[1.375rem]">{title}</h2>
      <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-text-secondary sm:text-base">
        {children}
      </div>
    </section>
  );
}

function List({ children }: { children: ReactNode }) {
  return <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-text-tertiary">{children}</ul>;
}

export function Component() {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-bg-dark">
      <BrandBackground asset="brand-main" presence="support" overlay="bottom" ambient />

      <div className="relative z-10 mx-auto flex w-full max-w-[52rem] flex-col gap-8 px-6 py-10 sm:px-8 sm:py-14">
        <header className="flex flex-col gap-6">
          <Link
            to="/"
            className="w-fit rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-2"
          >
            <Logo variant="light" size="sm" icon />
          </Link>
          <div className="flex flex-col gap-3">
            <Eyebrow tone="accent">Aviso de privacidad</Eyebrow>
            <h1 className="text-balance text-4xl font-semibold tracking-[-0.03em] text-text-on-dark sm:text-5xl">
              Cómo cuidamos tus datos
            </h1>
            <p className="text-pretty text-base text-text-on-dark-secondary sm:text-lg">
              Última actualización: {UPDATED_AT}.
            </p>
          </div>
        </header>

        <Card variant="light" padding="lg" className="flex flex-col gap-8">
          <p className="text-[15px] leading-relaxed text-text-secondary sm:text-base">
            Conecta Empleo es una plataforma de talento verificado por inteligencia artificial. Este
            aviso explica qué datos personales tratamos, para qué los usamos y cómo puedes
            controlarlos, conforme a la Ley Federal de Protección de Datos Personales en Posesión de
            los Particulares.
          </p>

          <Section title="Quién es responsable de tus datos">
            <p>
              El responsable del tratamiento es el equipo de <strong>Conecta Empleo</strong>, proyecto
              desarrollado para el Hackatón IA de UTEL y Hostinger en septiembre de 2026. Puedes
              contactarnos en <strong>{CONTACT_EMAIL}</strong> para cualquier asunto relacionado con
              tus datos personales.
            </p>
            <p>
              Durante la evaluación del hackatón, la plataforma funciona con acceso por invitación:
              solo entran las cuentas que entrega el equipo.
            </p>
          </Section>

          <Section title="Qué datos recabamos">
            <List>
              <li>
                <strong>Identificación y contacto:</strong> nombre, correo electrónico y teléfono.
              </li>
              <li>
                <strong>Perfil profesional:</strong> experiencia, estudios, habilidades, ubicación
                (ciudad y estado), disponibilidad y expectativa de sueldo.
              </li>
              <li>
                <strong>Documentos:</strong> el currículum y los certificados que decidas subir.
              </li>
              <li>
                <strong>Entrevista:</strong> tus respuestas, su transcripción y la evaluación que se
                genera a partir de ellas.
              </li>
              <li>
                <strong>Voz:</strong> si eliges la entrevista hablada, el audio de tus respuestas.
              </li>
              <li>
                <strong>Datos opcionales:</strong> fecha de nacimiento y género, solo si decides
                proporcionarlos.
              </li>
            </List>
            <p>
              No te pedimos datos sensibles (salud, origen étnico, creencias religiosas, afiliación
              sindical u orientación sexual). Te pedimos que tampoco los incluyas en tu currículum ni
              en tus respuestas.
            </p>
          </Section>

          <Section title="Para qué los usamos">
            <List>
              <li>Construir tu Perfil de Talento Verificado y la evidencia que lo respalda.</li>
              <li>Realizar tu entrevista y evaluarla con rúbricas.</li>
              <li>Calcular tu compatibilidad con las vacantes y explicarte el resultado.</li>
              <li>Mostrar tu perfil anónimo a las empresas y permitirte postularte.</li>
              <li>Dar soporte, prevenir abusos y mantener la seguridad de la plataforma.</li>
            </List>
            <p>
              No usamos tus datos para publicidad, no los vendemos y no tomamos decisiones sobre ti
              sin explicarte en qué se basan.
            </p>
          </Section>

          <Section title="Qué ven las empresas">
            <p>
              En el primer filtro, las empresas ven una tarjeta anónima: tu nombre, tu foto, tu edad
              y tu género no viajan en ella. Solo cuando una empresa desbloquea tu perfil, dentro de
              su proceso para una vacante, conoce tu identidad y tus datos de contacto.
            </p>
            <p>
              El porcentaje de compatibilidad lo calcula código determinista a partir de tu
              evidencia; la inteligencia artificial solo redacta la explicación de ese resultado.
            </p>
          </Section>

          <Section title="Qué recibe la inteligencia artificial">
            <p>
              A los modelos de IA nunca se les envía tu nombre, tu foto, tu fecha de nacimiento ni tu
              género: el formato de datos que reciben no incluye esos campos. Trabajan con tu
              experiencia, tus habilidades y tus respuestas.
            </p>
            <p>
              Si eliges la entrevista hablada, tu audio se envía a nuestro proveedor de voz para
              transcribirlo. Lo que conservamos es la transcripción, que es la base de tu evaluación.
              Siempre puedes hacer la entrevista por escrito.
            </p>
          </Section>

          <Section title="Con quién compartimos tus datos">
            <p>
              Solo con los proveedores tecnológicos que hacen funcionar la plataforma, y únicamente
              con los datos que cada uno necesita:
            </p>
            <List>
              <li>
                <strong>Anthropic (Claude):</strong> modelo de lenguaje para la entrevista, la
                evaluación y las explicaciones.
              </li>
              <li>
                <strong>ElevenLabs:</strong> transcripción y síntesis de voz.
              </li>
              <li>
                <strong>Railway y Hostinger:</strong> alojamiento de la aplicación y de la base de
                datos.
              </li>
              <li>
                <strong>Cloudflare:</strong> DNS y protección del sitio.
              </li>
            </List>
            <p>
              Algunos de estos proveedores operan fuera de México. Estas transferencias son las
              necesarias para prestarte el servicio. Fuera de ellas, no compartimos tus datos con
              terceros.
            </p>
          </Section>

          <Section title="Cuánto tiempo los conservamos">
            <p>
              Conservamos tus datos mientras tu cuenta esté activa y mientras dure la evaluación del
              hackatón. Al terminar, los eliminamos o los dejamos sin posibilidad de identificarte.
              Puedes pedir su eliminación antes, cuando quieras.
            </p>
          </Section>

          <Section title="Tus derechos ARCO">
            <p>
              Puedes pedir <strong>acceso</strong> a tus datos, su <strong>rectificación</strong> si
              son incorrectos, su <strong>cancelación</strong> cuando consideres que no debemos
              tratarlos, y <strong>oponerte</strong> a un uso concreto. También puedes revocar tu
              consentimiento en cualquier momento.
            </p>
            <p>
              Escríbenos a <strong>{CONTACT_EMAIL}</strong> indicando tu nombre, el correo de tu
              cuenta, qué derecho quieres ejercer y sobre qué datos. Te responderemos en un máximo de
              20 días hábiles. Para confirmar que eres tú, podemos pedirte una identificación
              oficial, que usaremos solo para eso.
            </p>
          </Section>

          <Section title="Cookies y almacenamiento del navegador">
            <p>
              Guardamos tu sesión en el almacenamiento de tu navegador para que no tengas que entrar
              en cada pantalla. No usamos cookies de publicidad ni de seguimiento entre sitios.
              Cloudflare puede colocar cookies técnicas de seguridad para distinguir tráfico legítimo
              de automatizado.
            </p>
          </Section>

          <Section title="Cómo protegemos tus datos">
            <p>
              El sitio y la API viajan cifrados con HTTPS, tus contraseñas se guardan con un
              algoritmo de cifrado irreversible y el acceso a la plataforma está restringido a
              cuentas invitadas durante la evaluación. Ningún sistema es infalible, pero trabajamos
              para que un incidente sea improbable y, si ocurriera, te avisaríamos.
            </p>
          </Section>

          <Section title="Cambios a este aviso">
            <p>
              Si cambiamos la forma en que tratamos tus datos, publicaremos la nueva versión en esta
              misma página y actualizaremos su fecha. Te recomendamos revisarla de vez en cuando.
            </p>
          </Section>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button href="/" variant="secondary">
            Volver al inicio
          </Button>
          <p className="text-xs text-text-on-dark-secondary/70">
            ¿Dudas sobre tus datos? Escríbenos a {CONTACT_EMAIL}.
          </p>
        </div>
      </div>
    </div>
  );
}

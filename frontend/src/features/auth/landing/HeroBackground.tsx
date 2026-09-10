/**
 * Fondo del hero — 07_LANDING_HERO.md §2. Construido enteramente en CSS
 * (sin imagen nueva): base casi negra, dos haces diagonales azul/violeta,
 * halo radial detrás de los paneles, suelo reflectante y grano sutil.
 * El halo respira lentamente en opacidad; `prefers-reduced-motion` lo
 * congela vía la variante `motion-reduce` de Tailwind.
 */
export function HeroBackground() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-bg-dark">
      <style>{`
        @keyframes hero-halo-breathe {
          0%, 100% { opacity: .55; }
          50% { opacity: .85; }
        }
        .hero-halo {
          animation: hero-halo-breathe 14s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-halo { animation: none; opacity: .7; }
        }
      `}</style>

      {/* Haz diagonal principal: borde definido para que se lea como un rayo de
          luz entrando por la derecha, no como una neblina azul uniforme. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(105deg, transparent 46%, rgba(78,96,255,.30) 56%, rgba(120,140,255,.62) 63%, rgba(78,96,255,.22) 70%, transparent 84%)",
          mixBlendMode: "screen",
        }}
      />
      {/* Haz secundario, más abierto y violeta, para dar volumen. Contenido a la
          mitad superior: al cubrir todo el alto teñía de lavanda la esquina
          inferior derecha y el fondo perdía la profundidad casi negra. */}
      <div
        className="absolute inset-x-0 top-0 h-[62%]"
        style={{
          background:
            "linear-gradient(88deg, transparent 52%, rgba(101,67,255,.30) 68%, transparent 90%)",
          mixBlendMode: "screen",
        }}
      />
      {/* Vignette inferior: devuelve el negro profundo bajo los paneles. */}
      <div
        className="absolute inset-x-0 bottom-0 h-[46%]"
        style={{
          background: "linear-gradient(to top, rgba(4,6,14,.88), transparent)",
        }}
      />
      {/* Corte oscuro inferior izquierdo: sin él la luz inunda la columna de
          texto y el titular pierde contraste. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, rgba(5,7,16,.92) 0%, rgba(5,7,16,.62) 34%, transparent 58%)",
        }}
      />
      {/* Halo radial detrás de los paneles */}
      <div
        className="hero-halo absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 74% 34%, rgba(90,90,255,.42), transparent 58%)",
        }}
      />
      {/* Suelo reflectante */}
      <div
        className="absolute inset-x-0 bottom-0 h-[22%]"
        style={{
          background: "linear-gradient(to top, rgba(120,140,255,.10), transparent)",
        }}
      />
      {/* Grano sutil para evitar banding */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.025,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}

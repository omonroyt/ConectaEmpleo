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

      {/* Haz diagonal 1 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(18deg, transparent 40%, rgba(60,82,255,.45) 62%, transparent 82%)",
          mixBlendMode: "screen",
        }}
      />
      {/* Haz diagonal 2 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(22deg, transparent 55%, rgba(101,67,255,.28) 72%, transparent 92%)",
          mixBlendMode: "screen",
        }}
      />
      {/* Halo radial detrás de los paneles */}
      <div
        className="hero-halo absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 72% 38%, rgba(74,69,255,.35), transparent 60%)",
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

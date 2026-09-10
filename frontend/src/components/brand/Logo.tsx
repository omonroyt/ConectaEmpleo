import { cn } from "@/lib/cn";

export interface LogoProps {
  /** "dark" = texto oscuro (fondos claros); "light" = texto blanco (fondos oscuros). */
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  /**
   * Icono de marca provisional: dos formas geométricas en gradiente que se
   * superponen sugiriendo dos piezas que encajan (empresa y candidato).
   * Opcional para no alterar los usos existentes del wordmark solo-texto.
   */
  icon?: boolean;
  className?: string;
}

const sizeMap: Record<NonNullable<LogoProps["size"]>, number> = {
  sm: 16,
  md: 20,
  lg: 28,
};

let gradientId = 0;

/**
 * Wordmark tipográfico "Conecta Empleo" con un punto de acento en gradiente
 * de marca justo después del texto. SVG inline simple, sin imagen.
 */
export function Logo({ variant = "light", size = "md", icon = false, className }: LogoProps) {
  const fontSize = sizeMap[size];
  const textColor = variant === "light" ? "#f7f8fc" : "#0a0b10";
  const id = `logo-dot-gradient-${(gradientId += 1)}`;
  const height = fontSize * 1.4;
  const baseline = height * 0.72;
  // Ancho de texto aproximado (Inter 600, "Conecta Empleo" ~14 caracteres).
  const textWidth = fontSize * 7.9;
  const dotGap = fontSize * 0.22;
  const dotRadius = fontSize * 0.09;
  // Icono: dos cuadrados redondeados en gradiente, ligeramente rotados en
  // direcciones opuestas y superpuestos, para leerse como dos piezas que
  // encajan (empresa + candidato) en vez de un placeholder gris.
  const iconSize = height * 0.86;
  const iconGap = icon ? fontSize * 0.4 : 0;
  const textX = icon ? iconSize + iconGap : 0;
  const width = textX + textWidth + dotGap * 2 + dotRadius * 2;

  return (
    <svg
      role="img"
      aria-label="Conecta Empleo"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn("select-none", className)}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#173cff" />
          <stop offset="55%" stopColor="#4e46ff" />
          <stop offset="100%" stopColor="#9271ff" />
        </linearGradient>
      </defs>
      {icon && (
        <g transform={`translate(0, ${(height - iconSize) / 2})`}>
          <rect
            x={iconSize * 0.05}
            y={iconSize * 0.16}
            width={iconSize * 0.62}
            height={iconSize * 0.62}
            rx={iconSize * 0.2}
            fill={`url(#${id})`}
            transform={`rotate(-10, ${iconSize * 0.36}, ${iconSize * 0.47})`}
          />
          <rect
            x={iconSize * 0.4}
            y={iconSize * 0.24}
            width={iconSize * 0.56}
            height={iconSize * 0.56}
            rx={iconSize * 0.18}
            fill={`url(#${id})`}
            opacity={0.82}
            transform={`rotate(12, ${iconSize * 0.68}, ${iconSize * 0.52})`}
          />
        </g>
      )}
      <text
        x={textX}
        y={baseline}
        fontFamily="var(--font-sans)"
        fontWeight={600}
        fontSize={fontSize}
        fill={textColor}
      >
        Conecta Empleo
      </text>
      <circle
        cx={textX + textWidth + dotGap + dotRadius}
        cy={baseline - fontSize * 0.32}
        r={dotRadius}
        fill={`url(#${id})`}
      />
    </svg>
  );
}

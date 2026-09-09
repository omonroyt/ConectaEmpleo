import { cn } from "@/lib/cn";

export interface LogoProps {
  /** "dark" = texto oscuro (fondos claros); "light" = texto blanco (fondos oscuros). */
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
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
export function Logo({ variant = "light", size = "md", className }: LogoProps) {
  const fontSize = sizeMap[size];
  const textColor = variant === "light" ? "#f7f8fc" : "#0a0b10";
  const id = `logo-dot-gradient-${(gradientId += 1)}`;
  const height = fontSize * 1.4;
  const baseline = height * 0.72;
  // Ancho de texto aproximado (Inter 600, "Conecta Empleo" ~14 caracteres).
  const textWidth = fontSize * 7.9;
  const dotGap = fontSize * 0.22;
  const dotRadius = fontSize * 0.09;
  const width = textWidth + dotGap * 2 + dotRadius * 2;

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
      <text
        x="0"
        y={baseline}
        fontFamily="var(--font-sans)"
        fontWeight={600}
        fontSize={fontSize}
        fill={textColor}
      >
        Conecta Empleo
      </text>
      <circle
        cx={textWidth + dotGap + dotRadius}
        cy={baseline - fontSize * 0.32}
        r={dotRadius}
        fill={`url(#${id})`}
      />
    </svg>
  );
}

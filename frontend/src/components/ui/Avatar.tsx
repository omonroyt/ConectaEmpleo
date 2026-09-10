import { useSurfaceTone, type SurfaceTone } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";

export interface AvatarProps {
  name?: string;
  src?: string;
  /** Si es `true`, nunca muestra foto ni nombre real: solo un monograma neutro. */
  anonymous?: boolean;
  /** Semilla para variar el tono del monograma (ej. código anónimo del candidato). */
  seed?: string;
  size?: "sm" | "md" | "lg";
  /** Fuerza la paleta; por defecto la hereda del panel (`Surface`/`Card`). */
  tone?: SurfaceTone;
  className?: string;
}

const sizeClasses: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "size-8 text-xs",
  md: "size-11 text-sm",
  lg: "size-16 text-lg",
};

const tonesLight = [
  "bg-primary/15 text-primary",
  "bg-accent/20 text-accent",
  "bg-success-soft text-success",
  "bg-warning-soft text-warning",
];

const tonesDark = [
  "bg-primary/20 text-primary-on-dark",
  "bg-accent/25 text-accent-soft",
  "bg-success/20 text-success-on-dark",
  "bg-warning/20 text-warning-on-dark",
];

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "?";
}

/** Avatar con foto, iniciales o (si `anonymous`) monograma neutro — nunca muestra foto anónima. */
export function Avatar({
  name,
  src,
  anonymous = false,
  seed,
  size = "md",
  tone,
  className,
}: AvatarProps) {
  const resolved = useSurfaceTone(tone);
  const tones = resolved === "dark" ? tonesDark : tonesLight;
  const toneClass = tones[hashSeed(seed ?? name ?? "conecta") % tones.length];

  if (!anonymous && src) {
    return (
      <img
        src={src}
        alt={name ?? ""}
        className={cn("shrink-0 rounded-full object-cover", sizeClasses[size], className)}
      />
    );
  }

  const label = anonymous ? "Perfil anónimo" : (name ?? "Usuario");
  const content = anonymous ? "?" : initialsFrom(name ?? "?");

  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        sizeClasses[size],
        toneClass,
        className,
      )}
    >
      {content}
    </span>
  );
}

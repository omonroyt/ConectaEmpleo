import { cn } from "@/lib/cn";

export interface AvatarProps {
  name?: string;
  src?: string;
  /** Si es `true`, nunca muestra foto ni nombre real: solo un monograma neutro. */
  anonymous?: boolean;
  /** Semilla para variar el tono del monograma (ej. código anónimo del candidato). */
  seed?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "size-8 text-xs",
  md: "size-11 text-sm",
  lg: "size-16 text-lg",
};

const tones = [
  "bg-primary/15 text-primary",
  "bg-accent/20 text-accent",
  "bg-success-soft text-success",
  "bg-warning-soft text-warning",
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
export function Avatar({ name, src, anonymous = false, seed, size = "md", className }: AvatarProps) {
  const tone = tones[hashSeed(seed ?? name ?? "conecta") % tones.length];

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
        tone,
        className,
      )}
    >
      {content}
    </span>
  );
}

import { CheckCircle2, Circle, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { VerificationStatus, VerificationView } from "@/api/types";

const STATUS_CONFIG: Record<VerificationStatus, { label: string; tone: BadgeTone; icon: typeof ShieldCheck }> = {
  VERIFIED: { label: "Verificada", tone: "success", icon: ShieldCheck },
  PENDING: { label: "Verificación pendiente", tone: "warning", icon: ShieldAlert },
  UNVERIFIED: { label: "Sin verificar", tone: "neutral", icon: ShieldQuestion },
};

/** Badge compacto de verificación, usado en el header de home y en el perfil de empresa. */
export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <Badge tone={config.tone} className="gap-1.5">
      <Icon className="size-3.5" aria-hidden="true" />
      {config.label}
    </Badge>
  );
}

export interface VerificationCardProps {
  verification: VerificationView | undefined;
  loading?: boolean;
}

/** Card "Estado de verificación": lista de checks visuales (sin acción real en el MVP). */
export function VerificationCard({ verification, loading }: VerificationCardProps) {
  if (loading || !verification) {
    return (
      <Card padding="md">
        <Skeleton className="h-5 w-40" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-text-primary">Estado de verificación</h3>
        <VerificationBadge status={verification.status} />
      </div>
      <ul className="mt-4 space-y-2.5">
        {verification.checks.map((check) => (
          <li key={check.label} className="flex items-center gap-2 text-sm">
            {check.done ? (
              <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <Circle className="size-4 shrink-0 text-text-tertiary" aria-hidden="true" />
            )}
            <span className={check.done ? "text-text-primary" : "text-text-secondary"}>{check.label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-text-tertiary">Verificación visual para el MVP.</p>
    </Card>
  );
}

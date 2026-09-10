import { Bell } from "lucide-react";
import { useNotifications } from "@/api/hooks";
import { PageContainer } from "@/components/layout";
import { Badge, Card, EmptyState, PageHeader, Reveal, RevealGroup, Skeleton } from "@/components/ui";
import { formatDate } from "@/lib/format";

/**
 * Notificaciones, reutilizable por ambos roles. El shell
 * (`CandidateShell`/`EmployerShell`) lo aporta la ruta que la monta.
 */
export function NotificationsPage() {
  const notificationsQuery = useNotifications();
  const notifications = notificationsQuery.data ?? [];

  return (
    <PageContainer className="py-10 md:py-14">
      <PageHeader
        eyebrow="Tu actividad"
        title="Notificaciones"
        subtitle="Avisos sobre tu evaluación, tus vacantes y tus procesos de selección."
      />

      <div className="mt-8 max-w-3xl">
        {notificationsQuery.isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : notificationsQuery.isError ? (
          <p className="text-sm text-danger-on-dark">
            No pudimos cargar tus notificaciones. Intenta recargar la página.
          </p>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Aún no tienes notificaciones"
            description="Aquí verás avisos sobre tu evaluación, tus vacantes y tus procesos de selección."
          />
        ) : (
          <RevealGroup as="ul" className="flex flex-col gap-3">
            {notifications.map((notification) => (
              <Reveal as="li" key={notification.id}>
                <Card
                  variant="glass"
                  padding="md"
                  className="flex items-start gap-3.5"
                  // Lo no leído se marca con un filo de acento a la izquierda,
                  // no solo con un punto: se distingue de un vistazo al recorrer
                  // la lista.
                >
                  <span
                    aria-hidden="true"
                    className={
                      notification.read
                        ? "mt-2 size-2 shrink-0 rounded-full bg-white/15"
                        : "mt-2 size-2 shrink-0 rounded-full bg-gradient-cta shadow-[0_0_10px_rgba(74,69,255,.9)]"
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-pretty font-semibold text-text-on-dark">
                        {notification.title}
                      </p>
                      {!notification.read && <Badge tone="info">Nuevo</Badge>}
                    </div>
                    <p className="mt-1 text-pretty text-sm leading-relaxed text-text-on-dark-secondary">
                      {notification.body}
                    </p>
                    <p className="mt-2 text-xs tabular-nums text-text-on-dark-tertiary">
                      {formatDate(notification.created_at)}
                    </p>
                  </div>
                </Card>
              </Reveal>
            ))}
          </RevealGroup>
        )}
      </div>
    </PageContainer>
  );
}

export { NotificationsPage as Component };

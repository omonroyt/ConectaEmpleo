import { Bell } from "lucide-react";
import { useNotifications } from "@/api/hooks";
import { PageContainer } from "@/components/layout";
import { Badge, Card, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { formatDate } from "@/lib/format";

/**
 * Stub P2 (03 §C15 / 04 §E13): notificaciones, reutilizable por ambos roles.
 * El shell (`CandidateShell`/`EmployerShell`) lo aporta la ruta que la monta.
 */
export function NotificationsPage() {
  const notificationsQuery = useNotifications();
  const notifications = notificationsQuery.data ?? [];

  return (
    <PageContainer className="py-10">
      <PageHeader title="Notificaciones" subtitle="Avisos sobre tu actividad en Conecta Empleo." />

      <div className="mt-6 flex flex-col gap-3">
        {notificationsQuery.isLoading ? (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        ) : notificationsQuery.isError ? (
          <p className="text-sm text-danger">No pudimos cargar tus notificaciones. Intenta recargar la página.</p>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Aún no tienes notificaciones"
            description="Aquí verás avisos sobre tu evaluación, tus vacantes y tus procesos de selección."
          />
        ) : (
          notifications.map((notification) => (
            <Card key={notification.id} padding="md" className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={
                  notification.read
                    ? "mt-1.5 size-2 shrink-0 rounded-full bg-transparent"
                    : "mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                }
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-text-primary">{notification.title}</p>
                  {!notification.read && <Badge tone="info">Nuevo</Badge>}
                </div>
                <p className="mt-1 text-sm text-text-secondary">{notification.body}</p>
                <p className="mt-2 text-xs text-text-tertiary">{formatDate(notification.created_at)}</p>
              </div>
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  );
}

export { NotificationsPage as Component };

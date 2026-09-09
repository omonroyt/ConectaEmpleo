import { MessageSquare } from "lucide-react";
import { useMessages } from "@/api/hooks";
import { PageContainer } from "@/components/layout";
import { Avatar, Badge, Card, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { formatDate } from "@/lib/format";

/**
 * Stub P2 (03 §C15 / 04 §E13): mensajería, reutilizable por ambos roles.
 * El shell (`CandidateShell`/`EmployerShell`) lo aporta la ruta que la monta.
 * Sin lógica real (no hay envío de mensajes en el alcance de F8): solo lista los hilos.
 */
export function MessagesPage() {
  const messagesQuery = useMessages();
  const threads = messagesQuery.data ?? [];

  return (
    <PageContainer className="py-10">
      <PageHeader title="Mensajes" subtitle="Conversaciones con tus procesos de selección." />

      <div className="mt-6 flex flex-col gap-3">
        {messagesQuery.isLoading ? (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        ) : messagesQuery.isError ? (
          <p className="text-sm text-danger">No pudimos cargar tus mensajes. Intenta recargar la página.</p>
        ) : threads.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Aún no tienes conversaciones"
            description="Cuando una empresa o un candidato te escriba, lo verás aquí."
          />
        ) : (
          threads.map((thread) => (
            <Card key={thread.id} padding="md" className="flex items-center gap-3">
              <Avatar name={thread.counterpart} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold text-text-primary">{thread.counterpart}</p>
                  {thread.unread > 0 && <Badge tone="info">{thread.unread}</Badge>}
                </div>
                <p className="mt-1 truncate text-sm text-text-secondary">{thread.last_message}</p>
              </div>
              <p className="shrink-0 text-xs text-text-tertiary">{formatDate(thread.updated_at)}</p>
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  );
}

export { MessagesPage as Component };

import { MessageSquare } from "lucide-react";
import { useMessages } from "@/api/hooks";
import { PageContainer } from "@/components/layout";
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Reveal,
  RevealGroup,
  Skeleton,
} from "@/components/ui";
import { formatDate } from "@/lib/format";

/**
 * Mensajería, reutilizable por ambos roles. El shell
 * (`CandidateShell`/`EmployerShell`) lo aporta la ruta que la monta.
 * Lista los hilos; el envío de mensajes no está en el alcance actual.
 */
export function MessagesPage() {
  const messagesQuery = useMessages();
  const threads = messagesQuery.data ?? [];

  return (
    <PageContainer className="py-10 md:py-14">
      <PageHeader
        eyebrow="Tus conversaciones"
        title="Mensajes"
        subtitle="Conversaciones con tus procesos de selección."
      />

      <div className="mt-8 max-w-3xl">
        {messagesQuery.isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : messagesQuery.isError ? (
          <p className="text-sm text-danger-on-dark">
            No pudimos cargar tus mensajes. Intenta recargar la página.
          </p>
        ) : threads.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Aún no tienes conversaciones"
            description="Cuando una empresa o un candidato te escriba, lo verás aquí."
          />
        ) : (
          <RevealGroup as="ul" className="flex flex-col gap-3">
            {threads.map((thread) => (
              <Reveal as="li" key={thread.id}>
                <Card variant="glass" padding="md" interactive spotlight className="flex items-center gap-3.5">
                  <Avatar name={thread.counterpart} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-text-on-dark">{thread.counterpart}</p>
                      {thread.unread > 0 && <Badge tone="info">{thread.unread}</Badge>}
                    </div>
                    <p className="mt-1 truncate text-sm text-text-on-dark-secondary">
                      {thread.last_message}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs tabular-nums text-text-on-dark-tertiary">
                    {formatDate(thread.updated_at)}
                  </p>
                </Card>
              </Reveal>
            ))}
          </RevealGroup>
        )}
      </div>
    </PageContainer>
  );
}

export { MessagesPage as Component };

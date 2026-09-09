import { type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/ui/Toast";
import { queryClient } from "@/api/queryClient";

export interface AppProvidersProps {
  children: ReactNode;
}

/** Providers globales de la app: TanStack Query + cola de Toasts (`useToast`). */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}

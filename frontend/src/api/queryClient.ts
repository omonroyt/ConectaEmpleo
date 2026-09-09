import { QueryClient } from "@tanstack/react-query";

/**
 * Instancia única de QueryClient. Se importa tanto en `app/providers.tsx`
 * (para el Provider de React) como en `store/session.ts` (para limpiar el
 * caché al cerrar sesión) sin crear una dependencia circular con los hooks.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
    },
  },
});

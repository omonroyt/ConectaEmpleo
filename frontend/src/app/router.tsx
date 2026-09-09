import { createBrowserRouter, type RouteObject } from "react-router";
import { LandingPlaceholder } from "@/app/LandingPlaceholder";
import { RoutePlaceholder } from "@/app/RoutePlaceholder";
import { NotFoundPage } from "@/app/NotFoundPage";
import { candidateRoutes } from "@/features/candidate/candidate.routes";
import { employerRoutes } from "@/features/employer/employer.routes";

// Ruta de verificación visual del design system (F1), solo en desarrollo.
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: "/dev/ui",
        lazy: async () => {
          const { DevKitchenSink } = await import("@/app/DevKitchenSink");
          return { Component: DevKitchenSink };
        },
      },
    ]
  : [];

export const router = createBrowserRouter([
  { path: "/", element: <LandingPlaceholder /> },
  { path: "/login", element: <RoutePlaceholder name="Iniciar sesión" /> },
  { path: "/register", element: <RoutePlaceholder name="Crear cuenta" /> },
  { path: "/candidate", children: candidateRoutes },
  { path: "/employer", children: employerRoutes },
  ...devRoutes,
  { path: "*", element: <NotFoundPage /> },
]);

import { createBrowserRouter } from "react-router";
import { LandingPlaceholder } from "@/app/LandingPlaceholder";
import { RoutePlaceholder } from "@/app/RoutePlaceholder";
import { NotFoundPage } from "@/app/NotFoundPage";
import { candidateRoutes } from "@/features/candidate/candidate.routes";
import { employerRoutes } from "@/features/employer/employer.routes";

export const router = createBrowserRouter([
  { path: "/", element: <LandingPlaceholder /> },
  { path: "/login", element: <RoutePlaceholder name="Iniciar sesión" /> },
  { path: "/register", element: <RoutePlaceholder name="Crear cuenta" /> },
  { path: "/candidate", children: candidateRoutes },
  { path: "/employer", children: employerRoutes },
  { path: "*", element: <NotFoundPage /> },
]);

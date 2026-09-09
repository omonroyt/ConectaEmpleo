import type { RouteObject } from "react-router";
import { RoutePlaceholder } from "@/app/RoutePlaceholder";
import { EmployerShellRoute } from "./EmployerShellRoute";

/**
 * Rutas del área empresa (montadas bajo `/employer`, ya protegidas por rol).
 *
 *  - `shellRoutes`: pantallas con navegación (`EmployerShell`). Rutas relativas a `/employer`.
 *  - `immersiveRoutes`: pantallas sin navegación (onboarding, nueva vacante, perfil ideal) con `ImmersiveLayout`.
 *
 * Cada tarea (F6/F7) agrega SUS entradas de forma aditiva con `lazy`.
 * Volver a leer este archivo justo antes de editarlo: otras tareas escriben en paralelo.
 */

// ---- F6: index (home), company, vacancies, vacancies/:id -------------------------
// ---- F7: vacancies/:id/talent, vacancies/:id/compare, vacancies/:id/shortlist,
//          candidates/:matchResultId, candidates/:matchResultId/full ---------------
const shellRoutes: RouteObject[] = [
  { index: true, element: <RoutePlaceholder name="Empresa — Inicio (F6)" /> },
];

// ---- F6: onboarding, vacancies/new, vacancies/:id/ideal-profile -----------------
const immersiveRoutes: RouteObject[] = [];

export const employerRoutes: RouteObject[] = [
  { element: <EmployerShellRoute />, children: shellRoutes },
  ...immersiveRoutes,
];

import type { RouteObject } from "react-router";
import { RoutePlaceholder } from "@/app/RoutePlaceholder";
import { CandidateShellRoute } from "./CandidateShellRoute";

/**
 * Rutas del área candidato (montadas bajo `/candidate`, ya protegidas por rol).
 *
 * Dos grupos:
 *  - `shellRoutes`: pantallas con navegación (`CandidateShell`). Rutas relativas a `/candidate`.
 *  - `immersiveRoutes`: pantallas sin navegación (onboarding, CV, entrevista) que usan `ImmersiveLayout`.
 *
 * Cada tarea (F3/F4/F5) agrega SUS entradas de forma aditiva con `lazy`.
 * Volver a leer este archivo justo antes de editarlo: otras tareas escriben en paralelo.
 */

// ---- F3: home ---------------------------------------------------------------
// ---- F5: profile, opportunities ----------------------------------------------
const shellRoutes: RouteObject[] = [
  { index: true, element: <RoutePlaceholder name="Candidato — Inicio (F3)" /> },
];

// ---- F3: onboarding, cv/* ------------------------------------------------------
// ---- F4: interview/* -----------------------------------------------------------
const immersiveRoutes: RouteObject[] = [];

export const candidateRoutes: RouteObject[] = [
  { element: <CandidateShellRoute />, children: shellRoutes },
  ...immersiveRoutes,
];

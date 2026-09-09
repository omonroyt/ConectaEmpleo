import type { RouteObject } from "react-router";
import { RoutePlaceholder } from "@/app/RoutePlaceholder";

/**
 * Rutas del área candidato. Cada tarea (F3/F4/F5) agrega sus entradas aquí
 * de forma aditiva — no reemplazar el arreglo completo.
 */
export const candidateRoutes: RouteObject[] = [
  {
    index: true,
    element: <RoutePlaceholder name="Candidato — Inicio" />,
  },
];

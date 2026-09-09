import type { RouteObject } from "react-router";
import { RoutePlaceholder } from "@/app/RoutePlaceholder";

/**
 * Rutas del área empresa. Cada tarea (F6/F7) agrega sus entradas aquí
 * de forma aditiva — no reemplazar el arreglo completo.
 */
export const employerRoutes: RouteObject[] = [
  {
    index: true,
    element: <RoutePlaceholder name="Empresa — Inicio" />,
  },
];

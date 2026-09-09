import type { RouteObject } from "react-router";
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
  {
    index: true,
    lazy: async () => {
      const { HomePage } = await import("@/features/employer/home/HomePage");
      return { Component: HomePage };
    },
  },
  {
    path: "company",
    lazy: async () => {
      const { CompanyProfilePage } = await import("@/features/employer/company/CompanyProfilePage");
      return { Component: CompanyProfilePage };
    },
  },
  {
    path: "vacancies",
    lazy: async () => {
      const { VacanciesPage } = await import("@/features/employer/vacancies/VacanciesPage");
      return { Component: VacanciesPage };
    },
  },
  {
    path: "vacancies/:id",
    lazy: async () => {
      const { VacancyDetailPage } = await import("@/features/employer/vacancies/VacancyDetailPage");
      return { Component: VacancyDetailPage };
    },
  },
  {
    path: "vacancies/:id/talent",
    lazy: async () => {
      const { Component } = await import("@/features/employer/talent/TalentPage");
      return { Component };
    },
  },
  {
    path: "vacancies/:id/compare",
    lazy: async () => {
      const { Component } = await import("@/features/employer/talent/ComparePage");
      return { Component };
    },
  },
  {
    path: "vacancies/:id/shortlist",
    lazy: async () => {
      const { Component } = await import("@/features/employer/talent/ShortlistPage");
      return { Component };
    },
  },
  {
    path: "candidates/:matchResultId",
    lazy: async () => {
      const { Component } = await import("@/features/employer/talent/CandidateDetailPage");
      return { Component };
    },
  },
  {
    path: "candidates/:matchResultId/full",
    lazy: async () => {
      const { Component } = await import("@/features/employer/talent/UnlockedProfilePage");
      return { Component };
    },
  },
];

// ---- F6: onboarding, vacancies/new, vacancies/:id/ideal-profile -----------------
const immersiveRoutes: RouteObject[] = [
  {
    path: "onboarding",
    lazy: async () => {
      const { OnboardingPage } = await import("@/features/employer/onboarding/OnboardingPage");
      return { Component: OnboardingPage };
    },
  },
  {
    path: "vacancies/new",
    lazy: async () => {
      const { NewVacancyPage } = await import("@/features/employer/vacancies/NewVacancyPage");
      return { Component: NewVacancyPage };
    },
  },
  {
    path: "vacancies/:id/ideal-profile",
    lazy: async () => {
      const { IdealProfilePage } = await import("@/features/employer/vacancies/IdealProfilePage");
      return { Component: IdealProfilePage };
    },
  },
];

export const employerRoutes: RouteObject[] = [
  { element: <EmployerShellRoute />, children: shellRoutes },
  ...immersiveRoutes,
];

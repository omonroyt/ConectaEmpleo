import type { RouteObject } from "react-router";
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
  {
    index: true,
    lazy: async () => {
      const { Component } = await import("@/features/candidate/home/HomePage");
      return { Component };
    },
  },
];

// ---- F3: onboarding, cv/* ------------------------------------------------------
// ---- F4: interview/* -----------------------------------------------------------
const immersiveRoutes: RouteObject[] = [
  {
    path: "onboarding",
    lazy: async () => {
      const { Component } = await import("@/features/candidate/onboarding/OnboardingPage");
      return { Component };
    },
  },
  {
    path: "cv/upload",
    lazy: async () => {
      const { Component } = await import("@/features/candidate/cv/CvUploadPage");
      return { Component };
    },
  },
  {
    path: "cv/build",
    lazy: async () => {
      const { Component } = await import("@/features/candidate/cv/CvBuildPage");
      return { Component };
    },
  },
  {
    path: "cv/review",
    lazy: async () => {
      const { Component } = await import("@/features/candidate/cv/CvReviewPage");
      return { Component };
    },
  },
  {
    path: "interview/prepare",
    lazy: async () => {
      const { Component } = await import("@/features/candidate/interview/PreparePage");
      return { Component };
    },
  },
  {
    path: "interview/:id",
    lazy: async () => {
      const { Component } = await import("@/features/candidate/interview/InterviewPage");
      return { Component };
    },
  },
  {
    path: "interview/:id/result",
    lazy: async () => {
      const { Component } = await import("@/features/candidate/interview/ResultPage");
      return { Component };
    },
  },
];

export const candidateRoutes: RouteObject[] = [
  { element: <CandidateShellRoute />, children: shellRoutes },
  ...immersiveRoutes,
];

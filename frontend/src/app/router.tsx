import type { ReactNode } from "react";
import { createBrowserRouter, Navigate, Outlet, useLocation, type RouteObject } from "react-router";
import { NotFoundPage } from "@/app/NotFoundPage";
import { candidateRoutes } from "@/features/candidate/candidate.routes";
import { employerRoutes } from "@/features/employer/employer.routes";
import { useSessionStore, homePathForRole } from "@/store/session";
import type { Role } from "@/api/types";

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

/**
 * Protege `/candidate/*` y `/employer/*`: sin sesión redirige a
 * `/login?next=<ruta>`; con sesión de otro rol redirige a la home de su rol.
 */
function RequireRole({ role }: { role: Role }) {
  const location = useLocation();
  const token = useSessionStore((s) => s.token);
  const userRole = useSessionStore((s) => s.user?.role ?? null);

  if (!token || !userRole) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (userRole !== role) {
    return <Navigate to={homePathForRole(userRole)} replace />;
  }
  return <Outlet />;
}

/** En `/login` y `/register`: si ya hay sesión, redirige a la home del rol. */
function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const token = useSessionStore((s) => s.token);
  const userRole = useSessionStore((s) => s.user?.role ?? null);
  if (token && userRole) return <Navigate to={homePathForRole(userRole)} replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    lazy: async () => {
      const { Component } = await import("@/features/auth/LandingPage");
      return { Component };
    },
  },
  {
    path: "/login",
    element: (
      <RedirectIfAuthenticated>
        <Outlet />
      </RedirectIfAuthenticated>
    ),
    children: [
      {
        index: true,
        lazy: async () => {
          const { Component } = await import("@/features/auth/LoginPage");
          return { Component };
        },
      },
    ],
  },
  {
    path: "/register",
    element: (
      <RedirectIfAuthenticated>
        <Outlet />
      </RedirectIfAuthenticated>
    ),
    children: [
      {
        index: true,
        lazy: async () => {
          const { Component } = await import("@/features/auth/RegisterPage");
          return { Component };
        },
      },
    ],
  },
  { path: "/candidate", element: <RequireRole role="CANDIDATE" />, children: candidateRoutes },
  { path: "/employer", element: <RequireRole role="COMPANY" />, children: employerRoutes },
  ...devRoutes,
  { path: "*", element: <NotFoundPage /> },
]);

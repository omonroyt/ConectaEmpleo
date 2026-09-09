import { Briefcase, Building2, Home, Users } from "lucide-react";
import { Outlet, useNavigate } from "react-router";
import { BottomNav, type NavItem, type NavLocation } from "@/components/layout/BottomNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

const isTalentTab = (location: NavLocation) =>
  location.pathname === "/employer/vacancies" && new URLSearchParams(location.search).get("tab") === "talent";

const employerNavItems: NavItem[] = [
  { to: "/employer", label: "Inicio", icon: Home, end: true },
  {
    to: "/employer/vacancies?tab=talent",
    label: "Talento",
    icon: Users,
    isActiveOverride: isTalentTab,
  },
  {
    to: "/employer/vacancies",
    label: "Vacantes",
    icon: Briefcase,
    isActiveOverride: (location) => location.pathname === "/employer/vacancies" && !isTalentTab(location),
  },
  { to: "/employer/company", label: "Empresa", icon: Building2 },
];

export interface EmployerShellProps {
  user?: { name: string; email: string };
  onLogout?: () => void;
}

/**
 * Shell del área empresa. "Talento" apunta a `/employer/vacancies?tab=talent`
 * porque el ranking depende de la vacante seleccionada (ver spec F1).
 * No lee `src/store` (propiedad de F2): recibe `user`/`onLogout` por props.
 */
export function EmployerShell({ user, onLogout }: EmployerShellProps) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-dvh bg-bg-light">
      <Sidebar
        items={employerNavItems}
        ctaLabel="Nueva vacante"
        onCtaClick={() => navigate("/employer/vacancies/new")}
        user={user}
        onLogout={onLogout}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={user} onNotificationsClick={() => navigate("/employer/notifications")} />
        <main className="flex-1 pb-20 md:pb-0">
          <Outlet />
        </main>
        <BottomNav items={employerNavItems} />
      </div>
    </div>
  );
}

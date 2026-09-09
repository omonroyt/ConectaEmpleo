import { Compass, Home, Mic, User as UserIcon } from "lucide-react";
import { Outlet, useNavigate } from "react-router";
import { BottomNav, type NavItem } from "@/components/layout/BottomNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

const candidateNavItems: NavItem[] = [
  { to: "/candidate", label: "Inicio", icon: Home, end: true },
  { to: "/candidate/opportunities", label: "Explorar", icon: Compass },
  { to: "/candidate/interview/prepare", label: "Entrevista", icon: Mic },
  { to: "/candidate/profile", label: "Perfil", icon: UserIcon },
];

export interface CandidateShellProps {
  user?: { name: string; email: string };
  onLogout?: () => void;
}

/**
 * Shell del área candidato: sidebar desktop / bottom nav mobile + `Outlet`.
 * No lee `src/store` (propiedad de F2): recibe `user`/`onLogout` por props.
 */
export function CandidateShell({ user, onLogout }: CandidateShellProps) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-dvh bg-bg-light">
      <Sidebar
        items={candidateNavItems}
        ctaLabel="Continuar entrevista"
        onCtaClick={() => navigate("/candidate/interview/prepare")}
        user={user}
        onLogout={onLogout}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={user} onNotificationsClick={() => navigate("/candidate/notifications")} />
        <main className="flex-1 pb-20 md:pb-0">
          <Outlet />
        </main>
        <BottomNav items={candidateNavItems} />
      </div>
    </div>
  );
}

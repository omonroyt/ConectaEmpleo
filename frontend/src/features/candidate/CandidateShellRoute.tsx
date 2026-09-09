import { useNavigate } from "react-router";
import { CandidateShell } from "@/components/layout";
import { useCandidateMe } from "@/api/hooks";
import { useSessionStore } from "@/store/session";

/**
 * Ruta layout del área candidato: conecta la sesión con `CandidateShell`.
 * Las pantallas hijas se renderizan en el `<Outlet />` interno del shell.
 */
export function CandidateShellRoute() {
  const navigate = useNavigate();
  const sessionUser = useSessionStore((s) => s.user);
  const logout = useSessionStore((s) => s.logout);
  const { data: me } = useCandidateMe(Boolean(sessionUser));

  const user = sessionUser
    ? { name: me?.full_name?.trim() || "Candidato", email: sessionUser.email }
    : undefined;

  return (
    <CandidateShell
      user={user}
      onLogout={() => {
        logout();
        navigate("/login", { replace: true });
      }}
    />
  );
}

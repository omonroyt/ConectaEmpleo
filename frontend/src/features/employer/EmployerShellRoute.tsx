import { useNavigate } from "react-router";
import { EmployerShell } from "@/components/layout";
import { useCompanyMe } from "@/api/hooks";
import { useSessionStore } from "@/store/session";

/**
 * Ruta layout del área empresa: conecta la sesión con `EmployerShell`.
 * Las pantallas hijas se renderizan en el `<Outlet />` interno del shell.
 */
export function EmployerShellRoute() {
  const navigate = useNavigate();
  const sessionUser = useSessionStore((s) => s.user);
  const logout = useSessionStore((s) => s.logout);
  const { data: company } = useCompanyMe(Boolean(sessionUser));

  const user = sessionUser
    ? { name: company?.trade_name?.trim() || "Empresa", email: sessionUser.email }
    : undefined;

  return (
    <EmployerShell
      user={user}
      onLogout={() => {
        logout();
        navigate("/login?role=COMPANY", { replace: true });
      }}
    />
  );
}

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthResponse, Role, User } from "@/api/types";
import { queryClient } from "@/api/queryClient";

interface SessionState {
  token: string | null;
  user: User | null;
  login(auth: AuthResponse): void;
  logout(): void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (auth) => set({ token: auth.access_token, user: auth.user }),
      logout: () => {
        set({ token: null, user: null });
        queryClient.clear();
      },
    }),
    { name: "ce-session" },
  ),
);

export function useRole(): Role | null {
  return useSessionStore((s) => s.user?.role ?? null);
}

export function useIsAuthenticated(): boolean {
  return useSessionStore((s) => s.token != null);
}

/** Ruta de inicio por rol, usada por los guards del router. */
export function homePathForRole(role: Role): string {
  return role === "CANDIDATE" ? "/candidate" : "/employer";
}

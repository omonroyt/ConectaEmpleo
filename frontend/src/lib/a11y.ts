import { useEffect, useState } from "react";

/**
 * Hook propio (matchMedia) para detectar `prefers-reduced-motion: reduce`.
 * No depende de `motion` para poder usarse fuera de componentes con AnimatePresence.
 */
export function useReducedMotion(): boolean {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setReduced(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

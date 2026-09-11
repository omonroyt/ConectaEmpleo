/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_MODE?: "mock" | "http";
  readonly VITE_API_URL?: string;
  /** `"false"` cierra el registro en la interfaz (ver `src/lib/registration.ts`). */
  readonly VITE_REGISTRATION_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Expuesto solo en dev por src/api/mock/index.ts para depurar la demo. */
interface Window {
  __ce?: { resetMock: () => void };
}


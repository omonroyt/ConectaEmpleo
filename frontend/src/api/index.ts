import type { ApiClient } from "./client";
import { mockApiClient } from "./mock";
import { httpApiClient } from "./http/client";

const mode = (import.meta.env.VITE_API_MODE as string | undefined) ?? "mock";

/** Cliente de datos activo, seleccionado por VITE_API_MODE (default "mock"). */
export const api: ApiClient = mode === "http" ? httpApiClient : mockApiClient;

export type { ApiClient } from "./client";
export { ApiClientError } from "./client";

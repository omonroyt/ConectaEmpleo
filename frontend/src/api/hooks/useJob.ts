import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { queryKeys } from "@/api/queryKeys";
import type { Job } from "@/api/types";

export interface UseJobOptions {
  onDone?: (job: Job) => void;
  onFailed?: (job: Job) => void;
  enabled?: boolean;
}

/** Hace polling de un job cada 1.5 s hasta que termina (DONE o FAILED). */
export function useJob(jobId: string | null | undefined, options: UseJobOptions = {}) {
  const { onDone, onFailed, enabled = true } = options;
  const query = useQuery({
    queryKey: queryKeys.job(jobId ?? "none"),
    queryFn: () => api.jobs.get(jobId as string),
    enabled: enabled && jobId != null,
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      return status === "DONE" || status === "FAILED" ? false : 1500;
    },
  });

  const notified = useRef<string | null>(null);
  useEffect(() => {
    const job = query.data;
    if (!job || notified.current === job.id + job.status) return;
    if (job.status === "DONE" || job.status === "FAILED") {
      notified.current = job.id + job.status;
      if (job.status === "DONE") onDone?.(job);
      else onFailed?.(job);
    }
  }, [query.data, onDone, onFailed]);

  return query;
}

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

/** Contenedor de ancho máximo (1240px) con padding lateral consistente. */
export function PageContainer({ children, className, ...rest }: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-[1240px] px-6 md:px-8", className)} {...rest}>
      {children}
    </div>
  );
}

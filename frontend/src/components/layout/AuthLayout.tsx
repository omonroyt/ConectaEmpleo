import type { ReactNode } from "react";
import { BrandBackground, type BrandAsset } from "@/components/brand/BrandBackground";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";

export interface AuthLayoutProps {
  heroTitle: string;
  heroSubtitle?: string;
  asset?: BrandAsset;
  children: ReactNode;
  className?: string;
}

/**
 * Hero oscuro + panel claro superpuesto (radio superior 32px).
 * Desktop: dos columnas (hero 45% izquierda, formulario centrado derecha).
 */
export function AuthLayout({
  heroTitle,
  heroSubtitle,
  asset = "brand-main",
  children,
  className,
}: AuthLayoutProps) {
  return (
    <div className={cn("relative flex min-h-dvh flex-col bg-bg-dark md:flex-row", className)}>
      <div className="relative flex h-[42vh] shrink-0 flex-col justify-between overflow-hidden p-6 sm:p-10 md:h-auto md:w-[45%] md:p-12">
        <BrandBackground asset={asset} presence="hero" priority ambient />
        <div className="relative z-10">
          <Logo variant="light" size="md" />
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-3xl font-semibold text-text-on-dark sm:text-4xl">{heroTitle}</h1>
          {heroSubtitle && (
            <p className="mt-3 text-base text-text-on-dark-secondary">{heroSubtitle}</p>
          )}
        </div>
      </div>
      <div className="relative z-10 -mt-8 flex flex-1 items-center justify-center rounded-t-2xl bg-surface p-6 sm:p-10 md:mt-0 md:rounded-t-none md:rounded-l-2xl md:p-16">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

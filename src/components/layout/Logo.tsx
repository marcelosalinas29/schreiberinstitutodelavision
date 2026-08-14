import horizontal from "@/assets/schreiber-horizontal.jpg.asset.json";
import sello from "@/assets/schreiber-sello.jpg.asset.json";

import { cn } from "@/lib/utils";

export const LOGO_HORIZONTAL_URL = horizontal.url;
export const LOGO_SELLO_URL = sello.url;
export const LOGO_HORIZONTAL_TRANSPARENTE_URL = horizontal.url;


/** Marca institucional: sello circular + wordmark. */
export function Logo({
  className,
  size = "md",
  showName = true,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
}) {
  const dim = size === "sm" ? "size-9" : size === "lg" ? "size-14" : "size-11";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src={LOGO_SELLO_URL}
        alt="Schreiber Instituto de la Visión"
        className={cn(dim, "shrink-0 rounded-full bg-card object-cover ring-1 ring-border")}
        loading="lazy"
      />
      {showName ? (
        <span className="leading-tight">
          <span className="block text-sm font-semibold tracking-[0.18em] uppercase">Schreiber</span>
          <span className="block text-[11px] tracking-wide text-muted-foreground">Instituto de la Visión</span>
        </span>
      ) : null}
    </div>
  );
}

/** Versión apaisada del logo (archivo original), integrada con mix-blend-mode
 *  para que el fondo blanco de la foto se funda con la superficie. */
export function LogoWordmark({ className }: { className?: string; transparente?: boolean }) {
  return (
    <img
      src={LOGO_HORIZONTAL_URL}
      alt="Schreiber Instituto de la Visión — Porque cada mirada es única"
      className={cn("h-20 w-auto object-contain mix-blend-multiply dark:mix-blend-screen", className)}
    />
  );

}

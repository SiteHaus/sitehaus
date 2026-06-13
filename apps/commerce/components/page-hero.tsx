import { PageHero as BasePageHero } from "@site-haus/ui/components/shared/page-hero";
import type { ComponentProps } from "react";

type PageHeroProps = ComponentProps<typeof BasePageHero>;

export function PageHero({ className = "", ...props }: PageHeroProps) {
  return <BasePageHero {...props} className={`-mt-6 ${className}`} />;
}

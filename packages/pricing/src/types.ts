import type { HTMLAttributes } from "svelte/elements";

export interface PricingPlan {
  title: string;
  price: string;
  features: string[];
  href?: string;
  isPopular?: boolean;
  description?: string;
}

export interface PricingHeader {
  title: string;
  description: string;
}

export type SerenityPricingProps = {
  showHeader?: boolean;
  title?: string;
  description?: string;
  showCTA?: boolean;
  ctaText?: string;
}

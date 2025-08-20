import type { HTMLAttributes } from "svelte/elements";

export interface PricingPlan {
  title: string;
  // New price fields: monthly and annual-per-month
  monthlyPrice: string;
  annualPricePerMonth: string;
  features: string[];
  href?: string;
  isPopular?: boolean;
  showPrice?: boolean;
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
  typeOfPrice?: "monthly" | "annual";
}

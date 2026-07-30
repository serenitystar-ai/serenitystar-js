import type { HTMLAttributes } from "svelte/elements";

/**
 * What a feature row describes:
 * - `Highlight`: headline claim for the plan ("tokens / month").
 * - `Quantity`: an entitlement with a numeric limit ("Rate limit - Per 12 hours").
 * - `Level`: a tier for a named capability ("Cost Dashboard: Advanced").
 *
 * `Highlight` and `Quantity` both carry their number in `value` and render the
 * same way; only `Level` is purely textual.
 */
export type PricingFeatureType = "Highlight" | "Quantity" | "Level";

export interface PricingFeature {
  type: PricingFeatureType;
  /**
   * The display-ready limit for `Highlight` and `Quantity` features ("10M"),
   * already abbreviated by the API. `null` means "not included", and it is
   * always `null` for `Level`.
   */
  value: string | null;
  /** Label for the feature, without the number. */
  text: string;
}

export interface PricingPlan {
  title: string;
  // New price fields: monthly and annual-per-month
  monthlyPrice: string;
  annualPricePerMonth: string;
  features: PricingFeature[];
  href?: string;
  isPopular?: boolean;
  showPrice?: boolean;
  description?: string;
  /** Ascending display order returned by the API. */
  order?: number;
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
  ctaUrl?: string;
  typeOfPrice?: "monthly" | "annual";
  theme?: "light" | "dark";
  language?: "en" | "es";
}

<script lang="ts">
  import { clsx } from "clsx";
  import { Check } from "@lucide/svelte";
  import SquircleDashed from "./SquircleDashed.svelte";
  import type { PricingPlan } from "./types.js";
  import { getDefaults } from "./utils/i18n.js";

  interface Props extends PricingPlan {
    showCTA?: boolean;
    ctaText?: string;
    ctaUrl?: string;
    typeOfPrice?: "monthly" | "annual";
    theme?: "light" | "dark";
    language?: "en" | "es";
    /** Highest feature count across the plans rendered together. */
    featureRowCount?: number;
  }

  let {
    title,
    monthlyPrice,
    annualPricePerMonth,
    description,
    href,
    features,
    isPopular = false,
    showCTA = true,
    ctaText = "Get Started",
    ctaUrl = "https://hub.serenitystar.ai",
    typeOfPrice = "annual",
    showPrice = true,
    theme = "dark",
    language,
    featureRowCount = 0,
  }: Props = $props();

  const isDark = $derived(theme === "dark");
  const i18n = $derived(getDefaults(language));

  // The card is a subgrid of the pricing grid, so every plan sharing a grid row
  // sizes the same tracks and its sections line up horizontally:
  // 1 title, 2 price, 3 billing note, 4 description, 5 CTA, 6+ one row per feature.
  const featuresRowStart = 6;
  const featureRows = $derived(Math.max(featureRowCount, features.length, 1));
  const totalRows = $derived(featuresRowStart - 1 + featureRows);

  const iconClass = $derived(
    clsx("h-6 w-6 flex-none", isPopular ? "text-white" : isDark ? "text-slate-400" : "text-slate-500")
  );

  // The chip takes the icon's place whenever a feature carries a value, so it
  // matches the icon height and shares the same fixed-width leading slot to keep
  // every label starting at the same offset.
  const quantityClass = $derived(
    clsx(
      "inline-flex w-full h-6 items-center justify-center rounded-md px-0.5 text-xs font-semibold tabular-nums",
      isPopular ? "bg-white/20 text-white" : isDark ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-900"
    )
  );
</script>

<section
  style="grid-row: span {totalRows};"
  class={clsx(
    "grid grid-rows-subgrid gap-y-0 rounded-3xl px-6 sm:px-8 mb-10 2xl:mb-0",
    isPopular
      ? "bg-primary py-8 lg:order-0"
      : isDark
        ? "border border-slate-800 lg:py-8 2xl:border-0"
        : "border border-slate-200 lg:py-8 2xl:border-0"
  )}
>
  <h3 class={clsx("row-start-1 mt-5 font-display text-lg font-semibold", isPopular || isDark ? "text-white" : "text-slate-900")}>
    {title}
  </h3>
  <p class={clsx("row-start-2 font-display text-2xl font-light tracking-tight", isPopular || isDark ? "text-white" : "text-slate-900")}>
    {typeOfPrice === "annual" ? annualPricePerMonth : monthlyPrice}
  </p>

  <p
    class={clsx(
      "row-start-3 text-sm min-h-4",
      isPopular ? "text-slate-200" : isDark ? "text-slate-400" : "text-slate-500"
    )}
  >
    {#if showPrice}
      {`${typeOfPrice === "annual" ? i18n.billedAnnually : i18n.perMonth}`}
    {/if}
  </p>

  {#if description}
    <p
      class={clsx(
        "row-start-4 mt-2 text-base",
        isPopular ? "text-white" : isDark ? "text-slate-400" : "text-slate-600"
      )}
    >
      {description}
    </p>
  {/if}

  <ul
    role="list"
    style="grid-row: {featuresRowStart} / span {featureRows};"
    class={clsx(
      "mt-6 grid grid-rows-subgrid gap-y-0 text-sm",
      isPopular ? "text-white" : isDark ? "text-slate-200" : "text-slate-700"
    )}
  >
    {#each features as feature, index}
      <li class={clsx("flex items-start gap-x-3", index > 0 && "mt-3")}>
        <span class="flex min-w-12 flex-none justify-center">
          {#if feature.type === "Level"}
            <Check class={iconClass} />
          {:else if feature.value === null}
            <SquircleDashed class={iconClass} />
          {:else}
            <span class={quantityClass}>{feature.value}</span>
          {/if}
        </span>
        <span class="flex min-h-6 min-w-0 flex-1 items-center">{feature.text}</span>
      </li>
    {/each}
  </ul>

  {#if href && showCTA}
    <a
      href={ctaUrl}
      class={clsx(
        "group row-start-5 inline-flex items-center justify-center self-start rounded-full py-2 px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 mt-2",
        isPopular
          ? "bg-white text-slate-900 hover:bg-slate-100 active:bg-slate-100 active:text-slate-900 focus-visible:outline-white"
          : isDark
            ? "border border-slate-700 text-slate-300 hover:text-white active:text-white"
            : "border border-slate-300 text-slate-600 hover:text-slate-900 active:text-slate-900"
      )}>{ctaText}</a
    >
  {/if}
</section>

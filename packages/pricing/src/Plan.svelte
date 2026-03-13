<script lang="ts">
  import { clsx } from "clsx";
  import { CheckCircle2 } from "@lucide/svelte";
  import type { PricingPlan } from "./types.js";
  import { getDefaults } from "./utils/i18n.js";

  interface Props extends PricingPlan {
    showCTA?: boolean;
    ctaText?: string;
    ctaUrl?: string;
    typeOfPrice?: "monthly" | "annual";
    theme?: "light" | "dark";
    language?: "en" | "es";
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
  }: Props = $props();

  const isDark = $derived(theme === "dark");
  const i18n = $derived(getDefaults(language));
</script>

<section
  class={clsx(
    "flex flex-col rounded-3xl px-6 sm:px-8",
    isPopular
      ? "bg-primary py-8 lg:order-0"
      : isDark
        ? "border border-slate-800 lg:py-8 2xl:border-0"
        : "border border-slate-200 lg:py-8 2xl:border-0"
  )}
>
  <h3 class={clsx("mt-5 font-display text-lg font-semibold", isPopular || isDark ? "text-white" : "text-slate-900")}>
    {title}
  </h3>
  <p class={clsx("font-display text-2xl font-light tracking-tight", isPopular || isDark ? "text-white" : "text-slate-900")}>
    {typeOfPrice === "annual" ? annualPricePerMonth : monthlyPrice}
  </p>

  <p
    class={clsx(
      "text-sm min-h-4",
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
        "mt-2 text-base",
        isPopular ? "text-white" : isDark ? "text-slate-400" : "text-slate-600"
      )}
    >
      {description}
    </p>
  {/if}

  <ul
    role="list"
    class={clsx(
      "order-last mt-10 mb-6 flex flex-col gap-y-3 text-sm",
      isPopular ? "text-white" : isDark ? "text-slate-200" : "text-slate-700"
    )}
  >
    {#each features as feature}
      <li class="flex">
        <CheckCircle2
          class={clsx(
            "h-6 w-6 flex-none",
            isPopular ? "text-white" : isDark ? "text-slate-400" : "text-slate-500"
          )}
        />
        <span class="ml-4">{feature}</span>
      </li>
    {/each}
  </ul>

  {#if href && showCTA}
    <a
      href={ctaUrl}
      class={clsx(
        "group inline-flex items-center justify-center rounded-full py-2 px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 mt-8",
        isPopular
          ? "bg-white text-slate-900 hover:bg-slate-100 active:bg-slate-100 active:text-slate-900 focus-visible:outline-white"
          : isDark
            ? "border border-slate-700 text-slate-300 hover:text-white active:text-white"
            : "border border-slate-300 text-slate-600 hover:text-slate-900 active:text-slate-900"
      )}>{ctaText}</a
    >
  {/if}
</section>

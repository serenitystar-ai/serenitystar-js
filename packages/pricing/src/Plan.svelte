<script lang="ts">
  import { clsx } from "clsx";
  import { CheckCircle2 } from "@lucide/svelte";
  import type { PricingPlan } from "./types.js";

  interface Props extends PricingPlan {
    featured?: boolean;
    showCTA?: boolean;
    ctaText?: string;
  }

  let {
    title,
    price,
    description,
    href,
    features,
    featured = false,
    isPopular = false,
    showCTA = true,
    ctaText = "Get Started"
  }: Props = $props();

  // Use either featured prop or isPopular from API data
  const isFeatured = featured || isPopular;
</script>

<section
  class={clsx(
    "flex flex-col rounded-3xl px-6 sm:px-8",
    isFeatured
      ? "bg-primary py-8 lg:order-0"
      : "border border-slate-800 lg:py-8 2xl:border-0"
  )}
>
  <h3 class="mt-5 font-display text-lg font-semibold text-white">
    {title}
  </h3>
  <p class="font-display text-2xl font-light tracking-tight text-white">
    {price}
  </p>
  {#if description}
    <p
      class={clsx(
        "mt-2 text-base",
        isFeatured ? "text-white" : "text-slate-400"
      )}
    >
      {description}
    </p>
  {/if}

  <ul
    role="list"
    class={clsx(
      "order-last mt-10 mb-6 flex flex-col gap-y-3 text-sm",
      isFeatured ? "text-white" : "text-slate-200"
    )}
  >
    {#each features as feature}
      <li class="flex">
        <CheckCircle2
          class={clsx(
            "h-6 w-6 flex-none",
            isFeatured ? "text-white" : "text-slate-400"
          )}
        />
        <span class="ml-4">{feature}</span>
      </li>
    {/each}
  </ul>

  {#if href && showCTA}
    <a
      href="/"
      class={clsx(
        "group inline-flex items-center justify-center rounded-full py-2 px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 mt-8",
        featured
          ? "bg-white text-slate-900 hover:bg-slate-100 active:bg-slate-100 active:text-slate-900 focus-visible:outline-white"
          : "border border-slate-700 text-slate-300 hover:text-white active:text-white"
      )}>{ctaText}</a
    >
  {/if}
</section>

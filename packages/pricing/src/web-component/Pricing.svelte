<svelte:options customElement={{
    shadow: "none",
}} />

<script lang="ts">
  import { fetchPricingData } from '../utils/api.js';
  import Container from '../Container.svelte';
  import SwirlyDoodle from '../SwirlyDoodle.svelte';
  import Plan from '../Plan.svelte';
  import type { PricingPlan, SerenityPricingProps } from '../types.js';
  import { getDefaults } from '../utils/i18n.js';
  
  // Props with defaults following Svelte 5 pattern
  // Note: "pricingTitle" is used instead of "title" to avoid conflict
  // with the native HTML title attribute on custom elements.
  // The public API (SerenityPricingProps) still uses "title" — the
  // SerenityPricing class maps title → pricingTitle.
  let { 
    showHeader = true,
    pricingTitle,
    description,
    showCTA = true,
    ctaText,
    ctaUrl = "https://hub.serenitystar.ai",
    typeOfPrice = "annual",
    theme = "dark",
    language,
  }: Omit<SerenityPricingProps, 'title'> & { pricingTitle?: string } = $props();

  // Resolve i18n based on the language prop (or browser default)
  const i18n = $derived(getDefaults(language));

  // Apply i18n defaults for props that weren't explicitly set
  const resolvedTitle = $derived(pricingTitle ?? i18n.title);
  const resolvedDescription = $derived(description ?? i18n.description);
  const resolvedCtaText = $derived(ctaText ?? i18n.ctaText);

  const isDark = $derived(theme === "dark");

  // Internal toggle state — initialized from the typeOfPrice prop
  let selectedPrice = $state<"monthly" | "annual">(typeOfPrice ?? "annual");

  // Sync if the prop changes externally
  $effect(() => {
    if (typeOfPrice) selectedPrice = typeOfPrice;
  });
  
  // State for pricing data
  let plans = $state<PricingPlan[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  
  // Effect to fetch pricing data on component mount
  $effect(() => {
    const loadData = async () => {
      try {
        loading = true;
        error = null;
        const data = await fetchPricingData();
        plans = data;
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to load pricing data';
      } finally {
        loading = false;
      }
    };
    
    loadData();
  });
</script>

<section
  id="pricing"
  aria-label="Pricing"
  class="{isDark ? 'bg-serenity-deep-blue' : 'bg-white'} py-20 sm:py-32 serenity-pricing-root"
>
  <Container divProps={{ class: "max-w-[80%]"}}>
    {#if showHeader}
      <div class="md:text-center">
        <h2 class="font-display text-3xl tracking-tight {isDark ? 'text-white' : 'text-slate-900'} sm:text-4xl">
          <span class="relative whitespace-nowrap">
            <SwirlyDoodle
              {theme}
              svgProps={{
                class: "absolute top-1/2 left-0 h-[1em] w-full"
              }}
            />
            <span class="relative">{resolvedTitle}</span>
          </span>
        </h2>
        <p class="mt-4 text-lg {isDark ? 'text-slate-400' : 'text-slate-600'}">
          {resolvedDescription}
        </p>

        <!-- Monthly / Annual toggle -->
        <div class="mt-8 flex items-center justify-center gap-3">
          <span
            class="text-sm font-medium {selectedPrice === 'monthly'
              ? isDark ? 'text-white' : 'text-slate-900'
              : isDark ? 'text-slate-400' : 'text-slate-500'}"
          >
            {i18n.monthly}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={selectedPrice === 'annual'}
            aria-label="{i18n.monthly} / {i18n.annual}"
            class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary {selectedPrice === 'annual' ? 'bg-primary' : isDark ? 'bg-slate-700' : 'bg-slate-300'}"
            onclick={() => selectedPrice = selectedPrice === 'annual' ? 'monthly' : 'annual'}
          >
            <span
              class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out {selectedPrice === 'annual' ? 'translate-x-5' : 'translate-x-0'}"
            ></span>
          </button>
          <span
            class="text-sm font-medium {selectedPrice === 'annual'
              ? isDark ? 'text-white' : 'text-slate-900'
              : isDark ? 'text-slate-400' : 'text-slate-500'}"
          >
            {i18n.annual}
          </span>
        </div>
      </div>
    {/if}

    {#if loading}
      <div class="mt-16 text-center">
        <p class="{isDark ? 'text-white' : 'text-slate-900'}">{i18n.loading}</p>
      </div>
    {:else if error}
      <div class="mt-16 text-center">
        <p class="text-red-400">{i18n.error}: {error}</p>
      </div>
    {:else if plans.length === 0}
      <div class="mt-16 text-center">
        <p class="{isDark ? 'text-slate-400' : 'text-slate-600'}">{i18n.noPlans}</p>
      </div>
    {:else}
      <div class="-mx-4 mt-8 grid max-w-2xl grid-cols-1 gap-y-10 sm:mx-auto md:grid-cols-2 md:gap-x-8 lg:-mx-8 lg:max-w-none xl:mx-0 xl:grid-cols-3 xl:gap-x-4 2xl:grid-cols-5">
        {#each plans as plan}
          <Plan
            title={plan.title}
            monthlyPrice={plan.monthlyPrice}
            annualPricePerMonth={plan.annualPricePerMonth}
            description={plan.description}
            href={plan.href}
            features={plan.features}
            isPopular={plan.isPopular}
            showPrice={plan.showPrice}
            typeOfPrice={selectedPrice}
            {showCTA}
            ctaText={resolvedCtaText}
            {ctaUrl}
            {theme}
            {language}
          />
        {/each}
      </div>
    {/if}
  </Container>
</section>

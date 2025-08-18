<svelte:options customElement={{
    shadow: "none",
}} />

<script lang="ts">
  import { fetchPricingData } from '../utils/api.js';
  import Container from '../Container.svelte';
  import SwirlyDoodle from '../SwirlyDoodle.svelte';
  import Plan from '../Plan.svelte';
  import type { PricingPlan, SerenityPricingProps } from '../types.js';
  
  // Props with defaults following Svelte 5 pattern
  let { 
    showHeader = true,
    title = "Pricing",
    description = "Start with a free trial, no credit card required and pay-as-you-go.",
    showCTA = true,
    ctaText = "Get Started"
  }: SerenityPricingProps = $props();
  
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
  class="bg-serenity-deep-blue py-20 sm:py-32 serenity-pricing-root"
>
  <Container divProps={{ class: "max-w-[80%]"}}>
    {#if showHeader}
      <div class="md:text-center">
        <h2 class="font-display text-3xl tracking-tight text-white sm:text-4xl">
          <span class="relative whitespace-nowrap">
            <SwirlyDoodle svgProps={{
              class: "absolute top-1/2 left-0 h-[1em] w-full fill-primary/30"
            }} />
            <span class="relative">{title}</span>
          </span>
        </h2>
        <p class="mt-4 text-lg text-slate-400">
          {description}
        </p>
      </div>
    {/if}

    {#if loading}
      <div class="mt-16 text-center">
        <p class="text-white">Loading pricing plans...</p>
      </div>
    {:else if error}
      <div class="mt-16 text-center">
        <p class="text-red-400">Error: {error}</p>
      </div>
    {:else if plans.length === 0}
      <div class="mt-16 text-center">
        <p class="text-slate-400">No pricing plans available.</p>
      </div>
    {:else}
      <div class="-mx-4 mt-16 grid max-w-2xl grid-cols-1 gap-y-10 sm:mx-auto md:grid-cols-2 md:gap-x-8 lg:-mx-8 lg:max-w-none xl:mx-0 xl:grid-cols-3 xl:gap-x-4 2xl:grid-cols-5">
        {#each plans as plan}
          <Plan
            title={plan.title}
            price={plan.price}
            description={plan.description}
            href={plan.href}
            features={plan.features}
            featured={plan.isPopular}
            {showCTA}
            {ctaText}
          />
        {/each}
      </div>
    {/if}
  </Container>
</section>

// @ts-ignore
import WebComponent from './web-component/Pricing.svelte';

// Styles are adopted into the element's shadow root (see
// ./web-component/styles.ts), not injected into document.head.
export function defineElement(tagName = 'serenity-pricing') {
  if (!customElements.get(tagName)) {
    // @ts-ignore
    customElements.define(tagName, WebComponent.element!);
  }
}

// Export types
export type { PricingPlan, PricingHeader, PricingFeature, PricingFeatureType } from './types.js';

// Export utility functions
export { fetchPricingData } from './utils/api.js';

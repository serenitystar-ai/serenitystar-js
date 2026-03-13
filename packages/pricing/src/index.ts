// @ts-ignore
import WebComponent from './web-component/Pricing.svelte';

import styles from "./styles.css?raw";

export function defineElement(tagName = 'serenity-pricing') {
  if (!customElements.get(tagName)) {
    
    if (!document.getElementById('serenity-pricing-style')) {
      const style = document.createElement('style');
      style.id = 'serenity-pricing-style';
      style.textContent = styles;
      document.head.appendChild(style);
    }
    
    // @ts-ignore
    customElements.define(tagName, WebComponent.element!);
  }
}

// Export types
export type { PricingPlan, PricingHeader } from './types.js';

// Export utility functions
export { fetchPricingData } from './utils/api.js';

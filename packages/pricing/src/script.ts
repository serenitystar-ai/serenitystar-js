//@ts-ignore
import WebComponent from "./web-component/Pricing.svelte";

import styles from "./styles.css?raw";
import { SerenityPricing, serenityPricing } from "./SerenityPricing";
import type { SerenityPricingProps } from "./types";
export { SerenityPricing, serenityPricing } from "./SerenityPricing";

if (!customElements.get("serenity-pricing")) {
  if (!document.getElementById("serenity-pricing-style")) {
    const style = document.createElement("style");
    style.id = "serenity-pricing-style";
    style.textContent = styles;
    document.head.appendChild(style);
  }

  //@ts-ignore
  customElements.define("serenity-pricing", WebComponent.element!);
}

// jQuery extension - check if jQuery is available
declare global {
  interface JQuery {
    serenityPricing(options?: SerenityPricingProps): JQuery;
  }
}

// Add jQuery plugin if jQuery is available
if (typeof window !== "undefined" && (window as any).jQuery) {
  const $ = (window as any).jQuery;

  $.fn.serenityPricing = function (options?: SerenityPricingProps) {
    return this.each(function (this: HTMLElement) {
      const id = this.id;
      if (!id) {
        throw new Error(
          "Element must have an id attribute to use serenityPricing"
        );
      }

      // Initialize registry if it doesn't exist
      if (typeof window !== "undefined" && !window.__serenityPricingRegistry) {
        window.__serenityPricingRegistry = {};
      }

      // Check if an instance already exists for the given id
      if (window.__serenityPricingRegistry[id]) {
        const instance = window.__serenityPricingRegistry[id];
        if (options) {
          // If options are provided, update the existing instance
          instance.setProperties(options);
        }
        return instance;
      }

      const instance = new SerenityPricing(id, options);
      window.__serenityPricingRegistry[id] = instance;

      (this as any).instance = instance;
    });
  };
}

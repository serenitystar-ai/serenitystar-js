
import type { SerenityPricingProps } from "./types";

interface SerenityPricingElement extends HTMLElement {
  showHeader?: SerenityPricingProps["showHeader"];
  pricingTitle?: SerenityPricingProps["title"];
  description?: SerenityPricingProps["description"];
  showCTA?: SerenityPricingProps["showCTA"];
  ctaText?: SerenityPricingProps["ctaText"];
  typeOfPrice?: SerenityPricingProps["typeOfPrice"];
}
interface SerenityPricingRegistry {
  [id: string]: SerenityPricing;
}

declare global {
  interface Window {
    serenityPricing: (
      id: string,
      options?: SerenityPricingProps
    ) => SerenityPricing;
    __serenityPricingRegistry: SerenityPricingRegistry;
  }
}

export class SerenityPricing {
  private container?: HTMLElement;
  private webComponent: SerenityPricingElement;
  private id: string;

  constructor(id: string, options: SerenityPricingProps = {}) {
    this.id = id;
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Element with id "${id}" not found`);
    }

    this.container = element;

    // Create the serenity-pricing web component
    this.webComponent = document.createElement(
      "serenity-pricing"
    ) as SerenityPricingElement;
    this.webComponent.id = id;

    // Set all the properties/attributes from options
    this.setProperties(options);

    // Replace the container with the web component
    this.container.parentNode?.replaceChild(this.webComponent, this.container);
  }

  /**
   * Updates properties of the serenity-pricing component
   */
  public setProperties(options: Partial<SerenityPricingProps>) {
    if (options.showHeader !== undefined && options.showHeader === false) {
      this.webComponent.showHeader = options.showHeader;
    }
    if (options.title !== undefined) {
      this.webComponent.pricingTitle = options.title;
    }
    if (options.description !== undefined) {
      this.webComponent.description = options.description;
    }
    if (options.showCTA !== undefined && options.showCTA === false) {
      this.webComponent.showCTA = options.showCTA;
    }
    if (options.ctaText !== undefined) {
      this.webComponent.ctaText = options.ctaText;
    }
    if (options.typeOfPrice !== undefined) {
      this.webComponent.typeOfPrice = options.typeOfPrice;
    }
  }

  /**
   * Gets a property value from the serenity-pricing component
   */
  public get<K extends keyof SerenityPricingProps>(
    key: K
  ): SerenityPricingProps[K] | undefined {
    switch (key) {
      case "showHeader":
        return this.webComponent.showHeader as SerenityPricingProps[K];
      case "title":
        return this.webComponent.pricingTitle as SerenityPricingProps[K];
      case "description":
        return this.webComponent.description as SerenityPricingProps[K];
      case "showCTA":
        return this.webComponent.showCTA as SerenityPricingProps[K];
      case "ctaText":
        return this.webComponent.ctaText as SerenityPricingProps[K];
      case "typeOfPrice":
        return this.webComponent.typeOfPrice as SerenityPricingProps[K];
      default:
        return undefined;
    }
  }

  /**
   * Sets a property value on the serenity-pricing component
   */
  public set<K extends keyof SerenityPricingProps>(
    key: K,
    value: SerenityPricingProps[K]
  ): void {
    // Set the property directly on the web component
    if (key === "title") {
      this.webComponent.pricingTitle = value as string;
    } else {
      (this.webComponent as any)[key] = value;
    }
  }

  /**
   * Gets the underlying web component element
   */
  public getElement(): HTMLElement {
    return this.webComponent;
  }

  /**
   * Destroys the component by removing it from the DOM and clearing the registry reference.
   */
  public destroy(): void {
    if (this.webComponent.parentNode) {
      this.webComponent.parentNode.removeChild(this.webComponent);
    }
    
    // Clear from registry if it exists
    if (typeof window !== 'undefined' && window.__serenityPricingRegistry) {
      delete window.__serenityPricingRegistry[this.id];
    }
  }
}

// Factory function following the select2 pattern
export function serenityPricing(
  id: string,
  options?: SerenityPricingProps
): SerenityPricing {
  // Initialize registry if it doesn't exist
  if (typeof window !== 'undefined' && !window.__serenityPricingRegistry) {
    window.__serenityPricingRegistry = {};
  }

  // Check if an instance already exists for the given id
  if(window.__serenityPricingRegistry[id]) {
    const instance = window.__serenityPricingRegistry[id];
    if (options) {
      // If options are provided, update the existing instance
      instance.setProperties(options);
    }
    return instance;
  }

  const instance = new SerenityPricing(id, options);
  window.__serenityPricingRegistry[id] = instance;
  return instance;
}

// Make the factory function available globally
if (typeof window !== 'undefined') {
  window.serenityPricing = serenityPricing;
}
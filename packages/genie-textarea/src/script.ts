//@ts-ignore
import WebComponent from "./web-component/GenieTextarea.svelte";

import styles from "./styles.css?raw";
import { GenieTextarea, genieTextarea } from "./GenieTextarea";
import type { GenieTextareaOptions } from "./types";
export { GenieTextarea, genieTextarea } from "./GenieTextarea";

if (!customElements.get("genie-textarea")) {
  if (!document.getElementById("genie-textarea-style")) {
    const style = document.createElement("style");
    style.id = "genie-textarea-style";
    style.textContent = styles;
    document.head.appendChild(style);
  }

  //@ts-ignore
  customElements.define("genie-textarea", WebComponent.element!);
}

// jQuery extension - check if jQuery is available
declare global {
  interface JQuery {
    genieTextarea(options?: GenieTextareaOptions): JQuery;
  }
}

// Add jQuery plugin if jQuery is available
if (typeof window !== "undefined" && (window as any).jQuery) {
  const $ = (window as any).jQuery;

  $.fn.genieTextarea = function (options?: GenieTextareaOptions) {
    return this.each(function (this: HTMLElement) {
      const id = this.id;
      if (!id) {
        throw new Error(
          "Element must have an id attribute to use genieTextarea"
        );
      }

      // Initialize registry if it doesn't exist
      if (typeof window !== "undefined" && !window.__genieTextareaRegistry) {
        window.__genieTextareaRegistry = {};
      }

      // Check if an instance already exists for the given id
      if (window.__genieTextareaRegistry[id]) {
        const instance = window.__genieTextareaRegistry[id];
        if (options) {
          // If options are provided, update the existing instance
          instance.setProperties?.(options);
        }
        return instance;
      }

      const instance = new GenieTextarea(id, options);
      window.__genieTextareaRegistry[id] = instance;

      (this as any).instance = instance;
    });
  };
}

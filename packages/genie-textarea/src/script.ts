//@ts-ignore
import WebComponent from "./web-component/GenieTextarea.svelte";

import styles from "./styles.css?raw";
import { genieTextarea } from "./GenieTextarea";
import type { GenieTextareaOptions } from "./types";
export { GenieTextarea } from "./GenieTextarea";

if (!document.getElementById("genie-textarea-style")) {
  const style = document.createElement("style");
  style.id = "genie-textarea-style";
  style.textContent = styles;
  document.head.appendChild(style);
}

// Auto-register under default tag
customElements.define("genie-textarea", WebComponent.element!);

// Export both the class and the factory function
window.genieTextarea = genieTextarea;

// jQuery extension - check if jQuery is available
declare global {
  interface JQuery {
    genieTextarea(options?: GenieTextareaOptions): JQuery;
  }
}

// Add jQuery plugin if jQuery is available
if (typeof window !== 'undefined' && (window as any).jQuery) {
  const $ = (window as any).jQuery;
  
  $.fn.genieTextarea = function(options?: GenieTextareaOptions) {
    return this.each(function(this: HTMLElement) {
      const id = this.id;
      if (!id) {
        throw new Error('Element must have an id attribute to use genieTextarea');
      }
      
      // Create the GenieTextarea instance
      genieTextarea(id, options);
      (this as any).instance = genieTextarea(id, options);
    });
  };
}



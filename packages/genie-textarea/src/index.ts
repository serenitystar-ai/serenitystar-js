//@ts-ignore
import WebComponent from './web-component/GenieTextarea.svelte';

import styles from "./styles.css?raw";
export { GenieTextarea, genieTextarea } from './GenieTextarea';

export function defineElement(tagName = 'genie-textarea') {
  if (!customElements.get(tagName)) {
    
    if (!document.getElementById('genie-textarea-style')) {
      const style = document.createElement('style');
      style.id = 'genie-textarea-style';
      style.textContent = styles;
      document.head.appendChild(style);
    }
    
    //@ts-ignore
    customElements.define(tagName, WebComponent.element!);
  }
}
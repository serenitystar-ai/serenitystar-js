import styles from "../styles.css?raw";

/**
 * The component's stylesheet lives inside the shadow root, never in
 * `document.head`. Two reasons:
 *
 * 1. Tailwind emits everything into `@layer` blocks, and unlayered author CSS
 *    (i.e. every WordPress theme and plugin stylesheet) beats layered CSS
 *    regardless of specificity. No amount of selector prefixing can win that
 *    fight in a shared cascade — only a shadow boundary can.
 * 2. Injecting into the page also leaked Tailwind's preflight and theme tokens
 *    onto the host document.
 */

// One constructable stylesheet shared by every instance: the CSS is parsed once
// no matter how many <serenity-pricing> elements the page has.
let sheet: CSSStyleSheet | undefined;

const supportsAdoptedStyleSheets =
  typeof CSSStyleSheet !== "undefined" &&
  "replaceSync" in CSSStyleSheet.prototype &&
  typeof ShadowRoot !== "undefined" &&
  "adoptedStyleSheets" in ShadowRoot.prototype;

export function adoptStyles(root: ShadowRoot) {
  if (supportsAdoptedStyleSheets) {
    if (!sheet) {
      sheet = new CSSStyleSheet();
      sheet.replaceSync(styles);
    }
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    return;
  }

  // Safari < 16.4
  const style = document.createElement("style");
  style.textContent = styles;
  root.insertBefore(style, root.firstChild);
}

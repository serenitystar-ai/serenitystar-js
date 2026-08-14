const FONT_ID = "serenity-pricing-font";
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap";

/**
 * Inter has to be registered on the *document*, not in the shadow root:
 * Chrome ignores `@font-face` declared inside a shadow root, while font faces
 * registered at document level are visible to shadow trees.
 *
 * This link is the only thing the component adds to `document.head`, and it
 * carries no rules that can match page elements — it only registers font
 * faces. `display=swap` keeps it non-blocking.
 *
 * To avoid the third-party request (GDPR-sensitive hosting), self-host the
 * woff2 files and point FONT_HREF at them — nothing else needs to change.
 */
export function loadFont() {
  if (typeof document === "undefined") return;
  if (document.getElementById(FONT_ID)) return;

  const link = document.createElement("link");
  link.id = FONT_ID;
  link.rel = "stylesheet";
  link.href = FONT_HREF;
  document.head.appendChild(link);
}

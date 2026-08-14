#!/usr/bin/env node
/**
 * Makes Tailwind's `--tw-*` defaults apply unconditionally, so the stylesheet
 * works inside a shadow root.
 *
 * Why: `@property` registration is document-global. Per spec, `@property`
 * rules in a shadow tree's stylesheet are ignored — verified in Chrome 150:
 * the same sheet registers `--tw-border-style` when adopted by `document` and
 * registers nothing when adopted by a `ShadowRoot`.
 *
 * Without those registrations the `--tw-*` properties have no initial value, so
 * every declaration that reads one becomes invalid-at-computed-value-time and
 * falls back to its unset default. Four of them are load-bearing here:
 *
 *   border-style: var(--tw-border-style)   -> `none`, so every `border`
 *                                             utility renders nothing
 *   translate:    var(--tw-translate-x) …  -> `none`, so `translate-x-*` is
 *                                             inert (the toggle knob never
 *                                             moves)
 *   outline-style: var(--tw-outline-style) -> `none`, so the focus ring is
 *                                             invisible
 *   box-shadow:   var(--tw-shadow) …       -> `none`, so `shadow`/`ring` are
 *                                             dropped
 *
 * Tailwind already emits the fix — a `@layer properties` block that sets every
 * one of these on `*, ::before, ::after, ::backdrop` — but wraps it in an
 * `@supports` condition that only Safari < 16.4 and Firefox < 128 satisfy
 * (browsers lacking `@property` altogether). Chrome fails the condition, so it
 * relies on registration alone. Unwrapping the guard makes the block apply
 * everywhere, which is what a shadow-root sheet needs regardless of browser.
 *
 * `@layer properties` is declared before all other layers, so these defaults
 * stay the lowest-priority declarations and utilities still override them.
 *
 * The `@property` rules themselves are left in place: they are inert in a
 * shadow root, and correct if this sheet is ever adopted by a document.
 *
 * Runs as part of `build:css`, after the Tailwind CLI. Note this does not apply
 * to `npm run dev`, which compiles app.css through the Vite plugin straight
 * into the document — where `@property` registers normally. That is exactly why
 * this defect was invisible in dev.
 */
import { readFileSync, writeFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: shadow-property-fallback.mjs <css-file>");
  process.exit(1);
}

const source = readFileSync(file, "utf8");

if (!source.includes("@property ")) {
  console.log(`shadow-property-fallback: no @property rules (${file})`);
  process.exit(0);
}

// Fail loudly rather than silently leaving the bug in place: if Tailwind stops
// emitting this block, or renames the layer, the build must stop so someone
// re-derives the fallback instead of shipping borderless cards again.
const LAYER = "@layer properties {";
const layerAt = source.indexOf(LAYER);
if (layerAt === -1) {
  console.error(
    `shadow-property-fallback: found @property rules but no "${LAYER}" block in ${file}.\n` +
      "Tailwind's fallback block is what this step unwraps; without it the --tw-* " +
      "defaults never apply inside a shadow root. See this script's header."
  );
  process.exit(1);
}

const supportsAt = source.indexOf("@supports", layerAt + LAYER.length);
const openAt = source.indexOf("{", supportsAt);
if (supportsAt === -1 || openAt === -1) {
  console.error(
    `shadow-property-fallback: no @supports guard inside ${LAYER} in ${file}. ` +
      "If Tailwind now emits the defaults unconditionally, delete this build step."
  );
  process.exit(1);
}

// Brace-match to the guard's close. The block holds only custom-property
// declarations, so there are no strings or comments to escape.
let depth = 0;
let closeAt = -1;
for (let i = openAt; i < source.length; i++) {
  if (source[i] === "{") depth++;
  else if (source[i] === "}" && --depth === 0) {
    closeAt = i;
    break;
  }
}
if (closeAt === -1) {
  console.error(`shadow-property-fallback: unbalanced braces after @supports in ${file}`);
  process.exit(1);
}

const guard = source.slice(supportsAt, openAt).trim();
const body = source.slice(openAt + 1, closeAt);
const declarations = (body.match(/--tw-[a-z-]+\s*:/g) ?? []).length;

const output =
  source.slice(0, supportsAt) +
  `/* @supports guard removed by scripts/shadow-property-fallback.mjs — these\n` +
  `     defaults must apply in every browser, not just those without @property,\n` +
  `     because @property does not register inside a shadow root. */` +
  body.replace(/\n {2}/g, "\n") +
  source.slice(closeAt + 1);

writeFileSync(file, output);
console.log(
  `shadow-property-fallback: unwrapped @supports guard, ${declarations} --tw-* defaults now unconditional (${file})`
);
console.log(`  guard was: ${guard.replace(/\s+/g, " ").slice(0, 96)}…`);

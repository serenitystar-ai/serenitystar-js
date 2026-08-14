#!/usr/bin/env node
/**
 * Converts `rem` lengths to `px` in the generated stylesheet.
 *
 * Why: `rem` always resolves against the *document* root, shadow boundary or
 * not, and Tailwind expresses every font size and spacing step in `rem`. A
 * WordPress theme with `html { font-size: 62.5% }` — a common idiom — would
 * otherwise scale the whole component down by 37.5%. The shadow root cannot
 * prevent that; only fixed units can.
 *
 * Trade-off (accepted, see docs/shadow-dom-migration-plan.md §8): the component
 * no longer scales with a user's *browser default font size* preference.
 * Browser zoom still scales it normally, and any theme overriding the root font
 * size already destroyed that preference anyway.
 *
 * Media-query conditions are deliberately left alone: `rem` in a media
 * condition resolves against the *initial* font size (the browser default),
 * not the document root's computed value, so breakpoints are already immune to
 * `html { font-size }` — converting them would only throw away breakpoints
 * that track the user's font-size preference.
 *
 * Runs as part of `build:css`, after the Tailwind CLI. Note it does not apply
 * to `npm run dev`, which compiles app.css through the Vite plugin instead.
 */
import { readFileSync, writeFileSync } from "node:fs";

const ROOT_FONT_SIZE = 16;
const REM = /(-?(?:\d+\.?\d*|\.\d+))rem\b/g;

const file = process.argv[2];
if (!file) {
  console.error("usage: rem-to-px.mjs <css-file>");
  process.exit(1);
}

const source = readFileSync(file, "utf8");

// The Tailwind CLI always emits an at-rule prelude on its own line, so a
// line-level skip is enough to leave media/container conditions untouched.
const isAtRulePrelude = (line) => /^\s*@(media|container)\b/.test(line);

let converted = 0;
let skipped = 0;

const output = source
  .split("\n")
  .map((line) => {
    if (isAtRulePrelude(line)) {
      skipped += (line.match(REM) ?? []).length;
      return line;
    }
    return line.replace(REM, (_, value) => {
      converted++;
      const px = Number.parseFloat(value) * ROOT_FONT_SIZE;
      // Trim float noise (0.875rem * 16 = 14.000000000000002)
      return `${Number.parseFloat(px.toFixed(4))}px`;
    });
  })
  .join("\n");

writeFileSync(file, output);
console.log(
  `rem-to-px: ${converted} converted, ${skipped} left in media conditions (${file})`
);

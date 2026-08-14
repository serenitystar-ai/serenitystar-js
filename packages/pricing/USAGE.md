# Serenity Pricing Component — Quick Start Guide

Add a beautiful, responsive pricing section to any landing page with a single script tag. No build tools required.

---

## Installation

Add the script to your HTML page, ideally before the closing `</body>` tag:

```html
<script src="https://hub.serenitystar.ai/resources/pricing/serenity-pricing.js"></script>
```

---

## Basic Usage

1. Create a placeholder `<div>` with an `id` where you want the pricing section to appear.
2. Call `serenityPricing()` with that `id`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pricing — My Site</title>
</head>
<body>

  <div id="pricing"></div>

  <script src="https://hub.serenitystar.ai/resources/pricing/serenity-pricing.js"></script>
  <script>
    serenityPricing('pricing');
  </script>

</body>
</html>
```

That's it — the component fetches plan data automatically and renders a fully styled pricing section.

---

## Customization

Pass an options object as the second argument to configure the component:

```html
<script>
  serenityPricing('pricing', {
    title: 'Choose Your Plan',
    description: 'Simple, transparent pricing for teams of all sizes.',
    ctaText: 'Start Free Trial',
    ctaUrl: 'https://hub.serenitystar.ai/signup',
    typeOfPrice: 'monthly',
    theme: 'light',
  });
</script>
```

### Available Options

| Option | Type | Default | Description |
|---|---|---|---|
| `showHeader` | `boolean` | `true` | Show or hide the title and description above the plans. |
| `title` | `string` | `"Pricing"` | Heading text displayed above the plans. |
| `description` | `string` | `"Start with a free trial, no credit card required and pay-as-you-go."` | Subtitle text below the heading. |
| `showCTA` | `boolean` | `true` | Show or hide the call-to-action button on each plan. |
| `ctaText` | `string` | `"Get Started"` | Label for the CTA button. |
| `ctaUrl` | `string` | `"https://hub.serenitystar.ai"` | URL the CTA buttons link to. |
| `typeOfPrice` | `"monthly"` \| `"annual"` | `"annual"` | Which price to display — monthly or annual (per-month). |
| `theme` | `"light"` \| `"dark"` | `"dark"` | Color scheme. Use `"light"` for pages with a white/light background. |
| `language` | `"en"` \| `"es"` | Auto-detected | Override the UI language. When omitted, the component detects the browser language and falls back to English. |

---

## Theme Examples

### Dark Mode (default)

Best for dark-background landing pages:

```html
<div id="pricing"></div>

<script src="https://hub.serenitystar.ai/resources/pricing/serenity-pricing.js"></script>
<script>
  serenityPricing('pricing');
</script>
```

### Light Mode

For white or light-background pages:

```html
<div id="pricing"></div>

<script src="https://hub.serenitystar.ai/resources/pricing/serenity-pricing.js"></script>
<script>
  serenityPricing('pricing', {
    theme: 'light',
  });
</script>
```

---

## Updating Options After Initialization

Call `serenityPricing()` again with the same `id` and new options to update the component without re-mounting it:

```html
<script>
  // Initial render
  const pricing = serenityPricing('pricing', {
    typeOfPrice: 'annual',
  });

  // Later — switch to monthly pricing
  pricing.set('typeOfPrice', 'monthly');
</script>
```

### Instance Methods

| Method | Description |
|---|---|
| `set(key, value)` | Update a single option. |
| `get(key)` | Read the current value of an option. |
| `setProperties(options)` | Update multiple options at once. |
| `getElement()` | Returns the underlying DOM element. |
| `destroy()` | Remove the component from the page. |

---

## Hiding the Header

If you only want to display the plan cards without the title and description:

```html
<script>
  serenityPricing('pricing', {
    showHeader: false,
  });
</script>
```

---

## Hiding CTA Buttons

To display plans as informational cards without action buttons:

```html
<script>
  serenityPricing('pricing', {
    showCTA: false,
  });
</script>
```

---

## Language

By default the component detects the browser language and uses Spanish or English accordingly (falling back to English for unsupported languages). Use the `language` option to override this:

### Force Spanish

```html
<script>
  serenityPricing('pricing', {
    language: 'es',
  });
</script>
```

### Force English

```html
<script>
  serenityPricing('pricing', {
    language: 'en',
  });
</script>
```

When `language` is set, all default UI strings — title, description, CTA button text, toggle labels, and billing period text — switch to that language. You can still override individual strings with `title`, `description`, or `ctaText`.

---

## Full Example

A complete landing page section with all options configured:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pricing — Acme Corp</title>
  <style>
    body {
      margin: 0;
      font-family: system-ui, sans-serif;
    }
  </style>
</head>
<body>

  <div id="pricing-section"></div>

  <script src="https://hub.serenitystar.ai/resources/pricing/serenity-pricing.js"></script>
  <script>
    serenityPricing('pricing-section', {
      title: 'Simple, Transparent Pricing',
      description: 'No hidden fees. Cancel anytime.',
      ctaText: 'Start Free Trial',
      ctaUrl: 'https://hub.serenitystar.ai/signup',
      typeOfPrice: 'annual',
      theme: 'dark',
    });
  </script>

</body>
</html>
```

---

## Styling & Isolation

The component renders inside a **shadow root**, and its stylesheet is loaded
into that root rather than into the page. This is what makes it safe to drop
into WordPress installs (Divi, Elementor, and friends) whose themes and plugins
ship aggressive global CSS.

**Your page's CSS cannot restyle the component's internals.** That is
deliberate — element selectors, `!important` declarations, `#id` rules and
inherited typography from the host page are all stopped at the boundary,
including page rules that try to redefine the component's design tokens.

Practical consequences:

- No CSS override hook is exposed today. If you need one, open an issue rather
  than reaching in — a `::part()` / custom-property theming API is the intended
  path (see `docs/shadow-dom-migration-plan.md` §4.7).
- Use the `theme` option for dark/light, which covers most of what page CSS was
  previously used for.
- **Inter** is fetched from Google Fonts and registered on the document, because
  Chrome ignores `@font-face` declared inside a shadow root. It loads once per
  page with `display=swap`, and the component falls back to the system sans
  stack if the request is blocked.
- Nothing else is added to `document.head`.

Sizes are emitted in `px` rather than `rem`, so a theme that sets
`html { font-size: 62.5% }` — a common WordPress idiom — no longer shrinks the
component. Responsive breakpoints are the one exception and stay in `rem`, which
in a media condition resolves against the browser's default font size and is
already immune to the page's root font size. Browser zoom scales the component
normally.

What the page **can** still affect, by design:

- **Layout of the surrounding box** — ancestor `width`, `max-width`,
  `overflow`, `transform`, `display: flex` and `z-index` all still apply. If the
  section looks too narrow, look at the wrapper you mounted it into (Divi's
  `.container` caps content at `1080px`, for example).

`demos/11-hostile-css.html` renders the component under a deliberately hostile
stylesheet and is the regression check for all of the above.

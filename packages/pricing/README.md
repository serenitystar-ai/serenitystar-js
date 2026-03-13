![Serenity Pricing Component](https://github.com/serenitystar-ai/serenitystar-js/blob/main/.github/resources/serenity-pricing-banner.png?raw=true)

[![npm version](https://img.shields.io/npm/v/@serenity-star/pricing.svg)](https://www.npmjs.com/package/@serenity-star/pricing)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A beautiful, responsive pricing section web component built with Svelte 5 that seamlessly integrates with any web application. Display Serenity* pricing plans with a modern, customizable interface that fetches data from APIs and provides flexible styling options.

## ✨ Key Features

- 🚀 **Modern Architecture**: Built with Svelte 5 and runes for optimal performance
- 📱 **Fully Responsive**: Adaptive layout (1-5 columns) that works on all devices
- 🎨 **Customizable Design**: Tailwind CSS styling with Serenity Star theme
- 🌐 **Universal Integration**: Works as ES module, IIFE script, or jQuery plugin
- 📡 **API Integration**: Fetches pricing data our REST API endpoint
- 🎛️ **Flexible Configuration**: Customizable header and CTA buttons
- � **TypeScript Support**: Complete type definitions included
- ⚡ **Lightweight**: Minimal footprint

## 📦 Installation

### NPM Installation

```bash
npm install @serenity-star/pricing
```

### CDN Usage (IIFE)

```html
<script src="https://unpkg.com/@serenity-star/pricing/dist/serenity-pricing.iife.js"></script>
```

## 🚀 Quick Start

### Basic HTML Setup

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pricing Demo</title>
</head>
<body>
    <!-- Container element that will be replaced -->
    <div id="pricing-container"></div>

    <!-- Include the IIFE script -->
    <script src="https://unpkg.com/@serenity-star/pricing/dist/serenity-pricing.iife.js"></script>
    
    <script>
        // Initialize the component with default settings
        serenityPricing('pricing-container');
    </script>
</body>
</html>
```

### ES Module Usage

```javascript
import { serenityPricing, defineElement } from '@serenity-star/pricing';

// Register the web component
defineElement();

// Initialize the component
serenityPricing('pricing-container', {
    title: 'Choose Your Plan',
    description: 'Select the perfect plan for your needs with flexible pricing options.',
    ctaText: 'Get Started'
});
```

## 🔧 Usage Patterns

### ES Module Import

```javascript
import { serenityPricing } from '@serenity-star/pricing';

// Using factory function (recommended)
const instance = serenityPricing('pricing-id', options);

// Control the instance
instance.set('title', 'New Title');
const currentTitle = instance.get('title');
```

### IIFE Script Tag

```html
<script src="https://unpkg.com/@serenity-star/pricing/dist/serenity-pricing.iife.js"></script>
<script>
    // Global function available
    const instance = serenityPricing('pricing-container', {
        title: 'Our Plans',
        showHeader: true,
        ctaText: 'Get Started Today'
    });
</script>
```

### jQuery Plugin Integration

```javascript
// Requires jQuery to be loaded first
$('#pricing-container').serenityPricing({
    title: 'Subscription Plans',
    description: 'Flexible pricing for teams of all sizes.',
    ctaText: 'Choose Plan'
});
```

### Direct Web Component Usage

```html
<!-- Use directly in HTML -->
<serenity-pricing 
    id="pricing-container"
    show-header="true"
    title="Our Pricing"
    description="Choose the plan that fits your needs">
</serenity-pricing>
```

### Hybrid HTML + JavaScript Configuration

This approach allows you to declare a web component directly in HTML with basic setup, then enhance it with additional JavaScript configuration. This is perfect for gradual enhancement and framework integration.

```html
<!-- HTML: Basic setup -->
<serenity-pricing 
    id="hybrid-pricing"
    title="Enterprise Solutions"
    description="Scalable pricing for growing businesses">
</serenity-pricing>
```

```javascript
// JavaScript: Enhancement
const instance = serenityPricing('hybrid-pricing', {
    ctaText: 'Contact Sales',
    showCTA: true
});

// You can also use the instance to control the component
instance.set('title', 'Updated via JavaScript!');
console.log('Current title:', instance.get('title'));
```

**Key benefits of this approach:**
- ✅ **Framework-friendly**: Works seamlessly with React, Vue, Angular, or any framework
- ✅ **Progressive enhancement**: Start with basic HTML, enhance with JavaScript as needed
- ✅ **No DOM replacement**: Existing components are preserved and enhanced in place

## ⚙️ Configuration Options

### Complete Options Reference

```typescript
interface SerenityPricingProps {
    // Header Configuration
    showHeader?: boolean;       // Whether to display the header section (default: true)
    title?: string;            // Main heading text (default: "Pricing")
    description?: string;      // Description text below title (default: "Start with a free trial...")
    
    // CTA Button Configuration
    showCTA?: boolean;         // Whether to display CTA buttons on plans (default: true)
    ctaText?: string;          // Text displayed on CTA buttons (default: "Get Started")
}
```

### Required vs Optional Parameters

**All parameters are optional** with sensible defaults. The component works out of the box without any configuration.

### Default Values

```javascript
const defaults = {
    showHeader: true,
    title: 'Pricing',
    description: 'Start with a free trial, no credit card required and pay-as-you-go.',
    showCTA: true,
    ctaText: 'Get Started'
};
```

## 🎨 Customization

### Basic Usage Examples

#### Simple Pricing Display

```javascript
// Basic pricing table with all defaults
serenityPricing('pricing-section');
```

#### Custom Branding

```javascript
serenityPricing('pricing-section', {
    title: 'Choose Your Plan',
    description: 'Select the perfect plan for your business needs.',
    ctaText: 'Start Free Trial'
});
```

#### Header-Only Mode

```javascript
serenityPricing('pricing-section', {
    title: 'Our Plans',
    description: 'Transparent pricing for every team size.',
    showCTA: false // Hide all CTA buttons
});
```

#### Plans-Only Mode (Minimal)

```javascript
serenityPricing('pricing-section', {
    showHeader: false, // Hide title and description
    ctaText: 'Select Plan'
});
```

#### Completely Minimal

```javascript
serenityPricing('pricing-section', {
    showHeader: false, // No header
    showCTA: false     // No CTA buttons - just pricing cards
});
```

### CSS Styling Options

The component includes scoped styles, but you can customize the appearance:

```css
/* Target the root container */
.serenity-pricing-root {
    font-family: 'Your Custom Font', sans-serif;
}

/* Customize the header section */
.serenity-pricing-root h2 {
    color: #1f2937;
    font-size: 2.5rem;
}

/* Style the description */
.serenity-pricing-root p {
    color: #6b7280;
    font-size: 1.125rem;
}

/* Customize pricing cards */
.serenity-pricing-root section {
    border-radius: 16px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
}

/* Style CTA buttons */
.serenity-pricing-root a {
    transition: all 0.2s ease-in-out;
}

.serenity-pricing-root a:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

## 📡 API Integration

### Pricing Data API

The component automatically fetches pricing data from: `https://api.serenitystar.ai/api/v2/SubscriptionPlans`

#### Expected Data Format

```typescript
interface PricingPlan {
  title: string;        // Plan name (e.g., "Basic", "Pro", "Enterprise")
  price: string;        // Price display (e.g., "$19/month", "Free")
  features: string[];   // Array of feature descriptions
  href?: string;        // Optional link for the CTA button
  isPopular?: boolean;  // Whether to highlight this plan as popular/featured
  description?: string; // Optional plan description
}
```

#### Example API Response

```json
[
  {
    "title": "Starter",
    "price": "Free",
    "description": "Perfect for trying out our platform",
    "features": [
      "Up to 3 projects",
      "5GB storage",
      "Email support"
    ],
    "href": "/signup",
    "isPopular": false
  },
  {
    "title": "Professional",
    "price": "$29/month",
    "description": "Best for growing businesses",
    "features": [
      "Unlimited projects",
      "100GB storage",
      "Priority support",
      "Advanced analytics"
    ],
    "href": "/signup?plan=pro",
    "isPopular": true
  }
]
```

## 📄 License & Credits

MIT License - see [LICENSE](LICENSE) file for details.

**Created by:** Mauro Garcia  
**Powered by:** [Serenity* Star AI](https://serenitystar.ai)

Built with:
- [Svelte 5](https://svelte.dev) - Web component framework
- [Vite](https://vitejs.dev) - Build tool
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [TypeScript](https://typescriptlang.org) - Type safety

---

## 🤝 Support

- 📖 **Documentation:** [https://docs.serenitystar.ai/](https://docs.serenitystar.ai/)
- 💬 **Community:** [Discord Server](https://discord.gg/SrT3xP7tS8)

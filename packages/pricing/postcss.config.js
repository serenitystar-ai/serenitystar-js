import postcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import prefixSelector from 'postcss-prefix-selector';

export default {
  plugins: [
    postcss,
    autoprefixer,
    prefixSelector({
      prefix: '.serenity-pricing-root',
      transform: (prefix, selector) => {
        if (
          selector.startsWith('html') ||
          selector.startsWith('body') ||
          selector.startsWith(':root') ||
          selector.startsWith(':host') ||
          selector.startsWith('.serenity-pricing-root')
        ) {
          return selector;
        }
        return `${prefix} ${selector}`;
      }
    })
  ]
};
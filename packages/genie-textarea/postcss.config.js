import postcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import prefixSelector from 'postcss-prefix-selector';

export default {
  plugins: [
    postcss,
    autoprefixer,
    prefixSelector({
      prefix: '.genie-textarea-root',
      transform: (prefix, selector) => {
        if (
          selector.startsWith('html') ||
          selector.startsWith('body') ||
          selector.startsWith(':root') ||
          selector.startsWith(':host') ||
          selector.startsWith('.genie-textarea-root')
        ) {
          return selector;
        }
        return `${prefix} ${selector}`;
      }
    })
  ]
};
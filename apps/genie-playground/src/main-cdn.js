// CDN version of the Genie Textarea Playground
// This uses the IIFE version and vanilla JavaScript

// Configuration
const apiKey = '<use-your-api-key>'; // Replace with your actual API key
const agentCode = 'inline-translator-for-genie'; // Using your specific agent

// Sleep utility for custom completion example
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Define examples configuration
const examples = [
  {
    id: 'basic-usage',
    setup: () => {
      genieTextarea('basic-example', {
        apiKey,
        agentCode,
        contentParameterName: "userMessage"
      });
    }
  },

  {
    id: 'with-label-placeholder',
    setup: () => {
      genieTextarea('labeled-example', {
        apiKey,
        agentCode,
        contentParameterName: "userMessage",
        label: 'Text to Translate',
        placeholder: 'Enter text in any language to translate to English...',
        value: 'Hola mundo, ¿cómo estás hoy?'
      });
    }
  },

  {
    id: 'custom-parameters',
    setup: () => {
      const instance = genieTextarea('params-example', {
        apiKey,
        agentCode,
        contentParameterName: "userMessage",
        label: 'Translate to Spanish',
        placeholder: 'Enter text to translate to spanish...',
        value: 'Hello world, how are you today?',
        inputParameters: {
          lang: 'spanish'
        }
      });

      const langSelector = document.getElementById('lang-selector');
      langSelector.addEventListener('change', (e) => {
        const selectedLang = e.target.value;
        const capitalizedLang = selectedLang.charAt(0).toUpperCase() + selectedLang.slice(1);
        
        // Use the set method to update properties dynamically
        instance.set('label', `Translate to ${capitalizedLang}`);
        instance.set('placeholder', `Enter text to translate to ${selectedLang}...`);
        instance.set('inputParameters', { lang: selectedLang });
      });
    }
  },

  {
    id: 'value-change-tracking',
    setup: () => {
      let charCount = 0;

      genieTextarea('tracking-example', {
        apiKey,
        agentCode,
        contentParameterName: "userMessage",
        label: 'Content with Change Tracking',
        placeholder: 'Type here and watch the character count...',
        handleValueChange: (newValue) => {
          charCount = newValue.length;
          document.getElementById('char-count-tracking').textContent = 
            `Character count: ${charCount}`;
          console.log('Content updated:', newValue);
        }
      });
    }
  },

  {
    id: 'custom-button-styling',
    setup: () => {
      genieTextarea('styled-button-example', {
        apiKey,
        agentCode,
        contentParameterName: "userMessage",
        label: 'Custom Styled Button',
        placeholder: 'Text with custom AI button styling...',
        aiButtonProps: {
          text: 'Translate Now',
          bgColor: '#10b981', // Green background
          tintColor: '#ffffff' // White text
        }
      });
    }
  },

  {
    id: 'custom-svg-icon',
    setup: () => {
      genieTextarea('svg-icon-example', {
        apiKey,
        agentCode,
        contentParameterName: "userMessage",
        label: 'Custom SVG Icon',
        placeholder: 'Text with custom SVG icon...',
        aiButtonProps: {
          bgColor: '#7c3aed',
          icon: {
            type: 'svg',
            content: `<svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>`,
            tintColor: '#fbbf24' // Gold star
          }
        }
      });
    }
  },

  {
    id: 'custom-image-icon',
    setup: () => {
      genieTextarea('image-icon-example', {
        apiKey,
        agentCode,
        contentParameterName: "userMessage",
        label: 'Custom Image Icon',
        placeholder: 'Text with custom image icon...',
        aiButtonProps: {
          bgColor: '#dc2626',
          icon: {
            type: 'img',
            src: '/vite.svg',
            alt: 'Custom AI Icon'
          }
        }
      });
    }
  },

  {
    id: 'textarea-customization',
    setup: () => {
      genieTextarea('textarea-custom-example', {
        apiKey,
        agentCode,
        contentParameterName: "userMessage",
        label: 'Customized Textarea',
        placeholder: 'Limited to 200 characters...',
        textareaProps: {
          rows: 6,
          maxlength: 200,
          class: 'custom-textarea-class',
          style: 'border-radius: 12px; font-size: 16px; border: 2px solid #4862ff;',
          spellcheck: true,
          'aria-label': 'Custom AI-enhanced text input'
        }
      });
    }
  },

  {
    id: 'label-customization',
    setup: () => {
      genieTextarea('label-custom-example', {
        apiKey,
        agentCode,
        contentParameterName: "userMessage",
        label: 'Styled Label',
        placeholder: 'Text with custom label styling...',
        labelProps: {
          class: 'custom-label-class',
          style: 'font-weight: bold; color: #7c3aed; font-size: 18px; text-transform: uppercase;',
          'aria-label': 'Custom styled label'
        }
      });
    }
  },

  {
    id: 'event-handlers',
    setup: () => {
      genieTextarea('events-example', {
        apiKey,
        agentCode,
        contentParameterName: "userMessage",
        label: 'Event Handlers Example',
        placeholder: 'Text with event handling...',
        
        handleBeforeSubmit: async ({ content, instruction, setContent }) => {
          console.log('About to process:', { content, instruction });
          
          if (content.length < 5) {
            alert('Please provide more content for better translation');
            return false; // Cancel processing
          }
          
          // Add context to improve translation
          setContent(`Context: This is casual conversation.\n\n${content}`);
          return true; // Proceed with processing
        },
        
        handleAgentResult: async (result) => {
          console.log('Translation completed:', result);
          document.getElementById('status-events').textContent = 
            'Translation completed successfully!';
          setTimeout(() => {
            document.getElementById('status-events').textContent = '';
          }, 3000);
        }
      });
    }
  },

  {
    id: 'custom-completion-handler',
    setup: () => {
      genieTextarea('custom-completion-example', {
        label: 'Custom Completion Logic',
        placeholder: 'Custom AI completion handler...',
        
        handleRequestCompletion: async ({ content, instruction, addChunk, setContent }) => {
          console.log('Starting custom completion...', { content, instruction });
          
          // Clear the textarea before adding new content
          setContent && setContent('');
          
          // Simulate AI processing delay
          await sleep(500);
          
          // Simulate streaming response
          const responses = [
            'This is a simulated ',
            'AI response that demonstrates ',
            'how to implement custom ',
            'completion logic with ',
            'streaming chunks.'
          ];
          
          for (const chunk of responses) {
            await sleep(200); // Simulate network delay
            addChunk && addChunk(chunk);
          }
          
          console.log('Custom completion finished');
        }
      });
    }
  },

  {
    id: 'localization',
    setup: () => {
      genieTextarea('localization-example', {
        apiKey,
        agentCode,
        contentParameterName: "userMessage",
        label: 'Ejemplo de Localización',
        placeholder: 'Texto en español para traducir...',
        locale: {
          contentMissingErrorMessage: 'Por favor, proporciona contenido para procesar.',
          thinkingMessage: 'Pensando...',
          completionErrorMessage: 'Ocurrió un error al procesar tu solicitud.'
        },
        aiButtonProps: {
          text: 'Traducir'
        }
      });
    }
  },

  {
    id: 'programmatic-control',
    setup: () => {
      const instance = genieTextarea('programmatic-example', {
        apiKey,
        agentCode,
        contentParameterName: "userMessage",
        label: 'Programmatic Control',
        placeholder: 'Use buttons below to control this textarea...'
      });

      // Store instance for button handlers
      window.programmaticInstance = instance;

      // Set up button event listeners
      document.getElementById('set-value-btn').addEventListener('click', () => {
        instance.set('value', 'Bonjour le monde!');
      });

      document.getElementById('get-value-btn').addEventListener('click', () => {
        const value = instance.get('value');
        alert(`Current value: ${value}`);
      });

      document.getElementById('execute-ai-btn').addEventListener('click', () => {
        instance.aiButton.execute();
      });
    }
  },

  {
    id: 'web-component-usage',
    setup: () => {
      // Set the API key for the web component example
      const webComponentExample = document.getElementById('web-component-example');
      if (webComponentExample) {
        webComponentExample.setAttribute('api-key', apiKey);
        webComponentExample.setAttribute('agent-code', agentCode);
      }
    }
  },

  {
    id: 'hybrid-config',
    setup: () => {
      // This demonstrates the hybrid approach: web component declared in HTML, enhanced with JS
      const instance = genieTextarea('hybrid-example', {
        apiKey, // Set API key via JavaScript
        agentCode, // Set agent code via JavaScript
        contentParameterName: 'userMessage',
        value: 'This value was set via JavaScript!',
        handleValueChange: (value) => {
          console.log('Hybrid example - Value changed:', value);
        },
        handleBeforeSubmit: async ({ content }) => {
          console.log('Hybrid example - About to submit:', content);
          return true; // Proceed with submission
        }
      });

      // Demo: Update some properties programmatically
      setTimeout(() => {
        instance.set('placeholder', 'Updated via JavaScript after 2 seconds!');
        console.log('Hybrid example - Current value:', instance.get('value'));
      }, 2000);

      // Store instance for potential external access
      window.hybridInstance = instance;
    }
  }
];

function initializePlayground() {
    // The genie-textarea web component is automatically registered by the IIFE bundle
    // No manual registration needed - just use window.genieTextarea function

    // Initialize all examples
    examples.forEach(example => {
        try {
            example.setup();
            console.log(`✅ Initialized example: ${example.id}`);
        } catch (error) {
            console.error(`❌ Failed to initialize example: ${example.id}`, error);
        }
    });

    // Highlight all code blocks that are already in the HTML
    if (typeof hljs !== 'undefined') {
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    }

    console.log('🧞 Genie Textarea Playground (CDN Version) initialized with', examples.length, 'examples');
    console.log('📝 Note: Replace "your-api-key" with your actual Serenity* Star API key to enable AI functionality');
}

// Only initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializePlayground);

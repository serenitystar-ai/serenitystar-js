import { defineElement, genieTextarea } from '@serenity-star/genie-textarea'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'

// Register the language for syntax highlighting
hljs.registerLanguage('javascript', javascript)

const apiKey = import.meta.env.VITE_API_KEY;
const agentCode = import.meta.env.VITE_AGENT_CODE; // Using your specific agent
const assistedModeApiKey = import.meta.env.VITE_ASSISTED_MODE_API_KEY; // For assisted mode examples
const assistedModeAgentCode = import.meta.env.VITE_ASSISTED_MODE_AGENT_CODE; // For assisted mode examples
// Register the web component globally
defineElement('genie-textarea')

interface Example {
  id: string
  setup: () => void
}

// Sleep utility for custom completion example
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const examples: Example[] = [
  {
    id: 'basic-usage',
    setup: () => {
      genieTextarea('basic-example', {
        apiKey,
        agentCode,
        contentParameterName: "userMessage"
      })
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
      })
    }
  },

  {
    id: 'custom-parameters',
    setup: () => {
      const langSelector = document.getElementById('lang-selector') as HTMLSelectElement;
      
      // Initialize the textarea instance once
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

      if (langSelector) {
        langSelector.addEventListener('change', (e) => {
          const selectedLang = (e.target as HTMLSelectElement).value;
          const capitalizedLang = selectedLang.charAt(0).toUpperCase() + selectedLang.slice(1);
          
          // Use the set method to update properties instead of recreating
          instance.set('label', `Translate to ${capitalizedLang}`);
          instance.set('placeholder', `Enter text to translate to ${selectedLang}...`);
          instance.set('inputParameters', { lang: selectedLang });
        });
      }
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
          const countElement = document.getElementById('char-count-tracking');
          if (countElement) {
            countElement.textContent = `Character count: ${charCount}`;
          }
          console.log('Content updated:', newValue);
        }
      })
    }
  },

  {
    id: 'custom-button-styling',
    setup: () => {
      (genieTextarea as any)('styled-button-example', {
        apiKey,
        agentCode,
        contentParameterName: "userMessage",
        label: 'Custom Styled Button',
        placeholder: 'Text with custom AI button styling...',
        aiButtonProps: {
          text: 'Translate Now',
          bgColor: '#10b981',
          tintColor: '#ffffff'
        }
      })
    }
  },

  {
    id: 'undo-button-customization',
    setup: () => {
      (genieTextarea as any)('undo-button-example', {
        apiKey,
        agentCode,
        contentParameterName: "userMessage",
        label: 'Undo Button Customization',
        placeholder: 'Type some text and click the AI button to see the undo feature...',
        value: 'This text will be processed by AI. After processing, an undo button will appear.',
        aiButtonProps: {
          text: 'Process Text',
          bgColor: '#3b82f6', // Blue background
          tintColor: '#ffffff' // White text
        },
        undoButtonProps: {
          bgColor: '#f59e0b', // Orange background
          tintColor: '#ffffff' // White icon
        }
      })
    }
  },

  {
    id: 'custom-svg-icon',
    setup: () => {
      (genieTextarea as any)('svg-icon-example', {
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
            tintColor: '#fbbf24'
          }
        }
      })
    }
  },

  {
    id: 'custom-image-icon',
    setup: () => {
      (genieTextarea as any)('image-icon-example', {
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
      })
    }
  },

  {
    id: 'textarea-customization',
    setup: () => {
      (genieTextarea as any)('textarea-custom-example', {
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
      })
    }
  },

  {
    id: 'label-customization',
    setup: () => {
      (genieTextarea as any)('label-custom-example', {
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
      })
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
            return false;
          }
          
          setContent(`Context: This is casual conversation.\n\n${content}`);
          return true;
        },
        
        handleAgentResult: async (result) => {
          console.log('Translation completed:', result);
          const statusElement = document.getElementById('status-events');
          if (statusElement) {
            statusElement.textContent = 'Translation completed successfully!';
            setTimeout(() => {
              statusElement.textContent = '';
            }, 3000);
          }
        }
      })
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
          
          // Clear the textarea before adding chunks
          setContent?.('');
          
          await sleep(500);
          
          const responses = [
            'This is a simulated ',
            'AI response that demonstrates ',
            'how to implement custom ',
            'completion logic with ',
            'streaming chunks.'
          ];
          
          for (const chunk of responses) {
            await sleep(200);
            addChunk?.(chunk);
          }
          
          console.log('Custom completion finished');
        }
      })
    }
  },

  {
    id: 'assisted-mode-basic',
    setup: () => {
      genieTextarea('assisted-basic-example', {
        apiKey: assistedModeApiKey,
        agentCode: assistedModeAgentCode,
        contentParameterName: "userMessage",
        instructionParameterName: "instruction",
        mode: 'assisted',
        label: 'Content Editor',
        placeholder: 'Enter your content here...',
        value: 'Artificial Intelligence has revolutionized the way we approach technology and problem-solving across numerous industries. From healthcare to finance, AI systems are now capable of analyzing vast amounts of data, identifying patterns, and making predictions that were once thought impossible. Machine learning algorithms can process information at speeds far beyond human capability, enabling breakthroughs in medical diagnosis, autonomous vehicles, and natural language processing. However, with these advancements come important considerations about ethics, privacy, and the future of work. As AI continues to evolve, it is crucial that we develop responsible frameworks for its implementation while ensuring that the benefits are distributed equitably across society. The integration of AI into our daily lives presents both exciting opportunities and significant challenges that require careful navigation.',
        quickActions: [
          { label: 'Improve Grammar', instruction: 'Fix grammar and improve readability' },
          { label: 'Make Professional', instruction: 'Rewrite in a professional tone' },
          { label: 'Summarize', instruction: 'Create a concise summary' }
        ]
      })
    }
  },

  {
    id: 'assisted-mode-advanced',
    setup: () => {
      genieTextarea('assisted-advanced-example', {
        apiKey: assistedModeApiKey,
        agentCode: assistedModeAgentCode,
        contentParameterName: "userMessage",
        instructionParameterName: "instruction",
        mode: 'assisted',
        label: 'Editor Avanzado',
        placeholder: 'Ingresa tu contenido aquí...',
        value: 'Este es un texto de ejemplo que puedes editar y mejorar con asistencia de IA.',
        locale: {
          assistedMode: {
            inputPlaceholder: 'Escribe una instrucción personalizada...',
            quickActionsTitle: 'Acciones Rápidas'
          }
        } as any,
        quickActions: [
          { 
            label: 'Corregir Texto', 
            instruction: 'Corrige la gramática y mejora la legibilidad del texto',
            icon: {
              type: 'svg',
              content: `<svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>`
            }
          },
          { 
            label: 'Traducir', 
            instruction: 'Traduce el texto al inglés manteniendo el tono y contexto',
            icon: {
              type: 'svg',
              content: `<svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
              </svg>`
            }
          }
        ]
      })
    }
  },

  {
    id: 'localization',
    setup: () => {
      (genieTextarea as any)('localization-example', {
        apiKey,
        agentCode,
        contentParameterName: "userMessage",
        label: 'Ejemplo de Localización',
        placeholder: 'Texto en español para traducir...',
        locale: {
          contentMissingErrorMessage: 'Por favor, proporciona contenido para procesar.',
          thinkingMessage: 'Pensando...',
          completionErrorMessage: 'Ocurrió un error al procesar tu solicitud.',
          undoButtonTooltip: 'Deshacer'
        },
        aiButtonProps: {
          text: 'Traducir'
        }
      })
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
      (window as any).programmaticInstance = instance;
    }
  },

  {
    id: 'web-component-usage',
    setup: () => {
      // This will be handled differently since it's direct HTML
    }
  },

  {
    id: 'hybrid-config',
    setup: () => {
      // This demonstrates the hybrid approach: web component declared in HTML, enhanced with JS
      const instance = genieTextarea('hybrid-example', {
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
      (window as any).hybridInstance = instance;
    }
  }
]

function initializePlayground() {
  // Set the API key for the web component example
  const webComponentExample = document.getElementById('web-component-example') as any;
  if (webComponentExample) {
    webComponentExample.setAttribute('api-key', apiKey);
  }

  // Initialize all examples
  examples.forEach(example => {
    if (example.id !== 'web-component-usage') {
      example.setup();
    }
  });

  // Highlight all code blocks that are already in the HTML
  document.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightElement(block as HTMLElement);
  });

  console.log('🧞 Genie Textarea Playground initialized with', examples.length, 'examples');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePlayground);
} else {
  initializePlayground();
}

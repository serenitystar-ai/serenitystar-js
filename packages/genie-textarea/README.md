# 🧞 Genie Textarea

[![npm version](https://img.shields.io/npm/v/@serenity-star/genie-textarea.svg)](https://www.npmjs.com/package/@serenity-star/genie-textarea)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful AI-enhanced textarea web component built with Svelte 5 that seamlessly integrates with the Serenity* Star AI platform. Transform any textarea into an intelligent text editor with AI-powered completions, suggestions, and content generation.

## ✨ Key Features

- 🤖 **AI-Powered**: Built-in integration with Serenity* Star AI platform
- 🎯 **Easy Integration**: Works as ES module, IIFE script, or jQuery plugin
- 🎨 **Fully Customizable**: Custom styling, icons, and behaviors
- 📱 **Responsive**: Auto-resizing textarea with modern UI
- 🔧 **TypeScript Support**: Complete type definitions included
- 🌐 **Universal**: Works with any framework or vanilla JavaScript
- ⚡ **Lightweight**: Minimal footprint with maximum functionality

## 📦 Installation

### NPM Installation

```bash
npm install @serenity-star/genie-textarea
```

### CDN Usage (IIFE)

```html
<script src="https://unpkg.com/@serenity-star/genie-textarea/dist/genie-textarea.iife.js"></script>
```

## 🚀 Quick Start

### Basic HTML Setup

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Genie Textarea Demo</title>
</head>
<body>
    <!-- Container element that will be replaced -->
    <div id="my-textarea"></div>

    <!-- Include the IIFE script -->
    <script src="https://unpkg.com/@serenity-star/genie-textarea/dist/genie-textarea.iife.js"></script>
    
    <script>
        // Initialize the component
        genieTextarea('my-textarea', {
            apiKey: 'your-api-key',
            agentCode: 'your-agent-code',
            placeholder: 'Type your content here...',
            label: 'Content'
        });
    </script>
</body>
</html>
```

### ES Module Usage

```javascript
import { genieTextarea, defineElement } from '@serenity-star/genie-textarea';

// Register the web component
defineElement();

// Initialize the component
genieTextarea('my-textarea', {
    apiKey: 'your-api-key',
    agentCode: 'your-agent-code',
    placeholder: 'Type your content here...'
});
```

## 🤖 AI Integration

### Serenity* Star Integration (Recommended)

Genie Textarea is designed to work seamlessly with [Serenity* Star](https://docs.serenitystar.ai/), a powerful AI platform for content generation and processing. This is the simplest and most powerful way to add AI capabilities to your textarea.

#### Getting Started with Serenity* Star

1. **Sign up** at [Serenity* Star](https://serenitystar.ai)
2. **Create an Agent** for your specific use case
3. **Get your API key** from the dashboard
4. **Use your agent code** in the component

```javascript
genieTextarea('my-textarea', {
    apiKey: 'sk-your-api-key-here',
    agentCode: 'your-agent-code',
    placeholder: 'Type something here...',
});
```

#### Custom Base URL

If you're using a custom Serenity* Star deployment:

```javascript
genieTextarea('my-textarea', {
    apiKey: 'your-api-key',
    agentCode: 'your-agent-code',
    baseURL: 'https://your-custom-api.example.com/api/v2'
});
```

#### Input Parameters

Pass additional parameters to your Serenity* Star agent:

```javascript
genieTextarea('my-textarea', {
    apiKey: 'your-api-key',
    agentCode: 'your-agent-code',
    inputParameters: {
        tone: 'professional',
        language: 'en',
        maxLength: 500
    }
});
```

### Custom Completion Handler

For complete control over the AI completion process, use the `handleRequestCompletion` callback. When using this approach, `agentCode` and `apiKey` are not used.

```javascript
genieTextarea('my-textarea', {
    handleRequestCompletion: async ({ content, instruction, addChunk, setContent }) => {
        try {
            // Your custom AI logic here
            const response = await fetch('https://your-ai-api.com/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    text: content, 
                    prompt: instruction 
                })
            });

            if (response.body) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value);
                    addChunk?.(chunk); // Stream chunks to the textarea
                }
            }
        } catch (error) {
            console.error('Completion error:', error);
            // Handle error appropriately
        }
    }
});
```

## 🔧 Usage Patterns

### ES Module Import

```javascript
import { genieTextarea } from '@serenity-star/genie-textarea';

// Using factory function (recommended)
const instance = genieTextarea('textarea-id', options);

// Control the instance
instance.set('value', 'New content');
const currentValue = instance.get('value');
instance.aiButton.execute(); // Trigger AI completion
```

### IIFE Script Tag

```html
<script src="https://unpkg.com/@serenity-star/genie-textarea/dist/genie-textarea.iife.js"></script>
<script>
    // Global function available
    const instance = genieTextarea('my-textarea', {
        apiKey: 'your-api-key',
        agentCode: 'your-agent-code'
    });
</script>
```

### jQuery Plugin Integration

```javascript
// Requires jQuery to be loaded first
$('#my-textarea').genieTextarea({
    apiKey: 'your-api-key',
    agentCode: 'your-agent-code',
    placeholder: 'Enhanced with AI...'
});
```

### Direct Web Component Usage

```html
<!-- Use directly in HTML -->
<genie-textarea 
    id="my-textarea"
    api-key="your-api-key"
    agent-code="your-agent-code"
    placeholder="Direct web component usage"
    label="Content">
</genie-textarea>
```

### Hybrid HTML + JavaScript Configuration

This approach allows you to declare a web component directly in HTML with basic setup, then enhance it with additional JavaScript configuration. This is perfect for gradual enhancement and framework integration.

```html
<!-- HTML: Basic setup -->
<genie-textarea 
    id="hybrid-example"
    api-key="your-api-key"
    agent-code="your-agent-code"
    placeholder="I was created in HTML and enhanced with JS!"
    label="Hybrid Configuration Example">
</genie-textarea>
```

```javascript
// JavaScript: Enhancement
const instance = genieTextarea('hybrid-example', {
    contentParameterName: 'userMessage',
    value: 'This value was set via JavaScript!',
    handleValueChange: (value) => {
        console.log('Value changed:', value);
    },
    handleBeforeSubmit: async ({ content }) => {
        console.log('About to submit:', content);
        return true; // Proceed with submission
    }
});

// You can also use the instance to control the component
instance.set('placeholder', 'Updated via JavaScript!');
console.log('Current value:', instance.get('value'));
```

**Key benefits of this approach:**
- ✅ **Framework-friendly**: Works seamlessly with React, Vue, Angular, or any framework
- ✅ **Progressive enhancement**: Start with basic HTML, enhance with JavaScript as needed
- ✅ **No DOM replacement**: Existing components are preserved and enhanced in place
- ✅ **DevExpress-like pattern**: Get instances of already-initialized components
- ✅ **Full control**: Access all instance methods and properties for dynamic updates

### Basic Usage Examples

#### Simple Textarea Replacement

```javascript
// Replace any div with an AI-enhanced textarea
genieTextarea('content-area', {
    apiKey: 'your-api-key',
    agentCode: 'writing-assistant'
});
```

#### With Placeholder and Label

```javascript
genieTextarea('article-content', {
    apiKey: 'your-api-key',
    agentCode: 'article-writer',
    label: 'Article Content',
    placeholder: 'Start writing your article...',
    value: 'Initial content here'
});
```

#### Track Value Changes

```javascript
genieTextarea('email-composer', {
    apiKey: 'your-api-key',
    agentCode: 'email-assistant',
    label: 'Email Content',
    placeholder: 'Type your email or describe what you want to write...',
    handleValueChange: (newValue) => {
        console.log('Content updated:', newValue);
        // Save to your application state
    }
});
```

## ⚙️ Configuration Options

### Complete Options Reference

```typescript
interface GenieTextareaOptions {
    // Basic Configuration
    value?: string;                    // Initial content
    label?: string;                    // Label text
    placeholder?: string;              // Placeholder text
    
    // AI Integration (Serenity* Star)
    apiKey?: string;                   // Your Serenity* Star API key
    agentCode?: string;                // Your agent code
    baseURL?: string;                  // Custom API base URL (default: Serenity* Star)
    inputParameters?: Record<string, any>; // Additional parameters for your agent
    contentParameterName?: string;     // Parameter name for content (default: 'content')
    instructionParameterName?: string; // Parameter name for instruction (default: 'instruction')
    
    // UI Customization
    aiButtonProps?: {
        text?: string;                 // Button text
        bgColor?: string;              // Background color
        tintColor?: string;            // Text/icon color
        icon?: {
            type: 'img' | 'svg';
            src?: string;              // For img type
            content?: string;          // For svg type
            alt?: string;              // Alt text for img
            tintColor?: string;        // Icon color override
        };
    };
    
    // Textarea Customization
    textareaProps?: HTMLTextareaAttributes; // Pass any HTML textarea attributes (rows, cols, maxlength, class, style, etc.)
    
    // Label Customization
    labelProps?: HTMLLabelAttributes; // Pass any HTML label attributes (class, style, for, etc.)

    // Behavior
    mode?: 'direct' | 'assisted';     // Processing mode (assisted not yet available)
    quickActions?: QuickAction[];     // Quick actions (assisted mode only)
    
    // Event Handlers
    handleValueChange?: (value: string) => void;
    handleRequestCompletion?: (args: CompletionArgs) => Promise<void>;
    handleBeforeSubmit?: (args: BeforeSubmitArgs) => Promise<boolean>;
    handleAgentResult?: (result: AgentResult) => Promise<void>;
    
    // Localization
    locale?: {
        contentMissingErrorMessage?: string;
        thinkingMessage?: string;
        completionErrorMessage?: string;
    };
}
```

### Required vs Optional Parameters

**Required for Serenity* Star integration:**
- `apiKey` - Your Serenity* Star API key
- `agentCode` - Your agent code

**Required for custom completion:**
- `handleRequestCompletion` - Custom completion handler

**All other parameters are optional** with sensible defaults.

### Default Values

```javascript
const defaults = {
    mode: 'direct',
    baseURL: 'https://api.serenitystar.ai/api/v2',
    contentParameterName: 'content',
    instructionParameterName: 'instruction',
    aiButtonProps: {
        bgColor: '#4862ff'
    },
    locale: {
        contentMissingErrorMessage: 'Content is required.',
        thinkingMessage: 'Thinking...',
        completionErrorMessage: 'An error occurred while processing your request.'
    },
    inputParameters: {}
};
```

## 🎭 Modes

### Direct Mode (Default)

In direct mode, clicking the AI button immediately processes the current content with your AI agent. This is the default and currently available mode.

```javascript
genieTextarea('my-textarea', {
    mode: 'direct', // Default mode
    apiKey: 'your-api-key',
    agentCode: 'your-agent-code'
});
```

**How it works:**
1. User types content in the textarea
2. User clicks the AI button
3. Content is sent to the AI agent immediately
4. AI response streams back and replaces/enhances the content

### Assisted Mode

⚠️ **DISCLAIMER: Assisted mode is not yet available and is coming in a future release.**

Assisted mode will provide a more interactive experience with suggestions, quick actions, and guided AI assistance through a popover interface.

```javascript
// Coming soon!
genieTextarea('my-textarea', {
    mode: 'assisted', // Not yet available
    apiKey: 'your-api-key',
    agentCode: 'your-agent-code',
    quickActions: [
        { label: 'Improve', instruction: 'Make this text better' },
        { label: 'Summarize', instruction: 'Create a brief summary' }
    ]
});
```

## 🎨 Customization

### Textarea Customization

You can pass any standard HTML textarea attributes through the `textareaProps` option to customize the behavior and appearance of the textarea element. This provides full control over the underlying textarea while maintaining the AI functionality.

```javascript
genieTextarea('my-textarea', {
    apiKey: 'your-api-key',
    agentCode: 'your-agent-code',
    textareaProps: {
        // Styling
        class: 'my-custom-textarea-class',
        style: 'border-radius: 12px; font-size: 16px;',
        
        // Behavior
        rows: 5,
        cols: 40,
        maxlength: 1000,
        readonly: false,
        required: true,
        spellcheck: true,
        wrap: 'soft',
        
        // Accessibility
        'aria-label': 'AI-enhanced text input',
        'aria-describedby': 'textarea-help',
        tabindex: 1,
        
        // Form integration
        name: 'content',
        form: 'my-form',
        
        // Events
        onfocus: (e) => console.log('Textarea focused'),
        onblur: (e) => console.log('Textarea blurred'),
        onkeydown: (e) => {
            if (e.key === 'Tab') {
                // Custom tab handling
            }
        }
    }
});
```

**Note:** The `value`, and `placeholder` props are handled separately by the component's dedicated properties and should not be passed through `textareaProps`. Custom classes in `textareaProps.class` will be merged with the component's default styling.

### Label Customization
You can also customize the label element using the `labelProps` option. This allows you to style the label, set its text, and add any HTML attributes you need.

```javascript
genieTextarea('my-textarea', {
    apiKey: 'your-api-key',
    agentCode: 'your-agent-code',
    label: 'Your Content',
    labelProps: {   
        class: 'my-custom-label-class',
        style: 'font-weight: bold; color: #374151;',
        for: 'my-textarea', // Associate label with textarea
        id: 'textarea-label',
        tabindex: 0, // Make label focusable
        'aria-label': 'Content input label'
    }
});
```

**Note** : The `children` prop is not supported in `labelProps` since the label text is set through the `label` option. The component will automatically handle the association between the label and textarea.

### UI Customization

#### Custom AI Button with Text and Colors

```javascript
genieTextarea('my-textarea', {
    apiKey: 'your-api-key',
    agentCode: 'your-agent-code',
    aiButtonProps: {
        text: 'Enhance',
        bgColor: '#10b981', // Green background
        tintColor: '#ffffff' // White text/icon
    }
});
```

#### Custom SVG Icon

```javascript
genieTextarea('my-textarea', {
    apiKey: 'your-api-key',
    agentCode: 'your-agent-code',
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
```

#### Custom Image Icon

```javascript
genieTextarea('my-textarea', {
    apiKey: 'your-api-key',
    agentCode: 'your-agent-code',
    aiButtonProps: {
        bgColor: '#dc2626',
        icon: {
            type: 'img',
            src: '/path/to/your/icon.png',
            alt: 'AI Assistant'
        }
    }
});
```

#### CSS Styling Options

The component includes scoped styles, but you can customize the appearance:

```css
/* Target the root container */
.genie-textarea-root {
    font-family: 'Your Custom Font', sans-serif;
}

/* Style the textarea */
.genie-textarea-root textarea {
    border-radius: 8px;
    border: 2px solid #e5e7eb;
    font-size: 16px;
    line-height: 1.5;
}

/* Style the textarea on focus */
.genie-textarea-root textarea:focus {
    outline: none;
    border-color: #4862ff;
    box-shadow: 0 0 0 3px rgba(72, 98, 255, 0.1);
}

/* Style the label */
.genie-textarea-root label {
    font-weight: 600;
    color: #374151;
    margin-bottom: 8px;
    display: block;
}
```

### Behavior Customization

#### Event Handlers

```javascript
genieTextarea('my-textarea', {
    apiKey: 'your-api-key',
    agentCode: 'your-agent-code',
    
    // Called whenever the content changes
    handleValueChange: (newValue) => {
        console.log('Content changed:', newValue);
        // Save to localStorage, update form state, etc.
        localStorage.setItem('draft', newValue);
    },
    
    // Called before AI processing starts
    handleBeforeSubmit: async ({ content, instruction, setContent, setInstruction }) => {
        console.log('About to process:', { content, instruction });
        
        // You can modify the content or instruction before processing
        if (content.length < 10) {
            alert('Please provide more content for better AI assistance');
            return false; // Cancel the AI processing
        }
        
        // Add context or modify the content
        setContent(`Context: This is a blog post.\n\n${content}`);
        
        return true; // Proceed with AI processing
    },
    
    // Called when AI processing completes
    handleAgentResult: async (result) => {
        console.log('AI processing completed:', result);
        // Log analytics, show success message, etc.
        
        // Show success notification
        showNotification('Content enhanced successfully!');
    }
});
```

#### Custom Completion Logic

```javascript
genieTextarea('my-textarea', {
    handleRequestCompletion: async ({ content, instruction, addChunk, setContent }) => {
        console.log('Starting custom completion...', { content, instruction });
        // Your custom logic goes here...
    }
});
```

#### Localization

```javascript
genieTextarea('my-textarea', {
    apiKey: 'your-api-key',
    agentCode: 'your-agent-code',
    locale: {
        contentMissingErrorMessage: 'Por favor, proporciona contenido para procesar.',
        thinkingMessage: 'Pensando...',
        completionErrorMessage: 'Ocurrió un error al procesar tu solicitud.'
    }
});
```

#### Quick Actions

⚠️ **DISCLAIMER: Quick actions are only available in assisted mode, which is coming in a future release.**

```javascript
// Coming soon with assisted mode!
genieTextarea('my-textarea', {
    mode: 'assisted', // Not yet available
    apiKey: 'your-api-key',
    agentCode: 'writing-assistant',
    quickActions: [
        {
            label: 'Improve Writing',
            instruction: 'Improve the grammar, clarity, and flow of this text'
        },
        {
            label: 'Make Professional',
            instruction: 'Rewrite this text in a professional tone'
        },
        {
            label: 'Summarize',
            instruction: 'Create a concise summary of this content'
        }
    ]
});
```

## Project Structure

```
packages/genie-textarea/
├── src/
│   ├── GenieTextarea.ts       # Main class
│   ├── index.ts               # ES module exports
│   ├── script.ts              # IIFE entry point
│   ├── types.ts               # TypeScript definitions
│   ├── web-component/
│   │   └── GenieTextarea.svelte # Svelte web component
│   └── utils/
│       └── ErrorHelper.ts     # Error handling utilities
├── dist/                      # Built files
├── package.json
├── vite.config.esm.ts         # ES module build config
├── vite.config.iife.ts        # IIFE build config
└── README.md
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
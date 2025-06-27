import type { GenieTextareaOptions, GenieTextareaProps } from "./types";
interface GenieTextareaElement extends HTMLElement {
  value?: GenieTextareaProps["value"];
  label?: GenieTextareaProps["label"];
  mode?: GenieTextareaProps["mode"];
  agentCode?: GenieTextareaProps["agentCode"];
  apiKey?: GenieTextareaProps["apiKey"];
  baseURL?: GenieTextareaProps["baseURL"];
  placeholder?: GenieTextareaProps["placeholder"];
  contentParameterName?: GenieTextareaProps["contentParameterName"];
  instructionParameterName?: GenieTextareaProps["instructionParameterName"];
  quickActions?: GenieTextareaProps["quickActions"];
  handleRequestCompletion?: GenieTextareaProps["handleRequestCompletion"];
  handleValueChange?: GenieTextareaProps["handleValueChange"];
  inputParameters?: GenieTextareaProps["inputParameters"];
  handleBeforeSubmit?: GenieTextareaProps["handleBeforeSubmit"];
  handleAgentResult?: GenieTextareaProps["handleAgentResult"];
  locale?: GenieTextareaProps["locale"];
  aiButtonProps?: GenieTextareaProps["aiButtonProps"];
  textareaProps?: GenieTextareaProps["textareaProps"];
  labelProps?: GenieTextareaProps["labelProps"];
}

// Global registry to track web component instances
interface GenieTextareaRegistry {
  [id: string]: GenieTextarea;
}

declare global {
  interface Window {
    genieTextarea: (
      id: string,
      options?: GenieTextareaOptions
    ) => GenieTextarea;
    __genieTextareaRegistry: GenieTextareaRegistry;
  }
}

// Button interface for the AI button
interface AIButton {
  enable(): void;
  disable(): void;
  execute(): void;
}

export class GenieTextarea {
  private container?: HTMLElement;
  private webComponent: GenieTextareaElement;
  private id: string;
  public readonly aiButton: AIButton;

  constructor(id: string, options: GenieTextareaOptions = {}) {
    this.id = id;
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Element with id "${id}" not found`);
    }

    this.container = element;

    // Create the genie-textarea web component
    this.webComponent = document.createElement(
      "genie-textarea"
    ) as GenieTextareaElement;
    this.webComponent.id = id;

    this.aiButton = {
      enable: () => {
        const button = this.webComponent.querySelector("button");
        if (button) {
          button.disabled = false;
        }
      },
      disable: () => {
        const button = this.webComponent.querySelector("button");
        if (button) {
          button.disabled = true;
        }
      },
      execute: () => {
        // Find the button inside the web component and trigger a click
        const button = this.webComponent.querySelector("button");
        if (button) {
          button.click();
        }
      },
    };

    // Set all the properties/attributes from options
    this.setProperties(options);

    // Replace the container with the web component
    this.container.parentNode?.replaceChild(this.webComponent, this.container);
  }

  /**
   * Updates properties of the genie-textarea component
   */
  public setProperties(options: Partial<GenieTextareaOptions>) {
    if (options.value !== undefined) {
      this.webComponent.setAttribute("value", options.value);
    }

    if (options.label !== undefined) {
      this.webComponent.label = options.label;
    }
    if (options.mode !== undefined) {
      this.webComponent.mode = options.mode;
    }
    if (options.agentCode !== undefined) {
      this.webComponent.agentCode = options.agentCode;
    }
    if (options.apiKey !== undefined) {
      this.webComponent.apiKey = options.apiKey;
    }
    if (options.baseURL !== undefined) {
      this.webComponent.baseURL = options.baseURL;
    }
    if (options.placeholder !== undefined) {
      this.webComponent.placeholder = options.placeholder;
    }
    if (options.contentParameterName !== undefined) {
      this.webComponent.contentParameterName = options.contentParameterName;
    }
    if (options.instructionParameterName !== undefined) {
      this.webComponent.instructionParameterName =
        options.instructionParameterName;
    }
    if (options.quickActions !== undefined) {
      this.webComponent.quickActions = options.quickActions;
    }
    if (options.handleRequestCompletion !== undefined) {
      this.webComponent.handleRequestCompletion =
        options.handleRequestCompletion;
    }
    if (options.handleValueChange !== undefined) {
      this.webComponent.handleValueChange = options.handleValueChange;
    }
    if (options.inputParameters !== undefined) {
      this.webComponent.inputParameters = options.inputParameters;
    }
    if (options.aiButtonProps !== undefined) {
      this.webComponent.aiButtonProps = options.aiButtonProps;
    }
    if (options.handleBeforeSubmit !== undefined) {
      this.webComponent.handleBeforeSubmit = options.handleBeforeSubmit;
    }
    if (options.handleAgentResult !== undefined) {
      this.webComponent.handleAgentResult = options.handleAgentResult;
    }
    if (options.locale !== undefined) {
      this.webComponent.locale = options.locale;
    }
    if (options.textareaProps !== undefined) {
      this.webComponent.textareaProps = options.textareaProps;
    }
    if (options.labelProps !== undefined) {
      this.webComponent.labelProps = options.labelProps;
    }
  }

  /**
   * Gets a property value from the genie-textarea component
   */
  public get<K extends keyof GenieTextareaOptions>(
    key: K
  ): GenieTextareaOptions[K] | undefined {
    switch (key) {
      case "value":
        return this.webComponent.value as GenieTextareaOptions[K];
      case "label":
        return this.webComponent.label as GenieTextareaOptions[K];
      case "mode":
        return this.webComponent.mode as GenieTextareaOptions[K];
      case "agentCode":
        return this.webComponent.agentCode as GenieTextareaOptions[K];
      case "apiKey":
        return this.webComponent.apiKey as GenieTextareaOptions[K];
      case "baseURL":
        return this.webComponent.baseURL as GenieTextareaOptions[K];
      case "placeholder":
        return this.webComponent.placeholder as GenieTextareaOptions[K];
      case "contentParameterName":
        return this.webComponent
          .contentParameterName as GenieTextareaOptions[K];
      case "instructionParameterName":
        return this.webComponent
          .instructionParameterName as GenieTextareaOptions[K];
      case "quickActions":
        return this.webComponent.quickActions as GenieTextareaOptions[K];
      case "handleRequestCompletion":
        return this.webComponent
          .handleRequestCompletion as GenieTextareaOptions[K];
      case "handleValueChange":
        return this.webComponent.handleValueChange as GenieTextareaOptions[K];
      case "inputParameters":
        return this.webComponent.inputParameters as GenieTextareaOptions[K];
      case "aiButtonProps":
        return this.webComponent.aiButtonProps as GenieTextareaOptions[K];
      case "handleBeforeSubmit":
        return this.webComponent.handleBeforeSubmit as GenieTextareaOptions[K];
      case "handleAgentResult":
        return this.webComponent.handleAgentResult as GenieTextareaOptions[K];
      case "locale":
        return this.webComponent.locale as GenieTextareaOptions[K];
      case "textareaProps":
        return this.webComponent.textareaProps as GenieTextareaOptions[K];
      case "labelProps":
        return this.webComponent.labelProps as GenieTextareaOptions[K];
      default:
        return undefined;
    }
  }

  /**
   * Sets a property value on the genie-textarea component
   */
  public set<K extends keyof GenieTextareaOptions>(
    key: K,
    value: GenieTextareaOptions[K]
  ): void {
    // Handle string properties that can be set as attributes
    if (key === "value" && typeof value === "string") {
      this.webComponent.setAttribute("value", value);
      this.webComponent.value = value;
    } else {
      // Set the property directly on the web component
      (this.webComponent as any)[key] = value;
    }
  }

  /**
   * Gets the underlying web component element
   */
  public getElement(): HTMLElement {
    return this.webComponent;
  }

  /**
   * Destroys the component by removing it from the DOM and clearing the registry reference.
   */
  public destroy(): void {
    if (this.webComponent.parentNode) {
      this.webComponent.parentNode.removeChild(this.webComponent);
    }
    
    // Clear from registry if it exists
    if (typeof window !== 'undefined' && window.__genieTextareaRegistry) {
      delete window.__genieTextareaRegistry[this.id];
    }
  }
}

// Factory function following the select2 pattern
export function genieTextarea(
  id: string,
  options?: GenieTextareaOptions
): GenieTextarea {
  // Initialize registry if it doesn't exist
  if (typeof window !== 'undefined' && !window.__genieTextareaRegistry) {
    window.__genieTextareaRegistry = {};
  }

  // Check if an instance already exists for the given id
  if(window.__genieTextareaRegistry[id]) {
    const instance = window.__genieTextareaRegistry[id];
    if (options) {
      // If options are provided, update the existing instance
      instance.setProperties(options);
    }
    return instance;
  }

  const instance = new GenieTextarea(id, options);
  window.__genieTextareaRegistry[id] = instance;
  return instance;
}

// Make the factory function available globally
if (typeof window !== 'undefined') {
  window.genieTextarea = genieTextarea;
}
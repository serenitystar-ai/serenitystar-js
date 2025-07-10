<svelte:options
  customElement={{
    shadow: "none",
    props: {
      agentCode: { reflect: false, type: "String", attribute: "agent-code" },
      apiKey: { reflect: false, type: "String", attribute: "api-key" },
      handleBeforeSubmit: {
        reflect: false,
        type: "Object",
        attribute: "handle-before-submit",
      },
      handleAgentResult: {
        reflect: false,
        type: "Object",
        attribute: "handle-agent-result",
      },
      aiButtonProps: {
        reflect: false,
        type: "Object",
        attribute: "ai-button-props",
      },
      undoButtonProps: {
        reflect: false,
        type: "Object",
        attribute: "undo-button-props",
      },
      id: { reflect: false, type: "String", attribute: "id" },
      handleRequestCompletion: {
        reflect: false,
        type: "Object",
        attribute: "handle-request-completion",
      },
      placeholder: { reflect: false, type: "String", attribute: "placeholder" },
      quickActions: {
        reflect: false,
        type: "Array",
        attribute: "quick-actions",
      },
      value: { reflect: false, type: "String", attribute: "value" },
      handleValueChange: {
        reflect: false,
        type: "Object",
        attribute: "handle-value-change",
      },
      label: { reflect: false, type: "String", attribute: "label" },
      locale: { reflect: false, type: "Object", attribute: "locale" },
      inputParameters: {
        reflect: false,
        type: "Object",
        attribute: "input-parameters",
      },
      mode: { reflect: false, type: "String", attribute: "mode" },
      baseURL: { reflect: false, type: "String", attribute: "base-url" },
      contentParameterName: {
        reflect: false,
        type: "String",
        attribute: "content-parameter-name",
      },
      instructionParameterName: {
        reflect: false,
        type: "String",
        attribute: "instruction-parameter-name",
      },
      textareaProps: {
        reflect: false,
        type: "Object",
        attribute: "textarea-props",
      },
      labelProps: {
        reflect: false,
        type: "Object",
        attribute: "label-props",
      },
      containerProps: {
        reflect: false,
        type: "Object",
        attribute: "container-props",
      },
    },
  }}
/>

<script lang="ts">
  import { Undo } from "@lucide/svelte";
  import type { GenieTextareaProps } from "../types";
  import { SerenityClient } from "@serenity-star/sdk";
  import autosize from "svelte-autosize";
  import { tick } from "svelte";
  import { ErrorHelper } from "../utils/ErrorHelper";
  import Popover from "./Popover.svelte";
  import IconRenderer from "./IconRenderer.svelte";

  // Generate a unique ID for the component
  function generateId(): string {
    return `genie-textarea-${Math.random().toString(36).substr(2, 9)}`;
  }

  let {
    agentCode,
    apiKey,
    handleBeforeSubmit,
    aiButtonProps,
    undoButtonProps = {},
    id,
    handleRequestCompletion,
    placeholder,
    quickActions,
    value = "",
    handleValueChange,
    handleAgentResult,
    label,
    locale = {
      contentMissingErrorMessage: "Content is required.",
      thinkingMessage: "Thinking...",
      completionErrorMessage:
        "An error occurred while processing your request.",
      undoButtonTooltip: "Undo",
      assistedMode: {
        inputPlaceholder: "Enter an instruction...",
        quickActionsTitle: "Quick actions",
      },
    },
    inputParameters = {},
    mode = "direct",
    baseURL = "https://api.serenitystar.ai/api/v2",
    contentParameterName = "content",
    instructionParameterName = "instruction",
    textareaProps = {},
    labelProps = {},
    containerProps = {},
  }: GenieTextareaProps = $props();

  // Generate a unique ID for the textarea (separate from container id)
  // Use textareaProps.id if provided, otherwise generate one
  const textareaId = textareaProps?.id || generateId();

  let {
    errorMessage,
    internalValue,
    loading,
    previousValue,
    canUndo,
    instruction
  }: {
    errorMessage?: string;
    internalValue: string;
    instruction?: string;
    loading?: boolean;
    previousValue?: string;
    canUndo: boolean;
  } = $state({ 
    errorMessage: "", 
    internalValue: value,
    instruction: "", 
    loading: false,
    previousValue: undefined,
    canUndo: false
  });

  let isOpen = $state(false);

  let textarea: HTMLTextAreaElement;
  let customAnchor = $state<HTMLElement>(null!);

  let previousExternalValue = value;

  const buttonIsDisabled = $derived.by(() => {
    if (mode === "direct") {
      return internalValue === "" || loading;
    } else if (mode === "assisted") {
      return internalValue === "";
    }
    return false;
  });

  // Effect that only reacts to external value prop changes
  $effect(() => {
    if (value !== previousExternalValue) {
      internalValue = value;
      previousExternalValue = value;
    }
    handleValueChange?.(internalValue);
    autosize.update(textarea);
  });

  // Register this component instance when it mounts using $effect
  $effect(() => {
    if (typeof window !== 'undefined' && id) {
      // Initialize registry if it doesn't exist
      if (!(window as any).__genieTextareaRegistry) {
        (window as any).__genieTextareaRegistry = {};
      }
      
      // Register this component instance using the current element
      const currentElement = document.getElementById(id);
      if (currentElement && currentElement.tagName.toLowerCase() === 'genie-textarea') {
        (window as any).__genieTextareaRegistry[id] = currentElement;
      }
    }
  });

  async function handleUndo() {
    if (previousValue !== undefined) {
      internalValue = previousValue;
      handleValueChange?.(internalValue);
      canUndo = false;
      previousValue = undefined;
      await tick();
      autosize.update(textarea);
    }
  }

  function executeInstruction(text: string) {
    isOpen = false;
    instruction = text;
    handleExecuteAI();
  }

  async function handleExecuteAI() {
    if (!internalValue) {
      errorMessage =
        locale?.contentMissingErrorMessage || "Content is required.";
      return;
    }

    // Store the current value before processing
    previousValue = internalValue;
    loading = true;

    if (handleBeforeSubmit) {
      const proceed = await handleBeforeSubmit({
        content: internalValue,
        setContent: (newContent: string) => {
          internalValue = newContent;
          handleValueChange?.(internalValue);
          autosize.update(textarea);
        },
      });
      if(!proceed) {
        loading = false;
        return;
      }
    }

    if (handleRequestCompletion) {
      await handleRequestCompletion({
        content: internalValue,
        setContent: (newContent: string) => {
          internalValue = newContent;
          handleValueChange?.(internalValue);
          autosize.update(textarea);
        },
        addChunk: (chunk: string) => {
          internalValue += chunk;
          handleValueChange?.(internalValue);
          autosize.update(textarea);
        },
      });
      loading = false;
      // Enable undo if the content changed
      canUndo = internalValue !== previousValue;
      return;
    }

    if (mode === "assisted") {
      await handleAssistedExecute();
    } else {
      await handleDirectExecute();
    }

    loading = false;
    // Enable undo if the content changed
    canUndo = internalValue !== previousValue;
  }

  async function executeAgent(additionalInputParameters: Record<string, any> = {}) {
    if (agentCode && apiKey) {
      // Save the current value before clearing
      const savedValue = internalValue;

      internalValue = locale?.thinkingMessage || "Thinking...";
      handleValueChange?.(internalValue);
      await tick();
      autosize.update(textarea);

      const client = new SerenityClient({
        apiKey,
      });

      const activity = client.agents.activities.create(agentCode, {
        inputParameters: {
          [contentParameterName]: savedValue,
          ...inputParameters,
          ...additionalInputParameters,
        },
      });

      let firstChunk = true;

      activity
        .on("content", (content) => {
          if (firstChunk) {
            firstChunk = false;
            internalValue = "";
          }
          internalValue += content;
          handleValueChange?.(internalValue);
          autosize.update(textarea);
        })
        .on("stop", (result) => {
          handleAgentResult?.(result);
        })
        .on("error", (error) => {
          errorMessage = error?.message || "An error occurred";
        });

      try {
        await activity.stream();
      } catch (error) {
        const message = await ErrorHelper.extractErrorMessage(error, locale);
        console.error(message);
        errorMessage = locale.completionErrorMessage;
        internalValue = savedValue; // Restore the original value
        handleValueChange?.(internalValue);
        autosize.update(textarea);
        // Don't enable undo if there was an error
        canUndo = false;
        previousValue = undefined;
      }
    }
  }

  async function handleAssistedExecute() {
    await executeAgent({
      [instructionParameterName]: instruction,
    });
  }

  async function handleDirectExecute() {
    await executeAgent();
  }
</script>

{#snippet buttonRenderer(
  aiButtonConfig: GenieTextareaProps["aiButtonProps"] | undefined
)}
  <IconRenderer 
    icon={aiButtonConfig?.icon}
    fallbackTintColor={aiButtonConfig?.tintColor || 'white'}
  />

  {#if aiButtonConfig?.text}
    <span class="text-sm font-medium">{aiButtonConfig.text}</span>
  {/if}
{/snippet}

<div class="genie-textarea-root flex flex-col" {id}>
  {#if label}
    <label
      for={textareaId}
      {...labelProps}
      class="text-sm text-black/80 {labelProps?.class || ''}">{label}</label
    >
  {/if}

  <div 
    {...containerProps}
    class="border border-gray-300 rounded flex gap-2 p-2 {containerProps?.class || ''}"
  >
    <textarea
      bind:this={textarea}
      use:autosize
      bind:value={internalValue}
      {placeholder}
      id={textareaId}
      rows="1"
      {...textareaProps}
      class="border-none flex-1 px-0 py-0 outline-none resize-none {textareaProps?.class ||
        ''}"
    ></textarea>

    <div class="buttons-container flex flex-col items-end gap-1">
      {#if mode == "direct"}
        <button
          disabled={buttonIsDisabled}
          onclick={handleExecuteAI}
          class="rounded text-white shadow inline-flex select-none items-center justify-center whitespace-nowrap p-3 text-md font-medium transition-all gap-2 {buttonIsDisabled
            ? 'cursor-not-allowed opacity-50'
            : 'hover:opacity-90 cursor-pointer'}"
          style="background-color: {aiButtonProps?.bgColor || '#4862ff'}"
        >
          {@render buttonRenderer(aiButtonProps)}
        </button>
      {:else if mode === "assisted"}
        <Popover
          bind:isOpen
          {buttonIsDisabled}
          {aiButtonProps}
          {customAnchor}
          {buttonRenderer}
          {quickActions}
          {locale}
          {executeInstruction}
        />
      {/if}

      {#if canUndo}
        <button
          data-undo
          disabled={!canUndo}
          onclick={handleUndo}
          title={locale?.undoButtonTooltip || "Undo"}
          class="rounded text-white shadow inline-flex p-3 select-none items-center justify-center whitespace-nowrap text-sm font-medium transition-all {!canUndo
            ? 'cursor-not-allowed opacity-50'
            : 'hover:opacity-90 cursor-pointer'}"
          style="background-color: {undoButtonProps?.bgColor || '#6b7280'}"
        >
          <Undo 
            size={14} 
            color={undoButtonProps?.tintColor || 'white'} 
          />
        </button>
      {/if}
    </div>
  </div>

  {#if errorMessage}
    <div class="text-red-500">
      <p>{errorMessage}</p>
    </div>
  {/if}
</div>

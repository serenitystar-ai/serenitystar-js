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
      aiButton: { reflect: false, type: "Object", attribute: "ai-button" },
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
    },
  }}
/>

<script lang="ts">
  import { Popover } from "bits-ui";
  import type { GenieTextareaProps } from "../types";
  import { SerenityClient } from "@serenity-star/sdk";
  import autosize from "svelte-autosize";
  import { tick } from "svelte";
  import { ErrorHelper } from "../utils/ErrorHelper";

  let {
    agentCode,
    apiKey,
    handleBeforeSubmit,
    aiButton,
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
    },
    inputParameters = {},
    mode = "direct",
    baseURL = "https://api.serenitystar.ai/api/v2",
    contentParameterName = "content",
    instructionParameterName = "instruction",
  }: GenieTextareaProps = $props();

  let {
    errorMessage,
    internalValue,
    loading,
  }: {
    errorMessage?: string;
    internalValue: string;
    loading?: boolean;
  } = $state({ errorMessage: "", internalValue: value, loading: false });

  let isOpen = $state(false);

  let textarea: HTMLTextAreaElement;

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
  });

  async function handleBtnClicked() {
    if (mode === "assisted") {
      // TODO: Implement assisted mode
      return;
    }

    if (!internalValue) {
      errorMessage =
        locale?.contentMissingErrorMessage || "Content is required.";
      return;
    }

    loading = true;

    if (handleBeforeSubmit) {
      await handleBeforeSubmit({
        content: internalValue,
        setContent: (newContent: string) => {
          internalValue = newContent;
          handleValueChange?.(internalValue);
          autosize.update(textarea);
        },
      });
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
      return;
    }

    await handleDirectExecute();

    loading = false;
  }

  async function handleAssistedExecute() {
    // TODO: Implement assisted mode handling
  }

  async function handleDirectExecute() {
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
      }
    }
  }
</script>

{#snippet buttonRenderer(
  aiButtonConfig: GenieTextareaProps["aiButton"] | undefined
)}
  {#if aiButtonConfig?.icon?.type === "img"}
    <img
      src={aiButtonConfig.icon.src}
      alt={aiButtonConfig.icon.alt || ""}
      class="w-4 h-4"
    />
  {:else if aiButtonConfig?.icon?.type === "svg"}
    <div
      class="w-4 h-4"
      style="color: {aiButtonConfig.icon.tintColor ||
        aiButtonConfig.tintColor ||
        'white'}"
    >
      {@html aiButtonConfig.icon.content}
    </div>
  {:else}
    <!-- Default Serena SVG - inline for color customization -->
    <svg
      width="17"
      height="16"
      viewBox="0 0 17 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      class="w-4 h-4"
      style="color: {aiButtonConfig?.tintColor || 'white'}"
    >
      <path
        d="M7.16959 0.0649538C7.12983 0.0947676 7.09008 0.313401 7.07021 0.561849C6.98077 2.2016 5.91741 4.22893 4.59567 5.28235C3.46275 6.17675 1.85281 6.82272 0.729833 6.82272H0.203125V7.95564V9.07862L0.878901 9.13825C4.02921 9.40657 6.77207 12.1395 7.03045 15.2799L7.09008 15.9656H8.20312H9.31617L9.3758 15.2898C9.61431 12.1296 12.3075 9.40657 15.5373 9.05874L16.2031 8.98918V7.96558V6.94197L15.6367 6.87241C12.2975 6.47489 9.83294 4.13949 9.33605 0.889799L9.21679 0.074892L8.223 0.0450783C7.68636 0.0252028 7.20934 0.03514 7.16959 0.0649538ZM8.69008 5.00408C8.93853 5.38172 9.34598 5.90843 9.61431 6.19663C10.0317 6.64384 11.1845 7.578 11.6814 7.87613C11.8404 7.96558 11.8106 8.01526 11.3733 8.27365C10.2901 8.94943 8.93853 10.3308 8.3025 11.4438C8.21306 11.5929 8.15344 11.5432 7.83542 11.0364C7.31865 10.1917 6.41431 9.24756 5.48014 8.56185C5.04288 8.24384 4.67518 7.9457 4.67518 7.91589C4.67518 7.88607 4.93356 7.70719 5.24163 7.51837C5.98698 7.06123 7.33853 5.69974 7.80561 4.94446C8.00437 4.60657 8.18325 4.33825 8.20312 4.33825C8.223 4.33825 8.44164 4.63638 8.69008 5.00408Z"
      />
    </svg>
  {/if}

  {#if aiButtonConfig?.text}
    <span class="text-sm font-medium">{aiButtonConfig.text}</span>
  {/if}
{/snippet}

<div class="genie-textarea-root flex flex-col" {id}>
  <label for="genie-textarea">{label}</label>

  <div class="flex gap-2">
    <textarea
      bind:this={textarea}
      use:autosize
      bind:value={internalValue}
      {placeholder}
      class="border flex-1 border-gray-300 px-2 py-1 rounded"
    ></textarea>

    {#if mode == "direct"}
      <button
        disabled={buttonIsDisabled}
        onclick={handleBtnClicked}
        class="rounded text-white shadow inline-flex h-10 select-none items-center justify-center whitespace-nowrap px-4 text-md font-medium transition-all active:scale-[0.98] gap-2 {buttonIsDisabled
          ? 'cursor-not-allowed opacity-50'
          : 'hover:opacity-90 cursor-pointer'}"
        style="background-color: {aiButton?.bgColor || '#4862ff'}"
      >
        {@render buttonRenderer(aiButton)}
      </button>
    {:else if mode === "assisted"}
      <Popover.Root bind:open={isOpen}>
        <Popover.Trigger
          disabled={buttonIsDisabled}
          onclick={handleBtnClicked}
          class="rounded text-white shadow inline-flex h-10 select-none items-center justify-center whitespace-nowrap px-4 text-md font-medium transition-all active:scale-[0.98] gap-2 {buttonIsDisabled
            ? 'cursor-not-allowed opacity-50'
            : 'hover:opacity-90 cursor-pointer'}"
          style="background-color: {aiButton?.bgColor || '#4862ff'}"
        >
          {@render buttonRenderer(aiButton)}
        </Popover.Trigger>
        <Popover.Content>
          <p>Content for assisted mode goes here</p>
          <Popover.Close />
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Root>
    {/if}
  </div>

  {#if errorMessage}
    <div class="text-red-500">
      <p>{errorMessage}</p>
    </div>
  {/if}
</div>

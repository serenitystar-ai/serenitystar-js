<script lang="ts">
  import { Popover } from "bits-ui";
  import type { GenieTextareaProps } from "../types";
  import IconRenderer from "./IconRenderer.svelte";

  interface PopoverProps {
    isOpen: boolean;
    loading: boolean;
    aiButtonProps?: GenieTextareaProps["aiButtonProps"];
    buttonRenderer: any;
    customAnchor?: HTMLElement;
    quickActions?: GenieTextareaProps["quickActions"];
    locale?: GenieTextareaProps["locale"];
    tooltip?: string;
    executeInstruction: (instruction: string) => void;
  }

  let {
    isOpen = $bindable(),
    loading,
    aiButtonProps,
    buttonRenderer,
    quickActions = [],
    locale,
    tooltip,
    customAnchor = $bindable<HTMLElement>(null!),
    executeInstruction,
  }: PopoverProps = $props();

  let customInstruction = $state("");

  function handleCustomInstructionSubmit() {
    if (customInstruction.trim()) {
      executeInstruction(customInstruction.trim());
      // Clear the input after submission
      customInstruction = "";
    }
  }
</script>

<div class="flex flex-col items-end relative">
  <Popover.Root bind:open={isOpen}>
    <Popover.Trigger
      disabled={loading}
      title={tooltip}
      class="rounded text-white shadow inline-flex select-none items-center justify-center whitespace-nowrap p-3 text-md font-medium transition-all active:scale-[0.98] gap-2 {loading
        ? 'cursor-not-allowed opacity-50'
        : 'hover:opacity-90 cursor-pointer'}"
      style="background-color: {aiButtonProps?.bgColor || '#4862ff'}"
    >
      {@render buttonRenderer(aiButtonProps)}
    </Popover.Trigger>
    <Popover.Content
      {customAnchor}
      class="mt-2 p-4 bg-white border border-gray-300 rounded shadow-lg max-w-[400px]"
    >
      <!-- Custom instruction input -->
      <div>
        <input
          type="text"
          bind:value={customInstruction}
          placeholder={locale?.assistedMode?.inputPlaceholder ||
            "Enter an instruction..."}
          class="border flex-1 border-gray-300 px-4 py-2 rounded w-full"
          onkeydown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              handleCustomInstructionSubmit();
            }
          }}
        />
      </div>

      <!-- Quick actions section -->
      {#if quickActions && quickActions.length > 0}
        <div class="mt-4">
          <h3 class="text-sm font-semibold text-gray-900 mb-2">
            {locale?.assistedMode?.quickActionsTitle || "Quick actions"}
          </h3>
          <div class="flex flex-col gap-1">
            {#each quickActions as action}
              <button
                onclick={() => executeInstruction(action.instruction)}
                class="flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors cursor-pointer"
              >
                {#if action.icon}
                  <div class="flex-shrink-0">
                    <IconRenderer
                      icon={action.icon}
                      fallbackTintColor="currentColor"
                      showDefaultIcon={false}
                    />
                  </div>
                {/if}
                <span class="flex-1">{action.label}</span>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </Popover.Content>
  </Popover.Root>
  <div bind:this={customAnchor}></div>
</div>

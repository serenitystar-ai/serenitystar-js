<script lang="ts">
  import { clsx } from "clsx";
  import type { HTMLAttributes } from "svelte/elements";

  interface Props {
    divProps?: HTMLAttributes<HTMLDivElement>;
    children?: import("svelte").Snippet;
  }

  let { divProps, children }: Props = $props();
</script>

<div
  {...divProps}
  class={clsx("mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", divProps?.class)}
>
  {#if children}
    {@render children()}
  {/if}
</div>

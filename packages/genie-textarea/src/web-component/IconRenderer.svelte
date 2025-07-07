<script lang="ts">
  // Import IconOptions type by extracting it from the QuickAction type
  type IconOptions = NonNullable<NonNullable<import("../types").GenieTextareaProps["quickActions"]>[0]["icon"]>;

  interface IconRendererProps {
    icon?: IconOptions;
    fallbackTintColor?: string;
    class?: string;
    showDefaultIcon?: boolean;
  }

  let {
    icon,
    fallbackTintColor = "white",
    class: className = "w-4 h-4",
    showDefaultIcon = true,
  }: IconRendererProps = $props();
</script>

{#if icon?.type === "img"}
  <img
    src={icon.src}
    alt={icon.alt || ""}
    class={className}
  />
{:else if icon?.type === "svg"}
  <div
    class={className}
    style="color: {icon.tintColor || fallbackTintColor}"
  >
    {@html icon.content}
  </div>
{:else if showDefaultIcon}
  <!-- Default Serena SVG - inline for color customization -->
  <svg
    width="17"
    height="16"
    viewBox="0 0 17 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    class={className}
    style="color: {fallbackTintColor}"
  >
    <path
      d="M7.16959 0.0649538C7.12983 0.0947676 7.09008 0.313401 7.07021 0.561849C6.98077 2.2016 5.91741 4.22893 4.59567 5.28235C3.46275 6.17675 1.85281 6.82272 0.729833 6.82272H0.203125V7.95564V9.07862L0.878901 9.13825C4.02921 9.40657 6.77207 12.1395 7.03045 15.2799L7.09008 15.9656H8.20312H9.31617L9.3758 15.2898C9.61431 12.1296 12.3075 9.40657 15.5373 9.05874L16.2031 8.98918V7.96558V6.94197L15.6367 6.87241C12.2975 6.47489 9.83294 4.13949 9.33605 0.889799L9.21679 0.074892L8.223 0.0450783C7.68636 0.0252028 7.20934 0.03514 7.16959 0.0649538ZM8.69008 5.00408C8.93853 5.38172 9.34598 5.90843 9.61431 6.19663C10.0317 6.64384 11.1845 7.578 11.6814 7.87613C11.8404 7.96558 11.8106 8.01526 11.3733 8.27365C10.2901 8.94943 8.93853 10.3308 8.3025 11.4438C8.21306 11.5929 8.15344 11.5432 7.83542 11.0364C7.31865 10.1917 6.41431 9.24756 5.48014 8.56185C5.04288 8.24384 4.67518 7.9457 4.67518 7.91589C4.67518 7.88607 4.93356 7.70719 5.24163 7.51837C5.98698 7.06123 7.33853 5.69974 7.80561 4.94446C8.00437 4.60657 8.18325 4.33825 8.20312 4.33825C8.223 4.33825 8.44164 4.63638 8.69008 5.00408Z"
    />
  </svg>
{/if}

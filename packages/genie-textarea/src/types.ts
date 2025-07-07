import type { AgentResult } from "@serenity-star/sdk";
import type { HTMLLabelAttributes, HTMLTextareaAttributes } from "svelte/elements";

export type GenieTextareaProps = {
  // These are the only properties that are passed to the textarea element outside of textareaProps
  value?: string;
  placeholder?: string;

  labelProps?: Omit<HTMLLabelAttributes, "children">
  aiButtonProps?: AiButtonOptions;
  undoButtonProps?: UndoButtonOptions;
  textareaProps?: Omit<HTMLTextareaAttributes, "value" | "placeholder">;
  
  id?: string;
  label?: string;
  mode?: "direct" | "assisted";
  agentCode?: string;
  apiKey?: string;
  baseURL?: string;
  quickActions?: QuickAction[];
  inputParameters?: Record<string, any>;
  contentParameterName?: string;
  instructionParameterName?: string;
  handleRequestCompletion?: RequestCompletionProps;
  handleAgentResult?: (result: AgentResult) => Promise<void>;
  handleValueChange?: (value: string) => void;
  handleBeforeSubmit?: BeforeSumitProps;
  locale?: {
    contentMissingErrorMessage?: string;
    thinkingMessage?: string;
    completionErrorMessage?: string;
    undoButtonTooltip?: string;
    assistedMode?: {
      inputPlaceholder?: string;
      quickActionsTitle?: string;
    };
  };
};

export type GenieTextareaOptions = Omit<GenieTextareaProps, "id">;

type QuickAction = {
  label: string;
  instruction: string;
  icon?: IconOptions;
};

type AiButtonOptions = {
  icon?: IconOptions;
  bgColor?: string;
  text?: string;
  tintColor?: string;
};

type UndoButtonOptions = {
  bgColor?: string;
  tintColor?: string;
};

type IconOptions =
  | {
      type: "img";
      src: string;
      alt?: string;
      tintColor?: string;
    }
  | {
      type: "svg";
      content: string;
      tintColor?: string;
    };

type BeforeSumitProps = (args: {
  content: string;
  instruction?: string;
  setContent: (content: string) => void;
  setInstruction?: (instruction: string) => void;
}) => Promise<boolean>;

type RequestCompletionProps = (args: {
  content: string;
  instruction?: string;
  addChunk?: (chunk: string) => void;
  setContent: (content: string) => void;
}) => Promise<void>;

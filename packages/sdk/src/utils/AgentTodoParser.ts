import { AgentTodoEvent, AgentTodoItem, AgentTodoStatus, TaskStopEvent } from "../types";

/**
 * Reads the TODO list an agent plans for itself out of the `task_stop` frames that carry it.
 */
export class AgentTodoParser {
  /** The skill type every AgentTodo tool reports in its `task_stop` output. */
  static readonly SKILL_TYPE = "AgentTodo";

  /** Task key of the self-iteration loop, whose `task_stop` carries the list as a bare array. */
  static readonly ITERATE_TASK_KEY = "agent_todo_iterate";

  static readonly #STATUSES: AgentTodoStatus[] = ["pending", "completed", "canceled"];

  /**
   * The TODO snapshot a `task_stop` carries, or `null` when it carries none (another task
   * type, or an empty or malformed list).
   */
  static fromTaskStop(task: TaskStopEvent): AgentTodoEvent | null {
    const isIteration = task?.task_key === AgentTodoParser.ITERATE_TASK_KEY;

    const rawItems = isIteration
      ? task.output
      : task?.output?.type === AgentTodoParser.SKILL_TYPE
        ? task.output.content
        : null;

    if (!Array.isArray(rawItems) || rawItems.length === 0) return null;

    const items = rawItems
      .filter((item) => item && typeof item === "object")
      .map(AgentTodoParser.#toItem);

    if (items.length === 0) return null;

    return { items, isIteration, task };
  }

  static #toItem(item: any): AgentTodoItem {
    return {
      description: typeof item.description === "string" ? item.description : "",
      status: AgentTodoParser.#toStatus(item.status),
    };
  }

  /** Lower-cased so a change of the server enum's JSON naming policy doesn't break the match. */
  static #toStatus(status: unknown): AgentTodoStatus {
    const normalized = String(status ?? "").toLowerCase() as AgentTodoStatus;
    return AgentTodoParser.#STATUSES.includes(normalized) ? normalized : "pending";
  }
}

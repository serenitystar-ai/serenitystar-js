import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentTodoParser } from "../src/utils/AgentTodoParser";
import { Conversation } from "../src/scopes/conversational/Conversation";
import type { AuthProvider } from "../src/auth/AuthProvider";
import type { AgentTodoEvent, TaskStopEvent } from "../src/types";

/** A `task_stop` frame as the AgentTodo tools report it. */
const skillTaskStop = (content: unknown): TaskStopEvent => ({
  type: "task_stop",
  task: "Executing Skill: AgentTodo",
  task_key: "skills_AgentTodo_execute",
  output: { type: "AgentTodo", content },
});

/** A `task_stop` frame of the self-iteration loop, which carries the list as a bare array. */
const iterateTaskStop = (output: unknown): TaskStopEvent => ({
  type: "task_stop",
  task: "Iterating on the plan",
  task_key: "agent_todo_iterate",
  output,
});

describe("AgentTodoParser.fromTaskStop", () => {
  it("reads the list an AgentTodo skill reports", () => {
    const task = skillTaskStop([
      { description: "Look up the order", status: "Completed" },
      { description: "Refund it", status: "Pending" },
    ]);

    expect(AgentTodoParser.fromTaskStop(task)).toEqual({
      items: [
        { description: "Look up the order", status: "completed" },
        { description: "Refund it", status: "pending" },
      ],
      isIteration: false,
      task,
    });
  });

  it("reads the bare array of the self-iteration loop and flags it", () => {
    const todo = AgentTodoParser.fromTaskStop(
      iterateTaskStop([{ description: "Retry the search", status: "canceled" }])
    );

    expect(todo?.isIteration).toBe(true);
    expect(todo?.items).toEqual([{ description: "Retry the search", status: "canceled" }]);
  });

  it("normalizes status casing and reports unknown ones as pending", () => {
    const todo = AgentTodoParser.fromTaskStop(
      skillTaskStop([
        { description: "a", status: "CANCELED" },
        { description: "b", status: "in_progress" },
        { description: "c" },
      ])
    );

    expect(todo?.items.map((item) => item.status)).toEqual(["canceled", "pending", "pending"]);
  });

  it("defaults a missing description to an empty string", () => {
    const todo = AgentTodoParser.fromTaskStop(skillTaskStop([{ status: "pending" }]));

    expect(todo?.items).toEqual([{ description: "", status: "pending" }]);
  });

  it.each([
    ["an empty list", skillTaskStop([])],
    ["a non-array content", skillTaskStop({ description: "x" })],
    ["a list without objects", skillTaskStop(["x", null])],
    ["an iteration without an array", iterateTaskStop({ items: [] })],
    ["another skill's output", { ...skillTaskStop([{ description: "x" }]), output: { type: "Prompt", content: [{ description: "x" }] } }],
    ["a task without output", { type: "task_stop", task: "x", task_key: "skills_Other_execute" }],
  ])("returns null for %s", (_, task) => {
    expect(AgentTodoParser.fromTaskStop(task as TaskStopEvent)).toBeNull();
  });
});

describe("Conversation agent_todo event", () => {
  const authProvider: AuthProvider = {
    getHeaders: async () => ({}),
    getWebSocketProtocols: async () => [],
    handleUnauthorized: async () => false,
  };

  const sseResponse = (frames: Array<{ event: string; data: string }>): Response => {
    const body = frames.map(({ event, data }) => `event: ${event}\ndata: ${data}\n\n`).join("");
    return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
  };

  const stopFrame = { event: "stop", data: JSON.stringify({ result: { instance_id: "conv-1" } }) };

  const createConversation = (): Conversation =>
    (Conversation as any).createWithoutInfo("support-agent", authProvider, "https://api.example.com");

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("follows the task_stop that carries the list", async () => {
    const task = skillTaskStop([{ description: "Look up the order", status: "pending" }]);
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse([{ event: "task_stop", data: JSON.stringify(task) }, stopFrame])));

    const conversation = createConversation();
    const received: string[] = [];
    let todo: AgentTodoEvent | undefined;
    conversation.on("task_stop", () => received.push("task_stop"));
    conversation.on("agent_todo", (data) => {
      received.push("agent_todo");
      todo = data;
    });

    await conversation.streamMessage("Refund my order");

    expect(received).toEqual(["task_stop", "agent_todo"]);
    expect(todo?.items).toEqual([{ description: "Look up the order", status: "pending" }]);
  });

  it("stays quiet for task frames that carry no list", async () => {
    const task: TaskStopEvent = { type: "task_stop", task: "Executing Skill: X", task_key: "skills_X_execute", output: "done" };
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse([{ event: "task_stop", data: JSON.stringify(task) }, stopFrame])));

    const conversation = createConversation();
    const onTodo = vi.fn();
    conversation.on("agent_todo", onTodo);

    await conversation.streamMessage("Hi");

    expect(onTodo).not.toHaveBeenCalled();
  });

  it("still emits the list when a task_stop handler throws", async () => {
    const task = skillTaskStop([{ description: "a", status: "pending" }]);
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse([{ event: "task_stop", data: JSON.stringify(task) }, stopFrame])));

    const conversation = createConversation();
    const onTodo = vi.fn();
    conversation.on("task_stop", () => {
      throw new Error("handler bug");
    });
    conversation.on("agent_todo", onTodo);

    await expect(conversation.streamMessage("Hi")).resolves.toEqual({ instance_id: "conv-1" });
    expect(onTodo).toHaveBeenCalledOnce();
  });

  it("ignores a malformed task frame without failing the stream", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse([{ event: "task_stop", data: "{not json" }, stopFrame])));

    const conversation = createConversation();
    const onTodo = vi.fn();
    conversation.on("agent_todo", onTodo);

    await expect(conversation.streamMessage("Hi")).resolves.toEqual({ instance_id: "conv-1" });
    expect(onTodo).not.toHaveBeenCalled();
  });
});

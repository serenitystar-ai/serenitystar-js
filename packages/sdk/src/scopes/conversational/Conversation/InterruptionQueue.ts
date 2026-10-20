import { InterruptionEvent, SerenityErrorBody, TaskStartEvent, TaskStopEvent } from "../../../types";
import { InterruptOptions, InterruptResult } from "./types";

/** Task that wraps the model call: interruptions are accepted while it runs. */
const LLM_RESPONSE_TASK_KEY = "llm_response";

/** Task whose `task_stop` announces that the turn took an interruption in. */
const MERGED_TASK_KEY = "interruption_merged";

/** The server's default `MaxQueuedInterruptions`, for servers that don't report it. */
export const DEFAULT_MAX_QUEUED_INTERRUPTIONS = 5;

/** Refusals meaning "this turn won't take interruptions": send the message as its own turn. */
const NOT_ACCEPTED_KEYS = ["interruption_not_accepted", "user_interruptions_disabled"];
const QUEUE_FULL_KEY = "interruption_queue_full";

type Run = {
  windowOpen: boolean;
  /** The server refused an interruption for this run, so it won't take any more. */
  closed: boolean;
  /** The server's queue is full: wait for a merge before sending more. */
  paused: boolean;
};

type Entry = {
  id: string;
  message: string;
  options?: InterruptOptions;
  run: Run;
  state: "held" | "sending" | "queued";
  userMessageId?: string;
  /** The merge was announced while the request was still on its way. */
  merged?: boolean;
};

type InterruptionQueueDeps = {
  send: (message: string, options?: InterruptOptions) => Promise<InterruptResult>;
  emit: (event: InterruptionEvent) => void;
  maxQueued: () => number;
};

/**
 * Delivers the messages a user writes while a turn is streaming to that turn, in order.
 *
 * Messages are held until the turn's `llm_response` window opens, then sent one at a time,
 * so the server receives them in the order they were written. Sending pauses while the
 * server holds `maxQueued` of them, and resumes on each merge. Whatever the turn didn't take
 * is reported when it ends: `deferred` if it never reached the server, `dropped` if the
 * server accepted but discarded it.
 */
export class InterruptionQueue {
  readonly #deps: InterruptionQueueDeps;
  #entries: Entry[] = [];
  #run: Run | null = null;
  #flushing = false;
  #sequence = 0;

  constructor(deps: InterruptionQueueDeps) {
    this.#deps = deps;
  }

  /** Whether a turn is streaming, i.e. `enqueue` delivers to it rather than deferring. */
  get isRunning(): boolean {
    return this.#run !== null && !this.#run.closed;
  }

  /** Messages the current turn hasn't settled yet (held, being sent, or queued server-side). */
  get pendingCount(): number {
    return this.#entries.filter((entry) => entry.run === this.#run).length;
  }

  /** Queues a message for the running turn. With `deliver` false it is deferred right away. */
  enqueue(message: string, options?: InterruptOptions, deliver = true): string {
    const id = this.#nextId();
    const run = this.#run;

    if (!deliver || !run || run.closed) {
      // Report it asynchronously, so the caller holds the id before the event arrives.
      queueMicrotask(() => this.#emit({ id, message, status: "deferred" }));
      return id;
    }

    this.#entries.push({ id, message, options, run, state: "held" });
    void this.#flush();
    return id;
  }

  /** Starts tracking a streamed turn. Returns the handle `endRun` takes. */
  beginRun(): object {
    if (this.#run) this.endRun(this.#run);
    this.#run = { windowOpen: false, closed: false, paused: false };
    return this.#run;
  }

  /**
   * Settles what the turn didn't take. Requests still in flight settle when they answer.
   * Does nothing when `handle` isn't the current turn (a newer one already started).
   */
  endRun(handle: object): void {
    const run = this.#run;
    if (!run || run !== handle) return;
    this.#run = null;

    for (const entry of [...this.#entries]) {
      if (entry.run !== run || entry.state === "sending") continue;
      this.#remove(entry);
      this.#emit({
        id: entry.id,
        message: entry.message,
        status: entry.state === "held" ? "deferred" : "dropped",
      });
    }
  }

  handleTaskStart(task: TaskStartEvent): void {
    if (task?.task_key === LLM_RESPONSE_TASK_KEY) this.#setWindowOpen(true);
  }

  handleTaskStop(task: TaskStopEvent): void {
    if (task?.task_key === LLM_RESPONSE_TASK_KEY) {
      this.#setWindowOpen(false);
      return;
    }
    if (task?.task_key === MERGED_TASK_KEY) {
      this.#handleMerged(task.output?.user_message_id);
    }
  }

  #setWindowOpen(open: boolean): void {
    if (!this.#run) return;
    this.#run.windowOpen = open;
    if (open) void this.#flush();
  }

  #handleMerged(userMessageId: unknown): void {
    const run = this.#run;
    if (!run || typeof userMessageId !== "string") return;
    const id = userMessageId.toLowerCase();

    // Only one request is in flight at a time, so a merge for an id not acknowledged yet
    // belongs to it.
    const entry =
      this.#entries.find((e) => e.run === run && e.state === "queued" && e.userMessageId === id) ??
      this.#entries.find((e) => e.run === run && e.state === "sending");
    if (!entry) return;

    if (entry.state === "sending") entry.merged = true;
    else this.#remove(entry);

    run.paused = false;
    this.#emit({ id: entry.id, message: entry.message, status: "merged", userMessageId });
    void this.#flush();
  }

  async #flush(): Promise<void> {
    if (this.#flushing) return;
    this.#flushing = true;

    try {
      while (true) {
        const run = this.#run;
        if (!run || !run.windowOpen || run.closed || run.paused) return;

        const queued = this.#entries.filter((e) => e.run === run && e.state === "queued").length;
        if (queued >= this.#deps.maxQueued()) return;

        const next = this.#entries.find((e) => e.run === run && e.state === "held");
        if (!next) return;

        next.state = "sending";
        await this.#send(next);
      }
    } finally {
      this.#flushing = false;
    }
  }

  async #send(entry: Entry): Promise<void> {
    let result: InterruptResult;
    try {
      result = await this.#deps.send(entry.message, entry.options);
    } catch (error) {
      this.#handleRefusal(entry, error as SerenityErrorBody);
      return;
    }

    const isCurrent = this.#run === entry.run;

    if (result.status === "blocked") {
      this.#remove(entry);
      this.#emit({
        id: entry.id,
        message: entry.message,
        status: "blocked",
        userMessageId: result.userMessageId,
        content: result.content,
        violations: result.violations,
      });
      return;
    }

    if (entry.merged) {
      this.#remove(entry);
      return;
    }

    if (!isCurrent) {
      // The turn ended while the message was on its way: the server discarded it.
      this.#remove(entry);
      this.#emit({ id: entry.id, message: entry.message, status: "dropped" });
      return;
    }

    entry.state = "queued";
    entry.userMessageId = result.userMessageId?.toLowerCase();
    this.#emit({ id: entry.id, message: entry.message, status: "queued", userMessageId: result.userMessageId });
  }

  #handleRefusal(entry: Entry, error: SerenityErrorBody): void {
    if (entry.merged) {
      this.#remove(entry);
      return;
    }

    const isCurrent = this.#run === entry.run;
    const keys = Object.keys(error?.errors ?? {});

    if (keys.includes(QUEUE_FULL_KEY) && isCurrent) {
      // Back in line, ahead of the messages written after it.
      entry.state = "held";
      entry.run.paused = true;
      return;
    }

    if (keys.includes(QUEUE_FULL_KEY) || keys.some((key) => NOT_ACCEPTED_KEYS.includes(key))) {
      this.#remove(entry);
      this.#emit({ id: entry.id, message: entry.message, status: "deferred" });
      if (isCurrent) this.#closeRun(entry.run);
      return;
    }

    this.#remove(entry);
    this.#emit({ id: entry.id, message: entry.message, status: "failed", error });
  }

  /** Defers everything still held, so later messages can't overtake the refused one. */
  #closeRun(run: Run): void {
    run.closed = true;
    for (const entry of [...this.#entries]) {
      if (entry.run !== run || entry.state !== "held") continue;
      this.#remove(entry);
      this.#emit({ id: entry.id, message: entry.message, status: "deferred" });
    }
  }

  #remove(entry: Entry): void {
    this.#entries = this.#entries.filter((e) => e !== entry);
  }

  #emit(event: InterruptionEvent): void {
    try {
      this.#deps.emit(event);
    } catch {
      // A failing listener must not stall the queue.
    }
  }

  #nextId(): string {
    const random = globalThis.crypto?.randomUUID?.();
    return random ?? `interruption-${Date.now()}-${++this.#sequence}`;
  }
}

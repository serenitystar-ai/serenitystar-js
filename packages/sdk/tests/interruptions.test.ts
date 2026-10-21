import { afterEach, describe, expect, it, vi } from "vitest";
import SerenityClient from "../src/SerenityClient";
import { InterruptionEvent } from "../src/types";
import { jsonResponse } from "./helpers";
import { controllableStream, flush, frame, stopFrame } from "./sseHelpers";

afterEach(() => {
  vi.unstubAllGlobals();
});

const LLM_START = frame("task_start", { task_key: "llm_response" });
const LLM_STOP = frame("task_stop", { task_key: "llm_response" });
const merged = (userMessageId: string) =>
  frame("task_stop", { task_key: "interruption_merged", output: { user_message_id: userMessageId } });

const queuedRes = (userMessageId: string) =>
  jsonResponse(202, { instanceId: "instance-1", userMessageId, status: "Queued", content: null, violations: null });

const refusal = (key: string) =>
  jsonResponse(400, { code: "validation_error", message: "Refused", errors: { [key]: "Refused" } });

const interruptionsInfo = (settings: Record<string, unknown> = {}) => ({
  userInterruptions: { enabled: true, maxQueuedInterruptions: 5, maxInterruptionsPerRun: 10, ...settings },
});

/** A response the test answers later, to control when an interrupt request settles. */
function pending() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((r) => (resolve = r));
  return { promise, resolve };
}

type Interrupt = { body: Array<{ Key: string; Value: unknown }>; respond: (response: Response) => void };

/**
 * A conversation with an existing chat, whose execute streams through `stream` and whose
 * interrupt requests wait in `interrupts` until the test answers them.
 */
async function setup(agentInfo: Record<string, unknown> = interruptionsInfo()) {
  const stream = controllableStream();
  const interrupts: Interrupt[] = [];

  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    if (url.includes("/conversation/info")) return jsonResponse(200, { agent: agentInfo });
    if (url.endsWith("/interrupt")) {
      const response = pending();
      interrupts.push({ body: JSON.parse(String(init?.body)), respond: response.resolve });
      return response.promise;
    }
    return stream.fetch(url, init);
  });

  const client = new SerenityClient({ apiKey: "sk_test", baseUrl: "https://api.test" });
  const conversation = await client.agents.assistants.createConversation("agent");
  conversation.conversationId = "chat-1";

  const events: InterruptionEvent[] = [];
  conversation.on("interruption", (event) => events.push(event));

  const statuses = () => events.map((e) => `${e.message}:${e.status}`);
  const message = (interrupt: Interrupt) => interrupt.body.find((p) => p.Key === "message")?.Value;

  return { conversation, stream, interrupts, events, statuses, message };
}

describe("Conversation.interrupt", () => {
  it("posts the message and chat id to the interrupt endpoint", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      if (url.includes("/conversation/info")) return jsonResponse(200, {});
      calls.push({ url, init });
      return queuedRes("MSG-1");
    });
    const client = new SerenityClient({ apiKey: "sk_test", baseUrl: "https://api.test" });
    const conversation = await client.agents.assistants.createConversation("agent", {
      channel: "Widget",
      inputParameters: { city: "Rome" },
    });
    conversation.conversationId = "chat-1";

    const result = await conversation.interrupt("Also prices", { inputParameters: { lang: "en" } });

    expect(calls[0].url).toBe("https://api.test/v2/agent/agent/interrupt");
    expect(JSON.parse(String(calls[0].init?.body))).toEqual([
      { Key: "message", Value: "Also prices" },
      { Key: "chatId", Value: "chat-1" },
      { Key: "city", Value: "Rome" },
      { Key: "lang", Value: "en" },
      { Key: "channel", Value: "Widget" },
    ]);
    expect(result).toEqual({ status: "queued", instanceId: "instance-1", userMessageId: "MSG-1" });
  });

  it("returns the standard response of a blocked message", async () => {
    vi.stubGlobal("fetch", async (url: string) =>
      url.includes("/conversation/info")
        ? jsonResponse(200, {})
        : jsonResponse(200, { instanceId: "i", userMessageId: "m", status: "Blocked", content: "Can't help", violations: [{ rule: "Toxicity", score: 0.9 }] })
    );
    const client = new SerenityClient({ apiKey: "sk_test", baseUrl: "https://api.test" });
    const conversation = await client.agents.assistants.createConversation("agent");
    conversation.conversationId = "chat-1";

    await expect(conversation.interrupt("bad")).resolves.toMatchObject({
      status: "blocked",
      content: "Can't help",
      violations: [{ rule: "Toxicity", score: 0.9 }],
    });
  });

  it("rejects a refusal with its errors key", async () => {
    vi.stubGlobal("fetch", async (url: string) =>
      url.includes("/conversation/info") ? jsonResponse(200, {}) : refusal("interruption_not_accepted")
    );
    const client = new SerenityClient({ apiKey: "sk_test", baseUrl: "https://api.test" });
    const conversation = await client.agents.assistants.createConversation("agent");
    conversation.conversationId = "chat-1";

    await expect(conversation.interrupt("late")).rejects.toMatchObject({
      statusCode: 400,
      code: "validation_error",
      errors: { interruption_not_accepted: "Refused" },
    });
  });

  it("requires a conversation", async () => {
    vi.stubGlobal("fetch", async () => jsonResponse(200, {}));
    const client = new SerenityClient({ apiKey: "sk_test", baseUrl: "https://api.test" });
    const conversation = await client.agents.assistants.createConversation("agent");

    await expect(conversation.interrupt("hi")).rejects.toThrow(/Conversation ID is not set/);
  });
});

describe("Conversation.queueInterruption", () => {
  it("holds messages until the turn accepts them, then sends them one at a time in order", async () => {
    const { conversation, stream, interrupts, statuses, message } = await setup();
    const turn = conversation.streamMessage("Plan a trip");
    await flush();

    conversation.queueInterruption("first");
    conversation.queueInterruption("second");
    await flush();
    expect(interrupts).toHaveLength(0);

    stream.push(LLM_START);
    await flush();
    expect(interrupts.map(message)).toEqual(["first"]);

    interrupts[0].respond(queuedRes("ID-1"));
    await flush();
    expect(interrupts.map(message)).toEqual(["first", "second"]);

    interrupts[1].respond(queuedRes("ID-2"));
    await flush();
    stream.push(merged("id-1"));
    stream.push(merged("ID-2"));
    stream.push(LLM_STOP);
    stream.push(stopFrame());
    await turn;

    expect(statuses()).toEqual(["first:queued", "second:queued", "first:merged", "second:merged"]);
  });

  it("emits merged at the merge point even when the merge outruns the acknowledgement", async () => {
    const { conversation, stream, interrupts, events } = await setup();
    const turn = conversation.streamMessage("Plan a trip");
    await flush();
    stream.push(LLM_START);
    await flush();

    const id = conversation.queueInterruption("quick");
    await flush();
    stream.push(merged("ID-1"));
    await flush();
    expect(events).toEqual([{ id, message: "quick", status: "merged", userMessageId: "ID-1" }]);

    interrupts[0].respond(queuedRes("ID-1"));
    stream.push(stopFrame());
    await turn;
    expect(events).toHaveLength(1);
  });

  it("reports a blocked message with the guardrails' standard response", async () => {
    const { conversation, stream, interrupts, events } = await setup();
    const turn = conversation.streamMessage("Plan a trip");
    await flush();
    stream.push(LLM_START);
    await flush();

    conversation.queueInterruption("bad words");
    await flush();
    interrupts[0].respond(jsonResponse(200, { instanceId: "i", userMessageId: "B-1", status: "Blocked", content: "I can't help with that." }));
    await flush();

    expect(events[0]).toMatchObject({ status: "blocked", userMessageId: "B-1", content: "I can't help with that." });
    stream.push(stopFrame());
    await turn;
  });

  it("stops sending at the server's queue limit and resumes on each merge", async () => {
    const { conversation, stream, interrupts, message } = await setup(interruptionsInfo({ maxQueuedInterruptions: 1 }));
    const turn = conversation.streamMessage("Plan a trip");
    await flush();
    stream.push(LLM_START);
    await flush();

    conversation.queueInterruption("one");
    conversation.queueInterruption("two");
    await flush();
    interrupts[0].respond(queuedRes("ID-1"));
    await flush();
    expect(interrupts.map(message)).toEqual(["one"]);

    stream.push(merged("ID-1"));
    await flush();
    expect(interrupts.map(message)).toEqual(["one", "two"]);

    interrupts[1].respond(queuedRes("ID-2"));
    stream.push(merged("ID-2"));
    stream.push(stopFrame());
    await turn;
  });

  it("retries a message the full queue refused after the next merge, ahead of later ones", async () => {
    const { conversation, stream, interrupts, message } = await setup();
    const turn = conversation.streamMessage("Plan a trip");
    await flush();
    stream.push(LLM_START);
    await flush();

    conversation.queueInterruption("one");
    conversation.queueInterruption("two");
    await flush();
    interrupts[0].respond(queuedRes("ID-1"));
    await flush();
    interrupts[1].respond(refusal("interruption_queue_full"));
    conversation.queueInterruption("three");
    await flush();
    expect(interrupts.map(message)).toEqual(["one", "two"]);

    stream.push(merged("ID-1"));
    await flush();
    expect(interrupts.map(message)).toEqual(["one", "two", "two"]);

    interrupts[2].respond(queuedRes("ID-2"));
    await flush();
    expect(interrupts.map(message)).toEqual(["one", "two", "two", "three"]);

    interrupts[3].respond(queuedRes("ID-3"));
    stream.push(merged("ID-2"));
    stream.push(merged("ID-3"));
    stream.push(stopFrame());
    await turn;
  });

  it("defers the refused message and everything held after it when the turn stops accepting", async () => {
    const { conversation, stream, interrupts, statuses } = await setup();
    const turn = conversation.streamMessage("Plan a trip");
    await flush();
    stream.push(LLM_START);
    await flush();

    conversation.queueInterruption("one");
    conversation.queueInterruption("two");
    await flush();
    interrupts[0].respond(refusal("interruption_not_accepted"));
    await flush();

    expect(statuses()).toEqual(["one:deferred", "two:deferred"]);
    expect(interrupts).toHaveLength(1);

    stream.push(stopFrame());
    await turn;
  });

  it("settles what the turn didn't take before the stream resolves", async () => {
    const { conversation, stream, interrupts, statuses } = await setup();
    const turn = conversation.streamMessage("Plan a trip");
    await flush();
    stream.push(LLM_START);
    await flush();

    conversation.queueInterruption("accepted");
    await flush();
    interrupts[0].respond(queuedRes("ID-1"));
    await flush();
    stream.push(LLM_STOP);
    await flush();
    conversation.queueInterruption("held");
    await flush();

    let order: string[] = [];
    conversation.on("stop", () => (order = statuses()));
    stream.push(stopFrame());
    await turn;

    expect(order).toEqual(["accepted:queued"]);
    expect(statuses()).toEqual(["accepted:queued", "accepted:dropped", "held:deferred"]);
  });

  it("drops a message acknowledged after a stopped turn ended", async () => {
    const { conversation, stream, interrupts, statuses } = await setup();
    const turn = conversation.streamMessage("Plan a trip");
    await flush();
    stream.push(LLM_START);
    await flush();

    conversation.queueInterruption("in flight");
    await flush();
    conversation.stop();
    await turn;
    interrupts[0].respond(queuedRes("ID-1"));
    await flush();

    expect(statuses()).toEqual(["in flight:dropped"]);
  });

  it("defers right away when no turn is running", async () => {
    const { conversation, statuses, interrupts } = await setup();

    conversation.queueInterruption("idle");
    await flush();

    expect(statuses()).toEqual(["idle:deferred"]);
    expect(interrupts).toHaveLength(0);
  });

  it("defers right away when the agent has interruptions turned off", async () => {
    const { conversation, stream, statuses, interrupts } = await setup(interruptionsInfo({ enabled: false }));
    const turn = conversation.streamMessage("Plan a trip");
    await flush();
    stream.push(LLM_START);
    await flush();

    conversation.queueInterruption("nope");
    await flush();

    expect(statuses()).toEqual(["nope:deferred"]);
    expect(interrupts).toHaveLength(0);
    stream.push(stopFrame());
    await turn;
  });

  it("defers what comes after the turn's limit without sending it", async () => {
    const { conversation, stream, interrupts, statuses, message } = await setup(interruptionsInfo({ maxInterruptionsPerRun: 2 }));
    const turn = conversation.streamMessage("Plan a trip");
    await flush();
    stream.push(LLM_START);
    await flush();

    conversation.queueInterruption("one");
    expect(conversation.isInterruptionLimitReached).toBe(false);
    conversation.queueInterruption("two");
    expect(conversation.isInterruptionLimitReached).toBe(true);
    conversation.queueInterruption("three");
    await flush();
    interrupts[0].respond(queuedRes("ID-1"));
    await flush();
    interrupts[1].respond(queuedRes("ID-2"));
    await flush();

    expect(interrupts.map(message)).toEqual(["one", "two"]);
    expect(statuses()).toEqual(["one:queued", "two:queued", "three:deferred"]);

    conversation.queueInterruption("late");
    await flush();
    expect(statuses()).toEqual(["one:queued", "two:queued", "three:deferred", "late:deferred"]);
    expect(interrupts).toHaveLength(2);

    stream.push(merged("ID-1"));
    stream.push(merged("ID-2"));
    stream.push(stopFrame());
    await turn;
    expect(conversation.isInterruptionLimitReached).toBe(false);
  });

  it("counts blocked messages toward the turn's limit", async () => {
    const { conversation, stream, interrupts, statuses } = await setup(interruptionsInfo({ maxInterruptionsPerRun: 1 }));
    const turn = conversation.streamMessage("Plan a trip");
    await flush();
    stream.push(LLM_START);
    await flush();

    conversation.queueInterruption("bad words");
    conversation.queueInterruption("next");
    await flush();
    interrupts[0].respond(jsonResponse(200, { instanceId: "i", userMessageId: "B-1", status: "Blocked", content: "No." }));
    await flush();

    expect(statuses()).toEqual(["bad words:blocked", "next:deferred"]);
    expect(interrupts).toHaveLength(1);
    stream.push(stopFrame());
    await turn;
  });

  it("doesn't count refused messages toward the turn's limit", async () => {
    const { conversation, stream, interrupts, statuses, message } = await setup(interruptionsInfo({ maxInterruptionsPerRun: 2 }));
    const turn = conversation.streamMessage("Plan a trip");
    await flush();
    stream.push(LLM_START);
    await flush();

    conversation.queueInterruption("one");
    conversation.queueInterruption("two");
    await flush();
    interrupts[0].respond(queuedRes("ID-1"));
    await flush();
    interrupts[1].respond(refusal("interruption_queue_full"));
    await flush();

    stream.push(merged("ID-1"));
    await flush();
    interrupts[2].respond(queuedRes("ID-2"));
    await flush();

    expect(interrupts.map(message)).toEqual(["one", "two", "two"]);
    expect(statuses()).toEqual(["one:queued", "one:merged", "two:queued"]);

    stream.push(merged("ID-2"));
    stream.push(stopFrame());
    await turn;
  });

  it("uses the server's default limit when it isn't reported", async () => {
    const { conversation, stream, interrupts } = await setup({ userInterruptions: { enabled: true } });
    const turn = conversation.streamMessage("Plan a trip");
    await flush();
    stream.push(LLM_START);
    await flush();

    for (let i = 1; i <= 10; i++) conversation.queueInterruption(`m${i}`);
    expect(conversation.isInterruptionLimitReached).toBe(true);

    for (let i = 1; i <= 10; i++) {
      await flush();
      interrupts[i - 1].respond(queuedRes(`ID-${i}`));
      if (i % 5 === 0) {
        await flush();
        for (let j = i - 4; j <= i; j++) stream.push(merged(`ID-${j}`));
      }
    }
    await flush();
    expect(interrupts).toHaveLength(10);

    stream.push(stopFrame());
    await turn;
  });

  it("reports other failures as failed and moves on to the next message", async () => {
    const { conversation, stream, interrupts, events, message } = await setup();
    const turn = conversation.streamMessage("Plan a trip");
    await flush();
    stream.push(LLM_START);
    await flush();

    conversation.queueInterruption("one");
    conversation.queueInterruption("two");
    await flush();
    interrupts[0].respond(jsonResponse(500, { code: "server_error", message: "Boom" }));
    await flush();

    expect(events[0]).toMatchObject({ message: "one", status: "failed", error: { statusCode: 500 } });
    expect(interrupts.map(message)).toEqual(["one", "two"]);

    interrupts[1].respond(queuedRes("ID-2"));
    stream.push(merged("ID-2"));
    stream.push(stopFrame());
    await turn;
  });

  it("rejects an empty message", async () => {
    const { conversation } = await setup();
    expect(() => conversation.queueInterruption("   ")).toThrow(/non-empty/);
  });
});

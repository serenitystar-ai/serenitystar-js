import { afterEach, describe, expect, it, vi } from "vitest";
import SerenityClient from "../src/SerenityClient";
import { SseConnection } from "../src/scopes/conversational/Conversation/SseConnection";
import { jsonResponse } from "./helpers";
import { controllableStream, flush, frame, stopFrame, streamOf } from "./sseHelpers";

afterEach(() => {
  vi.unstubAllGlobals();
});

/** A conversation whose info call succeeds and whose executes use `execute`. */
async function conversationWith(execute: (url: string, init?: RequestInit) => Promise<Response>) {
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) =>
    url.includes("/conversation/info") ? jsonResponse(200, {}) : execute(url, init)
  );
  const client = new SerenityClient({ apiKey: "sk_test", baseUrl: "https://api.test" });
  return client.agents.assistants.createConversation("agent");
}

describe("SseConnection", () => {
  const listen = (connection: SseConnection, events: string[]) => {
    const received: Array<[string, string]> = [];
    events.forEach((event) => connection.on(event, (data) => received.push([event, data])));
    return received;
  };

  it("accepts a content type with parameters", async () => {
    vi.stubGlobal(
      "fetch",
      streamOf([frame("content", { text: "Hi" }), stopFrame()], "text/event-stream; charset=utf-8")
    );
    const connection = new SseConnection();
    const received = listen(connection, ["content", "stop"]);

    expect(await connection.start("https://api.test", {})).toBe("completed");
    expect(received.map(([event]) => event)).toEqual(["content", "stop"]);
  });

  it("throws the response when it is not an event stream, instead of hanging", async () => {
    vi.stubGlobal("fetch", async () => jsonResponse(200, { message: "Not a stream" }));

    await expect(new SseConnection().start("https://api.test", {})).rejects.toBeInstanceOf(Response);
  });

  it("joins multi-line data with line breaks", async () => {
    vi.stubGlobal("fetch", streamOf(["event: content\ndata: line one\ndata: line two\n\n", stopFrame()]));
    const connection = new SseConnection();
    const received = listen(connection, ["content"]);

    await connection.start("https://api.test", {});

    expect(received).toEqual([["content", "line one\nline two"]]);
  });

  it("delivers a last event that has no trailing blank line", async () => {
    vi.stubGlobal("fetch", streamOf([frame("content", "a"), "event: stop\ndata: {}"]));
    const connection = new SseConnection();
    const received = listen(connection, ["stop"]);

    expect(await connection.start("https://api.test", {})).toBe("completed");
    expect(received).toEqual([["stop", "{}"]]);
  });

  it("delivers nothing after the first error or stop frame", async () => {
    vi.stubGlobal(
      "fetch",
      streamOf([frame("error", { message: "one" }), frame("error", { message: "two" }), stopFrame()])
    );
    const connection = new SseConnection();
    const received = listen(connection, ["error", "stop"]);

    await connection.start("https://api.test", {});

    expect(received).toEqual([["error", JSON.stringify({ message: "one" })]]);
  });

  it("reports a stream the server closed without a stop frame", async () => {
    vi.stubGlobal("fetch", streamOf([frame("content", { text: "partial" })]));

    expect(await new SseConnection().start("https://api.test", {})).toBe("closed");
  });

  it("resolves as aborted when aborted mid-stream", async () => {
    const stream = controllableStream();
    vi.stubGlobal("fetch", stream.fetch);
    const connection = new SseConnection();
    const outcome = connection.start("https://api.test", {});

    await flush();
    stream.push(frame("content", { text: "a" }));
    await flush();
    connection.abort();

    expect(await outcome).toBe("aborted");
  });

  it("resolves as aborted without a request when aborted before starting", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const connection = new SseConnection();

    connection.abort();

    expect(await connection.start("https://api.test", {})).toBe("aborted");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("Conversation streaming", () => {
  it("exposes instance_id on start and adopts it as the conversation id", async () => {
    const conversation = await conversationWith(
      streamOf([frame("start", { instance_id: "instance-9", start_time_utc: "2026-09-30T10:00:00Z" }), stopFrame({ instance_id: "instance-9" })])
    );
    const start = vi.fn();
    conversation.on("start", start);

    await conversation.streamMessage("Hi");

    expect(start).toHaveBeenCalledWith({ instance_id: "instance-9", start_time_utc: "2026-09-30T10:00:00Z" });
    expect(conversation.conversationId).toBe("instance-9");
  });

  it("resolves stop() as aborted with the content and instance so far", async () => {
    const stream = controllableStream();
    const conversation = await conversationWith(stream.fetch);
    const stop = vi.fn();
    conversation.on("stop", stop);

    const result = conversation.streamMessage("Hi");
    await flush();
    stream.push(frame("start", { instance_id: "instance-2" }) + frame("content", { text: "Hel" }) + frame("content", { text: "lo" }));
    await flush();
    conversation.stop();

    await expect(result).resolves.toEqual({ content: "Hello", instance_id: "instance-2", aborted: true });
    expect(stop).not.toHaveBeenCalled();
    expect(conversation.conversationId).toBe("instance-2");
  });

  it("resolves a stream the server closed without stop as incomplete", async () => {
    const conversation = await conversationWith(
      streamOf([frame("start", { instance_id: "instance-3" }), frame("content", { text: "partial" })])
    );

    await expect(conversation.streamMessage("Hi")).resolves.toEqual({
      content: "partial",
      instance_id: "instance-3",
      incomplete: true,
    });
  });

  it("emits and rejects one error, even when the server sends more frames", async () => {
    const conversation = await conversationWith(
      streamOf([frame("error", { code: "server_error", message: "Boom." }), frame("error", { message: "Again." }), stopFrame()])
    );
    const error = vi.fn();
    const stop = vi.fn();
    conversation.on("error", error).on("stop", stop);

    const rejection = await conversation.streamMessage("Hi").catch((e) => e);

    expect(error).toHaveBeenCalledTimes(1);
    expect(stop).not.toHaveBeenCalled();
    expect(rejection).toBe(error.mock.calls[0][0]);
    expect(rejection).toEqual({ code: "server_error", message: "Boom." });
  });

  it("rejects instead of hanging when custom headers are invalid for a request", async () => {
    vi.stubGlobal("fetch", async (url: string) =>
      url.includes("/conversation/info") ? jsonResponse(200, {}) : streamOf([stopFrame()])()
    );
    const client = new SerenityClient({
      apiKey: "sk_test",
      baseUrl: "https://api.test",
      headers: ({ url }) => (url.includes("/execute") ? { Cookie: "x" } : {}),
    });
    const conversation = await client.agents.assistants.createConversation("agent");

    await expect(conversation.streamMessage("Hi")).rejects.toMatchObject({ statusCode: 500 });
  });

  it("keeps a streamed audio error's code instead of a generic 500", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("/conversation/info")) return jsonResponse(200, {});
      if (url.includes("/file/upload")) return jsonResponse(200, { id: "file-1" });
      return streamOf([frame("error", { code: "validation_error", message: "Closed." })])();
    });
    const client = new SerenityClient({ apiKey: "sk_test", baseUrl: "https://api.test" });
    const conversation = await client.agents.assistants.createConversation("agent");

    await expect(conversation.streamAudioMessage(new Blob(["a"]))).rejects.toEqual({
      code: "validation_error",
      message: "Closed.",
    });
  });

  it("stop() on a system agent resolves as aborted too", async () => {
    const stream = controllableStream();
    vi.stubGlobal("fetch", stream.fetch);
    const client = new SerenityClient({ apiKey: "sk_test", baseUrl: "https://api.test" });
    const activity = client.agents.activities.create("activity");

    const result = activity.stream();
    await flush();
    stream.push(frame("content", { text: "abc" }));
    await flush();
    activity.stop();

    await expect(result).resolves.toEqual({ content: "abc", instance_id: "", aborted: true });
  });
});

describe("EventEmitter.off", () => {
  it("removes one listener, every listener of an event, or all of them", async () => {
    const conversation = await conversationWith(
      streamOf([frame("content", { text: "a" }), stopFrame()])
    );
    const kept = vi.fn();
    const removed = vi.fn();
    const stop = vi.fn();
    conversation.on("content", kept).on("content", removed).on("stop", stop);

    conversation.off("content", removed);
    await conversation.streamMessage("Hi");
    expect(kept).toHaveBeenCalledTimes(1);
    expect(removed).not.toHaveBeenCalled();

    conversation.off("content");
    conversation.off();
    await conversation.streamMessage("Again").catch(() => undefined);
    expect(kept).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("lets a listener remove itself without skipping the next one", async () => {
    const conversation = await conversationWith(streamOf([frame("content", { text: "a" }), stopFrame()]));
    const second = vi.fn();
    const first = () => conversation.off("content", first);
    conversation.on("content", first).on("content", second);

    await conversation.streamMessage("Hi");

    expect(second).toHaveBeenCalledTimes(1);
  });
});

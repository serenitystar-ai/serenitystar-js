import { afterEach, describe, expect, it, vi } from "vitest";
import SerenityClient from "../src/SerenityClient";
import { InternalErrorHelper } from "../src/utils/ErrorHelper";
import { jsonResponse } from "./helpers";
import { stopFrame, streamOf } from "./sseHelpers";

afterEach(() => {
  vi.unstubAllGlobals();
});

async function startedConversation(afterStream: (url: string, init?: RequestInit) => Promise<Response>) {
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    if (url.includes("/conversation/info")) return jsonResponse(200, {});
    if (url.includes("/execute")) return streamOf([stopFrame({ instance_id: "chat-1" })])();
    return afterStream(url, init);
  });
  const client = new SerenityClient({ apiKey: "sk_test", baseUrl: "https://api.test" });
  const conversation = await client.agents.assistants.createConversation("agent");
  await conversation.streamMessage("Hi");
  return conversation;
}

describe("feedback errors", () => {
  it("submitFeedback reports why it failed", async () => {
    const conversation = await startedConversation(async () =>
      jsonResponse(404, { code: "resource_not_found", message: "Message not found." })
    );

    await expect(conversation.submitFeedback({ agentMessageId: "m-1", feedback: false })).resolves.toEqual({
      success: false,
      error: { code: "resource_not_found", message: "Message not found.", statusCode: 404 },
    });
  });

  it("removeFeedback reports why it failed", async () => {
    const conversation = await startedConversation(async () => jsonResponse(500, {}));

    const result = await conversation.removeFeedback({ agentMessageId: "m-1" });

    expect(result.success).toBe(false);
    expect(result.error).toEqual({ message: "Failed to remove feedback", statusCode: 500 });
  });

  it("carries no error on success", async () => {
    const conversation = await startedConversation(async () => jsonResponse(200, {}));

    await expect(conversation.submitFeedback({ agentMessageId: "m-1", feedback: true })).resolves.toEqual({
      success: true,
    });
  });
});

describe("volatile knowledge upload", () => {
  it("returns the caller's file name and size, not the server's generic one", async () => {
    vi.stubGlobal("fetch", async (url: string) =>
      url.includes("/conversation/info")
        ? jsonResponse(200, {})
        : jsonResponse(200, { id: "vk-1", status: "Processing", fileName: "file", fileSize: 0 })
    );
    const client = new SerenityClient({ apiKey: "sk_test", baseUrl: "https://api.test" });
    const conversation = await client.agents.assistants.createConversation("agent");
    const file = new File(["12345"], "Report Q3.pdf", { type: "application/pdf" });

    const result = await conversation.volatileKnowledge.upload(file);

    expect(result).toMatchObject({ success: true, id: "vk-1", fileName: "Report Q3.pdf", fileSize: 5 });
  });
});

describe("stream error retryAfter", () => {
  it("exposes retry_after_seconds as retryAfter too, as buffered errors name it", () => {
    const event = InternalErrorHelper.processStreamError({
      code: "agent_execution_failed",
      message: "Rate limited.",
      retry_after_seconds: 12,
    });

    expect(event.retry_after_seconds).toBe(12);
    expect(event.retryAfter).toBe(12);
  });
});

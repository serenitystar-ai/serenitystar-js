import { afterEach, describe, expect, it, vi } from "vitest";
import { AccessTokenAuthProvider } from "../src/auth/AccessTokenAuthProvider";
import { CustomHeadersAuthProvider } from "../src/auth/CustomHeadersAuthProvider";
import { createAuthProvider } from "../src/auth";
import { fetchWithAuth } from "../src/utils/fetchWithAuth";
import SerenityClient, { FullSerenityClient } from "../src/SerenityClient";
import { jsonResponse } from "./helpers";
import { stopFrame, streamOf } from "./sseHelpers";

afterEach(() => {
  vi.unstubAllGlobals();
});

const request = { url: "https://api.test/x", method: "GET" };

describe("AccessTokenAuthProvider", () => {
  it("sends a static token as a bearer header", async () => {
    const provider = new AccessTokenAuthProvider("t-static");

    expect(await provider.getHeaders()).toEqual({ Authorization: "Bearer t-static" });
  });

  it.each([[""], [null], [42]])("rejects %j at construction", (token) => {
    expect(() => new AccessTokenAuthProvider(token as unknown as string)).toThrow(TypeError);
  });

  it("calls a function on every request, without forcing a refresh", async () => {
    let n = 0;
    const accessToken = vi.fn(async () => `t-${++n}`);
    const provider = new AccessTokenAuthProvider(accessToken);

    expect(await provider.getHeaders()).toEqual({ Authorization: "Bearer t-1" });
    expect(await provider.getHeaders()).toEqual({ Authorization: "Bearer t-2" });
    expect(accessToken.mock.calls).toEqual([[{ forceRefresh: false }], [{ forceRefresh: false }]]);
  });

  it("accepts a synchronous function", async () => {
    const provider = new AccessTokenAuthProvider(() => "t-sync");

    expect(await provider.getHeaders()).toEqual({ Authorization: "Bearer t-sync" });
  });

  it("rejects a function that returns no token", async () => {
    const provider = new AccessTokenAuthProvider(() => "");

    await expect(provider.getHeaders()).rejects.toThrow(/non-empty string/);
  });

  it("does not retry a static token after a 401", async () => {
    const provider = new AccessTokenAuthProvider("t-static");

    expect(await provider.handleUnauthorized()).toBe(false);
  });

  it("asks a function for a fresh token after a 401", async () => {
    const accessToken = vi.fn(() => "t-new");
    const provider = new AccessTokenAuthProvider(accessToken);

    expect(await provider.handleUnauthorized()).toBe(true);
    expect(accessToken).toHaveBeenCalledWith({ forceRefresh: true });
  });

  it("gives up when the forced refresh fails", async () => {
    const provider = new AccessTokenAuthProvider(({ forceRefresh }) => {
      if (forceRefresh) throw new Error("refresh token revoked");
      return "t-old";
    });

    expect(await provider.handleUnauthorized()).toBe(false);
  });

  it("refuses WebSocket connections", async () => {
    const provider = new AccessTokenAuthProvider("t-static");

    await expect(provider.getWebSocketProtocols()).rejects.toThrow(/does not support WebSocket/);
  });
});

describe("401 retry through fetchWithAuth", () => {
  it("retries once with the token returned after the forced refresh", async () => {
    let current = "t-old";
    const accessToken = vi.fn(({ forceRefresh }: { forceRefresh: boolean }) => {
      if (forceRefresh) current = "t-new";
      return current;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchWithAuth(new AccessTokenAuthProvider(accessToken), request.url, {
      method: "GET",
    });

    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls.map(([, init]) => init.headers.Authorization)).toEqual([
      "Bearer t-old",
      "Bearer t-new",
    ]);
    expect(accessToken.mock.calls.map(([context]) => context.forceRefresh)).toEqual([
      false,
      true,
      false,
    ]);
  });

  it("returns the second 401 instead of retrying again", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(401, {}));
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchWithAuth(new AccessTokenAuthProvider(() => "t"), request.url, {
      method: "GET",
    });

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a static token", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(401, {}));
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchWithAuth(new AccessTokenAuthProvider("t"), request.url, {
      method: "GET",
    });

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("createAuthProvider with an access token", () => {
  it("builds an AccessTokenAuthProvider", () => {
    expect(createAuthProvider({ accessToken: "t" })).toBeInstanceOf(AccessTokenAuthProvider);
  });

  it("merges custom headers under the bearer header and keeps the retry", async () => {
    const accessToken = vi.fn(() => "t-1");
    const provider = createAuthProvider({ accessToken, headers: { "X-Custom": "1" } });

    expect(provider).toBeInstanceOf(CustomHeadersAuthProvider);
    expect(await provider.getHeaders(request)).toEqual({
      "X-Custom": "1",
      Authorization: "Bearer t-1",
    });
    expect(await provider.handleUnauthorized(jsonResponse(401, {}))).toBe(true);
    await expect(provider.getWebSocketProtocols()).rejects.toThrow(/does not support WebSocket/);
  });
});

describe("SerenityClient with an access token", () => {
  it("returns the full client, services included", () => {
    const client = new SerenityClient({ accessToken: "t" });

    expect(client).toBeInstanceOf(FullSerenityClient);
    expect(client.services.audio).toBeDefined();
  });

  it("sends the bearer header from every scope", async () => {
    const seen: Array<{ url: string; headers: Record<string, string> }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      seen.push({ url, headers: init.headers as Record<string, string> });
      if (url.includes("/conversation/info")) return jsonResponse(200, {});
      if (url.includes("/volatileKnowledge")) return jsonResponse(200, { id: "vk-1" });
      if (url.includes("/connection/")) return jsonResponse(200, { isConnected: true });
      if (url.includes("/audio/transcribe")) return jsonResponse(200, { transcript: "hi" });
      if (url.includes("/feedback")) return jsonResponse(200, {});
      if (url.includes("/agent/chat")) return streamOf([stopFrame()])();
      return jsonResponse(200, { content: "", instance_id: "i-1" });
    });

    const client = new SerenityClient({
      accessToken: async () => "t-user",
      baseUrl: "https://api.test",
      headers: { "X-Custom": "1" },
    });
    const conversation = await client.agents.assistants.createConversation("chat");
    await conversation.volatileKnowledge.upload(new File(["x"], "a.pdf", { type: "application/pdf" }));
    await conversation.streamMessage("Hi");
    await conversation.submitFeedback({ agentMessageId: "m-1", feedback: true });
    await conversation.removeFeedback({ agentMessageId: "m-1" });
    await conversation.getConnectorStatus({ agentInstanceId: "i-1", connectorId: "c-1" });
    await client.agents.copilots.createConversation("chat-copilot");
    await client.agents.activities.execute("activity");
    await client.agents.proxies.execute("proxy", { model: "m", messages: [] });
    await client.agents.chatCompletions.execute("completion", { message: "Hi" });
    await client.services.audio.transcribe(new File(["x"], "a.mp3", { type: "audio/mpeg" }));

    expect(seen.map(({ url }) => url.replace("https://api.test", ""))).toEqual([
      "/v2/agent/chat/conversation/info",
      "/v2/agent/chat/volatileKnowledge",
      "/v2/agent/chat/execute",
      "/agent/chat/conversation/instance-1/message/m-1/feedback",
      "/agent/chat/conversation/instance-1/message/m-1/feedback",
      "/connection/agentInstance/i-1/connector/c-1/status",
      "/v2/agent/chat-copilot/conversation/info",
      "/v2/agent/activity/execute",
      "/v2/agent/proxy/execute",
      "/v2/agent/completion/execute",
      "/audio/transcribe",
    ]);
    for (const { headers } of seen) {
      expect(headers).toMatchObject({ Authorization: "Bearer t-user", "X-Custom": "1" });
      expect(headers).not.toHaveProperty("X-API-KEY");
    }
  });

  it("can't start a realtime session", async () => {
    const client = new SerenityClient({ accessToken: "t" });
    const session = client.agents.assistants.createRealtimeSession("agent");

    await expect(session.start()).rejects.toThrow(/starting the session/);
  });
});

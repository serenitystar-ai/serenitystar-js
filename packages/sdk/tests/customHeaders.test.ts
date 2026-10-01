import { afterEach, describe, expect, it, vi } from "vitest";
import { CustomHeadersAuthProvider, validateCustomHeaders } from "../src/auth/CustomHeadersAuthProvider";
import { ApiKeyAuthProvider } from "../src/auth/ApiKeyAuthProvider";
import { createAuthProvider } from "../src/auth";
import { fetchWithAuth } from "../src/utils/fetchWithAuth";
import SerenityClient from "../src/SerenityClient";
import { jsonResponse } from "./helpers";
import { stopFrame, streamOf } from "./sseHelpers";

const apiKey = new ApiKeyAuthProvider("sk_test");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("validateCustomHeaders", () => {
  it.each(["X-API-KEY", "x-api-key", "Authorization", "content-type"])(
    "rejects %s, which the SDK sets itself",
    (name) => {
      expect(() => validateCustomHeaders({ [name]: "value" })).toThrow(/set by the SDK/);
    }
  );

  it.each(["Cookie", "Host", "Origin", "Content-Length", "Sec-Fetch-Mode", "Proxy-Authorization", "X-HTTP-Method-Override"])(
    "rejects %s, which browsers forbid",
    (name) => {
      expect(() => validateCustomHeaders({ [name]: "value" })).toThrow(/browser/);
    }
  );

  it.each(["", "Bad Header", "Bad:Header", "Ünicode"])("rejects the invalid name %j", (name) => {
    expect(() => validateCustomHeaders({ [name]: "value" })).toThrow(/Invalid custom header name/);
  });

  it.each(["a\r\nX-Injected: 1", "a\nb", "a\rb", "a\0b"])("rejects the value %j", (value) => {
    expect(() => validateCustomHeaders({ "X-Custom": value })).toThrow(/line breaks/);
  });

  it("rejects a value that is not a string", () => {
    expect(() => validateCustomHeaders({ "X-Custom": 1 as unknown as string })).toThrow(/must be a string/);
  });

  it("accepts ordinary headers", () => {
    expect(() =>
      validateCustomHeaders({ RequestVerificationToken: "abc", "X-Request-Id": "42" })
    ).not.toThrow();
  });
});

describe("CustomHeadersAuthProvider", () => {
  it("rejects a static map at construction", () => {
    expect(() => new CustomHeadersAuthProvider(apiKey, { Authorization: "Bearer x" })).toThrow();
  });

  it("adds a static map to every request, under the SDK's auth header", async () => {
    const provider = new CustomHeadersAuthProvider(apiKey, { "X-Custom": "1" });

    expect(await provider.getHeaders({ url: "https://api.test/a", method: "GET" })).toEqual({
      "X-Custom": "1",
      "X-API-KEY": "sk_test",
    });
  });

  it("calls a function per request with the URL and method", async () => {
    const headers = vi.fn(({ url }: { url: string; method: string }) =>
      url.startsWith("https://app.test") ? { RequestVerificationToken: "token" } : {}
    );
    const provider = new CustomHeadersAuthProvider(apiKey, headers);

    expect(await provider.getHeaders({ url: "https://app.test/proxy", method: "POST" })).toEqual({
      RequestVerificationToken: "token",
      "X-API-KEY": "sk_test",
    });
    expect(await provider.getHeaders({ url: "https://api.test/v2", method: "POST" })).toEqual({
      "X-API-KEY": "sk_test",
    });
    expect(headers).toHaveBeenCalledWith({ url: "https://app.test/proxy", method: "POST" });
  });

  it("validates a function's result on every request", async () => {
    const provider = new CustomHeadersAuthProvider(apiKey, () => ({ "X-API-KEY": "other" }));

    await expect(provider.getHeaders({ url: "https://api.test", method: "GET" })).rejects.toThrow(
      /set by the SDK/
    );
  });

  it("awaits an async function", async () => {
    const provider = new CustomHeadersAuthProvider(apiKey, async () => ({ "X-Custom": "late" }));

    expect(await provider.getHeaders({ url: "https://api.test", method: "GET" })).toMatchObject({
      "X-Custom": "late",
    });
  });

  it("delegates WebSocket protocols without custom headers", async () => {
    const provider = new CustomHeadersAuthProvider(apiKey, { "X-Custom": "1" });

    expect(await provider.getWebSocketProtocols()).toEqual(["X-API-KEY", "sk_test"]);
  });
});

describe("createAuthProvider", () => {
  it("wraps the provider only when headers are configured", () => {
    expect(createAuthProvider({ apiKey: "sk" })).toBeInstanceOf(ApiKeyAuthProvider);
    expect(createAuthProvider({ apiKey: "sk", headers: { "X-Custom": "1" } })).toBeInstanceOf(
      CustomHeadersAuthProvider
    );
  });
});

describe("custom headers on the wire", () => {
  it("fetchWithAuth sends them with the request's URL and method", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, {}));
    vi.stubGlobal("fetch", fetchMock);
    const provider = new CustomHeadersAuthProvider(apiKey, ({ method }) => ({ "X-Method": method }));

    await fetchWithAuth(provider, "https://api.test/x", {
      method: "post",
      headers: { "Content-Type": "application/json" },
    });

    expect(fetchMock).toHaveBeenCalledWith("https://api.test/x", {
      method: "post",
      headers: { "Content-Type": "application/json", "X-Method": "POST", "X-API-KEY": "sk_test" },
    });
  });

  it("reaches conversation info, the SSE stream and uploads", async () => {
    const seen: Array<{ url: string; header: string | undefined }> = [];
    const stream = streamOf([stopFrame()]);
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      seen.push({ url, header: (init.headers as Record<string, string>)["X-Custom"] });
      if (url.includes("/conversation/info")) return jsonResponse(200, {});
      if (url.includes("/volatileKnowledge")) return jsonResponse(200, { id: "vk-1" });
      return stream();
    });

    const client = new SerenityClient({
      apiKey: "sk_test",
      baseUrl: "https://api.test",
      headers: { "X-Custom": "1" },
    });
    const conversation = await client.agents.assistants.createConversation("agent");
    await conversation.volatileKnowledge.upload(new File(["x"], "a.pdf", { type: "application/pdf" }));
    await conversation.streamMessage("Hi");

    expect(seen.map((call) => call.header)).toEqual(["1", "1", "1"]);
  });
});

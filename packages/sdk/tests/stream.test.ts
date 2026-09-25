import { describe, expect, it } from "vitest";
import { InternalErrorHelper } from "../src/utils/ErrorHelper";

describe("processStreamError — changes 5 and 6", () => {
  it("keeps code, message and errors so a streamed failure reads like a buffered one", () => {
    const event = InternalErrorHelper.processStreamError({
      code: "validation_error",
      message: "The conversation is closed.",
      errors: { conversation_closed: "Start a new conversation." },
    });

    expect(event).toEqual({
      code: "validation_error",
      message: "The conversation is closed.",
      errors: { conversation_closed: "Start a new conversation." },
    });
  });

  it("invents no statusCode — the transport already reported 200", () => {
    const event = InternalErrorHelper.processStreamError({
      code: "agent_execution_failed",
      message: "Failed.",
    });

    expect("statusCode" in event).toBe(false);
  });

  it("falls back to the caller's message when the frame omits one", () => {
    const event = InternalErrorHelper.processStreamError(
      { code: "server_error" },
      "Failed to send message"
    );

    expect(event.message).toBe("Failed to send message");
  });

  it("keeps attempts in their wire-native snake_case", () => {
    const event = InternalErrorHelper.processStreamError({
      code: "agent_execution_failed",
      message: "Every attempt failed.",
      attempts: [
        {
          index: 0,
          model_type: "main",
          status_code: 429,
          code: "vendor_rate_limit_error",
          message: "Rate limited.",
        },
        {
          index: 1,
          model_type: "fallback",
          code: "vendor_service_error",
          errors: { vendor_error: "upstream 503" },
        },
      ],
    });

    expect(event.attempts).toEqual([
      {
        index: 0,
        model_type: "main",
        status_code: 429,
        code: "vendor_rate_limit_error",
        message: "Rate limited.",
      },
      {
        index: 1,
        model_type: "fallback",
        code: "vendor_service_error",
        errors: { vendor_error: "upstream 503" },
      },
    ]);
  });

  it("keeps AI service attempts, which carry no model_type", () => {
    const event = InternalErrorHelper.processStreamError({
      type: "error",
      code: "aiservice_execution_failed",
      message: "The speech couldn't be generated.",
      attempts: [
        { index: 1, code: "vendor_service_error", status_code: 503, message: "Upstream 503." },
      ],
    });

    expect(event.attempts).toEqual([
      { index: 1, code: "vendor_service_error", status_code: 503, message: "Upstream 503." },
    ]);
  });

  it("keeps retry_after_seconds and documentation_url in their wire-native snake_case", () => {
    const event = InternalErrorHelper.processStreamError({
      code: "agent_execution_failed",
      message: "Rate limited.",
      documentation_url:
        "https://docs.serenitystar.ai/docs/serenity-aihub/dev-tools/api-error-responses#agent_execution_failed",
      retry_after_seconds: 30,
    });

    expect(event.retry_after_seconds).toBe(30);
    expect(event.documentation_url).toBe(
      "https://docs.serenitystar.ai/docs/serenity-aihub/dev-tools/api-error-responses#agent_execution_failed"
    );
  });

  it("omits a null documentation_url and an invalid retry_after_seconds", () => {
    const event = InternalErrorHelper.processStreamError({
      code: "server_error",
      message: "Boom.",
      documentation_url: null,
      retry_after_seconds: "soon",
    });

    expect(event).toEqual({ code: "server_error", message: "Boom." });
  });

  it("accepts camelCase attempt fields and reports them snake_case", () => {
    const event = InternalErrorHelper.processStreamError({
      attempts: [{ modelType: "fallback", statusCode: 503 }],
    });

    expect(event.attempts).toEqual([
      { model_type: "fallback", status_code: 503 },
    ]);
  });

  it("drops a non-array attempts value rather than passing it on", () => {
    const event = InternalErrorHelper.processStreamError({
      message: "Failed.",
      attempts: "nope",
    });

    expect("attempts" in event).toBe(false);
  });

  it("surfaces the top-level agent_result and generated_json extras", () => {
    const agentResult = {
      content: "partial answer",
      instance_id: "abc-123",
      completion_usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
    };

    const event = InternalErrorHelper.processStreamError({
      code: "agent_execution_failed",
      message: "Failed.",
      agent_result: agentResult,
      generated_json: '{"partial":true}',
    });

    expect(event.agent_result).toEqual(agentResult);
    expect(event.generated_json).toBe('{"partial":true}');
  });

  it("normalizes pending_actions the same way the success path does", () => {
    const event = InternalErrorHelper.processStreamError({
      code: "validation_error",
      message: "Approve the pending tool call first.",
      pending_actions: [
        {
          type: "approval",
          requestId: "req-1",
          callId: "call-1",
          skillCode: "GetWeather",
          skillType: "api",
          tool: "get_weather",
          arguments: { city: "Paris" },
        },
      ],
    });

    expect(event.pending_actions).toEqual([
      {
        type: "approval",
        request_id: "req-1",
        call_id: "call-1",
        skill_code: "GetWeather",
        skill_type: "api",
        tool: "get_weather",
        arguments: { city: "Paris" },
      },
    ]);
  });

  it("ignores the removed `status` field without breaking (change 5)", () => {
    const event = InternalErrorHelper.processStreamError({
      message: "Failed.",
      status: 400,
    });

    expect(event.message).toBe("Failed.");
  });

  it("drops a non-string code and a non-object errors value", () => {
    const event = InternalErrorHelper.processStreamError({
      message: "Failed.",
      code: 500,
      errors: "nope",
    });

    expect(event).toEqual({ message: "Failed." });
  });
});

describe("parseStreamError — malformed frames", () => {
  it("returns the fallback message instead of throwing in the SSE listener", () => {
    const event = InternalErrorHelper.parseStreamError(
      "not json at all",
      "Failed to send message"
    );

    expect(event).toEqual({ message: "Failed to send message" });
  });

  it("parses a well-formed frame", () => {
    const event = InternalErrorHelper.parseStreamError(
      JSON.stringify({ code: "server_error", message: "Boom." }),
      "Failed to send message"
    );

    expect(event).toEqual({ code: "server_error", message: "Boom." });
  });

  it("handles a frame that is valid JSON but not an object", () => {
    const event = InternalErrorHelper.parseStreamError("null", "Fallback.");

    expect(event).toEqual({ message: "Fallback." });
  });
});

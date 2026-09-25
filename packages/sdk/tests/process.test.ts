import { describe, expect, it } from "vitest";
import { InternalErrorHelper } from "../src/utils/ErrorHelper";
import type {
  AgentExecutionFailedErrorBody,
  AIServiceExecutionFailedErrorBody,
  NotFoundErrorBody,
  RateLimitErrorBody,
} from "../src/types";
import { jsonResponse, rawResponse } from "./helpers";

describe("process — coded responses (change 1: 400 → 404 re-route)", () => {
  it("keeps the errors map on a 404, which names the actual missing resource", async () => {
    const body = await InternalErrorHelper.process(
      jsonResponse(404, {
        code: "resource_not_found",
        message: "The resource you're trying to see was not found (Code 0040)",
        errors: { agent_code_invalid: "Agent 'nope' does not exist." },
      }),
      "Failed to send message"
    );

    expect(body.statusCode).toBe(404);
    expect(body.code).toBe("resource_not_found");
    expect((body as NotFoundErrorBody).errors).toEqual({
      agent_code_invalid: "Agent 'nope' does not exist.",
    });
  });

  it.each([
    "agent_code_invalid",
    "agent_version_not_found",
    "conversation_not_found",
    "aimodel_not_found",
  ])("preserves the %s key", async (key) => {
    const body = await InternalErrorHelper.process(
      jsonResponse(404, {
        code: "resource_not_found",
        message: "Not found",
        errors: { [key]: "detail" },
      })
    );

    expect(body.errors).toEqual({ [key]: "detail" });
  });

  it("keeps message and code on an unspecified miss with no errors map", async () => {
    const body = await InternalErrorHelper.process(
      jsonResponse(404, {
        code: "resource_not_found",
        message: "Conversation 'abc' was not found.",
      })
    );

    expect(body).toEqual({
      message: "Conversation 'abc' was not found.",
      statusCode: 404,
      code: "resource_not_found",
    });
    expect("errors" in body).toBe(false);
  });
});

describe("process — agent_execution_failed", () => {
  // Mirrors the example in the API Error Responses reference.
  const attempts = [
    {
      index: 1,
      modelType: "main",
      code: "vendor_service_error",
      statusCode: 503,
      message: "The AI provider returned a server error (HTTP 503) (Code 0086)",
      errors: { vendor_error: "upstream 503" },
    },
    {
      index: 2,
      modelType: "fallback",
      code: "vendor_rate_limit_error",
      statusCode: 429,
      message: "The AI provider rejected the request due to rate limiting (HTTP 429) (Code 0085)",
      errors: { vendor_error: "upstream 429" },
    },
  ];

  it("keeps errors and attempts on the 502 (every attempt failed at the provider)", async () => {
    const body = (await InternalErrorHelper.process(
      jsonResponse(502, {
        code: "agent_execution_failed",
        message: "All retry attempts with the base and fallback model have failed.",
        errors: { vendor_error: "upstream 429" },
        attempts,
      })
    )) as AgentExecutionFailedErrorBody;

    expect(body.statusCode).toBe(502);
    expect(body.code).toBe("agent_execution_failed");
    expect(body.errors).toEqual({ vendor_error: "upstream 429" });
    expect(body.attempts).toEqual(attempts);
    expect("retryAfter" in body).toBe(false);
  });

  it.each([400, 500])("keeps attempts on the %i variant too", async (status) => {
    const body = (await InternalErrorHelper.process(
      jsonResponse(status, {
        code: "agent_execution_failed",
        message: "Failed.",
        attempts: [attempts[0]],
      })
    )) as AgentExecutionFailedErrorBody;

    expect(body.statusCode).toBe(status);
    expect(body.attempts).toHaveLength(1);
    expect(body.attempts?.[0].modelType).toBe("main");
  });

  it("reads Retry-After on the 429 variant (every attempt rate-limited)", async () => {
    const body = (await InternalErrorHelper.process(
      jsonResponse(
        429,
        {
          code: "agent_execution_failed",
          message: "Failed.",
          attempts: [attempts[1]],
        },
        { "Retry-After": "30" }
      )
    )) as AgentExecutionFailedErrorBody;

    expect(body.statusCode).toBe(429);
    expect(body.code).toBe("agent_execution_failed");
    expect(body.retryAfter).toBe(30);
    expect(body.attempts).toHaveLength(1);
  });

  it("keeps a single context-length attempt, which has no statusCode", async () => {
    const attempt = {
      index: 1,
      modelType: "main",
      code: "vendor_context_length_error",
      message: "The request exceeded the model's context window.",
      errors: { vendor_error: "maximum context length is 8192 tokens" },
    };

    const body = (await InternalErrorHelper.process(
      jsonResponse(400, {
        code: "agent_execution_failed",
        message: "Failed.",
        attempts: [attempt],
      })
    )) as AgentExecutionFailedErrorBody;

    expect(body.statusCode).toBe(400);
    expect(body.attempts).toEqual([attempt]);
  });

  it("normalizes snake_case attempt fields and fills a missing index 1-based", async () => {
    const body = (await InternalErrorHelper.process(
      jsonResponse(502, {
        code: "agent_execution_failed",
        message: "Failed.",
        attempts: [{ model_type: "fallback", status_code: 529 }],
      })
    )) as AgentExecutionFailedErrorBody;

    expect(body.attempts).toEqual([
      { index: 1, modelType: "fallback", statusCode: 529 },
    ]);
  });

  it("omits attempts entirely when the body has none", async () => {
    const body = await InternalErrorHelper.process(
      jsonResponse(502, { code: "agent_execution_failed", message: "Failed." })
    );

    expect("attempts" in body).toBe(false);
  });

  it("no longer treats the removed agent_run_failed code specially", async () => {
    const body = await InternalErrorHelper.process(
      jsonResponse(502, {
        code: "agent_run_failed",
        message: "Failed.",
        attempts: [attempts[0]],
      })
    );

    expect("attempts" in body).toBe(false);
  });
});

describe("process — aiservice_execution_failed", () => {
  const attempt = {
    index: 1,
    code: "vendor_service_error",
    statusCode: 503,
    message: "The AI provider returned a server error (HTTP 503) (Code 0086)",
    errors: { vendor_error: "upstream 503" },
  };

  it("keeps attempts, which carry no modelType", async () => {
    const body = (await InternalErrorHelper.process(
      jsonResponse(502, {
        code: "aiservice_execution_failed",
        message: "The audio couldn't be transcribed. Please try again.",
        errors: { vendor_error: "upstream 503" },
        attempts: [attempt],
      })
    )) as AIServiceExecutionFailedErrorBody;

    expect(body.code).toBe("aiservice_execution_failed");
    expect(body.statusCode).toBe(502);
    expect(body.attempts).toEqual([attempt]);
    expect("modelType" in body.attempts![0]).toBe(false);
  });

  it("reads Retry-After on the 429 variant", async () => {
    const body = (await InternalErrorHelper.process(
      jsonResponse(
        429,
        {
          code: "aiservice_execution_failed",
          message: "Failed.",
          attempts: [{ ...attempt, code: "vendor_rate_limit_error", statusCode: 429 }],
        },
        { "Retry-After": "45" }
      )
    )) as AIServiceExecutionFailedErrorBody;

    expect(body.retryAfter).toBe(45);
  });

  it("keeps a timeout attempt's synthetic 504 and a cancellation attempt", async () => {
    const body = (await InternalErrorHelper.process(
      jsonResponse(502, {
        code: "aiservice_execution_failed",
        message: "Failed.",
        attempts: [
          { index: 1, code: "vendor_timeout_error", statusCode: 504, message: "Timed out." },
          { index: 2, code: "vendor_cancellation_error", statusCode: 504, message: "Cancelled." },
        ],
      })
    )) as AIServiceExecutionFailedErrorBody;

    expect(body.attempts?.map((a) => [a.code, a.statusCode])).toEqual([
      ["vendor_timeout_error", 504],
      ["vendor_cancellation_error", 504],
    ]);
  });
});

describe("process — change 8: rate limiting", () => {
  it("prefers the localized body message over a hardcoded English one", async () => {
    const body = (await InternalErrorHelper.process(
      jsonResponse(
        429,
        {
          code: "rate_limit_exceeded",
          message: "Demasiadas solicitudes. Intente de nuevo más tarde.",
        },
        { "Retry-After": "30" }
      )
    )) as RateLimitErrorBody;

    expect(body.message).toBe("Demasiadas solicitudes. Intente de nuevo más tarde.");
    expect(body.retryAfter).toBe(30);
    expect(body.code).toBe("rate_limit_exceeded");
  });

  it("omits retryAfter when no Retry-After header was sent", async () => {
    const body = (await InternalErrorHelper.process(
      jsonResponse(429, { code: "rate_limit_exceeded", message: "Too many requests." })
    )) as RateLimitErrorBody;

    expect("retryAfter" in body).toBe(false);
  });

  it("omits retryAfter for an unparseable Retry-After header", async () => {
    const body = (await InternalErrorHelper.process(
      jsonResponse(
        429,
        { code: "rate_limit_exceeded", message: "Too many requests." },
        { "Retry-After": "Wed, 21 Oct 2026 07:28:00 GMT" }
      )
    )) as RateLimitErrorBody;

    expect("retryAfter" in body).toBe(false);
  });
});

describe("process — changes 3, 9, 10: validation and the remaining coded statuses", () => {
  it("reads the renamed message field on a request-validation error (was title)", async () => {
    const body = await InternalErrorHelper.process(
      jsonResponse(400, {
        code: "input_validation_error",
        message: "One or more validation errors occurred.",
        errors: { message: ["The message field is required."] },
      })
    );

    expect(body.message).toBe("One or more validation errors occurred.");
    expect(body.errors).toEqual({ message: ["The message field is required."] });
  });

  it("handles a business-validation failure that carries no errors map", async () => {
    const body = await InternalErrorHelper.process(
      jsonResponse(400, {
        code: "validation_error",
        message: "The conversation is closed.",
      })
    );

    expect(body).toEqual({
      message: "The conversation is closed.",
      statusCode: 400,
      code: "validation_error",
    });
  });

  it("keeps the tool_approval_pending key (still shipped per the API team)", async () => {
    const body = await InternalErrorHelper.process(
      jsonResponse(400, {
        code: "validation_error",
        message: "Validation failed.",
        errors: { tool_approval_pending: "Approve the pending tool call first." },
      })
    );

    expect(body.errors?.tool_approval_pending).toBe(
      "Approve the pending tool call first."
    );
  });

  it.each([
    [401, "unauthorized"],
    [403, "forbidden"],
    [405, "method_not_allowed"],
    [413, "request_too_large"],
    [415, "unsupported_media_type"],
    [500, "server_error"],
  ])("carries code through on a %i %s", async (status, code) => {
    const body = await InternalErrorHelper.process(
      jsonResponse(status, { code, message: "Nope." })
    );

    expect(body).toEqual({ message: "Nope.", statusCode: status, code });
  });

  it("carries documentationUrl through when present", async () => {
    const body = await InternalErrorHelper.process(
      jsonResponse(403, {
        code: "forbidden",
        message: "Forbidden.",
        documentationUrl: "https://docs.example.com/errors/forbidden",
      })
    );

    expect(body.documentationUrl).toBe(
      "https://docs.example.com/errors/forbidden"
    );
  });
});

describe("process — malformed and legacy responses", () => {
  it("keeps the real status when the body is not JSON", async () => {
    const body = await InternalErrorHelper.process(
      rawResponse(502, "<html><body>Bad Gateway</body></html>"),
      "Failed to send message"
    );

    expect(body.statusCode).toBe(502);
    expect(body.message).toBe("Failed to send message");
  });

  it("keeps the real status when the body is empty", async () => {
    const body = await InternalErrorHelper.process(rawResponse(404, ""));

    expect(body.statusCode).toBe(404);
    expect(body.message).toBe(
      "An error occurred while processing your request."
    );
  });

  it("does not throw when the caller already consumed the body", async () => {
    const response = jsonResponse(500, { message: "Boom." });
    await response.json();

    const body = await InternalErrorHelper.process(response, "Fallback.");

    expect(body.statusCode).toBe(500);
    expect(body.message).toBe("Fallback.");
  });

  it("falls back to status-based mapping on a legacy 400 with no code", async () => {
    const body = await InternalErrorHelper.process(
      jsonResponse(400, {
        message: "Validation failed.",
        errors: { agent_inactive: "The agent is inactive." },
      })
    );

    expect(body).toEqual({
      message: "Validation failed.",
      statusCode: 400,
      errors: { agent_inactive: "The agent is inactive." },
    });
  });

  it("defaults errors to an empty map on a legacy 400 without one", async () => {
    const body = await InternalErrorHelper.process(
      jsonResponse(400, { message: "Validation failed." })
    );

    expect(body.errors).toEqual({});
  });

  it("still maps a legacy 429, without fabricating retryAfter", async () => {
    const withHeader = (await InternalErrorHelper.process(
      jsonResponse(429, {}, { "Retry-After": "12" })
    )) as RateLimitErrorBody;
    const withoutHeader = (await InternalErrorHelper.process(
      jsonResponse(429, {})
    )) as RateLimitErrorBody;

    expect(withHeader.retryAfter).toBe(12);
    expect(withHeader.message).toBe("Rate limit exceeded");
    expect("retryAfter" in withoutHeader).toBe(false);
  });

  it("preserves errors on a legacy non-400 status instead of dropping them", async () => {
    const body = await InternalErrorHelper.process(
      jsonResponse(404, {
        message: "Not found.",
        errors: { conversation_not_found: "No such conversation." },
      })
    );

    expect(body.statusCode).toBe(404);
    expect(body.errors).toEqual({
      conversation_not_found: "No such conversation.",
    });
  });
});

describe("process — non-Response inputs", () => {
  it("maps an Error to a 500 carrying its message", async () => {
    const body = await InternalErrorHelper.process(new Error("Network down"));

    expect(body).toEqual({ message: "Network down", statusCode: 500 });
  });

  it("uses the fallback for an unknown thrown value", async () => {
    const body = await InternalErrorHelper.process("nope", "Failed to upload");

    expect(body).toEqual({ message: "Failed to upload", statusCode: 500 });
  });

  it("passes an already-normalized body straight through", async () => {
    const original = {
      message: "Agent not found.",
      statusCode: 404,
      code: "resource_not_found",
      errors: { agent_code_invalid: "Nope." },
    };

    const body = await InternalErrorHelper.process(
      original,
      "Failed to upload audio file or stream audio message"
    );

    expect(body).toEqual(original);
  });
});

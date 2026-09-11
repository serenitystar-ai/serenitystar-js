import { describe, expect, it } from "vitest";
import { InternalErrorHelper } from "../src/utils/ErrorHelper";
import type {
  AgentRunFailedErrorBody,
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

describe("process — change 2: vendor faults", () => {
  it("does not report a vendor 429 as a platform rate limit, and invents no retryAfter", async () => {
    const body = await InternalErrorHelper.process(
      jsonResponse(429, {
        code: "vendor_rate_limit_error",
        message: "The AI provider is rate limiting requests.",
      })
    );

    expect(body.statusCode).toBe(429);
    expect(body.code).toBe("vendor_rate_limit_error");
    expect("retryAfter" in body).toBe(false);
  });

  it.each([
    [502, "vendor_authentication_error"],
    [503, "vendor_service_error"],
    [504, "vendor_timeout_error"],
    [500, "vendor_error"],
  ])("carries code through on a %i %s", async (status, code) => {
    const body = await InternalErrorHelper.process(
      jsonResponse(status, { code, message: "Upstream failure." })
    );

    expect(body).toEqual({
      message: "Upstream failure.",
      statusCode: status,
      code,
    });
  });

  it("keeps the per-item breakdown a vendor fault can carry", async () => {
    const body = await InternalErrorHelper.process(
      jsonResponse(503, {
        code: "vendor_service_error",
        message: "OCR failed for some files.",
        errors: { "file1.pdf": "Timed out", "file2.pdf": "Unsupported" },
      })
    );

    expect(body.errors).toEqual({
      "file1.pdf": "Timed out",
      "file2.pdf": "Unsupported",
    });
  });

  it("treats vendor_validation_error as a client-fixable 400, not an upstream fault", async () => {
    const body = await InternalErrorHelper.process(
      jsonResponse(400, {
        code: "vendor_validation_error",
        message: "The request was rejected by the AI provider.",
        errors: { vendor_error: "This model's maximum context length is 8192 tokens." },
      })
    );

    expect(body.statusCode).toBe(400);
    expect(body.code).toBe("vendor_validation_error");
    expect(body.errors).toEqual({
      vendor_error: "This model's maximum context length is 8192 tokens.",
    });
    expect(InternalErrorHelper.isVendorFaultCode(body.code)).toBe(false);
  });
});

describe("process — change 4: agent_run_failed", () => {
  const attempts = [
    {
      index: 0,
      modelType: "main",
      code: "vendor_rate_limit_error",
      statusCode: 429,
      message: "Rate limited by the provider.",
    },
    {
      index: 1,
      modelType: "fallback",
      code: "vendor_service_error",
      statusCode: 503,
      message: "Provider unavailable.",
      errors: { vendor_error: "upstream 503" },
    },
  ];

  it("keeps errors and attempts on the 502 (all attempts failed upstream)", async () => {
    const body = (await InternalErrorHelper.process(
      jsonResponse(502, {
        code: "agent_run_failed",
        message: "The agent run failed.",
        errors: { vendor_error: "upstream 503" },
        attempts,
      })
    )) as AgentRunFailedErrorBody;

    expect(body.statusCode).toBe(502);
    expect(body.code).toBe("agent_run_failed");
    expect(body.errors).toEqual({ vendor_error: "upstream 503" });
    expect(body.attempts).toEqual(attempts);
  });

  it("keeps attempts on the 400 variant too", async () => {
    const body = (await InternalErrorHelper.process(
      jsonResponse(400, {
        code: "agent_run_failed",
        message: "The agent run failed.",
        attempts: [attempts[0]],
      })
    )) as AgentRunFailedErrorBody;

    expect(body.statusCode).toBe(400);
    expect(body.attempts).toHaveLength(1);
    expect(body.attempts?.[0].modelType).toBe("main");
  });

  it("normalizes snake_case attempt fields and fills a missing index", async () => {
    const body = (await InternalErrorHelper.process(
      jsonResponse(502, {
        code: "agent_run_failed",
        message: "The agent run failed.",
        attempts: [{ model_type: "fallback", status_code: 529 }],
      })
    )) as AgentRunFailedErrorBody;

    expect(body.attempts).toEqual([
      { index: 0, modelType: "fallback", statusCode: 529 },
    ]);
  });

  it("omits attempts entirely when the body has none", async () => {
    const body = await InternalErrorHelper.process(
      jsonResponse(502, { code: "agent_run_failed", message: "Failed." })
    );

    expect("attempts" in body).toBe(false);
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

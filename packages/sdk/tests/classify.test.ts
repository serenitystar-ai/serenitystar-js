import { describe, expect, it } from "vitest";
import { ExternalErrorHelper, InternalErrorHelper } from "../src/utils/ErrorHelper";
import { SerenityApiError } from "../src/errors";
import { VENDOR_FAULT_CODES } from "../src/types";

const classify = (error: unknown) =>
  ExternalErrorHelper.determineErrorType(error).type;

describe("determineErrorType — code first", () => {
  it("does not report an all-rate-limited execution as the API's own rate limit", () => {
    expect(
      classify({
        message: "Failed.",
        statusCode: 429,
        code: "agent_execution_failed",
        retryAfter: 30,
        attempts: [{ index: 1, code: "vendor_rate_limit_error", statusCode: 429 }],
      })
    ).toBe("AgentExecutionFailedError");
  });

  it("still reports the platform 429 as a rate limit", () => {
    expect(
      classify({
        message: "Too many requests.",
        statusCode: 429,
        code: "rate_limit_exceeded",
        retryAfter: 30,
      })
    ).toBe("RateLimitError");
  });

  it("classifies a 404 as NotFoundError", () => {
    expect(
      classify({
        message: "Not found.",
        statusCode: 404,
        code: "resource_not_found",
      })
    ).toBe("NotFoundError");
  });

  it.each([400, 429, 500, 502])(
    "classifies agent_execution_failed on a %i",
    (statusCode) => {
      expect(
        classify({ message: "Failed.", statusCode, code: "agent_execution_failed" })
      ).toBe("AgentExecutionFailedError");
    }
  );

  it.each([400, 429, 500, 502])(
    "classifies aiservice_execution_failed on a %i",
    (statusCode) => {
      expect(
        classify({ message: "Failed.", statusCode, code: "aiservice_execution_failed" })
      ).toBe("AIServiceExecutionFailedError");
    }
  );

  it.each(["validation_error", "input_validation_error"])(
    "classifies %s as a validation error even with no errors map",
    (code) => {
      expect(classify({ message: "Invalid.", statusCode: 400, code })).toBe(
        "ValidationError"
      );
    }
  );

  it.each(["unauthorized", "forbidden", "server_error", "request_too_large"])(
    "classifies %s as a base error",
    (code) => {
      expect(classify({ message: "Nope.", statusCode: 500, code })).toBe(
        "BaseError"
      );
    }
  );

  it("falls back to the shape checks for a code added server-side", () => {
    expect(
      classify({
        message: "Something new.",
        statusCode: 418,
        code: "brand_new_code",
        errors: { detail: "x" },
      })
    ).toBe("ValidationError");
  });
});

describe("determineErrorType — streamed errors have no statusCode", () => {
  it("classifies a streamed error by its code", () => {
    expect(classify({ message: "Failed.", code: "agent_execution_failed" })).toBe(
      "AgentExecutionFailedError"
    );
  });

  it("classifies a codeless streamed error as a base error, not unknown", () => {
    expect(classify({ message: "Failed." })).toBe("BaseError");
  });
});

describe("determineErrorType — legacy shapes still work", () => {
  it("detects a rate limit from retryAfter alone", () => {
    expect(classify({ message: "Slow down.", statusCode: 429, retryAfter: 60 })).toBe(
      "RateLimitError"
    );
  });

  it("detects a rate limit from the status when retryAfter is absent", () => {
    expect(classify({ message: "Slow down.", statusCode: 429 })).toBe(
      "RateLimitError"
    );
  });

  it("detects a validation error from the errors map", () => {
    expect(
      classify({ message: "Invalid.", statusCode: 400, errors: { a: "b" } })
    ).toBe("ValidationError");
  });

  it("detects a base error from message + statusCode", () => {
    expect(classify({ message: "Boom.", statusCode: 500 })).toBe("BaseError");
  });

  it.each([null, undefined, "string", 42, []])(
    "reports %s as unknown",
    (value) => {
      expect(classify(value)).toBe("UnknownError");
    }
  );

  it("returns the original value untouched", () => {
    const error = { message: "Boom.", statusCode: 500 };
    expect(ExternalErrorHelper.determineErrorType(error).error).toBe(error);
  });
});

describe("isVendorFault / isVendorFaultCode", () => {
  const failed = (code: string, attemptCodes: (string | undefined)[]) => ({
    message: "Failed.",
    statusCode: 502,
    code,
    attempts: attemptCodes.map((attemptCode, i) => ({ index: i + 1, code: attemptCode })),
  });

  it.each(VENDOR_FAULT_CODES)("isVendorFaultCode is true for %s", (code) => {
    expect(InternalErrorHelper.isVendorFaultCode(code)).toBe(true);
  });

  it.each(["vendor_validation_error", "vendor_context_length_error"])(
    "isVendorFaultCode is false for the client-fixable %s, despite the prefix",
    (code) => {
      expect(InternalErrorHelper.isVendorFaultCode(code)).toBe(false);
    }
  );

  it.each(["agent_execution_failed", "aiservice_execution_failed"])(
    "is true when every %s attempt is a provider fault",
    (code) => {
      expect(
        ExternalErrorHelper.isVendorFault(
          failed(code, ["vendor_service_error", "vendor_rate_limit_error"])
        )
      ).toBe(true);
    }
  );

  it("works on a streamed error, which has no statusCode", () => {
    expect(
      ExternalErrorHelper.isVendorFault({
        code: "aiservice_execution_failed",
        attempts: [{ index: 1, code: "vendor_timeout_error", status_code: 504 }],
      })
    ).toBe(true);
  });

  it.each([
    ["a client-fixable attempt", ["vendor_service_error", "vendor_validation_error"]],
    ["a context-length attempt", ["vendor_context_length_error"]],
    ["a server-side attempt", ["vendor_service_error", "server_error"]],
    ["an attempt with no code", ["vendor_service_error", undefined]],
    ["no attempts", []],
  ])("is false with %s", (_label, attemptCodes) => {
    expect(
      ExternalErrorHelper.isVendorFault(failed("agent_execution_failed", attemptCodes))
    ).toBe(false);
  });

  it.each([
    undefined,
    null,
    {},
    { code: "rate_limit_exceeded" },
    // A vendor code is never a top-level code any more.
    { code: "vendor_service_error" },
  ])("is false for %s", (value) => {
    expect(ExternalErrorHelper.isVendorFault(value)).toBe(false);
  });
});

describe("SerenityApiError", () => {
  const body = {
    message: "Agent not found.",
    statusCode: 404,
    code: "resource_not_found" as const,
    errors: { agent_code_invalid: "Agent 'nope' does not exist." },
  };

  it("is a real Error with a stack", () => {
    const error = SerenityApiError.from(body);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SerenityApiError);
    expect(error.name).toBe("SerenityApiError");
    expect(typeof error.stack).toBe("string");
  });

  it("spreads and serializes to the same shape as the plain body", () => {
    const error = SerenityApiError.from(body);

    expect({ ...error }).toEqual(body);
    expect(JSON.parse(JSON.stringify(error))).toEqual(body);
    expect(error.toJSON()).toEqual(body);
  });

  it("adds no undefined keys for fields the response omitted", () => {
    const error = SerenityApiError.from({ message: "Boom.", statusCode: 500 });

    expect(Object.keys(error).sort()).toEqual(["message", "statusCode"]);
  });

  it("carries attempts and retryAfter when present", () => {
    const error = SerenityApiError.from({
      message: "Too many requests.",
      statusCode: 429,
      code: "rate_limit_exceeded",
      retryAfter: 30,
    });

    expect(error.retryAfter).toBe(30);

    const failed = SerenityApiError.from({
      message: "Failed.",
      statusCode: 502,
      code: "agent_execution_failed",
      attempts: [{ index: 1, modelType: "main" as const }],
    });

    expect(failed.attempts).toEqual([{ index: 1, modelType: "main" }]);
  });

  it("returns an existing instance unchanged", () => {
    const error = SerenityApiError.from(body);
    expect(SerenityApiError.from(error)).toBe(error);
  });

  it("classifies exactly like the plain body it wraps", () => {
    expect(classify(SerenityApiError.from(body))).toBe("NotFoundError");
  });
});

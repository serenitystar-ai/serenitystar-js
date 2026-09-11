import { describe, expect, it } from "vitest";
import { ExternalErrorHelper, InternalErrorHelper } from "../src/utils/ErrorHelper";
import { SerenityApiError } from "../src/errors";
import { VENDOR_FAULT_CODES } from "../src/types";

const classify = (error: unknown) =>
  ExternalErrorHelper.determineErrorType(error).type;

describe("determineErrorType — code first", () => {
  it("no longer reports a vendor throttle as a platform rate limit", () => {
    expect(
      classify({
        message: "The AI provider is rate limiting requests.",
        statusCode: 429,
        code: "vendor_rate_limit_error",
      })
    ).toBe("VendorError");
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

  it.each(VENDOR_FAULT_CODES)("classifies %s as a vendor fault", (code) => {
    expect(classify({ message: "Upstream.", statusCode: 503, code })).toBe(
      "VendorError"
    );
  });

  it("classifies vendor_validation_error as a validation error, not a vendor fault", () => {
    expect(
      classify({
        message: "Rejected by the provider.",
        statusCode: 400,
        code: "vendor_validation_error",
        errors: { vendor_error: "context length exceeded" },
      })
    ).toBe("ValidationError");
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

  it("classifies agent_run_failed on both statuses it uses", () => {
    expect(
      classify({ message: "Failed.", statusCode: 400, code: "agent_run_failed" })
    ).toBe("AgentRunFailedError");
    expect(
      classify({ message: "Failed.", statusCode: 502, code: "agent_run_failed" })
    ).toBe("AgentRunFailedError");
  });

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
    expect(classify({ message: "Failed.", code: "agent_run_failed" })).toBe(
      "AgentRunFailedError"
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
  it.each(VENDOR_FAULT_CODES)("is true for %s", (code) => {
    expect(ExternalErrorHelper.isVendorFault({ code })).toBe(true);
    expect(InternalErrorHelper.isVendorFaultCode(code)).toBe(true);
  });

  it("is false for vendor_validation_error, despite the prefix", () => {
    expect(
      ExternalErrorHelper.isVendorFault({ code: "vendor_validation_error" })
    ).toBe(false);
    expect(InternalErrorHelper.isVendorFaultCode("vendor_validation_error")).toBe(
      false
    );
  });

  it.each([undefined, null, {}, { code: "rate_limit_exceeded" }])(
    "is false for %s",
    (value) => {
      expect(ExternalErrorHelper.isVendorFault(value)).toBe(false);
    }
  );
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
      code: "agent_run_failed",
      attempts: [{ index: 0, modelType: "main" as const }],
    });

    expect(failed.attempts).toEqual([{ index: 0, modelType: "main" }]);
  });

  it("returns an existing instance unchanged", () => {
    const error = SerenityApiError.from(body);
    expect(SerenityApiError.from(error)).toBe(error);
  });

  it("classifies exactly like the plain body it wraps", () => {
    expect(classify(SerenityApiError.from(body))).toBe("NotFoundError");
  });
});

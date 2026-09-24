import { describe, expect, it } from "vitest";
import { InternalErrorHelper } from "../src/utils/ErrorHelper";
import { fileNamed } from "./helpers";

const file = fileNamed("report.pdf");

describe("processFile — change 3: the errors key is camelCase now", () => {
  it("reads the camelCase `file` key", () => {
    const message = InternalErrorHelper.processFile(400, file, {
      code: "input_validation_error",
      message: "One or more validation errors occurred.",
      errors: { file: ["The file exceeds the maximum size."] },
    });

    expect(message).toBe("report.pdf: The file exceeds the maximum size.");
  });

  it("still reads the PascalCase `File` key an older API sends", () => {
    const message = InternalErrorHelper.processFile(400, file, {
      message: "One or more validation errors occurred.",
      errors: { File: ["The file exceeds the maximum size."] },
    });

    expect(message).toBe("report.pdf: The file exceeds the maximum size.");
  });

  it("joins multiple entries for the file field", () => {
    const message = InternalErrorHelper.processFile(400, file, {
      code: "input_validation_error",
      message: "Invalid.",
      errors: { file: ["Too large.", "Wrong type."] },
    });

    expect(message).toBe("report.pdf: Too large., Wrong type.");
  });
});

describe("processFile — change 9: a body with no errors map", () => {
  it("uses the top-level message instead of throwing", () => {
    const message = InternalErrorHelper.processFile(400, file, {
      code: "validation_error",
      message: "This file type is not supported by the agent.",
    });

    expect(message).toBe(
      "report.pdf: This file type is not supported by the agent."
    );
  });

  it("uses the top-level message when errors is an empty map", () => {
    const message = InternalErrorHelper.processFile(400, file, {
      code: "validation_error",
      message: "This file type is not supported by the agent.",
      errors: {},
    });

    expect(message).toBe(
      "report.pdf: This file type is not supported by the agent."
    );
  });

  it("never produces a blank message", () => {
    expect(InternalErrorHelper.processFile(500, file, {})).toBe(
      "report.pdf: An unknown error occurred while uploading the file."
    );
    expect(InternalErrorHelper.processFile(500, file, null)).toBe(
      "report.pdf: An unknown error occurred while uploading the file."
    );
    // Whitespace-only entries are not a message: the upload fallback wins.
    expect(
      InternalErrorHelper.processFile(400, file, { errors: { file: ["  "] } })
    ).toBe("report.pdf: An unknown error occurred while uploading the file.");
  });

  it("falls back to a caller-supplied locale message", () => {
    const message = InternalErrorHelper.processFile(
      500,
      file,
      null,
      "No pudimos subir el archivo."
    );

    expect(message).toBe("report.pdf: No pudimos subir el archivo.");
  });
});

describe("processFile — changes 1, 2, 10: statuses with no dedicated branch", () => {
  it.each([
    [404, "resource_not_found", "The agent was not found."],
    [429, "rate_limit_exceeded", "Too many requests."],
    [500, "server_error", "An unexpected error occurred."],
  ])("surfaces the real message on a %i %s", (status, code, message) => {
    expect(
      InternalErrorHelper.processFile(status, file, { code, message })
    ).toBe(`report.pdf: ${message}`);
  });

  it("surfaces a 401 message", () => {
    expect(
      InternalErrorHelper.processFile(401, file, {
        code: "unauthorized",
        message: "The API key is invalid.",
      })
    ).toBe("report.pdf: The API key is invalid.");
  });

  it("surfaces a 413 message", () => {
    expect(
      InternalErrorHelper.processFile(413, file, {
        code: "request_too_large",
        message: "The request is too large.",
      })
    ).toBe("report.pdf: The request is too large.");
  });

  it("uses a thrown Error's own message for a local failure", () => {
    expect(
      InternalErrorHelper.processFile(500, file, new Error("Network down"))
    ).toBe("report.pdf: Network down");
  });
});

describe("processFileError — the full envelope, not just a string", () => {
  it("keeps code, status and errors alongside the prefixed message", () => {
    const body = InternalErrorHelper.processFileError(413, file, {
      code: "request_too_large",
      message: "The request is too large.",
    });

    expect(body).toEqual({
      message: "report.pdf: The request is too large.",
      statusCode: 413,
      code: "request_too_large",
    });
  });

  it("keeps a 404's errors map so the caller can branch on the reason", () => {
    const body = InternalErrorHelper.processFileError(404, file, {
      code: "resource_not_found",
      message: "Not found.",
      errors: { agent_code_invalid: "Agent 'nope' does not exist." },
    });

    expect(body.code).toBe("resource_not_found");
    expect(body.errors).toEqual({
      agent_code_invalid: "Agent 'nope' does not exist.",
    });
    expect(body.message).toBe("report.pdf: Agent 'nope' does not exist.");
  });
});

describe("processFileError — aiservice_execution_failed (embeddings on upload)", () => {
  const body = {
    code: "aiservice_execution_failed",
    message: "The embeddings couldn't be generated. Please try again.",
    errors: { vendor_error: "raw provider detail: upstream 503" },
    attempts: [
      {
        index: 1,
        code: "vendor_service_error",
        statusCode: 503,
        message: "The AI provider returned a server error (HTTP 503) (Code 0086)",
        errors: { vendor_error: "raw provider detail: upstream 503" },
      },
    ],
  };

  it("uses the localized message, not the raw provider detail in errors", () => {
    expect(InternalErrorHelper.processFile(502, file, body)).toBe(
      "report.pdf: The embeddings couldn't be generated. Please try again."
    );
  });

  it("keeps attempts and reads Retry-After when the caller passes it", () => {
    const result = InternalErrorHelper.processFileError(
      429,
      file,
      body,
      undefined,
      "20"
    ) as { attempts?: unknown[]; retryAfter?: number };

    expect(result.attempts).toHaveLength(1);
    expect(result.retryAfter).toBe(20);
  });
});

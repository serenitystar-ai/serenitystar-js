import { VENDOR_FAULT_CODES } from "../types";
import type {
  AgentExecutionFailedErrorBody,
  AIServiceExecutionFailedErrorBody,
  BaseErrorBody,
  ErrorDetails,
  ExecutionAttempt,
  NotFoundErrorBody,
  RateLimitErrorBody,
  SerenityErrorBody,
  SerenityErrorCode,
  StreamErrorEvent,
  StreamExecutionAttempt,
  ValidationErrorBody,
  VendorFaultCode,
} from "../types";
import { AgentMapper } from "./AgentMapper";

const GENERIC_ERROR_MESSAGE = "An error occurred while processing your request.";
const GENERIC_FILE_ERROR_MESSAGE =
  "An unknown error occurred while uploading the file.";

type RawBody = { [key: string]: any };

/** Input for {@link InternalErrorHelper.normalize}. */
type NormalizeInput = {
  statusCode: number;
  /** The parsed response body, or `null` when it was empty or not JSON. */
  body: unknown;
  /** Raw `Retry-After` header value, when the caller has access to the headers. */
  retryAfterHeader?: string | null;
  fallbackErrorMessage?: string;
};

const isRecord = (value: unknown): value is RawBody =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

/** The codes whose body lists every provider attempt under `attempts`. */
const EXECUTION_FAILED_CODES: readonly string[] = [
  "agent_execution_failed",
  "aiservice_execution_failed",
];

const isExecutionFailedCode = (
  code: unknown
): code is "agent_execution_failed" | "aiservice_execution_failed" =>
  typeof code === "string" && EXECUTION_FAILED_CODES.includes(code);

export class InternalErrorHelper {
  /**
   * Normalize any thrown value into the SDK's error envelope.
   *
   * Accepts a `Response` (the usual case), an `Error`, an already-normalized error body
   * (so a re-`process()` in an outer `catch` does not flatten it), or anything else.
   */
  static async process(
    error: unknown,
    fallbackErrorMessage?: string
  ): Promise<SerenityErrorBody> {
    if (error instanceof Response) {
      // Read the body defensively: a parse failure must never overwrite the real status.
      const body = await this.#readBody(error);

      return this.normalize({
        statusCode: error.status,
        body,
        retryAfterHeader: error.headers?.get("Retry-After") ?? null,
        fallbackErrorMessage,
      });
    }

    // Already normalized upstream (e.g. an inner `FileManager.upload` that threw an error
    // body). Passing it through keeps `code` / `errors` / `statusCode` instead of
    // collapsing the whole thing to a generic 500.
    if (this.#isErrorBody(error)) {
      return error;
    }

    if (error instanceof Error) {
      return {
        message: error.message || fallbackErrorMessage || GENERIC_ERROR_MESSAGE,
        statusCode: 500,
      };
    }

    return {
      message: fallbackErrorMessage || "An unknown error occurred.",
      statusCode: 500,
    };
  }

  /**
   * Parse a response body, or `null` when there is nothing usable there — an empty body, a
   * non-JSON body (an HTML error page from a proxy), or a body a caller already consumed.
   *
   * Never throws, so the real status always survives. Callers must therefore hand the
   * response over **before** reading it themselves.
   */
  static async #readBody(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Map a status + parsed body onto the matching error-body type.
   *
   * Discriminates on `code` first and status second: a 429 is either the API's own rate
   * limit or an execution whose every attempt was rate-limited by the provider, and a 404
   * carries its specific reason in `errors`. When `code` is absent the legacy status-based
   * mapping applies, so the SDK still behaves correctly against an API instance that has
   * not been upgraded.
   */
  static normalize(input: NormalizeInput): SerenityErrorBody {
    const { statusCode, fallbackErrorMessage } = input;
    const raw = isRecord(input.body) ? input.body : null;

    const code = isNonEmptyString(raw?.code)
      ? (raw!.code as SerenityErrorCode)
      : undefined;
    const errors = isRecord(raw?.errors) ? (raw!.errors as ErrorDetails) : undefined;
    const documentationUrl = isNonEmptyString(raw?.documentationUrl)
      ? (raw!.documentationUrl as string)
      : undefined;

    const base: BaseErrorBody = {
      message: isNonEmptyString(raw?.message)
        ? (raw!.message as string)
        : fallbackErrorMessage || GENERIC_ERROR_MESSAGE,
      statusCode,
    };
    if (code !== undefined) base.code = code;
    if (documentationUrl !== undefined) base.documentationUrl = documentationUrl;
    if (errors !== undefined) base.errors = errors;

    if (code === undefined) {
      return this.#normalizeLegacy(base, input);
    }

    if (code === "rate_limit_exceeded") {
      const retryAfter = this.#parseRetryAfter(input.retryAfterHeader);
      const rateLimit: RateLimitErrorBody = { ...base, code: "rate_limit_exceeded" };
      // Only set `retryAfter` when the header actually said so — a fabricated value is
      // worse than none, because callers sleep on it.
      if (retryAfter !== undefined) rateLimit.retryAfter = retryAfter;
      return rateLimit;
    }

    if (code === "resource_not_found") {
      return { ...base, code } as NotFoundErrorBody;
    }

    if (isExecutionFailedCode(code)) {
      const failed = { ...base, code } as
        | AgentExecutionFailedErrorBody
        | AIServiceExecutionFailedErrorBody;
      const attempts = this.#normalizeAttempts(raw?.attempts);
      if (attempts !== undefined) failed.attempts = attempts;
      // The 429 variant (every attempt rate-limited by the provider) carries `Retry-After`.
      const retryAfter = this.#parseRetryAfter(input.retryAfterHeader);
      if (retryAfter !== undefined) failed.retryAfter = retryAfter;
      return failed;
    }

    // `validation_error`, `input_validation_error`, `unauthorized`, `forbidden`,
    // `request_too_large`, `method_not_allowed`, `unsupported_media_type`, `server_error`
    // and any code added server-side all keep the envelope as-is: `ValidationErrorBody`
    // when a breakdown came with it, else the base.
    return base;
  }

  /**
   * Pre-`code` API shapes. Mirrors the mapping the SDK has always applied, with two
   * corrections that hold either way: `errors` is preserved on every status, and
   * `retryAfter` is only set when `Retry-After` was actually sent.
   */
  static #normalizeLegacy(
    base: BaseErrorBody,
    input: NormalizeInput
  ): SerenityErrorBody {
    const raw = isRecord(input.body) ? input.body : null;

    switch (input.statusCode) {
      case 400: {
        const validation: ValidationErrorBody = {
          ...base,
          message: isNonEmptyString(raw?.message)
            ? (raw!.message as string)
            : input.fallbackErrorMessage || "Validation error",
          errors: base.errors ?? {},
        };
        return validation;
      }
      case 429: {
        const retryAfter = this.#parseRetryAfter(input.retryAfterHeader);
        const rateLimit: RateLimitErrorBody = {
          ...base,
          message: isNonEmptyString(raw?.message)
            ? (raw!.message as string)
            : "Rate limit exceeded",
        } as RateLimitErrorBody;
        if (retryAfter !== undefined) rateLimit.retryAfter = retryAfter;
        return rateLimit;
      }
      default:
        return base;
    }
  }

  /** `Retry-After` in seconds. Returns `undefined` for a missing or unparseable header. */
  static #parseRetryAfter(header?: string | null): number | undefined {
    if (!isNonEmptyString(header)) return undefined;
    const seconds = Number.parseInt(header, 10);
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
  }

  /**
   * Per-attempt detail of a failed execution. Accepts either casing so the same mapper
   * works on the buffered body and on anything a future server sends.
   */
  static #normalizeAttempts(raw: unknown): ExecutionAttempt[] | undefined {
    if (!Array.isArray(raw)) return undefined;

    return raw.filter(isRecord).map((entry, position) => {
      // `index` is 1-based on the wire; fill a missing one to match.
      const attempt: ExecutionAttempt = {
        index: typeof entry.index === "number" ? entry.index : position + 1,
      };

      // AI service attempts have no main/fallback distinction and omit it.
      const modelType = entry.modelType ?? entry.model_type;
      const statusCode = entry.statusCode ?? entry.status_code;
      if (isNonEmptyString(modelType)) {
        attempt.modelType = modelType as "main" | "fallback";
      }
      if (isNonEmptyString(entry.code)) attempt.code = entry.code;
      if (typeof statusCode === "number") attempt.statusCode = statusCode;
      if (isNonEmptyString(entry.message)) attempt.message = entry.message;
      if (isRecord(entry.errors)) attempt.errors = entry.errors as ErrorDetails;

      return attempt;
    });
  }

  /**
   * Normalize an in-band SSE `error` frame.
   *
   * A streamed run that fails still completes with HTTP 200, so there is no status to
   * report — the frame keeps its wire-native snake_case extras and gains nothing invented.
   * Both the emitted `error` event and the rejected promise use this value, so a streamed
   * and a buffered failure expose the same `code` / `message` / `errors`.
   */
  static processStreamError(
    frame: unknown,
    fallbackErrorMessage?: string
  ): StreamErrorEvent {
    const raw = isRecord(frame) ? frame : null;

    // Spread first so nothing the server sent is dropped, then normalize what we know.
    const event: StreamErrorEvent = { ...(raw ?? {}) } as StreamErrorEvent;

    if (!isNonEmptyString(event.message) && fallbackErrorMessage) {
      event.message = fallbackErrorMessage;
    }
    if (!isNonEmptyString(raw?.code)) delete event.code;
    if (!isRecord(raw?.errors)) delete event.errors;
    // Serialized as `null` when there is no deep link; omit it like the other null fields.
    if (!isNonEmptyString(raw?.documentation_url)) delete event.documentation_url;

    const retryAfter = raw?.retry_after_seconds;
    if (!(typeof retryAfter === "number" && Number.isFinite(retryAfter) && retryAfter >= 0)) {
      delete event.retry_after_seconds;
    }

    if (Array.isArray(raw?.attempts)) {
      event.attempts = raw!.attempts
        .filter(isRecord)
        .map((entry: RawBody) => {
          const attempt: StreamExecutionAttempt = {};
          const modelType = entry.model_type ?? entry.modelType;
          const statusCode = entry.status_code ?? entry.statusCode;

          if (typeof entry.index === "number") attempt.index = entry.index;
          if (isNonEmptyString(modelType)) {
            attempt.model_type = modelType as "main" | "fallback";
          }
          if (typeof statusCode === "number") attempt.status_code = statusCode;
          if (isNonEmptyString(entry.code)) attempt.code = entry.code;
          if (isNonEmptyString(entry.message)) attempt.message = entry.message;
          if (isRecord(entry.errors)) attempt.errors = entry.errors as ErrorDetails;

          return attempt;
        });
    } else {
      delete event.attempts;
    }

    // Same normalization the non-error path applies, so `pending_actions` reads the same
    // whether the run succeeded or failed.
    const pendingActions = AgentMapper.mapPendingActions(
      raw?.pending_actions ?? raw?.pendingActions
    );
    if (pendingActions !== undefined) {
      event.pending_actions = pendingActions;
    } else {
      delete event.pending_actions;
    }

    return event;
  }

  /**
   * Parse and normalize a raw SSE `error` frame. A malformed frame still yields a usable
   * event rather than throwing inside the stream listener.
   */
  static parseStreamError(
    data: string,
    fallbackErrorMessage?: string
  ): StreamErrorEvent {
    let frame: unknown = null;
    try {
      frame = JSON.parse(data);
    } catch {
      // Unparseable frame: fall through with `null` so the fallback message applies.
    }
    return this.processStreamError(frame, fallbackErrorMessage);
  }

  /**
   * Build the user-facing message for a failed file upload.
   *
   * @param statusCode - HTTP status of the upload response.
   * @param file - The file that failed, prefixed onto the message.
   * @param responseBody - The parsed response body, or `null`/`{}` when there was none.
   * @param fallbackErrorMessage - Used when the response carried no message at all.
   */
  static processFile = (
    statusCode: number,
    file: File,
    responseBody: unknown,
    fallbackErrorMessage?: string
  ): string => {
    return InternalErrorHelper.processFileError(
      statusCode,
      file,
      responseBody,
      fallbackErrorMessage
    ).message;
  };

  /**
   * The full normalized envelope for a failed upload, with `message` set to the same
   * file-prefixed string {@link processFile} returns. Lets the upload paths surface `code`
   * and `errors` alongside the human-readable message.
   *
   * @param retryAfterHeader - Raw `Retry-After` header, so a rate-limited upload still
   * reports `retryAfter`.
   */
  static processFileError = (
    statusCode: number,
    file: File,
    responseBody: unknown,
    fallbackErrorMessage?: string,
    retryAfterHeader?: string | null
  ): SerenityErrorBody => {
    const body = InternalErrorHelper.normalize({
      statusCode,
      body: responseBody,
      retryAfterHeader,
      fallbackErrorMessage: fallbackErrorMessage || GENERIC_FILE_ERROR_MESSAGE,
    });

    return {
      ...body,
      message: `${file.name}: ${InternalErrorHelper.#describeFileError(body)}`,
    };
  };

  /**
   * Prefer the field-level breakdown, which names the actual problem with the file, and
   * fall back to the top-level message. Every status is covered: a 404 / 429 / 5xx upload
   * failure used to be replaced with a generic string.
   */
  static #describeFileError = (body: SerenityErrorBody): string => {
    // An execution failure's `errors` mirrors the last attempt: raw provider detail under
    // `vendor_error`, not something to show a user. Its localized `message` is the summary;
    // the per-attempt detail stays readable on `attempts`.
    if (isExecutionFailedCode(body.code)) {
      return body.message;
    }

    const errors = body.errors;
    if (!isRecord(errors) || Object.keys(errors).length === 0) {
      // No breakdown — the reason is in `message`. Never join an empty map: that is how a
      // business-validation failure turns into a blank error.
      return body.message;
    }

    // The request-validation key is camelCase (`file`) on the current API and PascalCase
    // (`File`) on older ones.
    const fileErrors = errors["file"] ?? errors["File"];
    if (fileErrors !== undefined) {
      const joined = Array.isArray(fileErrors)
        ? fileErrors.join(", ")
        : fileErrors;
      if (isNonEmptyString(joined)) return joined;
    }

    const joined = Object.values(errors).flat().filter(isNonEmptyString).join(", ");
    return isNonEmptyString(joined) ? joined : body.message;
  };

  /**
   * True for the upstream-provider fault codes an attempt can carry. Never a `"vendor_"`
   * prefix match.
   */
  static isVendorFaultCode(
    code: string | undefined
  ): code is VendorFaultCode {
    return (
      code !== undefined &&
      (VENDOR_FAULT_CODES as readonly string[]).includes(code)
    );
  }

  static #isErrorBody(value: unknown): value is SerenityErrorBody {
    return (
      isRecord(value) &&
      typeof value.message === "string" &&
      typeof value.statusCode === "number"
    );
  }
}

/** The classification {@link ExternalErrorHelper.determineErrorType} returns. */
export type SerenityErrorType =
  | "RateLimitError"
  | "ValidationError"
  | "NotFoundError"
  | "AgentExecutionFailedError"
  | "AIServiceExecutionFailedError"
  | "BaseError"
  | "UnknownError";

export class ExternalErrorHelper {
  /**
   * Classify a thrown value.
   *
   * @remarks
   * Discriminates on `code` first, shape second, so an execution whose attempts were all
   * rate-limited by the provider (a 429 `agent_execution_failed`) is not reported as the
   * API's own rate limit, and a streamed error — which has no `statusCode` — is not
   * `"UnknownError"`. The shape-based path is kept for pre-`code` API responses.
   *
   * Provider failures never arrive as a top-level code: they are attempts inside an
   * execution failure. Use {@link isVendorFault} to ask whether one is worth retrying.
   */
  static determineErrorType(error: unknown): {
    type: SerenityErrorType;
    error: SerenityErrorBody | unknown;
  } {
    if (typeof error !== "object" || error === null) {
      return { type: "UnknownError", error };
    }

    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") {
      switch (code) {
        case "rate_limit_exceeded":
          return { type: "RateLimitError", error };
        case "resource_not_found":
          return { type: "NotFoundError", error };
        case "agent_execution_failed":
          return { type: "AgentExecutionFailedError", error };
        case "aiservice_execution_failed":
          return { type: "AIServiceExecutionFailedError", error };
        case "validation_error":
        case "input_validation_error":
          return { type: "ValidationError", error };
        // An unrecognised code (added server-side) falls through to the shape checks.
      }
    }

    if (this.isRateLimitErrorBody(error)) {
      return { type: "RateLimitError", error };
    }

    if (this.isValidationErrorBody(error)) {
      return { type: "ValidationError", error };
    }

    if (this.isBaseErrorBody(error)) {
      return { type: "BaseError", error };
    }

    // Streamed errors carry no `statusCode` — the transport already reported 200.
    if (typeof (error as { message?: unknown }).message === "string") {
      return { type: "BaseError", error };
    }

    return { type: "UnknownError", error };
  }

  /**
   * True when an execution failed purely at the upstream AI provider and is worth retrying
   * or escalating: an `agent_execution_failed` / `aiservice_execution_failed` whose every
   * attempt is a provider fault (the 429 / 502 cases). False when any attempt was
   * client-fixable (`vendor_validation_error`, `vendor_context_length_error`) or a
   * server-side fault. Works on buffered and streamed errors alike.
   */
  static isVendorFault(error: unknown): boolean {
    if (!isRecord(error) || !isExecutionFailedCode(error.code)) return false;

    const attempts = error.attempts;
    if (!Array.isArray(attempts) || attempts.length === 0) return false;

    return attempts.every(
      (attempt) =>
        isRecord(attempt) &&
        InternalErrorHelper.isVendorFaultCode(
          typeof attempt.code === "string" ? attempt.code : undefined
        )
    );
  }

  private static isRateLimitErrorBody(
    error: unknown
  ): error is RateLimitErrorBody {
    if (typeof error !== "object" || error === null) return false;
    if (!("message" in error) || !("statusCode" in error)) return false;

    // `retryAfter` is now omitted when the server sent no `Retry-After`, so the status has
    // to count as well.
    return (
      typeof (error as any).retryAfter === "number" ||
      (error as any).statusCode === 429
    );
  }

  private static isValidationErrorBody(
    error: unknown
  ): error is ValidationErrorBody {
    return (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      "statusCode" in error &&
      "errors" in error &&
      typeof (error as any).errors === "object" &&
      (error as any).errors !== null
    );
  }

  private static isBaseErrorBody(error: unknown): error is BaseErrorBody {
    return (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      "statusCode" in error &&
      typeof (error as any).message === "string" &&
      typeof (error as any).statusCode === "number"
    );
  }
}

import type {
  ErrorDetails,
  ExecutionAttempt,
  SerenityErrorBody,
  SerenityErrorCode,
} from "./types";

/**
 * A real `Error` carrying the full normalized API error envelope.
 *
 * @remarks
 * For backwards compatibility the SDK still **rejects with plain objects** ({@link
 * SerenityErrorBody}) from the agent-execution and conversation methods, so existing
 * `catch (e) { e.statusCode }` code keeps working. Use `SerenityApiError.from(body)` in a
 * `catch` block when you need an `instanceof Error` — for a stack trace, or for an
 * error-reporting tool that ignores non-`Error` values. The file-upload paths
 * (`volatileKnowledge.*`, `FileError.error`) already hand you one of these.
 *
 * Every envelope field is an **own enumerable** property, `message` included, so
 * `{ ...error }` and `JSON.stringify(error)` produce the same shape as the plain object.
 */
export class SerenityApiError extends Error {
  statusCode: number;
  /** Stable discriminator. Branch on this, not on `message`. */
  code?: SerenityErrorCode;
  documentationUrl?: string;
  errors?: ErrorDetails;
  /** Present on `agent_execution_failed` and `aiservice_execution_failed`. */
  attempts?: ExecutionAttempt[];
  /** Seconds, from `Retry-After`. Only set when the header was present. */
  retryAfter?: number;

  constructor(body: SerenityErrorBody & { attempts?: ExecutionAttempt[] }) {
    super(body.message);
    Object.setPrototypeOf(this, SerenityApiError.prototype);

    // `Error.prototype.message` is non-enumerable, which would drop it from `{ ...error }`
    // and `JSON.stringify`; `name` assigned normally would *add* a key the plain body never
    // had. Define both explicitly so a spread reproduces the error body exactly.
    Object.defineProperty(this, "message", {
      value: body.message,
      enumerable: true,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(this, "name", {
      value: "SerenityApiError",
      enumerable: false,
      writable: true,
      configurable: true,
    });

    this.statusCode = body.statusCode;
    // Only assign what the response actually carried: an `undefined` own property would
    // show up in a spread and in `Object.keys`.
    if (body.code !== undefined) this.code = body.code;
    if (body.documentationUrl !== undefined) {
      this.documentationUrl = body.documentationUrl;
    }
    if (body.errors !== undefined) this.errors = body.errors;
    if (body.attempts !== undefined) this.attempts = body.attempts;
    const retryAfter = (body as { retryAfter?: number }).retryAfter;
    if (retryAfter !== undefined) this.retryAfter = retryAfter;
  }

  /**
   * Wrap a normalized error body in a `SerenityApiError`. Returns the value unchanged if it
   * already is one.
   */
  static from(
    body: SerenityErrorBody | SerenityApiError
  ): SerenityApiError {
    return body instanceof SerenityApiError ? body : new SerenityApiError(body);
  }

  /** The plain error-body shape, for logging and serialization. */
  toJSON(): SerenityErrorBody & { attempts?: ExecutionAttempt[] } {
    return { ...this } as SerenityErrorBody & { attempts?: ExecutionAttempt[] };
  }
}

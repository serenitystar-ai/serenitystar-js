import type { GenieTextareaProps } from "../types";

/**
 * The fields this widget reads off any Serenity failure.
 *
 * @remarks
 * Deliberately structural: the SDK rejects with a normalized error body for buffered calls,
 * with an in-band frame (no `statusCode`) for streamed ones, and a consumer-supplied
 * `handleRequestCompletion` may throw a raw `Response`. All three are handled.
 */
type SerenityErrorLike = {
  message?: string;
  statusCode?: number;
  code?: string;
  errors?: { [key: string]: string | string[] };
};

/**
 * Quota and balance failures are the account's problem, not the user's — show the generic
 * message rather than the server's wording.
 */
const QUOTA_ERROR_KEYS = [
  "insufficient_balance",
  "monthly_quota_exceeded",
  "model_quota_exceeded",
  "organization_quota_exceeded",
  "user_quota_exceeded",
  "excluded_bonified_execution_insufficient_balance",
];

const isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export class ErrorHelper {
  static async extractErrorMessage(
    error: unknown,
    locale: GenieTextareaProps["locale"]
  ): Promise<string> {
    const fallback =
      locale?.completionErrorMessage ||
      "An error occurred while processing your request.";

    const body = await this.#toErrorBody(error);
    if (!body) return fallback;

    const errors = body.errors;
    if (isRecord(errors) && Object.keys(errors).length > 0) {
      if (Object.keys(errors).some((key) => QUOTA_ERROR_KEYS.includes(key))) {
        return fallback;
      }

      // Never join blindly: an empty or absent map used to produce a blank message, which
      // read as "something went wrong and we won't say what".
      const joined = Object.values(errors)
        .flat()
        .filter(isNonEmptyString)
        .join("\n\n")
        .trim();
      if (joined) return joined;
    }

    // Business-rule failures may carry no breakdown at all — the reason is in `message`.
    return isNonEmptyString(body.message) ? body.message : fallback;
  }

  /** Coerce whatever was thrown into the fields above, or `null` when there is nothing. */
  static async #toErrorBody(error: unknown): Promise<SerenityErrorLike | null> {
    if (error instanceof Response) {
      const body = await error.json().catch(() => null);
      return {
        statusCode: error.status,
        ...(isRecord(body) ? body : {}),
      };
    }

    // Covers both the normalized error body and the streamed error frame. `Error`
    // instances match too: `message` is readable even though it is not enumerable.
    if (isRecord(error) || error instanceof Error) {
      return error as SerenityErrorLike;
    }

    return null;
  }
}

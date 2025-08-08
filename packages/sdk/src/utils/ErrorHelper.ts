import {
  BaseErrorBody,
  RateLimitErrorBody,
  ValidationErrorBody,
} from "../types";

export class InternalErrorHelper {
  static async process(
    error: unknown,
    fallbackErrorMessage?: string
  ): Promise<BaseErrorBody | ValidationErrorBody | RateLimitErrorBody> {
    try {
      if (error instanceof Response) {
        switch (error.status) {
          case 400: {
            const errorBody = await error.json();
            return {
              message: errorBody.message || "Validation error",
              statusCode: 400,
              errors: errorBody.errors || {},
            } as ValidationErrorBody;
          }
          case 429: {
            const retryAfter = parseInt(
              error.headers.get("Retry-After") || "60"
            );
            return {
              message: "Rate limit exceeded",
              statusCode: 429,
              retryAfter,
            } as RateLimitErrorBody;
          }
          default: {
            const errorBody = await error.json();
            return {
              message:
                errorBody.message ||
                fallbackErrorMessage ||
                "An error occurred while processing your request.",
              statusCode: error.status,
            } as BaseErrorBody;
          }
        }
      }

      if (error instanceof Error) {
        return {
          message:
            error.message ||
            fallbackErrorMessage ||
            "An error occurred while processing your request.",
          statusCode: 500,
        } as BaseErrorBody;
      }

      return {
        message: fallbackErrorMessage || "An unknown error occurred.",
        statusCode: 500,
      } as BaseErrorBody;
    } catch (error) {
      return {
        message:
          fallbackErrorMessage ||
          "An error occurred while processing your request.",
        statusCode: 500,
      } as BaseErrorBody;
    }
  }
}

export class ExternalErrorHelper {
  static determineErrorType(error: unknown): {
    type: "RateLimitError" | "ValidationError" | "BaseError" | "UnknownError";
    error: RateLimitErrorBody | ValidationErrorBody | BaseErrorBody | unknown;
  } {
    if (this.isRateLimitErrorBody(error)) {
      return { type: "RateLimitError", error };
    }

    if (this.isValidationErrorBody(error)) {
      return { type: "ValidationError", error };
    }

    if (this.isBaseErrorBody(error)) {
      return { type: "BaseError", error };
    }

    return { type: "UnknownError", error };
  }

  private static isRateLimitErrorBody(
    error: unknown
  ): error is RateLimitErrorBody {
    return (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      "statusCode" in error &&
      "retryAfter" in error &&
      typeof (error as any).retryAfter === "number"
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
// dividir helper en dos. internal y external.
// exportar el external para que pueda ser usado en el chat widget

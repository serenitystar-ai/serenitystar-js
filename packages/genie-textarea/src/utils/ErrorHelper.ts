import type { GenieTextareaProps } from "../types";

type ValidationErrorBody = {
  errors: { [key: string]: string };
  message: string;
  statusCode: number;
};

type ErrorBody = {
  message: string;
  statusCode: number;
};

export class ErrorHelper {
  static async extractErrorMessage(
    error: unknown,
    locale: GenieTextareaProps["locale"]
  ): Promise<string> {
    // check if error is a response
    if (error instanceof Response) {
      // check 400 status code
      if (error.status === 400) {
        const validationError: ValidationErrorBody = await error.json();
        return this.extractValidationErrors(validationError, locale);
      }
    }
    return (
      locale?.completionErrorMessage ||
      "An error occurred while processing your request."
    );
  }

  private static extractValidationErrors(
    error: ValidationErrorBody,
    locale: GenieTextareaProps["locale"]
  ): string {
    // Check for specific quota or balance error keys
    const quotaErrorKeys = [
      "insufficient_balance",
      "monthly_quota_exceeded",
      "model_quota_exceeded",
      "organization_quota_exceeded",
    ];

    // If any of the specific error keys are present, return the generic message
    if (
      error.errors &&
      Object.keys(error.errors).some((key) => quotaErrorKeys.includes(key)) &&
      locale
    ) {
      return locale.completionErrorMessage!;
    }

    // Otherwise, process errors
    let errorMessage = "";
    for (const key in error.errors) {
      if (error.errors.hasOwnProperty(key)) {
        errorMessage += `${error.errors[key]}\n\n`;
      }
    }
    return errorMessage.trim();
  }
}

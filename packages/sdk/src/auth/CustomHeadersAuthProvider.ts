import { AuthProvider, AuthRequestContext } from "./AuthProvider";
import { CustomHeaders } from "../types";

/** Names the SDK sets itself. A custom value would silently break auth or body parsing. */
const SDK_HEADERS = ["x-api-key", "authorization", "content-type"];

/** Names `fetch` refuses to send, so a custom value would be dropped without a trace. */
const FORBIDDEN_HEADERS = [
  "accept-charset",
  "accept-encoding",
  "access-control-request-headers",
  "access-control-request-method",
  "connection",
  "content-length",
  "cookie",
  "cookie2",
  "date",
  "dnt",
  "expect",
  "host",
  "keep-alive",
  "origin",
  "referer",
  "set-cookie",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "via",
  "x-http-method",
  "x-http-method-override",
  "x-method-override",
];

const FORBIDDEN_PREFIXES = ["proxy-", "sec-"];

/** RFC 9110 `token`. */
const HEADER_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

/** CR, LF or NUL would let a value split into a second header. */
const UNSAFE_VALUE = /[\r\n\0]/;

/**
 * Throws when a custom header map contains a name the SDK owns, a name browsers forbid, an
 * invalid name, or a value that is not a single-line string.
 */
export function validateCustomHeaders(headers: Record<string, string>): void {
  if (typeof headers !== "object" || headers === null || Array.isArray(headers)) {
    throw new TypeError("Custom headers must be an object of header names to string values.");
  }

  for (const [name, value] of Object.entries(headers)) {
    if (!HEADER_NAME.test(name)) {
      throw new TypeError(`Invalid custom header name: "${name}".`);
    }

    const lowerName = name.toLowerCase();
    if (SDK_HEADERS.includes(lowerName)) {
      throw new TypeError(`The "${name}" header is set by the SDK and can't be overridden.`);
    }
    if (
      FORBIDDEN_HEADERS.includes(lowerName) ||
      FORBIDDEN_PREFIXES.some((prefix) => lowerName.startsWith(prefix))
    ) {
      throw new TypeError(`The "${name}" header can't be set from a browser request.`);
    }

    if (typeof value !== "string") {
      throw new TypeError(`The value of the "${name}" header must be a string.`);
    }
    if (UNSAFE_VALUE.test(value)) {
      throw new TypeError(`The value of the "${name}" header can't contain line breaks.`);
    }
  }
}

/**
 * Adds caller-supplied headers to every HTTP request the wrapped provider authenticates.
 * The SDK's own auth headers are merged last, so a custom header can never replace them.
 * WebSocket connections (realtime sessions) can't carry headers and don't receive them.
 */
export class CustomHeadersAuthProvider implements AuthProvider {
  constructor(
    private readonly inner: AuthProvider,
    private readonly headers: CustomHeaders
  ) {
    if (typeof headers !== "function") {
      validateCustomHeaders(headers);
    }
  }

  async getHeaders(request?: AuthRequestContext): Promise<Record<string, string>> {
    const custom = await this.resolveCustomHeaders(request);
    const authHeaders = await this.inner.getHeaders(request);
    return { ...custom, ...authHeaders };
  }

  getWebSocketProtocols(): Promise<string[]> {
    return this.inner.getWebSocketProtocols();
  }

  handleUnauthorized(response: Response): Promise<boolean> {
    return this.inner.handleUnauthorized(response);
  }

  private async resolveCustomHeaders(
    request?: AuthRequestContext
  ): Promise<Record<string, string>> {
    if (typeof this.headers !== "function") {
      return this.headers;
    }

    // Without a request there is no URL to scope a per-request header to, so none is sent.
    if (!request) return {};

    const headers = (await this.headers(request)) ?? {};
    validateCustomHeaders(headers);
    return headers;
  }
}

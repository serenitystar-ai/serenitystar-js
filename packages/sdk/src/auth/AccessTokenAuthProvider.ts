import { AuthProvider } from "./AuthProvider";
import { AccessToken, AccessTokenContext } from "../types";

const isToken = (token: unknown): token is string =>
  typeof token === "string" && token.length > 0;

/**
 * Sends a caller-issued bearer token. A function is called on every request and holds no
 * cache here, so an expired token is never reused; the caller caches and refreshes it.
 */
export class AccessTokenAuthProvider implements AuthProvider {
  constructor(private readonly accessToken: AccessToken) {
    if (typeof accessToken !== "function" && !isToken(accessToken)) {
      throw new TypeError(
        "accessToken must be a non-empty string or a function that returns one."
      );
    }
  }

  async getHeaders(): Promise<Record<string, string>> {
    const token = await this.resolve({ forceRefresh: false });
    return { Authorization: `Bearer ${token}` };
  }

  async getWebSocketProtocols(): Promise<string[]> {
    throw new Error(
      "Access token auth does not support WebSocket connections (RealtimeSession). " +
        "Use API Key auth for realtime features."
    );
  }

  async handleUnauthorized(): Promise<boolean> {
    if (typeof this.accessToken !== "function") return false;
    try {
      await this.resolve({ forceRefresh: true });
      return true;
    } catch {
      return false;
    }
  }

  private async resolve(context: AccessTokenContext): Promise<string> {
    if (typeof this.accessToken !== "function") return this.accessToken;

    const token = await this.accessToken(context);
    if (!isToken(token)) {
      throw new TypeError("The accessToken function must return a non-empty string.");
    }
    return token;
  }
}

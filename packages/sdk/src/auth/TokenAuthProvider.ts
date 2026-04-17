import { AuthProvider } from "./AuthProvider";
import { TokenProviderFn } from "../types";

export class TokenAuthProvider implements AuthProvider {
  private accessToken: string | null = null;
  private tokenPromise: Promise<string> | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly publicKey: string,
    private readonly tokenProvider: TokenProviderFn,
    private readonly baseUrl: string,
    private readonly agentCode: string
  ) {}

  async getHeaders(): Promise<Record<string, string>> {
    const token = await this.ensureToken();
    return { Authorization: `Bearer ${token}` };
  }

  async getWebSocketProtocols(): Promise<string[]> {
    throw new Error(
      "Token Provider auth does not support WebSocket connections (RealtimeSession). " +
        "Use API Key auth for realtime features."
    );
  }

  async handleUnauthorized(): Promise<boolean> {
    this.accessToken = null;
    try {
      await this.ensureToken();
      return true;
    } catch {
      return false;
    }
  }

  private async ensureToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;
    if (this.tokenPromise) return this.tokenPromise;

    this.tokenPromise = this.acquireToken();
    try {
      this.accessToken = await this.tokenPromise;
      this.scheduleRefresh();
      return this.accessToken;
    } finally {
      this.tokenPromise = null;
    }
  }

  private async acquireToken(): Promise<string> {
    const clientToken = await this.tokenProvider({
      context: {
        publicKey: this.publicKey,
        baseUrl: this.baseUrl,
        agentCode: this.agentCode,
      },
    });

    const response = await fetch(
      `${this.baseUrl}/v2/Agent/${encodeURIComponent(this.agentCode)}/ClientCredential/Token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey: this.publicKey,
          token: clientToken,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    const { accessToken } = await response.json();
    return accessToken;
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    // Refresh every 14 minutes (tokens typically expire at 15 min)
    this.refreshTimer = setInterval(() => {
      this.accessToken = null;
      this.ensureToken().catch(() => {});
    }, 14 * 60 * 1000);
  }

  destroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

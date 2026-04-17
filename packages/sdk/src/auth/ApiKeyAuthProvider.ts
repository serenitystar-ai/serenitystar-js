import { AuthProvider } from "./AuthProvider";

export class ApiKeyAuthProvider implements AuthProvider {
  constructor(private readonly apiKey: string) {}

  async getHeaders(): Promise<Record<string, string>> {
    return { "X-API-KEY": this.apiKey };
  }

  async getWebSocketProtocols(): Promise<string[]> {
    return ["X-API-KEY", this.apiKey];
  }

  async handleUnauthorized(): Promise<boolean> {
    return false; // Static keys can't be refreshed
  }
}

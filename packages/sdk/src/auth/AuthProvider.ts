/** The request an {@link AuthProvider} is asked to authenticate. */
export type AuthRequestContext = {
  /** Absolute URL of the request. */
  url: string;
  /** HTTP method, upper case. */
  method: string;
};

export interface AuthProvider {
  /** Returns the headers to attach to HTTP requests */
  getHeaders(request?: AuthRequestContext): Promise<Record<string, string>>;

  /** Returns the WebSocket sub-protocols for authentication */
  getWebSocketProtocols(): Promise<string[]>;

  /**
   * Handles a 401 Unauthorized response.
   * Returns true if the token was refreshed and the request should be retried.
   */
  handleUnauthorized(response: Response): Promise<boolean>;
}

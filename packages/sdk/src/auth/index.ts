import { AuthProvider } from "./AuthProvider";
import { ApiKeyAuthProvider } from "./ApiKeyAuthProvider";
import { TokenAuthProvider } from "./TokenAuthProvider";
import { CustomHeadersAuthProvider } from "./CustomHeadersAuthProvider";
import { SerenityClientOptions } from "../types";

export type { AuthProvider, AuthRequestContext } from "./AuthProvider";
export { ApiKeyAuthProvider } from "./ApiKeyAuthProvider";
export { TokenAuthProvider } from "./TokenAuthProvider";
export { CustomHeadersAuthProvider } from "./CustomHeadersAuthProvider";

const DEFAULT_BASE_URL = "https://api.serenitystar.ai/api";

export function createAuthProvider(
  options: SerenityClientOptions
): AuthProvider {
  const provider = createCredentialsProvider(options);
  return options.headers
    ? new CustomHeadersAuthProvider(provider, options.headers)
    : provider;
}

function createCredentialsProvider(options: SerenityClientOptions): AuthProvider {
  if ("apiKey" in options && options.apiKey) {
    return new ApiKeyAuthProvider(options.apiKey);
  }
  const credentials = options.agentClientCredentials!;
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  return new TokenAuthProvider(
    credentials.publicKey,
    credentials.tokenProvider,
    baseUrl,
    credentials.agentCode
  );
}

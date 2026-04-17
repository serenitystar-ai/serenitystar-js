import { AuthProvider } from "../auth/AuthProvider";

export async function fetchWithAuth(
  authProvider: AuthProvider,
  url: string,
  options: RequestInit
): Promise<Response> {
  const authHeaders = await authProvider.getHeaders();
  const response = await fetch(url, {
    ...options,
    headers: { ...options.headers, ...authHeaders },
  });

  if (response.status === 401) {
    const retried = await authProvider.handleUnauthorized(response);
    if (retried) {
      const newHeaders = await authProvider.getHeaders();
      return fetch(url, {
        ...options,
        headers: { ...options.headers, ...newHeaders },
      });
    }
  }

  return response;
}

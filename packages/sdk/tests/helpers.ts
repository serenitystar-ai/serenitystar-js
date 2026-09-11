/**
 * Fixtures mirroring the exact response bodies from the *API Error Responses* reference, so
 * a wire-shape change shows up here as a failing test rather than as silent data loss.
 */
export const jsonResponse = (
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

export const rawResponse = (
  status: number,
  body: string,
  headers: Record<string, string> = {}
): Response => new Response(body, { status, headers });

export const fileNamed = (name: string): File =>
  new File(["content"], name, { type: "application/pdf" });

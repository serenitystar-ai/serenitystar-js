/** An SSE frame as the server writes it. */
export const frame = (event: string, data: unknown): string =>
  `event: ${event}\ndata: ${typeof data === "string" ? data : JSON.stringify(data)}\n\n`;

export const stopFrame = (result: Record<string, unknown> = {}): string =>
  frame("stop", { result: { content: "", instance_id: "instance-1", ...result } });

type StreamControl = {
  /** Resolves with the `fetch` implementation to stub in. */
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
  push: (chunk: string) => void;
  close: () => void;
  /** The init of every call, in order. */
  calls: Array<{ url: string; init?: RequestInit }>;
};

/**
 * A `fetch` answering with an event stream the test writes to. The stream errors with an
 * `AbortError` when the request's signal aborts, as a real network body does.
 */
export function controllableStream(
  contentType = "text/event-stream"
): StreamControl {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const encoder = new TextEncoder();
  const calls: StreamControl["calls"] = [];

  return {
    calls,
    push: (chunk) => controller.enqueue(encoder.encode(chunk)),
    close: () => controller.close(),
    fetch: async (url, init) => {
      calls.push({ url, init });
      if (init?.signal?.aborted) {
        throw new DOMException("The operation was aborted.", "AbortError");
      }

      const body = new ReadableStream<Uint8Array>({
        start(c) {
          controller = c;
        },
      });
      init?.signal?.addEventListener("abort", () => {
        try {
          controller.error(new DOMException("The operation was aborted.", "AbortError"));
        } catch {
          // Already closed.
        }
      });

      return new Response(body, { status: 200, headers: { "Content-Type": contentType } });
    },
  };
}

/** A `fetch` answering every call with a whole event stream at once. */
export const streamOf =
  (chunks: string[], contentType = "text/event-stream") =>
  async (): Promise<Response> =>
    new Response(chunks.join(""), { status: 200, headers: { "Content-Type": contentType } });

/** Lets pending promise callbacks run. */
export const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

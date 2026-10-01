/**
 * Interface representing the event object with optional event and data properties.
 */
interface Event {
  event?: string;
  data?: string;
}

/**
 * Type for the event listeners.
 */
type ConnectionEventListener = (data: string) => void;

/**
 * How a stream ended: on a `stop` or `error` frame (`completed`), through {@link SseConnection.abort}
 * (`aborted`), or because the server closed it without either frame (`closed`).
 */
export type SseConnectionOutcome = "completed" | "aborted" | "closed";

const TERMINAL_EVENTS = ["stop", "error"];

/**
 * Class representing a server-sent events (SSE) connection.
 */
export class SseConnection {
  private eventListeners: Record<string, ConnectionEventListener[]> = {};
  private active = false;
  private aborted = false;
  private terminated = false;
  private buffer: string = "";
  private abortController: AbortController | null = null;

  /**
   * Connects to the SSE server and listens for events until the stream ends.
   * @param url - The URL to connect to for SSE.
   * @param fetchOptions - Additional fetch options.
   * @returns How the stream ended.
   * @throws The `Response` when the request fails or doesn't answer with an event stream, or the
   * error of a transport failure.
   */
  async start(
    url: string,
    fetchOptions: RequestInit
  ): Promise<SseConnectionOutcome> {
    if (this.aborted) return "aborted";

    this.active = true;
    this.abortController = new AbortController();

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: this.abortController.signal,
      });

      if (!response.ok || !SseConnection.isEventStream(response)) {
        throw response;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder("utf-8");
      this.buffer = "";

      while (this.active) {
        const { done, value } = await reader.read();
        if (done) {
          this.buffer += decoder.decode();
          this.processEvents(true);
          break;
        }

        this.buffer += decoder.decode(value, { stream: true });
        this.processEvents(false);
      }

      if (this.terminated) return "completed";
      return this.aborted ? "aborted" : "closed";
    } catch (error) {
      if (this.aborted && !this.terminated) return "aborted";
      throw error;
    } finally {
      this.stop();
    }
  }

  /** `; charset=utf-8` and other parameters are allowed after the media type. */
  private static isEventStream(response: Response): boolean {
    const contentType = response.headers.get("Content-Type") ?? "";
    return contentType.split(";")[0].trim().toLowerCase() === "text/event-stream";
  }

  /**
   * Processes the event data from the buffer.
   * @param flush - True once the stream has ended, so a last event without its trailing blank
   * line is still delivered.
   */
  private processEvents(flush: boolean): void {
    const lineEnding = this.buffer.includes("\r\n") ? "\r\n" : "\n";
    const eventDelimiter = lineEnding + lineEnding;

    let eventEnd: number;
    while (this.active && (eventEnd = this.buffer.indexOf(eventDelimiter)) !== -1) {
      const eventText = this.buffer.slice(0, eventEnd);
      this.buffer = this.buffer.slice(eventEnd + eventDelimiter.length);
      this.dispatch(eventText, lineEnding);
    }

    if (flush && this.active && this.buffer.trim()) {
      const eventText = this.buffer;
      this.buffer = "";
      this.dispatch(eventText, lineEnding);
    }
  }

  private dispatch(eventText: string, lineEnding: string): void {
    const event: Event = {};
    const dataLines: string[] = [];

    for (const line of eventText.trim().split(lineEnding)) {
      if (line.startsWith("data:")) {
        dataLines.push(SseConnection.fieldValue(line, "data:"));
      } else if (line.startsWith("event:")) {
        event.event = SseConnection.fieldValue(line, "event:").trim();
      }
    }

    if (dataLines.length > 0) {
      event.data = dataLines.join("\n");
    }

    this.trigger(event.event || "message", event.data!);
  }

  /** The SSE spec strips a single space after the colon, and nothing else. */
  private static fieldValue(line: string, field: string): string {
    const value = line.slice(field.length);
    return value.startsWith(" ") ? value.slice(1) : value;
  }

  /**
   * Registers an event listener for a specific event type.
   * @param eventType - The type of event to listen for.
   * @param callback - The callback function to execute when the event occurs.
   */
  on(eventType: string, callback: ConnectionEventListener): void {
    if (!this.eventListeners[eventType]) {
      this.eventListeners[eventType] = [];
    }
    this.eventListeners[eventType].push(callback);
  }

  /**
   * Unregisters an event listener for a specific event type.
   * @param eventType - The type of event to stop listening for.
   * @param callback - The callback function to remove.
   */
  off(eventType: string, callback: ConnectionEventListener): void {
    const listeners = this.eventListeners[eventType];
    if (listeners) {
      this.eventListeners[eventType] = listeners.filter(
        (cb) => cb !== callback
      );
    }
  }

  /**
   * Triggers an event and calls all registered listeners for that event type. Nothing is
   * delivered after a `stop` or `error` frame, so a stream settles exactly once.
   * @param eventType - The type of event to trigger.
   * @param data - The data to pass to the event listeners.
   */
  private trigger(eventType: string, data: string): void {
    if (this.terminated) return;

    const isTerminal = TERMINAL_EVENTS.includes(eventType);
    if (isTerminal) {
      this.terminated = true;
    }

    try {
      this.eventListeners[eventType]?.forEach((callback) => callback(data));
    } finally {
      if (isTerminal) this.stop();
    }
  }

  /**
   * Cancels the stream on the caller's request, even before {@link start} is called.
   * {@link start} then resolves with `aborted` instead of throwing the abort error.
   */
  abort(): void {
    if (this.terminated) return;
    this.aborted = true;
    this.stop();
  }

  /**
   * Stops the SSE connection.
   */
  stop(): void {
    this.active = false;
    // Abort the fetch request if it's still active
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

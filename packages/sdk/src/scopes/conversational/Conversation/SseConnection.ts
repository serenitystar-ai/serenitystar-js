/**
 * Interface representing the structure of event data.
 */
interface SseEventData {
  start_time_utc?: string;
  stop_time_utc?: string;
  message?: string;
}

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
 * Class representing a server-sent events (SSE) connection.
 */
export class SseConnection {
  private eventListeners: Record<string, ConnectionEventListener[]>;
  private active: boolean;
  private buffer: string = "";

  /**
   * Creates an instance of SseConnection.
   * @param options - Options for the SSE connection.
   */
  constructor() {
    this.eventListeners = {
      start: [
        (_: string) => {
        },
      ],
      stop: [
        (_: string) => {
          this.stop();
        },
      ],
      error: [
        (_: string) => {
          this.stop();
        },
      ],
    };
    this.active = false;
  }

  /**
   * Connects to the SSE server and listens for events.
   * @param url - The URL to connect to for SSE.
   * @param fetchOptions - Additional fetch options.
   * @returns A promise that resolves with the response when the connection is active.
   * @throws Will throw an error if the response is not an event stream.
   */
  async start(
    url: string,
    fetchOptions: RequestInit
  ): Promise<Response> {
    this.active = true;
    try {
      const response = await fetch(url, fetchOptions);
      const contentType = response.headers.get("Content-Type");

      if (contentType !== "text/event-stream") {
        return response;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder("utf-8");
      this.buffer = "";

      while (this.active) {
        const { done, value } = await reader.read();
        if (done) break;

        this.buffer += decoder.decode(value, { stream: true });
        this.processEvents();
      }

      return response;
    } catch (error) {
      console.error("Error in SSE connection:", error);
      this.active = false;
      throw error;
    }
  }

  /**
   * Processes the event data from the buffer.
   */
  private processEvents(): void {
    let eventEnd: number;
    const lineEnding = this.buffer.includes('\r\n') ? '\r\n' : '\n';
    const eventDelimiter = lineEnding + lineEnding;
    while ((eventEnd = this.buffer.indexOf(eventDelimiter)) !== -1) {
      const eventText = this.buffer.slice(0, eventEnd).trim();
      this.buffer = this.buffer.slice(eventEnd + eventDelimiter.length);

      const lines = eventText.split(lineEnding);
      const event: Event = {};
      for (let line of lines) {
        if (line.startsWith("data:")) {
          event.data = line.slice("data:".length).trim();
        } else if (line.startsWith("event:")) {
          event.event = line.slice("event:".length).trim();
        }
      }

      this.trigger(event.event || "message", event.data!);
    }
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
   * Triggers an event and calls all registered listeners for that event type.
   * @param eventType - The type of event to trigger.
   * @param data - The data to pass to the event listeners.
   */
  private trigger(eventType: string, data: string): void {
    const listeners = this.eventListeners[eventType];
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  /**
   * Stops the SSE connection.
   */
  stop(): void {
    this.active = false;
  }
}

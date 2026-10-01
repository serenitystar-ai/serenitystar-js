import { StreamStartEvent } from "../../../types";

/** The `start` frame is informational: a malformed one yields an empty payload. */
export function parseStreamStart(data: string | undefined): StreamStartEvent {
  if (!data) return {};
  try {
    const frame = JSON.parse(data);
    return typeof frame === "object" && frame !== null ? (frame as StreamStartEvent) : {};
  } catch {
    return {};
  }
}

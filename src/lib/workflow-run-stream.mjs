// Server-sent events client for GET /api/v1/workflow-runs/:id/events. The
// stream carries full run snapshots (event "snapshot", id = run revision);
// callers fall back to polling when it is unavailable.

// Parses complete SSE blocks from buffer; returns the parsed messages and
// the unconsumed remainder.
export function parseWorkflowRunEvents(buffer) {
  const messages = [];
  let rest = buffer.replace(/\r\n/g, "\n");
  for (;;) {
    const boundary = rest.indexOf("\n\n");
    if (boundary < 0) break;
    const block = rest.slice(0, boundary);
    rest = rest.slice(boundary + 2);
    let event = "message";
    let id;
    const data = [];
    for (const line of block.split("\n")) {
      if (line.startsWith(":")) continue;
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("id:")) id = line.slice(3).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    if (data.length > 0) messages.push({ event, id, data: data.join("\n") });
  }
  return { messages, remainder: rest };
}

const TERMINAL_STATUSES = new Set(["success", "failed", "canceled"]);

// Streams snapshots to onSnapshot until the server closes the stream after a
// terminal snapshot. Resolves {ok: true} only then (or when the caller
// aborted); an error event, an unusable stream or an early close resolves
// {ok: false} so the caller polls instead.
export async function streamWorkflowRun({ apiBaseUrl, runId, token, signal, onSnapshot, fetchImpl = fetch }) {
  let response;
  try {
    response = await fetchImpl(`${apiBaseUrl}/api/v1/workflow-runs/${encodeURIComponent(runId)}/events`, {
      headers: { Accept: "text/event-stream", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal,
    });
  } catch {
    return { ok: false };
  }
  if (!response.ok || !response.body) return { ok: false };
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let terminal = false;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseWorkflowRunEvents(buffer);
      buffer = parsed.remainder;
      for (const message of parsed.messages) {
        if (message.event === "error") {
          await reader.cancel().catch(() => {});
          return { ok: false };
        }
        if (message.event !== "snapshot") continue;
        let snapshot;
        try {
          snapshot = JSON.parse(message.data);
        } catch {
          await reader.cancel().catch(() => {});
          return { ok: false };
        }
        onSnapshot(snapshot);
        terminal = TERMINAL_STATUSES.has(snapshot?.status);
      }
    }
  } catch {
    return { ok: Boolean(signal?.aborted) };
  }
  return { ok: terminal || Boolean(signal?.aborted) };
}

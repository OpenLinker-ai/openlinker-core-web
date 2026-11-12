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

// Streams snapshots to onSnapshot until the server closes the stream (after
// a terminal snapshot). Resolves {ok: true} on a normal end and {ok: false}
// when the stream could not be used, so the caller can poll instead.
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
  let received = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseWorkflowRunEvents(buffer);
      buffer = parsed.remainder;
      for (const message of parsed.messages) {
        if (message.event !== "snapshot") continue;
        try {
          onSnapshot(JSON.parse(message.data));
          received += 1;
        } catch {
          return { ok: false };
        }
      }
    }
  } catch {
    return { ok: signal?.aborted ? true : false };
  }
  return { ok: received > 0 };
}

// Wait on the authorized Run API rather than inferring completion from an
// individual attempt event. Terminal events and the rendered Run can arrive at
// different times, and the event connection can be interrupted independently.
export async function watchRunStatus({
  runId,
  status,
  fetchRun,
  onChange,
  signal,
  pause = abortablePause,
}) {
  while (!signal.aborted) {
    const startedAt = Date.now();
    try {
      const run = await fetchRun(`/api/v1/runs/${encodeURIComponent(runId)}`, {
        headers: { Prefer: "wait=20" },
        signal,
      });
      if (signal.aborted) return;
      if (run.status !== status) {
        onChange();
        return;
      }
      // A server without Prefer support must not cause a busy request loop.
      await pause(Math.max(0, 1000 - (Date.now() - startedAt)), signal);
    } catch (error) {
      if (signal.aborted || [401, 403, 404].includes(error?.status)) return;
      try {
        await pause(2000, signal);
      } catch {
        return;
      }
    }
  }
}

function abortablePause(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    function abort() {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reject(signal.reason);
    }
    signal.addEventListener("abort", abort, { once: true });
  });
}

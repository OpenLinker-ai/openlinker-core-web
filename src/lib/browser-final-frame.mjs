/**
 * Reading the frame a Browser round ended on.
 *
 * Three rules live here rather than in a component, because all three are about
 * when an answer may be believed:
 *
 *   1. Core writes the retention when the observation closes, and that close can
 *      trail the Run's terminal state a viewer sees. Until it settles, Core
 *      answers 425, and this retries -- a first "no picture" must never become a
 *      permanent conclusion.
 *   2. Only a settled answer is remembered. An unsettled or failed read stays
 *      retriable, so a later mount asks again instead of inheriting a verdict
 *      that was never reached.
 *   3. One read per Run at a time. Several views can ask at once -- a collapsed
 *      stage's reader and an open panel -- and they share one request and one
 *      answer instead of racing.
 */

// Bounded retry schedule for the unsettled answer, in milliseconds. The ordinary
// case settles in one round trip; this budget also covers a Worker that never
// reported its close, after which the honest answer is "still not settled"
// rather than "no picture".
export const browserFinalFrameRetryDelaysMS = [500, 1_000, 2_000, 3_000, 4_000, 5_000, 5_000];

// How many settled answers are remembered. Small on purpose: this exists so a
// remount does not re-ask, not as a store of page content.
export const browserFinalFrameMemoryLimit = 16;

// What may be remembered. Deliberately not "none": an empty answer is settled for
// the observation Core looked at, but a caller that asked about a Run which had
// not finished yet would otherwise keep that emptiness after the round produced a
// picture. Re-asking is one cheap request; a wrong memory is permanent.
const SETTLED = new Set(["snapshot", "unreachable"]);

export function createBrowserFinalFrameStore({
  delays = browserFinalFrameRetryDelaysMS,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  limit = browserFinalFrameMemoryLimit,
} = {}) {
  const settled = new Map();
  const inFlight = new Map();

  const remember = (runId, answer) => {
    if (!SETTLED.has(answer.kind)) return answer;
    settled.set(runId, answer);
    while (settled.size > limit) {
      const oldest = settled.keys().next();
      if (oldest.done) break;
      settled.delete(oldest.value);
    }
    return answer;
  };

  const readOnce = async (runId, request, perform) => {
    try {
      const answer = await perform({ operation: "final-frame", runId, request });
      // 204 arrives as an empty body: the observation closed and retained
      // nothing, which for a Run whose Agent never used the browser is the
      // ordinary answer rather than a failure.
      if (answer && answer.final === true && answer.frame) {
        return { kind: "snapshot", frame: answer.frame, retainedUntil: answer.retained_until ?? "" };
      }
      return { kind: "none" };
    } catch (cause) {
      return { kind: "failed", cause };
    }
  };

  return {
    /**
     * Read one Run's final snapshot. `classify` turns a thrown failure into the
     * transport's kind, so this module never inspects HTTP status itself.
     */
    read(runId, { request, perform, classify }) {
      if (typeof runId !== "string" || !runId.trim()) {
        return Promise.resolve({ kind: "failed" });
      }
      const known = settled.get(runId);
      if (known) return Promise.resolve(known);
      const running = inFlight.get(runId);
      if (running) return running;

      const attempt = (async () => {
        for (let index = 0; ; index += 1) {
          const answer = await readOnce(runId, request, perform);
          if (answer.kind !== "failed") return remember(runId, answer);
          const kind = classify(answer.cause);
          if (kind !== "unsettled") {
            return remember(runId, { kind: kind === "unreachable" ? "unreachable" : "failed" });
          }
          if (index >= delays.length) {
            // Out of budget while Core still has not settled. Not remembered:
            // the close may complete later, and the next mount must ask again.
            return { kind: "unsettled" };
          }
          await sleep(delays[index]);
        }
      })().finally(() => {
        inFlight.delete(runId);
      });

      inFlight.set(runId, attempt);
      return attempt;
    },

    // Test and diagnostic surface: what is remembered, and what is being asked.
    remembered(runId) {
      return settled.get(runId) ?? null;
    },
    pending(runId) {
      return inFlight.has(runId);
    },
  };
}

// One store per page. Two views of the same Run share its request, and a remount
// does not re-ask a question that has already been answered.
export const browserFinalFrameStore = createBrowserFinalFrameStore();

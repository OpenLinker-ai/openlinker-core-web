import type { RunResult, RunStatus } from "../components/playground/types";

export interface PlaygroundTurn {
  id: string;
  sequence: number;
  inputText: string;
  inputPayload: unknown;
  runInput: unknown;
  status: RunStatus;
  result: RunResult | null;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
  resumeOnReload?: boolean;
  request?: { idempotencyKey: string; body: Record<string, unknown> };
}

export interface PlaygroundSession {
  conversationID: string;
  input: string;
  turns: PlaygroundTurn[];
  activeTurnId: string;
  seed: string;
  ready: boolean;
  storageError: boolean;
  autorunConsumed: boolean;
}

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
type Update = Partial<PlaygroundSession> | ((state: PlaygroundSession) => Partial<PlaygroundSession>);

export function playgroundSessionKey(userId: string | undefined, agentId: string, taskId?: string): string | null {
  return userId ? `openlinker.playground.v1:${JSON.stringify([userId, agentId, taskId ?? ""])}` : null;
}

function isTurn(value: unknown): value is PlaygroundTurn {
  if (!value || typeof value !== "object") return false;
  const turn = value as PlaygroundTurn;
  return typeof turn.id === "string" && Number.isInteger(turn.sequence) && turn.sequence > 0 &&
    typeof turn.inputText === "string" && typeof turn.createdAt === "string" &&
    ["running", "success", "failed"].includes(turn.status) &&
    (turn.result === null || (typeof turn.result === "object" && typeof turn.result?.run_id === "string" &&
      ["running", "success", "failed", "timeout", "canceled"].includes(turn.result.status))) &&
    (turn.request === undefined || (typeof turn.request?.idempotencyKey === "string" &&
      !!turn.request.body && typeof turn.request.body === "object" && !Array.isArray(turn.request.body))) &&
    (turn.status !== "running" || !!turn.result?.run_id || !!turn.request);
}

/** External store: restore before enabling sends, synchronously persist before POST. */
export function createPlaygroundSessionStore(
  key: string | null,
  initial: Pick<PlaygroundSession, "input" | "conversationID"> & { seed?: string },
  getStorage: () => Storage = () => window.localStorage,
) {
  const serverSnapshot: PlaygroundSession = {
    ...initial, seed: initial.seed ?? initial.input, turns: [], activeTurnId: "", ready: false, storageError: false, autorunConsumed: false,
  };
  let state = serverSnapshot;
  let loaded = false;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  function update(change: Update) {
    state = { ...state, ...(typeof change === "function" ? change(state) : change) };
    if (state.ready && key) {
      try {
        // Only conversation data is stored: no session/JWT or browser observation frames.
        const { conversationID, input, turns, activeTurnId, seed, autorunConsumed } = state;
        getStorage().setItem(key, JSON.stringify({ version: 1, conversationID, input, turns, activeTurnId, seed, autorunConsumed }));
        state = { ...state, storageError: false };
      } catch {
        state = { ...state, storageError: true };
      }
    }
    notify();
  }

  return {
    getSnapshot: () => state,
    getServerSnapshot: () => serverSnapshot,
    update,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (!loaded) {
        loaded = true;
        state = { ...state, ready: true };
        if (key) {
          try {
            const raw = getStorage().getItem(key);
            const saved = raw ? JSON.parse(raw) : null;
            if (saved?.version === 1 && typeof saved.conversationID === "string" &&
              typeof saved.input === "string" && typeof saved.activeTurnId === "string" &&
              Array.isArray(saved.turns) && saved.turns.every(isTurn)) {
              state = { ...state, conversationID: saved.conversationID,
                autorunConsumed: saved.autorunConsumed === true || saved.turns.length > 0,
                turns: saved.turns.map((turn: PlaygroundTurn) => turn.status === "failed" && turn.request && turn.resumeOnReload
                  ? { ...turn, status: "running", errorMessage: undefined, completedAt: undefined } : turn),
                activeTurnId: saved.activeTurnId, input: saved.seed === serverSnapshot.seed ? saved.input : initial.input };
            }
          } catch {
            state = { ...state, storageError: true };
          }
        }
        notify();
      }
      return () => { listeners.delete(listener); };
    },
  };
}

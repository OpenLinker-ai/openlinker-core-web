"use client";

import { useState, type FormEvent } from "react";
import { useApi } from "@/hooks/use-api";
import type { Locale } from "@/lib/i18n";
import { cliLoginMessages } from "@/messages/cli-login";

type LoginRequest = {
  client_name: string;
  user_code: string;
  scopes: string[];
  expires_at: string;
  token_lifetime_days: number;
  redirect_uri: string;
  instance_url: string;
};

export function validateCLICallback(raw: string, expected: string): string {
  const value = new URL(raw);
  const destination = new URL(expected);
  if (value.protocol !== "http:" || !["127.0.0.1", "[::1]"].includes(value.hostname)
    || !value.port || value.username || value.password || value.hash
    || value.pathname !== "/callback" || value.origin !== destination.origin
    || value.pathname !== destination.pathname
    || value.searchParams.getAll("state").length !== 1
    || !/^[A-Za-z0-9_-]{43}$/.test(value.searchParams.get("state") ?? "")) {
    throw new Error("Invalid CLI callback");
  }
  const code = value.searchParams.getAll("code");
  const error = value.searchParams.getAll("error");
  if (!((code.length === 1 && /^[A-Za-z0-9_-]{43}$/.test(code[0]) && error.length === 0)
    || (error.length === 1 && error[0] === "access_denied" && code.length === 0))) {
    throw new Error("Invalid CLI callback");
  }
  return value.toString();
}

export function CLIAuthorize({ initialCode, account, locale }: {
  initialCode: string; account: string; locale: Locale;
}) {
  const copy = cliLoginMessages[locale];
  const { fetch } = useApi();
  const [code, setCode] = useState(initialCode);
  const [request, setRequest] = useState<LoginRequest | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function inspect(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setConfirmed(false);
    try {
      const result = await fetch<LoginRequest>("/api/v1/cli-auth/request", {
        method: "POST", body: { user_code: code },
      });
      setRequest(result);
    } catch { setError(copy.requestFailed); }
    finally { setBusy(false); }
  }

  async function decide(approve: boolean) {
    if (!request || busy || (approve && !confirmed)) return;
    setBusy(true); setError("");
    try {
      const result = await fetch<{ status: string; redirect_uri: string }>("/api/v1/cli-auth/decision", {
        method: "POST", body: { user_code: request.user_code, approve },
      });
      setDone(approve ? copy.approved : copy.denied);
      if (result.redirect_uri) {
        window.location.assign(validateCLICallback(result.redirect_uri, request.redirect_uri));
      }
    } catch (failure) {
      setError(failure && typeof failure === "object" && "code" in failure && failure.code === "TOKEN_QUOTA_EXCEEDED"
        ? copy.quotaExceeded : copy.decisionFailed);
    }
    finally { setBusy(false); }
  }

  return <section className="mx-auto max-w-xl rounded-2xl border border-[color:var(--ol-line)] bg-white p-6">
    <h1 className="text-2xl font-bold">{copy.title}</h1>
    <p className="mt-3">{copy.account}: <strong>{account}</strong></p>
    <p className="mt-3 text-sm text-[color:var(--ol-muted)]">{copy.lead}</p>
    {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
    {done ? <p role="status" className="mt-6">{done}</p> : !request ? <form onSubmit={inspect} className="mt-6 space-y-4">
      <label className="block" htmlFor="cli-user-code">{copy.code}</label>
      <input id="cli-user-code" value={code} onChange={(event) => setCode(event.target.value)}
        disabled={busy} required maxLength={12} autoComplete="off" spellCheck={false}
        className="w-full rounded-lg border p-3 font-mono uppercase" />
      <button type="submit" disabled={busy} className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50">
        {busy ? copy.loading : copy.inspect}
      </button>
    </form> : <div className="mt-6 space-y-4">
      <p>{copy.instance}: <strong>{request.instance_url}</strong></p>
      <p>{copy.code}: <strong className="font-mono">{request.user_code}</strong></p>
      <p>{copy.permissions}</p>
      <ul className="list-disc space-y-2 pl-6">
        {request.scopes.map((scope) => <li key={scope}>{copy.scopes[scope as keyof typeof copy.scopes] ?? scope}</li>)}
      </ul>
      <p className="text-sm">{copy.scopeBoundary}</p>
      <p className="text-sm">{copy.duration.replace("{days}", String(request.token_lifetime_days))}</p>
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={confirmed} disabled={busy} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" />
        <span>{copy.confirm}</span>
      </label>
      <div className="flex gap-3">
        <button type="button" disabled={busy || !confirmed} onClick={() => void decide(true)}
          className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50">{copy.approve}</button>
        <button type="button" disabled={busy} onClick={() => void decide(false)}
          className="rounded-lg border px-4 py-2 disabled:opacity-50">{copy.deny}</button>
      </div>
    </div>}
  </section>;
}

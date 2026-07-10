"use client";

import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/use-api";
import { ApiError, localizedErrorMessage } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { coreUserTokenMessages } from "@/messages/user-token";

import { UserTokenPermissionEditor } from "./user-token-permission-editor";
import {
  AGENT_SCOPED_PERMISSIONS,
  grantsFromSelection,
  selectionFromGrants,
  selectionIsValid,
  type AgentOption,
  type CorePermission,
  type GrantSelection,
  type UserTokenItem,
} from "./user-token-types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
  locale: Locale;
  token: UserTokenItem;
  agentOptions: AgentOption[];
};

export function TightenUserTokenDialog({
  open,
  onOpenChange,
  onUpdated,
  locale,
  token,
  agentOptions,
}: Props) {
  const copy = coreUserTokenMessages[locale];
  const { fetch: apiFetch } = useApi();
  const [selection, setSelection] = useState<GrantSelection>(() =>
    selectionFromGrants(token.grants ?? []),
  );
  const [saving, setSaving] = useState(false);
  const [shorterExpiry, setShorterExpiry] = useState("");

  const allowedPermissions = useMemo(
    () => new Set(selectionFromGrants(token?.grants ?? []).permissions),
    [token],
  );
  const allowedAgentIds = useMemo(() => {
    const result: Partial<Record<CorePermission, ReadonlySet<string>>> = {};
    if (!token) return result;
    for (const permission of allowedPermissions) {
      if (!AGENT_SCOPED_PERMISSIONS.has(permission)) continue;
      const grants = token.grants.filter((grant) => grant.permission === permission);
      if (grants.some((grant) => !grant.resource_id)) continue;
      result[permission] = new Set(
        grants.flatMap((grant) => (grant.resource_id ? [grant.resource_id] : [])),
      );
    }
    return result;
  }, [allowedPermissions, token]);

  const selectionValid = selection.permissions.length === 0 || selectionIsValid(selection);

  const save = async () => {
    if (!token || !selectionValid) {
      toast.error(copy.atLeastOne);
      return;
    }
    const expiresAt = shorterExpiry ? new Date(shorterExpiry) : null;
    if (expiresAt && !validShorterExpiry(expiresAt, token.expires_at)) {
      toast.error(copy.expiryMustShorten);
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/v1/user-tokens/${encodeURIComponent(token.id)}`, {
        method: "PATCH",
        body: {
          grants: grantsFromSelection(selection),
          ...(expiresAt ? { expires_at: expiresAt.toISOString() } : {}),
        },
      });
      toast.success(copy.tightenSuccess);
      onOpenChange(false);
      onUpdated();
    } catch (error) {
      const replacementRequired =
        error instanceof ApiError &&
        error.status === 409 &&
        (error.code === "PERMISSION_EXPANSION_REQUIRES_NEW_TOKEN" ||
          isReplacementRequired(error.details));
      toast.error(
        replacementRequired
          ? copy.replacementRequired
          : localizedErrorMessage(error, locale, copy.tightenFailed),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={copy.close}
        className="max-h-[92vh] overflow-y-auto sm:max-w-3xl"
      >
        <DialogHeader>
          <DialogTitle>{copy.tightenTitle}</DialogTitle>
          <DialogDescription>{copy.tightenDescription}</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] font-bold leading-5 text-amber-900">
          {copy.tightenHint}
        </div>
        <UserTokenPermissionEditor
          locale={locale}
          selection={selection}
          agentOptions={agentOptions}
          onChange={setSelection}
          allowedPermissions={allowedPermissions}
          allowedAgentIds={allowedAgentIds}
        />
        <div className="space-y-2 rounded-xl border border-[color:var(--ol-line)] p-3">
          <Label htmlFor="core-shorter-expiry">{copy.shortenExpiry}</Label>
          <Input
            id="core-shorter-expiry"
            type="datetime-local"
            value={shorterExpiry}
            max={token?.expires_at ? localDateTimeValue(new Date(token.expires_at)) : undefined}
            onChange={(event) => setShorterExpiry(event.target.value)}
          />
          <p className="text-[11.5px] font-semibold text-[color:var(--ol-muted)]">
            {copy.shortenExpiryHint}
          </p>
        </div>
        {!selectionValid ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-bold text-red-700" aria-live="polite">
            {copy.atLeastOne}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={saving || !selectionValid}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {saving ? copy.saving : copy.saveTighten}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function validShorterExpiry(next: Date, current: string | null | undefined): boolean {
  if (Number.isNaN(next.getTime()) || next.getTime() <= Date.now()) return false;
  if (!current) return true;
  return next.getTime() < new Date(current).getTime();
}

function localDateTimeValue(date: Date): string {
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function isReplacementRequired(details: unknown): boolean {
  if (!details || typeof details !== "object") return false;
  const value = details as { replacement_required?: unknown; reason?: unknown };
  return (
    value.replacement_required === true ||
    value.reason === "TOKEN_PERMISSION_EXPANSION"
  );
}

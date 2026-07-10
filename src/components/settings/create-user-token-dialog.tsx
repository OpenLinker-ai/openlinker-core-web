"use client";

import { Copy, KeyRound, Loader2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
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
import { localizedErrorMessage } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { coreUserTokenMessages } from "@/messages/user-token";

import { UserTokenPermissionEditor } from "./user-token-permission-editor";
import {
  USER_TOKEN_PRESETS,
  expirationISO,
  grantsFromSelection,
  selectionForPermissions,
  selectionFromGrants,
  selectionIsValid,
  type AgentOption,
  type ExpirationChoice,
  type GrantSelection,
  type UserTokenItem,
} from "./user-token-types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  locale: Locale;
  agentOptions: AgentOption[];
  replacementOf?: UserTokenItem | null;
};

export function CreateUserTokenDialog({
  open,
  onOpenChange,
  onCreated,
  locale,
  agentOptions,
  replacementOf,
}: Props) {
  const copy = coreUserTokenMessages[locale];
  const { fetch: apiFetch, isAuthenticated, isLoading: sessionLoading } = useApi();
  const defaultPreset = USER_TOKEN_PRESETS[0];
  const [name, setName] = useState(() =>
    replacementOf ? `${replacementOf.name}-replacement` : "production-mcp",
  );
  const [selection, setSelection] = useState<GrantSelection>(() =>
    replacementOf
      ? selectionFromGrants(replacementOf.grants ?? [])
      : selectionForPermissions(defaultPreset.permissions),
  );
  const [expiration, setExpiration] = useState<ExpirationChoice>("90");
  const [activePreset, setActivePreset] = useState<string>(
    replacementOf ? "custom" : defaultPreset.id,
  );
  const [plaintext, setPlaintext] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedPreset = useMemo(
    () =>
      Object.values(selection.fixedResourceGrants).some((grants) => grants?.length)
        || Object.values(selection.agentRanges).some((range) => range?.mode === "selected")
        || selection.unknownGrants.length > 0
        ? "custom"
        : USER_TOKEN_PRESETS.find((preset) =>
            samePermissions(preset.permissions, selection.permissions),
          )?.id ?? "custom",
    [selection.agentRanges, selection.fixedResourceGrants, selection.permissions, selection.unknownGrants.length],
  );

  const applyPreset = (preset: (typeof USER_TOKEN_PRESETS)[number]) => {
    const next = selectionForPermissions(preset.permissions);
    next.unknownGrants = selection.unknownGrants;
    for (const permission of preset.permissions) {
      const fixed = selection.fixedResourceGrants[permission];
      if (fixed?.length) next.fixedResourceGrants[permission] = fixed;
      const range = selection.agentRanges[permission];
      if (range?.mode === "selected") next.agentRanges[permission] = range;
    }
    setSelection(next);
    setActivePreset(preset.id);
  };

  const updateSelection = (next: GrantSelection) => {
    setSelection(next);
    setActivePreset("custom");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sessionLoading) {
      toast.error(copy.sessionLoading);
      return;
    }
    if (!isAuthenticated) {
      toast.error(copy.sessionMissing);
      return;
    }
    if (!name.trim() || !selectionIsValid(selection)) {
      toast.error(copy.atLeastOne);
      return;
    }
    setSubmitting(true);
    try {
      const response = await apiFetch<UserTokenItem>("/api/v1/user-tokens", {
        method: "POST",
        body: {
          name: name.trim(),
          grants: grantsFromSelection(selection),
          expires_at: expirationISO(expiration),
        },
      });
      if (!response.plaintext_token) throw new Error(copy.createFailed);
      setPlaintext(response.plaintext_token);
    } catch (error) {
      toast.error(localizedErrorMessage(error, locale, copy.createFailed));
    } finally {
      setSubmitting(false);
    }
  };

  const copyPlaintext = async () => {
    try {
      await navigator.clipboard.writeText(plaintext);
      toast.success(copy.copied);
    } catch {
      toast.error(copy.copyFailed);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && plaintext) onCreated();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        closeLabel={copy.close}
        className="max-h-[92vh] overflow-y-auto sm:max-w-3xl"
      >
        {plaintext ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="size-5" /> {copy.plaintextTitle}
              </DialogTitle>
              <DialogDescription>{copy.plaintextBody}</DialogDescription>
            </DialogHeader>
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
              <p className="text-[12.5px] font-bold leading-5 text-amber-900">
                {copy.plaintextWarning}
              </p>
              <code className="mt-3 block select-all break-all rounded-lg bg-white p-3 text-[12px] text-[color:var(--ol-ink)] shadow-sm">
                {plaintext}
              </code>
            </div>
            <DialogFooter className="gap-2 sm:space-x-0">
              <Button type="button" variant="outline" onClick={() => void copyPlaintext()}>
                <Copy className="size-4" /> {copy.copy}
              </Button>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                {copy.saved}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <DialogHeader>
              <DialogTitle>{replacementOf ? copy.replaceTitle : copy.createTitle}</DialogTitle>
              <DialogDescription>
                {replacementOf ? copy.replaceDescription : copy.createDescription}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="user-token-name">{copy.name}</Label>
              <Input
                id="user-token-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={copy.namePlaceholder}
                maxLength={80}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>{copy.preset}</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {USER_TOKEN_PRESETS.map((preset) => {
                  const active =
                    activePreset === preset.id ||
                    (activePreset === "custom" && selectedPreset === preset.id);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={`rounded-xl border p-3 text-left transition ${
                        active
                          ? "border-[color:var(--ol-primary)] bg-[color:var(--ol-mint)]"
                          : "border-[color:var(--ol-line)] bg-white hover:border-[color:var(--ol-primary)]/40"
                      }`}
                    >
                      <strong className="block text-[12.5px] text-[color:var(--ol-ink)]">
                        {copy.presetCopy[preset.id].label}
                      </strong>
                      <span className="mt-1 block text-[11.5px] font-semibold leading-5 text-[color:var(--ol-muted)]">
                        {copy.presetCopy[preset.id].description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{copy.permissions}</Label>
              <UserTokenPermissionEditor
                locale={locale}
                selection={selection}
                agentOptions={agentOptions}
                onChange={updateSelection}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-token-expiry">{copy.expiry}</Label>
              <select
                id="user-token-expiry"
                value={expiration}
                onChange={(event) => setExpiration(event.target.value as ExpirationChoice)}
                className="ol-publish-input"
              >
                <option value="30">{copy.expiry30}</option>
                <option value="90">{copy.expiry90}</option>
                <option value="365">{copy.expiry365}</option>
                <option value="never">{copy.expiryNever}</option>
              </select>
            </div>

            {!selectionIsValid(selection) ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-bold text-red-700" aria-live="polite">
                {copy.atLeastOne}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="submit" disabled={submitting || !selectionIsValid(selection)}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                {submitting ? copy.creating : copy.createAction}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function samePermissions(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((permission) => rightSet.has(permission));
}

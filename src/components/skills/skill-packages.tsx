"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Plus, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useApi } from "@/hooks/use-api";
import { localizedErrorMessage } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { localizedSkill, type Skill } from "@/lib/skills";
import type {
  SkillPackage,
  SkillPackageAgent,
  SkillPackageBindings,
  SkillPackageContents,
  SkillPackageVersion,
} from "@/lib/skill-packages";
import { fetchCompleteSkillCatalog } from "@/lib/skill-package-catalog";
import {
  readSkillPackageFiles,
  encodedSkillFilesBytes,
} from "@/lib/skill-package-files.mjs";
import { skillPackageErrorMessages } from "@/messages/skill-package-errors";
import { skillPackageMessages } from "@/messages/skill-package";
import { SkillPicker } from "@/components/skill/skill-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

function packageErrorText(
  error: unknown,
  locale: Locale,
  fallback: string,
): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  const messages = skillPackageErrorMessages[locale];
  if (code in messages) return messages[code as keyof typeof messages];
  return localizedErrorMessage(error, locale, fallback);
}

const inputClass =
  "w-full rounded-xl border border-[color:var(--ol-line)] bg-white px-3 py-2 text-sm";
const buttonClass =
  "ol-mini-btn disabled:cursor-not-allowed disabled:opacity-50";
const primaryClass = `${buttonClass} bg-[color:var(--ol-primary)]! text-white!`;
const key = ["skill-packages"];
function usePackageApi() {
  const api = useApi();
  const { data } = useSession();
  return { ...api, ownerId: data?.user.id ?? "" };
}
type Props = {
  locale: Locale;
  agents: SkillPackageAgent[];
  skills: Skill[];
  packageId?: string;
  agentId?: string;
};

export function SkillPackages({
  locale,
  agents,
  skills: initialSkills,
  packageId,
  agentId,
}: Props) {
  const copy = skillPackageMessages[locale];
  const api = usePackageApi();
  const [importOpen, setImportOpen] = useState(false);
  const [query, setQuery] = useState("");
  const packages = useQuery({
    queryKey: [...key, api.ownerId],
    enabled: api.isAuthenticated,
    queryFn: () =>
      api.fetch<{ items: SkillPackage[] }>("/api/v1/creator/skill-packages"),
  });
  const items = packages.data?.items ?? [];
  const catalog = useQuery({
    queryKey: ["skill-catalog", locale],
    enabled: initialSkills.length === 0,
    queryFn: () => fetchCompleteSkillCatalog(locale),
  });
  const skills = initialSkills.length ? initialSkills : (catalog.data ?? []);
  const visible = items.filter((item) =>
    `${item.name} ${item.description}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <section className="ol-panel overflow-hidden" aria-label={copy.title}>
      <div className="ol-panel-head flex flex-wrap gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold">
            <Package size={18} />
            {agentId ? copy.agentPackages : copy.title}
          </h2>
          <p className="mt-1 text-xs text-[color:var(--ol-muted)]">
            {copy.description}
          </p>
        </div>
        {!packageId && (
          <button className={primaryClass} onClick={() => setImportOpen(true)}>
            <Plus size={14} />
            {copy.import}
          </button>
        )}
      </div>
      <div className="space-y-5 p-5">
        {packages.isPending && <p role="status">{copy.loading}</p>}
        {packages.isError && (
          <ErrorState
            text={copy.loadError}
            retry={copy.retry}
            onRetry={() => void packages.refetch()}
          />
        )}
        {packages.isSuccess &&
          (packageId ? (
            <PackageDetail {...{ locale, agents, skills, packageId }} />
          ) : agentId ? (
            <AgentPackages {...{ locale, agents, skills, items, agentId }} />
          ) : (
            <>
              {items.length > 0 && (
                <label className="block">
                  <span className="sr-only">{copy.search}</span>
                  <input
                    className={inputClass}
                    type="search"
                    value={query}
                    placeholder={copy.search}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
              )}
              {items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--ol-line)] px-6 py-10 text-center">
                  <Package
                    className="mx-auto mb-3 text-[color:var(--ol-primary)]"
                    size={28}
                  />
                  <h3 className="font-bold">{copy.empty}</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-[color:var(--ol-muted)]">
                    {copy.emptyDescription}
                  </p>
                  <button
                    className={`${primaryClass} mt-5`}
                    onClick={() => setImportOpen(true)}
                  >
                    {copy.import}
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {visible.map((item) => (
                    <Link
                      href={`/hub/skills/${item.id}`}
                      key={item.id}
                      className="rounded-2xl border border-[color:var(--ol-line)] p-5 transition hover:border-[color:var(--ol-primary)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-bold">{item.name}</h3>
                        <ArrowUpRight size={16} />
                      </div>
                      <p className="mt-2 line-clamp-3 text-sm text-[color:var(--ol-muted)]">
                        {item.description}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="ol-chip">{copy.private}</span>
                        <span className="ol-chip">
                          {item.versions[0]?.version}
                        </span>
                        {item.versions[0]?.providers.map((p) => (
                          <span className="ol-chip" key={p}>
                            {p === "codex" ? "Codex" : "Claude"}
                          </span>
                        ))}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {items.length > 0 && visible.length === 0 && (
                <p>{copy.noMatches}</p>
              )}
              <AgentPackages {...{ locale, agents, skills, items }} />
            </>
          ))}
      </div>
      {importOpen && (
        <ImportDialog
          {...{ locale, skills }}
          onClose={() => setImportOpen(false)}
        />
      )}
    </section>
  );
}

function ErrorState({
  text,
  retry,
  onRetry,
}: {
  text: string;
  retry: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm"
    >
      <p>{text}</p>
      <button className={`${buttonClass} mt-2`} onClick={onRetry}>
        {retry}
      </button>
    </div>
  );
}

function ImportDialog({
  locale,
  skills,
  packageId,
  initialContents,
  initialVersion,
  onClose,
}: {
  locale: Locale;
  skills: Skill[];
  packageId?: string;
  initialContents?: SkillPackageContents;
  initialVersion?: SkillPackageVersion;
  onClose: () => void;
}) {
  const copy = skillPackageMessages[locale];
  const api = usePackageApi();
  const router = useRouter();
  const cache = useQueryClient();
  const [version, setVersion] = useState(packageId ? "" : "1.0.0");
  const [files, setFiles] = useState<Record<string, string>>(
    initialContents?.files ?? {
      "SKILL.md":
        "---\nname: my-skill\ndescription: Describe when this skill should be used.\n---\n\nWrite the instructions here.\n",
    },
  );
  const [requirements, setRequirements] = useState(
    initialContents?.required_commands?.join(", ") ?? "",
  );
  const [providers, setProviders] = useState(
    initialVersion?.providers ?? ["codex", "claude"],
  );
  const [capabilities, setCapabilities] = useState<string[]>(
    initialVersion?.capability_ids ?? [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [skippedFiles, setSkippedFiles] = useState<string[]>([]);
  async function chooseFiles(list: FileList | null) {
    if (!list?.length) return;
    setError("");
    setSkippedFiles([]);
    try {
      const result = await readSkillPackageFiles(list);
      setFiles(result.files);
      setSkippedFiles(result.skipped);
    } catch (e) {
      setError(packageErrorText(e, locale, copy.fileError));
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!providers.length) {
      setError(copy.providersRequired);
      return;
    }
    if (encodedSkillFilesBytes(files) > 65536) {
      setError(
        skillPackageErrorMessages[locale].SKILL_PACKAGE_PAYLOAD_TOO_LARGE,
      );
      return;
    }
    setBusy(true);
    try {
      const result = await api.fetch<{ id: string }>(
        packageId
          ? `/api/v1/creator/skill-packages/${packageId}/versions`
          : "/api/v1/creator/skill-packages",
        {
          method: "POST",
          body: {
            version,
            files,
            capability_ids: capabilities,
            providers,
            required_commands: requirements
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean),
          },
        },
      );
      await cache.invalidateQueries({ queryKey: key });
      toast.success(copy.imported);
      onClose();
      router.push(`/hub/skills/${result.id}`);
    } catch (e) {
      setError(packageErrorText(e, locale, copy.importError));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        closeLabel={copy.close}
        className="max-h-[90dvh] max-w-2xl overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>{packageId ? copy.newVersion : copy.import}</DialogTitle>
          <DialogDescription>{copy.importHint}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span>{copy.version}</span>
            <input
              required
              pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}"
              className={inputClass}
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            />
            <span className="block text-xs text-[color:var(--ol-muted)]">
              {copy.versionHint}
            </span>
          </label>
          <div className="flex flex-wrap gap-3">
            <label className={buttonClass}>
              {copy.chooseFile}
              <input
                className="sr-only"
                type="file"
                accept=".md"
                disabled={busy}
                onChange={(e) => void chooseFiles(e.target.files)}
              />
            </label>
            <label className={buttonClass}>
              {copy.chooseFolder}
              <input
                className="sr-only"
                type="file"
                multiple
                ref={(node) => {
                  node?.setAttribute("webkitdirectory", "");
                }}
                disabled={busy}
                onChange={(e) => void chooseFiles(e.target.files)}
              />
            </label>
          </div>
          <label className="block space-y-1 text-sm">
            <span>{copy.manifest}</span>
            <textarea
              className={`${inputClass} min-h-52 font-mono text-xs`}
              value={files["SKILL.md"] ?? ""}
              onChange={(e) =>
                setFiles({ ...files, "SKILL.md": e.target.value })
              }
              required
            />
          </label>
          <p className="break-all text-xs text-[color:var(--ol-muted)]">
            {copy.files}: {Object.keys(files).join(", ")}
          </p>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">
              {copy.compatible}
            </legend>
            <div className="flex gap-5">
              {["codex", "claude"].map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={providers.includes(p)}
                    onChange={(e) =>
                      setProviders(
                        e.target.checked
                          ? [...providers, p]
                          : providers.filter((v) => v !== p),
                      )
                    }
                  />
                  {p === "codex" ? "Codex" : "Claude"}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block space-y-1 text-sm">
            <span>{copy.requirements}</span>
            <input
              className={inputClass}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
            />
            <span className="block text-xs text-[color:var(--ol-muted)]">
              {copy.requirementsHint}
            </span>
          </label>
          <details>
            <summary className="cursor-pointer text-sm font-semibold">
              {copy.mapping}
            </summary>
            <p className="my-2 text-xs text-[color:var(--ol-muted)]">
              {copy.mappingHint}
            </p>
            <SkillPicker
              {...{ skills, locale }}
              value={capabilities}
              onChange={setCapabilities}
            />
          </details>
          {skippedFiles.length > 0 && (
            <p role="status" className="break-all text-xs">
              {copy.skippedFiles}: {skippedFiles.join(", ")}
            </p>
          )}
          <p className="text-xs text-[color:var(--ol-muted)]">
            {copy.encodedSize}: {encodedSkillFilesBytes(files).toLocaleString()}{" "}
            {copy.bytesUnit}. {copy.encodedHint}
          </p>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={buttonClass}
              disabled={busy}
              onClick={onClose}
            >
              {copy.cancel}
            </button>
            <button className={primaryClass} disabled={busy}>
              {busy ? copy.saving : copy.import}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PackageDetail({
  locale,
  agents,
  skills,
  packageId,
}: Props & { packageId: string }) {
  const api = usePackageApi();
  const copy = skillPackageMessages[locale];
  const data = useQuery({
    queryKey: [...key, "detail", packageId, api.ownerId],
    queryFn: () =>
      api.fetch<SkillPackage>(`/api/v1/creator/skill-packages/${packageId}`),
  });
  const [versionId, setVersionId] = useState("");
  const [file, setFile] = useState("SKILL.md");
  const [importOpen, setImportOpen] = useState(false);
  const [bindOpen, setBindOpen] = useState(false);
  const item = data.data;
  const version =
    item?.versions.find((v) => v.id === versionId) ?? item?.versions[0];
  const contentQuery = useQuery({
    queryKey: [...key, "contents", packageId, version?.id, api.ownerId],
    enabled: Boolean(version),
    queryFn: () =>
      api.fetch<SkillPackageContents>(
        `/api/v1/creator/skill-packages/${packageId}/versions/${version!.id}`,
      ),
  });
  const contents = contentQuery.data;
  if (data.isPending) return <p role="status">{copy.loading}</p>;
  if (data.isError)
    return (
      <ErrorState
        text={copy.loadError}
        retry={copy.retry}
        onRetry={() => void data.refetch()}
      />
    );
  if (!item) return null;
  const selectedFile = contents?.files[file] !== undefined ? file : "SKILL.md";
  return (
    <>
      <Link
        href="/hub/skills"
        className="text-sm text-[color:var(--ol-primary)]"
      >
        ← {copy.back}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="ol-chip">{copy.private}</span>
          <h2 className="mt-3 text-2xl font-black">
            {contents?.name ?? item.name}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-[color:var(--ol-muted)]">
            {contents?.description ?? item.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={buttonClass}
            disabled={!contents}
            onClick={() => setImportOpen(true)}
          >
            {copy.newVersion}
          </button>
          <button className={primaryClass} onClick={() => setBindOpen(true)}>
            {copy.associate}
          </button>
        </div>
      </div>
      {contentQuery.isPending && <p role="status">{copy.loading}</p>}
      {contentQuery.isError && (
        <ErrorState
          text={copy.loadError}
          retry={copy.retry}
          onRetry={() => void contentQuery.refetch()}
        />
      )}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0 rounded-xl border border-[color:var(--ol-line)] p-4">
          <h2 className="mb-3 font-bold">{copy.source}</h2>
          <label>
            <span className="sr-only">{copy.files}</span>
            <select
              value={selectedFile}
              className={inputClass}
              onChange={(e) => setFile(e.target.value)}
            >
              {Object.keys(contents?.files ?? {})
                .sort()
                .map((name) => (
                  <option key={name}>{name}</option>
                ))}
            </select>
          </label>
          <p className="my-3 text-xs text-[color:var(--ol-muted)]">
            {copy.contentHint}
          </p>
          <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[color:var(--ol-soft)] p-4 text-xs leading-relaxed">
            {contents?.files[selectedFile]}
          </pre>
        </div>
        <aside className="space-y-5">
          <label className="block space-y-2 text-sm font-semibold">
            <span>{copy.version}</span>
            <select
              className={inputClass}
              value={version?.id ?? ""}
              onChange={(e) => setVersionId(e.target.value)}
            >
              {item.versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.version}
                </option>
              ))}
            </select>
          </label>
          <div>
            <h2 className="text-sm font-bold">{copy.compatible}</h2>
            <p className="mt-2 text-sm">{version?.providers.join(" / ")}</p>
          </div>
          {!!contents?.required_commands?.length && (
            <div>
              <h2 className="text-sm font-bold">{copy.requirements}</h2>
              <p className="mt-2 break-words text-sm">
                {contents.required_commands.join(", ")}
              </p>
            </div>
          )}
          <div>
            <h2 className="text-sm font-bold">{copy.mapping}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {version?.capability_ids.map((id) => {
                const skill = skills.find((s) => s.id === id);
                return (
                  <Link
                    className="ol-chip"
                    key={id}
                    href={`/skills/capabilities/${id.split("/").map(encodeURIComponent).join("/")}`}
                  >
                    {skill ? localizedSkill(skill, locale).name : id}
                  </Link>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-[color:var(--ol-muted)]">
              {copy.mappingHint}
            </p>
          </div>
          <details className="text-xs">
            <summary className="cursor-pointer">{copy.digest}</summary>
            <code className="mt-2 block break-all">{version?.digest}</code>
          </details>
        </aside>
      </div>
      {importOpen && (
        <ImportDialog
          {...{ locale, skills, packageId }}
          initialContents={contents}
          initialVersion={version}
          onClose={() => setImportOpen(false)}
        />
      )}
      {bindOpen && (
        <BindDialog
          {...{ locale, agents }}
          items={[item]}
          initialPackageId={packageId}
          initialVersionId={version?.id}
          onClose={() => setBindOpen(false)}
        />
      )}
    </>
  );
}

function AgentPackages({
  locale,
  agents,
  items,
  agentId,
}: Props & { items: SkillPackage[] }) {
  const api = usePackageApi();
  const copy = skillPackageMessages[locale];
  const cache = useQueryClient();
  const [chosen, setChosen] = useState(agentId ?? "");
  const current = agentId ?? chosen;
  const [bindOpen, setBindOpen] = useState(false);
  const [editPackage, setEditPackage] = useState("");
  const [editVersion, setEditVersion] = useState("");
  const [busy, setBusy] = useState("");
  const bindings = useQuery({
    queryKey: [...key, "bindings", current, api.ownerId],
    enabled: Boolean(current),
    queryFn: () =>
      api.fetch<SkillPackageBindings>(
        `/api/v1/creator/agents/${current}/skill-packages`,
      ),
    // A pending binding may wait hours; refresh on focus, mutation or explicit action.
    refetchInterval: false,
  });
  async function remove(id: string) {
    setBusy(id);
    try {
      await api.fetch(
        `/api/v1/creator/agents/${current}/skill-packages/${id}`,
        { method: "DELETE" },
      );
      await cache.invalidateQueries({
        queryKey: [...key, "bindings", current],
      });
      toast.success(copy.removed);
    } catch (e) {
      toast.error(packageErrorText(e, locale, copy.saveError));
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="space-y-4 border-t border-[color:var(--ol-line)] pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold">{copy.agentPackages}</h2>
        <button
          className={buttonClass}
          onClick={() => {
            setEditPackage("");
            setEditVersion("");
            setBindOpen(true);
          }}
          disabled={!agents.length || !items.length}
        >
          {copy.associate}
        </button>
      </div>
      {!agentId && (
        <label className="block space-y-1 text-sm">
          <span>{copy.selectAgent}</span>
          <select
            className={inputClass}
            value={current}
            onChange={(e) => setChosen(e.target.value)}
          >
            <option value="">{copy.choose}</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {!agents.length && (
        <p className="text-sm">
          {copy.noAgents}{" "}
          <Link className="underline" href="/hub/access">
            {copy.connectAgent}
          </Link>
        </p>
      )}
      {current && (
        <>
          {bindings.isPending && <p role="status">{copy.loading}</p>}
          {bindings.isError && (
            <ErrorState
              text={copy.loadError}
              retry={copy.retry}
              onRetry={() => void bindings.refetch()}
            />
          )}
          {bindings.data && (
            <>
              <div className="flex flex-wrap justify-between gap-3 text-xs text-[color:var(--ol-muted)]">
                <p>{copy.bindingHint}</p>
                <button
                  className="underline"
                  onClick={() => void bindings.refetch()}
                >
                  {copy.refresh}
                </button>
              </div>
              {agents.find((agent) => agent.id === current)?.visibility !== "private" && (
                <p role="note" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                  {copy.contentExposure}
                </p>
              )}
              {!bindings.data.supported && (
                <p className="rounded-xl bg-amber-50 p-3 text-sm">
                  {copy.unsupported}
                </p>
              )}
              {bindings.data.items.length === 0 && (
                <p className="text-sm text-[color:var(--ol-muted)]">
                  {copy.noBindings}
                </p>
              )}
              {bindings.data.items.map((binding) => (
                <div
                  key={binding.binding_id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[color:var(--ol-line)] p-4"
                >
                  <div>
                    <Link
                      href={`/hub/skills/${binding.package_id}`}
                      className="font-bold"
                    >
                      {binding.name}
                    </Link>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span>{binding.version}</span>
                      {binding.latest_version_id !== binding.version_id && (
                        <span className="ol-chip">{copy.updateAvailable}</span>
                      )}
                      {(!bindings.data.supported ||
                        !binding.providers.some((p) =>
                          bindings.data.providers.includes(p),
                        )) && (
                        <span role="status" className="text-amber-800">
                          {copy.currentIncompatible}
                        </span>
                      )}
                      <span
                        className={`ol-chip ${binding.status === "failed" ? "bg-red-50 text-red-700" : binding.status === "loaded" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}
                      >
                        {binding.error_code === "dependency_missing"
                          ? copy.dependencyMissing
                          : copy[binding.status]}
                      </span>
                      {binding.last_run_id && (
                        <Link
                          className="underline"
                          href={`/run/${binding.last_run_id}`}
                        >
                          {copy.run}
                        </Link>
                      )}
                    </div>
                    {binding.status === "failed" && (
                      <p className="mt-2 text-xs text-red-700">
                        {copy.failedHint}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className={buttonClass}
                      onClick={() => {
                        setEditPackage(binding.package_id);
                        setEditVersion(binding.version_id);
                        setBindOpen(true);
                      }}
                    >
                      {copy.manage}
                    </button>
                    <button
                      className={buttonClass}
                      disabled={busy === binding.package_id}
                      onClick={() => void remove(binding.package_id)}
                    >
                      {copy.remove}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}
      {bindOpen && (
        <BindDialog
          {...{ locale, agents, items }}
          initialAgentId={current}
          initialPackageId={editPackage}
          editing={Boolean(editPackage)}
          initialVersionId={editVersion}
          onClose={() => setBindOpen(false)}
        />
      )}
    </div>
  );
}

function BindDialog({
  locale,
  agents,
  items,
  initialAgentId = "",
  initialPackageId = "",
  initialVersionId = "",
  editing = false,
  onClose,
}: {
  locale: Locale;
  agents: SkillPackageAgent[];
  items: SkillPackage[];
  initialAgentId?: string;
  initialPackageId?: string;
  initialVersionId?: string;
  editing?: boolean;
  onClose: () => void;
}) {
  const copy = skillPackageMessages[locale];
  const api = usePackageApi();
  const cache = useQueryClient();
  const [agentId, setAgentId] = useState(initialAgentId);
  const [packageId, setPackageId] = useState(initialPackageId);
  const [versionId, setVersionId] = useState(initialVersionId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const item = items.find((p) => p.id === packageId);
  const version =
    item?.versions.find((v) => v.id === versionId) ?? item?.versions[0];
  const bindings = useQuery({
    queryKey: [...key, "bindings", agentId, api.ownerId],
    enabled: Boolean(agentId),
    queryFn: () =>
      api.fetch<SkillPackageBindings>(
        `/api/v1/creator/agents/${agentId}/skill-packages`,
      ),
  });
  const compatible = Boolean(
    bindings.data?.supported &&
    version?.providers.some((p) => bindings.data.providers.includes(p)),
  );
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!compatible || !version) return;
    setBusy(true);
    setError("");
    try {
      await api.fetch(
        `/api/v1/creator/agents/${agentId}/skill-packages/${packageId}`,
        { method: "PUT", body: { version_id: version.id } },
      );
      await cache.invalidateQueries({
        queryKey: [...key, "bindings", agentId],
      });
      toast.success(copy.saved);
      onClose();
    } catch (e) {
      setError(packageErrorText(e, locale, copy.saveError));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent closeLabel={copy.close}>
        <DialogHeader>
          <DialogTitle>{copy.associate}</DialogTitle>
          <DialogDescription>{copy.bindingHint}</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span>{copy.selectAgent}</span>
            <select
              className={inputClass}
              required
              disabled={editing}
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
            >
              <option value="">{copy.choose}</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>{copy.selectPackage}</span>
            <select
              className={inputClass}
              required
              disabled={editing}
              value={packageId}
              onChange={(e) => {
                setPackageId(e.target.value);
                setVersionId("");
              }}
            >
              <option value="">{copy.choose}</option>
              {items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          {item && (
            <label className="block space-y-1 text-sm">
              <span>{copy.selectVersion}</span>
              <select
                className={inputClass}
                value={version?.id}
                onChange={(e) => setVersionId(e.target.value)}
              >
                {item.versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.version} · {v.providers.join(" / ")}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!agents.length && (
            <p className="text-sm">
              {copy.noAgents}{" "}
              <Link className="underline" href="/hub/access">
                {copy.connectAgent}
              </Link>
            </p>
          )}
          {agentId && agents.find((agent) => agent.id === agentId)?.visibility !== "private" && (
            <p role="note" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              {copy.contentExposure}
            </p>
          )}
          {agentId && bindings.isPending && <p role="status">{copy.loading}</p>}
          {bindings.isError && (
            <ErrorState
              text={copy.loadError}
              retry={copy.retry}
              onRetry={() => void bindings.refetch()}
            />
          )}
          {bindings.data && !bindings.data.supported && (
            <p role="status" className="text-sm text-amber-800">
              {copy.unsupported}
            </p>
          )}
          {bindings.data?.supported && version && !compatible && (
            <p role="status" className="text-sm text-amber-800">
              {copy.incompatible}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={buttonClass}
              disabled={busy}
              onClick={onClose}
            >
              {copy.cancel}
            </button>
            <button className={primaryClass} disabled={busy || !compatible}>
              {busy ? copy.saving : copy.associate}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

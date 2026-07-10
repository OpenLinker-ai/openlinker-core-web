"use client";

import type { Locale } from "@/lib/i18n";
import { coreUserTokenMessages } from "@/messages/user-token";

import {
  AGENT_SCOPED_PERMISSIONS,
  CORE_PERMISSION_GROUPS,
  type AgentOption,
  type CorePermission,
  type GrantSelection,
} from "./user-token-types";

type Props = {
  locale: Locale;
  selection: GrantSelection;
  agentOptions: AgentOption[];
  onChange: (selection: GrantSelection) => void;
  allowedPermissions?: ReadonlySet<CorePermission>;
  allowedAgentIds?: Partial<Record<CorePermission, ReadonlySet<string>>>;
};

export function UserTokenPermissionEditor({
  locale,
  selection,
  agentOptions,
  onChange,
  allowedPermissions,
  allowedAgentIds,
}: Props) {
  const copy = coreUserTokenMessages[locale];

  const togglePermission = (permission: CorePermission) => {
    if (allowedPermissions && !allowedPermissions.has(permission)) return;
    const selected = selection.permissions.includes(permission);
    const permissions = selected
      ? selection.permissions.filter((item) => item !== permission)
      : [...selection.permissions, permission];
    const agentRanges = { ...selection.agentRanges };
    if (!selected && AGENT_SCOPED_PERMISSIONS.has(permission) && !agentRanges[permission]) {
      agentRanges[permission] = { mode: "all", agentIds: [] };
    }
    onChange({ ...selection, permissions, agentRanges });
  };

  const updateAgentMode = (permission: CorePermission, mode: "all" | "selected") => {
    const allowed = allowedAgentIds?.[permission];
    if (mode === "all" && allowed) return;
    onChange({
      ...selection,
      agentRanges: {
        ...selection.agentRanges,
        [permission]: {
          mode,
          agentIds:
            mode === "selected"
              ? selection.agentRanges[permission]?.agentIds ?? []
              : [],
        },
      },
    });
  };

  const toggleAgent = (permission: CorePermission, agentID: string) => {
    const allowed = allowedAgentIds?.[permission];
    if (allowed && !allowed.has(agentID)) return;
    const current = selection.agentRanges[permission]?.agentIds ?? [];
    const agentIds = current.includes(agentID)
      ? current.filter((item) => item !== agentID)
      : [...current, agentID];
    onChange({
      ...selection,
      agentRanges: {
        ...selection.agentRanges,
        [permission]: { mode: "selected", agentIds },
      },
    });
  };

  return (
    <div className="space-y-4">
      {CORE_PERMISSION_GROUPS.map((group) => (
        <fieldset
          key={group.id}
          className="rounded-xl border border-[color:var(--ol-line)] bg-white p-3"
        >
          <legend className="px-1 text-[12px] font-black text-[color:var(--ol-ink)]">
            {copy.permissionGroups[group.id]}
          </legend>
          <div className="grid gap-2">
            {group.permissions.map((permission) => {
              const selected = selection.permissions.includes(permission);
              const enabled = !allowedPermissions || allowedPermissions.has(permission);
              const range = selection.agentRanges[permission] ?? {
                mode: "all" as const,
                agentIds: [],
              };
              const fixedResources = selection.fixedResourceGrants[permission] ?? [];
              const constrainedIDs = allowedAgentIds?.[permission];
              const visibleAgents = constrainedIDs
                ? agentOptions.filter((agent) => constrainedIDs.has(agent.id))
                : agentOptions;
              return (
                <div key={permission} className="rounded-lg bg-[color:var(--ol-soft)] p-3">
                  <label className="flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={!enabled}
                      onChange={() => togglePermission(permission)}
                      className="mt-0.5"
                    />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <strong className="text-[12.5px] text-[color:var(--ol-ink)]">
                          {copy.permissionCopy[permission].label}
                        </strong>
                        <code className="text-[10.5px] text-[color:var(--ol-muted)]">
                          {permission}
                        </code>
                      </span>
                      <span className="mt-0.5 block text-[11.5px] font-semibold leading-5 text-[color:var(--ol-muted)]">
                        {copy.permissionCopy[permission].description}
                      </span>
                      {selected && fixedResources.length > 0 ? (
                        <span className="mt-1 block text-[10.5px] font-bold text-[color:var(--ol-primary-dark)]">
                          {copy.selectedResources(fixedResources.length)} · {fixedResources
                            .flatMap((grant) => grant.resource_id ? [grant.resource_id.slice(0, 8)] : [])
                            .join(", ")}
                        </span>
                      ) : null}
                    </span>
                  </label>

                  {selected && AGENT_SCOPED_PERMISSIONS.has(permission) ? (
                    <div className="ml-6 mt-3 border-t border-[color:var(--ol-line)] pt-3">
                      <div className="flex flex-wrap gap-3 text-[11.5px] font-bold text-[color:var(--ol-muted)]">
                        <label className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name={`${permission}-range`}
                            checked={range.mode === "all"}
                            disabled={Boolean(constrainedIDs)}
                            onChange={() => updateAgentMode(permission, "all")}
                          />
                          {permission === "agents:run" ? copy.allCallableAgents : copy.allOwnedAgents}
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name={`${permission}-range`}
                            checked={range.mode === "selected"}
                            onChange={() => updateAgentMode(permission, "selected")}
                          />
                          {copy.selectAgent}
                        </label>
                      </div>
                      {range.mode === "selected" ? (
                        <div className="mt-2 grid max-h-32 gap-1 overflow-y-auto rounded-lg border border-[color:var(--ol-line)] bg-white p-2 sm:grid-cols-2">
                          {visibleAgents.map((agent) => (
                            <label
                              key={agent.id}
                              className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px] font-semibold hover:bg-[color:var(--ol-soft)]"
                            >
                              <input
                                type="checkbox"
                                checked={range.agentIds.includes(agent.id)}
                                onChange={() => toggleAgent(permission, agent.id)}
                              />
                              <span className="min-w-0 truncate" title={`${agent.name} (${agent.slug})`}>
                                {agent.name} <span className="text-[color:var(--ol-subtle)]">/{agent.slug}</span>
                              </span>
                            </label>
                          ))}
                          {visibleAgents.length === 0 ? (
                            <span className="px-2 py-1 text-[11.5px] text-[color:var(--ol-muted)]">
                              {copy.noAgentsAvailable}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

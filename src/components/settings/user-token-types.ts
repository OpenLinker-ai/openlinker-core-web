export const CORE_PERMISSION_GROUPS = [
  {
    id: "agent",
    permissions: ["agents:read", "agents:run", "agents:create"],
  },
  {
    id: "run",
    permissions: ["runs:read", "runs:cancel"],
  },
  {
    id: "task",
    permissions: [
      "tasks:read",
      "tasks:create",
      "tasks:run",
      "tasks:publish",
      "tasks:work",
      "tasks:review",
    ],
  },
  {
    id: "workflow",
    permissions: ["workflows:read", "workflows:manage", "workflows:run"],
  },
  {
    id: "agentToken",
    permissions: [
      "agent-tokens:read",
      "agent-tokens:issue",
      "agent-tokens:revoke",
    ],
  },
] as const;

export type CorePermissionGroup = (typeof CORE_PERMISSION_GROUPS)[number]["id"];
export type CorePermission = (typeof CORE_PERMISSION_GROUPS)[number]["permissions"][number];

export const CORE_PERMISSIONS = CORE_PERMISSION_GROUPS.flatMap((group) => [
  ...group.permissions,
]) as CorePermission[];

export const CORE_RESOURCE_TYPE: Record<CorePermission, string> = {
  "agents:read": "agent",
  "agents:run": "agent",
  "agents:create": "agent",
  "runs:read": "run",
  "runs:cancel": "run",
  "tasks:read": "task",
  "tasks:create": "task",
  "tasks:run": "task",
  "tasks:publish": "task",
  "tasks:work": "task",
  "tasks:review": "task",
  "workflows:read": "workflow",
  "workflows:manage": "workflow",
  "workflows:run": "workflow",
  "agent-tokens:read": "agent",
  "agent-tokens:issue": "agent",
  "agent-tokens:revoke": "agent",
};

export const AGENT_SCOPED_PERMISSIONS = new Set<CorePermission>([
  "agents:run",
  "agent-tokens:read",
  "agent-tokens:issue",
  "agent-tokens:revoke",
]);

export type UserTokenGrant = {
  permission: string;
  resource_type: string;
  resource_id?: string | null;
  constraints?: Record<string, unknown>;
};

export type UserTokenItem = {
  id: string;
  user_id?: string;
  issuer_instance_id?: string;
  name: string;
  prefix: string;
  grants: UserTokenGrant[];
  scopes?: string[];
  expires_at?: string | null;
  last_used_at?: string | null;
  revoked_at?: string | null;
  created_at: string;
  updated_at?: string;
  plaintext_token?: string;
};

export type UserTokenListResponse = {
  items: UserTokenItem[];
  total: number;
  limit: number;
  offset: number;
  sort_by: "created_at" | "last_used_at" | "expires_at" | "name";
  sort_dir: "asc" | "desc";
  has_more: boolean;
};

export type AgentOption = {
  id: string;
  name: string;
  slug: string;
};

export type AgentRange = {
  mode: "all" | "selected";
  agentIds: string[];
};

export type GrantSelection = {
  permissions: CorePermission[];
  agentRanges: Partial<Record<CorePermission, AgentRange>>;
  fixedResourceGrants: Partial<Record<CorePermission, UserTokenGrant[]>>;
  unknownGrants: UserTokenGrant[];
};

export type ExpirationChoice = "30" | "90" | "365" | "never";

export const USER_TOKEN_PRESETS: Array<{
  id: "runner" | "task" | "workflow" | "agent-token";
  permissions: CorePermission[];
}> = [
  {
    id: "runner",
    permissions: ["agents:read", "agents:run", "runs:read"],
  },
  {
    id: "task",
    permissions: [
      "agents:read",
      "agents:run",
      "runs:read",
      "tasks:read",
      "tasks:create",
      "tasks:run",
    ],
  },
  {
    id: "workflow",
    permissions: [
      "agents:read",
      "agents:run",
      "runs:read",
      "workflows:read",
      "workflows:run",
    ],
  },
  {
    id: "agent-token",
    permissions: [
      "agent-tokens:read",
      "agent-tokens:issue",
      "agent-tokens:revoke",
    ],
  },
];

export function normalizeCorePermission(value: string): CorePermission | null {
  return CORE_PERMISSIONS.includes(value as CorePermission)
    ? (value as CorePermission)
    : null;
}

export function selectionFromGrants(grants: UserTokenGrant[]): GrantSelection {
  const permissions: CorePermission[] = [];
  const agentRanges: Partial<Record<CorePermission, AgentRange>> = {};
  const fixedResourceGrants: Partial<Record<CorePermission, UserTokenGrant[]>> = {};
  const unknownGrants: UserTokenGrant[] = [];
  const wildcardPermissions = new Set(
    grants.filter((grant) => !grant.resource_id).map((grant) => grant.permission),
  );

  for (const grant of grants) {
    const permission = normalizeCorePermission(grant.permission);
    if (!permission) {
      unknownGrants.push({ ...grant, constraints: { ...(grant.constraints ?? {}) } });
      continue;
    }
    if (!permissions.includes(permission)) permissions.push(permission);
    if (!AGENT_SCOPED_PERMISSIONS.has(permission)) {
      if (grant.resource_id && !wildcardPermissions.has(permission)) {
        fixedResourceGrants[permission] = [
          ...(fixedResourceGrants[permission] ?? []),
          { ...grant, constraints: { ...(grant.constraints ?? {}) } },
        ];
      }
      continue;
    }

    const current = agentRanges[permission] ?? { mode: "selected", agentIds: [] };
    if (!grant.resource_id) {
      agentRanges[permission] = { mode: "all", agentIds: [] };
    } else if (current.mode !== "all" && !current.agentIds.includes(grant.resource_id)) {
      agentRanges[permission] = {
        mode: "selected",
        agentIds: [...current.agentIds, grant.resource_id],
      };
    }
  }

  for (const permission of permissions) {
    if (AGENT_SCOPED_PERMISSIONS.has(permission) && !agentRanges[permission]) {
      agentRanges[permission] = { mode: "all", agentIds: [] };
    }
  }
  return { permissions, agentRanges, fixedResourceGrants, unknownGrants };
}

export function selectionForPermissions(permissions: CorePermission[]): GrantSelection {
  const agentRanges: Partial<Record<CorePermission, AgentRange>> = {};
  for (const permission of permissions) {
    if (AGENT_SCOPED_PERMISSIONS.has(permission)) {
      agentRanges[permission] = { mode: "all", agentIds: [] };
    }
  }
  return { permissions: [...permissions], agentRanges, fixedResourceGrants: {}, unknownGrants: [] };
}

export function grantsFromSelection(selection: GrantSelection): UserTokenGrant[] {
  const grants: UserTokenGrant[] = selection.unknownGrants.map((grant) => ({
    ...grant,
    constraints: { ...(grant.constraints ?? {}) },
  }));
  for (const permission of CORE_PERMISSIONS) {
    if (!selection.permissions.includes(permission)) continue;
    const resourceType = CORE_RESOURCE_TYPE[permission];
    const fixed = selection.fixedResourceGrants[permission];
    if (fixed?.length) {
      grants.push(...fixed.map((grant) => ({
        ...grant,
        constraints: { ...(grant.constraints ?? {}) },
      })));
      continue;
    }
    const range = selection.agentRanges[permission];
    if (
      AGENT_SCOPED_PERMISSIONS.has(permission) &&
      range?.mode === "selected"
    ) {
      for (const resourceID of range.agentIds) {
        grants.push({
          permission,
          resource_type: resourceType,
          resource_id: resourceID,
          constraints: {},
        });
      }
      continue;
    }
    grants.push({
      permission,
      resource_type: resourceType,
      resource_id: null,
      constraints: {},
    });
  }
  return grants;
}

export function selectionIsValid(selection: GrantSelection): boolean {
  if (selection.permissions.length + selection.unknownGrants.length === 0) return false;
  return selection.permissions.every((permission) => {
    if (!AGENT_SCOPED_PERMISSIONS.has(permission)) return true;
    const range = selection.agentRanges[permission];
    return range?.mode !== "selected" || range.agentIds.length > 0;
  });
}

export function expirationISO(choice: ExpirationChoice): string | null {
  if (choice === "never") return null;
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + Number(choice));
  return expiresAt.toISOString();
}

export function tokenIsExpired(token: UserTokenItem): boolean {
  return Boolean(token.expires_at && new Date(token.expires_at).getTime() <= Date.now());
}

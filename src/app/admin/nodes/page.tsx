import {
  type AdminRuntimeNodeList,
  RuntimeNodeManagement,
} from "@/components/admin/runtime-node-management";
import { apiFetchAuthed, localizedErrorMessage } from "@/lib/api";

import {
  activateRuntimeNodeAction,
  drainRuntimeNodeAction,
  revokeRuntimeNodeAction,
} from "../actions";
import {
  ADMIN_PAGE_SIZE,
  AdminShell,
  type AdminSearchParams,
  ForbiddenAdmin,
  buildQuery,
  getAdminContext,
  offsetForPage,
  pageFromParams,
  pageHref,
} from "../_components/shared";

async function loadNodes(page: number, locale: "zh" | "en") {
  try {
    return {
      nodes: await apiFetchAuthed<AdminRuntimeNodeList>(
        `/api/v1/admin/runtime/nodes${buildQuery({
          limit: ADMIN_PAGE_SIZE,
          offset: offsetForPage(page),
        })}`,
        { cache: "no-store" },
      ),
      error: null,
    };
  } catch (error) {
    return {
      nodes: {
        items: [],
        total: 0,
        limit: ADMIN_PAGE_SIZE,
        offset: offsetForPage(page),
        current_contract_id: "",
        current_contract_digest: "",
        database_time: new Date().toISOString(),
      } satisfies AdminRuntimeNodeList,
      error: localizedErrorMessage(
        error,
        locale,
        locale === "zh" ? "Runtime Node 列表加载失败" : "Failed to load Runtime Nodes",
      ),
    };
  }
}

export default async function AdminRuntimeNodesPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const page = pageFromParams(params);
  const { locale, me } = await getAdminContext(`/admin/nodes${buildQuery(params)}`);
  if (!me?.is_admin) return <ForbiddenAdmin locale={locale} />;

  const { nodes, error } = await loadNodes(page, locale);
  const totalPages = Math.max(1, Math.ceil(nodes.total / Math.max(nodes.limit, 1)));
  const returnTo = pageHref("/admin/nodes", params, page);

  return (
    <AdminShell active="nodes" locale={locale} status={params.status} error={params.error}>
      <RuntimeNodeManagement
        locale={locale}
        nodes={nodes}
        error={error}
        page={page}
        previousHref={page > 1 ? pageHref("/admin/nodes", params, page - 1) : undefined}
        nextHref={page < totalPages ? pageHref("/admin/nodes", params, page + 1) : undefined}
        returnTo={returnTo}
        drainAction={drainRuntimeNodeAction}
        activateAction={activateRuntimeNodeAction}
        revokeAction={revokeRuntimeNodeAction}
      />
    </AdminShell>
  );
}

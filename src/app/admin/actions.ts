"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { apiFetchAuthed, localizedErrorMessage } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

function messageFromError(error: unknown, locale: Locale, fallback: string): string {
  return localizedErrorMessage(error, locale, fallback);
}

/**
 * 表单显式带上的 locale 优先（Runtime Node 表单会传 hidden input），
 * 其余管理表单没有这个字段，回退到语言 Cookie / Accept-Language。
 */
async function actionLocale(formData: FormData): Promise<Locale> {
  const explicit = formData.get("locale");
  if (explicit === "en" || explicit === "zh") return explicit;
  return getLocale();
}

function checked(formData: FormData, name: string): boolean {
  return formData.getAll(name).some((value) => value === "true" || value === "on");
}

function safeReturnTo(value: FormDataEntryValue | null, fallback: string): string {
  const raw = String(value ?? "").trim();
  if (!raw.startsWith("/admin")) return fallback;
  if (raw.startsWith("//")) return fallback;
  return raw;
}

function withMessage(path: string, kind: "status" | "error", message: string): string {
  const [pathname, hash = ""] = path.split("#", 2);
  const separator = pathname.includes("?") ? "&" : "?";
  return `${pathname}${separator}${kind}=${encodeURIComponent(message)}${hash ? `#${hash}` : ""}`;
}

function adminRedirect(formData: FormData, kind: "status" | "error", message: string, fallback: string): never {
  redirect(withMessage(safeReturnTo(formData.get("return_to"), fallback), kind, message));
}

function revalidateAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/tasks");
  revalidatePath("/admin/users");
  revalidatePath("/admin/agents");
  revalidatePath("/admin/nodes");
}

export async function updateUserFlagsAction(formData: FormData) {
  const locale = await actionLocale(formData);
  const copy =
    locale === "zh"
      ? { missing: "缺少用户 ID", failed: "更新用户权限失败", done: "用户权限已更新" }
      : {
          missing: "User ID is missing",
          failed: "Failed to update user permissions",
          done: "User permissions updated",
        };
  const id = String(formData.get("id") ?? "").trim();
  if (!id) adminRedirect(formData, "error", copy.missing, "/admin/users");

  try {
    await apiFetchAuthed(`/api/v1/admin/users/${id}/flags`, {
      method: "PATCH",
      body: {
        is_admin: checked(formData, "is_admin"),
        is_creator: checked(formData, "is_creator"),
        creator_verified: checked(formData, "creator_verified"),
      },
    });
    revalidateAdmin();
  } catch (error) {
    adminRedirect(formData, "error", messageFromError(error, locale, copy.failed), "/admin/users");
  }

  adminRedirect(formData, "status", copy.done, "/admin/users");
}

export async function createUserAction(formData: FormData) {
	const locale = await actionLocale(formData);
	const copy =
		locale === "zh"
			? { failed: "创建用户失败", done: "用户已创建" }
			: { failed: "Failed to create the user", done: "User created" };

	try {
		await apiFetchAuthed("/api/v1/admin/users", {
			method: "POST",
			body: {
				email: String(formData.get("email") ?? "").trim(),
				display_name: String(formData.get("display_name") ?? "").trim(),
				password: String(formData.get("password") ?? ""),
				is_admin: checked(formData, "is_admin"),
				is_creator: checked(formData, "is_creator"),
				creator_verified: checked(formData, "creator_verified"),
			},
		});
		revalidateAdmin();
	} catch (error) {
		adminRedirect(formData, "error", messageFromError(error, locale, copy.failed), "/admin/users");
	}

	adminRedirect(formData, "status", copy.done, "/admin/users");
}

export async function updateAgentModerationAction(formData: FormData) {
  const locale = await actionLocale(formData);
  const copy =
    locale === "zh"
      ? { missing: "缺少 Agent ID", failed: "更新 Agent 状态失败", done: "Agent 状态已更新" }
      : {
          missing: "Agent ID is missing",
          failed: "Failed to update the Agent status",
          done: "Agent status updated",
        };
  const id = String(formData.get("id") ?? "").trim();
  if (!id) adminRedirect(formData, "error", copy.missing, "/admin/agents");

  try {
    await apiFetchAuthed(`/api/v1/admin/agents/${id}/moderation`, {
      method: "PATCH",
      body: {
        lifecycle_status: String(formData.get("lifecycle_status") ?? ""),
        visibility: String(formData.get("visibility") ?? ""),
        certification_status: String(formData.get("certification_status") ?? ""),
        rejection_reason: String(formData.get("rejection_reason") ?? "").trim(),
      },
    });
    revalidateAdmin();
  } catch (error) {
    adminRedirect(formData, "error", messageFromError(error, locale, copy.failed), "/admin/agents");
  }

  adminRedirect(formData, "status", copy.done, "/admin/agents");
}

export async function certifyAgentAction(formData: FormData) {
  const locale = await actionLocale(formData);
  const copy =
    locale === "zh"
      ? { missing: "缺少 Agent ID", failed: "实例认证通过失败", done: "Agent 已通过实例认证" }
      : {
          missing: "Agent ID is missing",
          failed: "Failed to grant instance certification",
          done: "Agent passed instance certification",
        };
  const id = String(formData.get("id") ?? "").trim();
  if (!id) adminRedirect(formData, "error", copy.missing, "/admin/agents");

  try {
    await apiFetchAuthed(`/api/v1/admin/agents/${id}/certify`, { method: "POST" });
    revalidateAdmin();
  } catch (error) {
    adminRedirect(formData, "error", messageFromError(error, locale, copy.failed), "/admin/agents");
  }

  adminRedirect(formData, "status", copy.done, "/admin/agents");
}

export async function rejectCertificationAction(formData: FormData) {
  const locale = await actionLocale(formData);
  const copy =
    locale === "zh"
      ? {
          missing: "缺少 Agent ID",
          reason: "拒绝原因不能为空",
          failed: "拒绝实例认证失败",
          done: "Agent 实例认证已拒绝",
        }
      : {
          missing: "Agent ID is missing",
          reason: "A rejection reason is required",
          failed: "Failed to reject instance certification",
          done: "Agent instance certification rejected",
        };
  const id = String(formData.get("id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id) adminRedirect(formData, "error", copy.missing, "/admin/agents");
  if (!reason) adminRedirect(formData, "error", copy.reason, "/admin/agents");

  try {
    await apiFetchAuthed(`/api/v1/admin/agents/${id}/reject-certification`, {
      method: "POST",
      body: { reason },
    });
    revalidateAdmin();
  } catch (error) {
    adminRedirect(formData, "error", messageFromError(error, locale, copy.failed), "/admin/agents");
  }

  adminRedirect(formData, "status", copy.done, "/admin/agents");
}

export async function drainRuntimeNodeAction(formData: FormData) {
  const locale = await actionLocale(formData);
  const nodeID = String(formData.get("node_id") ?? "").trim();
  const copy = locale === "zh"
    ? { missing: "缺少 Node ID", failed: "无法让 Runtime Node 停止接收新任务", done: "Runtime Node 已停止接收新任务" }
    : { missing: "Node ID is missing", failed: "Failed to stop new work on the Runtime Node", done: "The Runtime Node is no longer accepting new work" };
  if (!nodeID) adminRedirect(formData, "error", copy.missing, "/admin/nodes");

  try {
    await apiFetchAuthed(`/api/v1/admin/runtime/nodes/${encodeURIComponent(nodeID)}/drain`, {
      method: "POST",
    });
    revalidateAdmin();
  } catch {
    adminRedirect(formData, "error", copy.failed, "/admin/nodes");
  }

  adminRedirect(formData, "status", copy.done, "/admin/nodes");
}

export async function activateRuntimeNodeAction(formData: FormData) {
  const locale = await actionLocale(formData);
  const nodeID = String(formData.get("node_id") ?? "").trim();
  const copy = locale === "zh"
    ? {
        missing: "缺少 Node ID",
        failed: "无法恢复 Runtime Node；请确认没有在途任务，并且在线 Session、证书身份和协议仍有效",
        done: "Runtime Node 已恢复接收新任务",
      }
    : {
        missing: "Node ID is missing",
        failed: "Failed to resume the Runtime Node; confirm that no work is in flight and its online Session, certificate identity, and protocol remain valid",
        done: "The Runtime Node is accepting new work again",
      };
  if (!nodeID) adminRedirect(formData, "error", copy.missing, "/admin/nodes");

  try {
    await apiFetchAuthed(`/api/v1/admin/runtime/nodes/${encodeURIComponent(nodeID)}/activate`, {
      method: "POST",
    });
    revalidateAdmin();
  } catch {
    adminRedirect(formData, "error", copy.failed, "/admin/nodes");
  }

  adminRedirect(formData, "status", copy.done, "/admin/nodes");
}

export async function revokeRuntimeNodeAction(formData: FormData) {
  const locale = await actionLocale(formData);
  const nodeID = String(formData.get("node_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const copy = locale === "zh"
    ? {
        missing: "缺少 Node ID",
        reason: "撤销原因不能为空",
        failed: "无法撤销 Runtime Node",
        done: "Runtime Node 已撤销，现有连接将失效",
      }
    : {
        missing: "Node ID is missing",
        reason: "A revocation reason is required",
        failed: "Failed to revoke the Runtime Node",
        done: "The Runtime Node was revoked and its existing connections are no longer valid",
      };
  if (!nodeID) adminRedirect(formData, "error", copy.missing, "/admin/nodes");
  if (!reason) adminRedirect(formData, "error", copy.reason, "/admin/nodes");

  try {
    await apiFetchAuthed(`/api/v1/admin/runtime/nodes/${encodeURIComponent(nodeID)}/revoke`, {
      method: "POST",
      body: { reason },
    });
    revalidateAdmin();
  } catch {
    adminRedirect(formData, "error", copy.failed, "/admin/nodes");
  }

  adminRedirect(formData, "status", copy.done, "/admin/nodes");
}

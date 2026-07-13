"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { apiFetchAuthed } from "@/lib/api";

function messageFromError(error: unknown, fallback: string): string {
  return fallback;
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
	const id = String(formData.get("id") ?? "").trim();
	if (!id) adminRedirect(formData, "error", "缺少用户 ID", "/admin/users");

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
    adminRedirect(formData, "error", messageFromError(error, "更新用户权限失败"), "/admin/users");
  }

	adminRedirect(formData, "status", "用户权限已更新", "/admin/users");
}

export async function createUserAction(formData: FormData) {
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
		adminRedirect(formData, "error", messageFromError(error, "创建用户失败"), "/admin/users");
	}

	adminRedirect(formData, "status", "用户已创建", "/admin/users");
}

export async function updateAgentModerationAction(formData: FormData) {
	const id = String(formData.get("id") ?? "").trim();
	if (!id) adminRedirect(formData, "error", "缺少 Agent ID", "/admin/agents");

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
    adminRedirect(formData, "error", messageFromError(error, "更新 Agent 状态失败"), "/admin/agents");
  }

  adminRedirect(formData, "status", "Agent 状态已更新", "/admin/agents");
}

export async function certifyAgentAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) adminRedirect(formData, "error", "缺少 Agent ID", "/admin/agents");

  try {
    await apiFetchAuthed(`/api/v1/admin/agents/${id}/certify`, { method: "POST" });
    revalidateAdmin();
  } catch (error) {
    adminRedirect(formData, "error", messageFromError(error, "实例认证通过失败"), "/admin/agents");
  }

  adminRedirect(formData, "status", "Agent 已通过实例认证", "/admin/agents");
}

export async function rejectCertificationAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id) adminRedirect(formData, "error", "缺少 Agent ID", "/admin/agents");
  if (!reason) adminRedirect(formData, "error", "拒绝原因不能为空", "/admin/agents");

  try {
    await apiFetchAuthed(`/api/v1/admin/agents/${id}/reject-certification`, {
      method: "POST",
      body: { reason },
    });
    revalidateAdmin();
  } catch (error) {
    adminRedirect(formData, "error", messageFromError(error, "拒绝实例认证失败"), "/admin/agents");
  }

  adminRedirect(formData, "status", "Agent 实例认证已拒绝", "/admin/agents");
}

function actionLocale(formData: FormData): "zh" | "en" {
  return formData.get("locale") === "en" ? "en" : "zh";
}

export async function drainRuntimeNodeAction(formData: FormData) {
  const locale = actionLocale(formData);
  const nodeID = String(formData.get("node_id") ?? "").trim();
  const copy = locale === "zh"
    ? { missing: "缺少 Node ID", failed: "无法让 Agent Node 进入排空状态", done: "Agent Node 已开始排空" }
    : { missing: "Node ID is missing", failed: "Failed to start draining the Agent Node", done: "The Agent Node is draining" };
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

export async function revokeRuntimeNodeAction(formData: FormData) {
  const locale = actionLocale(formData);
  const nodeID = String(formData.get("node_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const copy = locale === "zh"
    ? {
        missing: "缺少 Node ID",
        reason: "撤销原因不能为空",
        failed: "无法撤销 Agent Node",
        done: "Agent Node 已撤销，现有连接将失效",
      }
    : {
        missing: "Node ID is missing",
        reason: "A revocation reason is required",
        failed: "Failed to revoke the Agent Node",
        done: "The Agent Node was revoked and its existing connections are no longer valid",
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

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ApiError, apiFetchAuthed } from "@/lib/api";

function messageFromError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
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
  revalidatePath("/admin/users");
  revalidatePath("/admin/agents");
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
    adminRedirect(formData, "error", messageFromError(error, "认证通过失败"), "/admin/agents");
  }

  adminRedirect(formData, "status", "Agent 已认证", "/admin/agents");
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
    adminRedirect(formData, "error", messageFromError(error, "拒绝认证失败"), "/admin/agents");
  }

  adminRedirect(formData, "status", "Agent 认证已拒绝", "/admin/agents");
}

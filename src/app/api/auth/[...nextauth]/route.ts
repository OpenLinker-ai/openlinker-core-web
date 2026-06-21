/**
 * NextAuth route handlers。
 *
 * 阶段 2 由 auth subagent 完整实现 providers 配置。
 */
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;

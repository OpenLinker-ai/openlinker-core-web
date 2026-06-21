/**
 * 扩展 next-auth 的内置类型，让 TypeScript 认识自定义字段。
 *
 * - Session.jwt：后端签发的 JWT 字符串，apiFetch 用它加 Authorization header
 * - Session.user.id：后端用户 id（NextAuth 默认 user 上没有 id）
 * - JWT.jwt / JWT.userId：jwt callback 透传字段
 */

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    /** 后端签发的 JWT，前端调后端 API 时挂到 Authorization */
    jwt?: string;
    user: {
      id?: string;
    } & DefaultSession["user"];
  }

  interface User {
    /** authorize 返回的后端 JWT（透传到 jwt callback 用） */
    jwt?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    jwt?: string;
    userId?: string;
  }
}

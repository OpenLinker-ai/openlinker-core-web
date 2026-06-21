/**
 * NextAuth v5 配置。
 *
 * 设计要点：
 *   - Credentials provider：调后端 POST /api/v1/auth/login
 *   - token-credentials provider：用于 Google OAuth 回调（后端 /auth/google 走完后
 *     redirect 到前端 /auth/callback?token=xxx，前端再用 signIn("token-credentials") 接管）
 *   - jwt / session callbacks 把后端 JWT 透传给客户端，方便 useSession 读取
 *   - session strategy: jwt（NextAuth 自身签名 cookie，存后端 JWT 字符串）
 *
 * Server Component 通过 `auth()` 拿 session；
 * Client Component 通过 `useSession()` 拿 session。
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { getApiBaseUrl } from "@/lib/api-root";

const API_URL = getApiBaseUrl();

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      // 邮箱 + 密码登录
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const res = await fetch(`${API_URL}/api/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) return null;

        const data = (await res.json()) as {
          user_id: string;
          email: string;
          display_name: string;
          jwt: string;
        };

        return {
          id: data.user_id,
          email: data.email,
          name: data.display_name,
          jwt: data.jwt,
        };
      },
    }),
    Credentials({
      // Google OAuth 回调时使用：前端拿到后端签发的 token 后，
      // 调用 signIn("token-credentials", { token }) 把会话交给 NextAuth 接管。
      id: "token-credentials",
      name: "Token",
      credentials: {
        token: { label: "Token", type: "text" },
      },
      authorize: async (credentials) => {
        const token = credentials?.token as string | undefined;
        if (!token) return null;

        const res = await fetch(`${API_URL}/api/v1/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return null;

        const me = (await res.json()) as {
          user_id: string;
          email: string;
          display_name: string;
          avatar_url?: string;
          is_creator?: boolean;
          is_admin?: boolean;
        };

        return {
          id: me.user_id,
          email: me.email,
          name: me.display_name,
          image: me.avatar_url,
          jwt: token,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // 把后端 JWT 透传到 NextAuth token（仅在 user 存在的首次签发时）
    async jwt({ token, user }) {
      if (user) {
        token.jwt = (user as { jwt?: string }).jwt;
        token.userId = user.id;
      }
      return token;
    },
    // 暴露给客户端 useSession()
    async session({ session, token }) {
      // 注：next-auth 的 JWT 接口是 `Record<string, unknown>`，
      // 即便我们做了 module augmentation，索引签名仍会让自定义字段
      // 推断成 unknown，因此这里需要一次显式断言。
      if (typeof token.jwt === "string") session.jwt = token.jwt;
      if (typeof token.userId === "string" && session.user) {
        session.user.id = token.userId;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24h
  },
});

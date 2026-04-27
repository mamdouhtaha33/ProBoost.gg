import NextAuth, { type DefaultSession } from "next-auth";
import type { JWT } from "@auth/core/jwt";

type JWTToken = JWT & {
  userId?: string;
  role?: Role;
  email?: string | null;
};

import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
  interface User {
    role?: Role;
  }
}

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      // Auto-promote bootstrap admins on first sign-in.
      if (user.email && adminEmails.includes(user.email.toLowerCase())) {
        await prisma.user.update({
          where: { email: user.email },
          data: { role: "ADMIN" },
        }).catch(() => {
          /* user may not exist yet (first sign-in); adapter creates it after this. */
        });
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      const t = token as JWTToken;
      if (user) {
        t.userId = user.id;
        t.role = (user.role as Role | undefined) ?? "USER";
      }
      // Always refresh role from DB on session updates so admin promotion is reflected.
      if (trigger === "update" || !t.role) {
        if (t.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: t.email },
            select: { id: true, role: true },
          });
          if (dbUser) {
            t.userId = dbUser.id;
            t.role = dbUser.role;
          }
        }
      }
      return t;
    },
    async session({ session, token }) {
      const t = token as JWTToken;
      if (t.userId) session.user.id = t.userId;
      session.user.role = t.role ?? "USER";
      return session;
    },
  },
});

export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function requireRole(roles: Role | Role[]) {
  const user = await requireUser();
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(user.role)) {
    throw new Error("Forbidden");
  }
  return user;
}

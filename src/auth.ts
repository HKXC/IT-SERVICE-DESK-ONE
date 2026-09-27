import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.string().optional(),
});

// ─── Future SSO extension point ─────────────────────────────────────────────
// To add Entra ID / Google / LDAP: import the provider here and append to the
// `providers` array, then set `identityProvider` on User during link/creation.
// The session/user model intentionally carries `identityProvider` + `roleId`
// instead of hardcoding credential-only assumptions (see prisma schema).
// Docs: https://authjs.dev/getting-started/authentication/oauth
// ────────────────────────────────────────────────────────────────────────────

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember me", type: "text" },
      },
      async authorize(raw) {
        const parsed = CredentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password, rememberMe } = parsed.data;

        // Basic brute-force mitigation is enforced in the login action via
        // rate-limit; this authorize path is defense-in-depth.
        const user = await db.user.findUnique({
          where: { email: email.toLowerCase().trim() },
          include: { role: true },
        });
        if (!user || !user.passwordHash || !user.isActive) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          roleId: user.roleId,
          roleName: user.role?.name,
          rememberMe: rememberMe === "true" || rememberMe === "on",
        } as unknown as import("next-auth").User;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = (user as { id?: string }).id ?? token.sub;
        token.roleId = (user as { roleId?: string }).roleId;
        token.roleName = (user as { roleName?: string }).roleName;
        const remember = (user as { rememberMe?: boolean }).rememberMe;
        // Remember-me → 30d session, else 12h
        token.rememberMe = remember;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        (session.user as { roleId?: unknown }).roleId = token.roleId;
        (session.user as { roleName?: unknown }).roleName = token.roleName;
      }
      if (token.rememberMe) {
        // Extend to 30d for remember-me (default session maxAge is 12h —
        // set NEXTAUTH session maxAge accordingly at deploy if needed).
        (session as { expires: unknown }).expires = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString();
      }
      return session;
    },
  },
});

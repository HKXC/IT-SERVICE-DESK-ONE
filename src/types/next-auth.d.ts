import "next-auth";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roleId?: string | null;
      roleName?: string | null;
    } & DefaultSession["user"];
  }
  interface User {
    roleId?: string | null;
    roleName?: string | null;
    rememberMe?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roleId?: string | null;
    roleName?: string | null;
    rememberMe?: boolean;
  }
}

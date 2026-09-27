import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { PermissionKey } from "@/lib/permissions";
import { cache } from "react";

/** Cached session getter for Server Components / Actions. */
export const getSession = cache(async () => auth());

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.user.findUnique({
    where: { id: session.user.id },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
      department: true,
      location: true,
    },
  });
}

export async function getUserPermissions(userId: string): Promise<Set<string>> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });
  const keys = user?.role?.permissions.map((rp) => rp.permission.key) ?? [];
  return new Set(keys);
}

/**
 * Server-side authorization. Throws 403-style Error when denied.
 * MUST be called inside every Server Action / Route Handler that touches
 * protected data — UI hiding is never sufficient.
 */
export async function requirePermission(key: PermissionKey) {
  const session = await auth();
  if (!session?.user?.id) {
    const err = new Error("Unauthorized");
    (err as Error & { status?: number }).status = 401;
    throw err;
  }
  const perms = await getUserPermissions(session.user.id);
  if (!perms.has(key)) {
    const err = new Error(`Forbidden: missing permission ${key}`);
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  return session;
}

export async function hasPermission(key: PermissionKey): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;
  const perms = await getUserPermissions(session.user.id);
  return perms.has(key);
}

/** Internal notes visibility gate — Technician+ only. */
export async function canViewInternalNotes(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;
  const perms = await getUserPermissions(session.user.id);
  return (
    perms.has("ticket.update") ||
    perms.has("ticket.assign") ||
    perms.has("ticket.read_all")
  );
}

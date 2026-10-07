import { auth } from "@/auth";
import { db } from "@/lib/db";
import { roleHasCapability, type Capability } from "@/lib/permissions";
import { cache } from "react";

/** Cached session getter for Server Components / Actions. */
export const getSession = cache(async () => auth());

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.user.findUnique({
    where: { id: session.user.id },
    include: { role: true, department: true, location: true },
  });
}

export async function getUserRoleName(userId: string): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: { select: { name: true } } },
  });
  return user?.role?.name ?? null;
}

/**
 * Server-side authorization. Throws 403-style Error when denied.
 * MUST be called inside every Server Action / Route Handler that touches
 * protected data — UI hiding is never sufficient.
 */
export async function requireCapability(capability: Capability) {
  const session = await auth();
  if (!session?.user?.id) {
    const err = new Error("Unauthorized");
    (err as Error & { status?: number }).status = 401;
    throw err;
  }
  const roleName = await getUserRoleName(session.user.id);
  if (!roleHasCapability(roleName, capability)) {
    const err = new Error(`Forbidden: missing capability ${capability}`);
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  return session;
}

export async function hasCapability(capability: Capability): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;
  return roleHasCapability(await getUserRoleName(session.user.id), capability);
}

/** Internal notes visibility gate — Technician and Administrator only. */
export async function canViewInternalNotes(): Promise<boolean> {
  return hasCapability("ticket.update");
}

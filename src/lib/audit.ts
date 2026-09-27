import { db } from "@/lib/db";

/** Append-only audit trail. Call from every mutating Server Action. */
export async function audit(params: {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
}) {
  try {
    await db.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        before: (params.before ?? null) as never,
        after: (params.after ?? null) as never,
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch (e) {
    // Audit must never break the primary write path — log and continue.
    console.error("[audit] failed to write audit log:", e);
  }
}

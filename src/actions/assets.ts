"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth-helpers";
import { assetCreateSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import type { AssetStatus } from "@prisma/client";

// ─── Assets ─────────────────────────────────────────────────────────────────
export async function createAsset(raw: unknown) {
  await requireCapability("asset.manage");
  const session = await auth();
  const input = assetCreateSchema.parse(raw);

  const asset = await db.asset.create({
    data: {
      assetTag: input.assetTag.trim().toUpperCase(),
      name: input.name.trim(),
      type: input.type,
      serialNumber: input.serialNumber || null,
      brand: input.brand || null,
      model: input.model || null,
      status: "IN_STOCK",
      history: {
        create: {
          event: "CREATED",
          toStatus: "IN_STOCK",
          detail: "Asset created",
          actorId: session?.user?.id,
        },
      },
    },
  });

  revalidatePath("/assets");
  return { id: asset.id };
}

export async function changeAssetStatus(
  assetId: string,
  toStatus: AssetStatus,
  detail?: string
) {
  await requireCapability("asset.manage");
  const session = await auth();

  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new Error("Asset not found");

  const updated = await db.$transaction(async (tx) => {
    const a = await tx.asset.update({ where: { id: assetId }, data: { status: toStatus } });
    await tx.assetHistoryEvent.create({
      data: {
        assetId,
        event: "STATUS_CHANGED",
        fromStatus: asset.status,
        toStatus,
        detail: detail ?? `Status ${asset.status} → ${toStatus}`,
        actorId: session?.user?.id,
      },
    });
    return a;
  });

  revalidatePath(`/assets/${assetId}`);
  return { status: updated.status };
}

export async function assignAsset(assetId: string, userId: string | null, note?: string) {
  await requireCapability("asset.manage");
  const session = await auth();
  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new Error("Asset not found");

  await db.$transaction(async (tx) => {
    // Close previous open assignment
    await tx.assetAssignment.updateMany({
      where: { assetId, returnedAt: null },
      data: { returnedAt: new Date() },
    });
    if (userId) {
      await tx.assetAssignment.create({
        data: { assetId, userId, note: note ?? null },
      });
    }
    await tx.asset.update({
      where: { id: assetId },
      data: {
        assignedUserId: userId,
        status: userId ? "ASSIGNED" : "IN_STOCK",
      },
    });
    await tx.assetHistoryEvent.create({
      data: {
        assetId,
        event: userId ? "ASSIGNED" : "UNASSIGNED",
        fromStatus: asset.status,
        toStatus: userId ? "ASSIGNED" : "IN_STOCK",
        detail: note ?? (userId ? `Assigned to ${userId}` : "Returned to stock"),
        actorId: session?.user?.id,
      },
    });
  });

  revalidatePath(`/assets/${assetId}`);
  return { ok: true };
}

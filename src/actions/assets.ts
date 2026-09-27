"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { assetCreateSchema, stockTxnSchema, inventoryItemSchema, vendorSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

// ─── Assets ─────────────────────────────────────────────────────────────────
export async function createAsset(raw: unknown) {
  await requirePermission("asset.create");
  const session = await auth();
  const input = assetCreateSchema.parse(raw);

  const asset = await db.asset.create({
    data: {
      assetTag: input.assetTag.trim().toUpperCase(),
      name: input.name.trim(),
      type: input.type,
      category: input.category || null,
      serialNumber: input.serialNumber || null,
      manufacturer: input.manufacturer || null,
      brand: input.brand || null,
      model: input.model || null,
      cpu: input.cpu || null,
      ram: input.ram || null,
      storage: input.storage || null,
      gpu: input.gpu || null,
      os: input.os || null,
      osVersion: input.osVersion || null,
      hostname: input.hostname || null,
      ipAddress: input.ipAddress || null,
      macAddress: input.macAddress || null,
      purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
      purchasePrice: input.purchasePrice ?? null,
      vendorId: input.vendorId || null,
      warrantyStart: input.warrantyStart ? new Date(input.warrantyStart) : null,
      warrantyEnd: input.warrantyEnd ? new Date(input.warrantyEnd) : null,
      departmentId: input.departmentId || null,
      locationId: input.locationId || null,
      status: "IN_STOCK",
      history: {
        create: {
          event: "RECEIVED",
          toStatus: "IN_STOCK",
          detail: "Asset created / received into stock",
          actorId: session?.user?.id,
        },
      },
    },
  });

  await audit({
    actorId: session?.user?.id,
    action: "asset.created",
    entity: "Asset",
    entityId: asset.id,
    after: { assetTag: asset.assetTag },
  });
  revalidatePath("/assets");
  return { id: asset.id };
}

export async function changeAssetStatus(
  assetId: string,
  toStatus: "REQUESTED" | "PURCHASED" | "RECEIVED" | "IN_STOCK" | "ASSIGNED" | "IN_USE" | "REPAIR" | "MAINTENANCE" | "TRANSFER" | "RESERVED" | "LOST" | "RETIRED" | "DISPOSED",
  detail?: string,
  cost?: number
) {
  await requirePermission("asset.update");
  if (toStatus === "RETIRED") await requirePermission("asset.retire");
  if (toStatus === "DISPOSED") await requirePermission("asset.dispose");
  const session = await auth();

  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new Error("Asset not found");

  const updated = await db.$transaction(async (tx) => {
    const a = await tx.asset.update({ where: { id: assetId }, data: { status: toStatus } });
    await tx.assetHistoryEvent.create({
      data: {
        assetId,
        event: toStatus,
        fromStatus: asset.status,
        toStatus,
        detail: detail ?? `Status ${asset.status} → ${toStatus}`,
        cost: cost ?? null,
        actorId: session?.user?.id,
      },
    });
    return a;
  });

  await audit({
    actorId: session?.user?.id,
    action: "asset.status_changed",
    entity: "Asset",
    entityId: assetId,
    before: { status: asset.status },
    after: { status: toStatus },
  });
  revalidatePath(`/assets/${assetId}`);
  return { status: updated.status };
}

export async function assignAsset(assetId: string, userId: string | null, note?: string) {
  await requirePermission("asset.assign");
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

  await audit({
    actorId: session?.user?.id,
    action: "asset.assigned",
    entity: "Asset",
    entityId: assetId,
    after: { userId },
  });
  revalidatePath(`/assets/${assetId}`);
  return { ok: true };
}

// ─── Inventory ──────────────────────────────────────────────────────────────
export async function adjustStock(raw: unknown) {
  await requirePermission("inventory.manage");
  const session = await auth();
  const input = stockTxnSchema.parse(raw);

  const result = await db.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({ where: { id: input.itemId } });
    if (!item) throw new Error("Item not found");

    let delta = input.quantity;
    if (input.type === "STOCK_OUT" || input.type === "REPAIR_USAGE") delta = -Math.abs(delta);
    if (input.type === "STOCK_IN" || input.type === "RETURN") delta = Math.abs(delta);
    // ADJUSTMENT: quantity is the signed delta as given
    if (input.type === "ADJUSTMENT") delta = input.quantity;

    if (item.quantity + delta < 0) throw new Error("Insufficient stock");

    const txn = await tx.stockTransaction.create({
      data: {
        itemId: input.itemId,
        type: input.type,
        quantity: delta,
        quantityBefore: item.quantity,
        quantityAfter: item.quantity + delta,
        ticketId: input.ticketId || null,
        reason: input.reason || null,
        actorId: session?.user?.id,
      },
    });
    await tx.inventoryItem.update({
      where: { id: input.itemId },
      data: { quantity: item.quantity + delta },
    });
    return txn;
  });

  await audit({
    actorId: session?.user?.id,
    action: "inventory.adjusted",
    entity: "InventoryItem",
    entityId: input.itemId,
    after: { type: input.type, quantity: input.quantity },
  });
  revalidatePath("/inventory");
  return { id: result.id };
}

// ─── Inventory items ────────────────────────────────────────────────────────
export async function createInventoryItem(raw: unknown) {
  await requirePermission("inventory.manage");
  const session = await auth();
  const input = inventoryItemSchema.parse(raw);
  const item = await db.inventoryItem.create({
    data: {
      sku: input.sku.trim().toUpperCase(),
      name: input.name.trim(),
      category: input.category.trim(),
      brand: input.brand || null,
      model: input.model || null,
      quantity: input.quantity,
      minStock: input.minStock,
      locationId: input.locationId || null,
      unitCost: input.unitCost ?? null,
      vendorId: input.vendorId || null,
    },
  });
  if (input.quantity > 0) {
    await db.stockTransaction.create({
      data: {
        itemId: item.id,
        type: "STOCK_IN",
        quantity: input.quantity,
        quantityBefore: 0,
        quantityAfter: input.quantity,
        reason: "Initial stock",
        actorId: session?.user?.id,
      },
    });
  }
  await audit({
    actorId: session?.user?.id,
    action: "inventory.created",
    entity: "InventoryItem",
    entityId: item.id,
    after: { sku: item.sku, quantity: item.quantity },
  });
  revalidatePath("/inventory");
  return { id: item.id };
}

// ─── Vendors ────────────────────────────────────────────────────────────────
export async function createVendor(raw: unknown) {
  await requirePermission("vendor.manage");
  const session = await auth();
  const input = vendorSchema.parse(raw);
  const vendor = await db.vendor.create({
    data: {
      name: input.name.trim(),
      contactPerson: input.contactPerson || null,
      email: input.email || null,
      phone: input.phone || null,
      address: input.address || null,
      taxId: input.taxId || null,
    },
  });
  await audit({
    actorId: session?.user?.id,
    action: "vendor.created",
    entity: "Vendor",
    entityId: vendor.id,
    after: { name: vendor.name },
  });
  revalidatePath("/vendors");
  return { id: vendor.id };
}

export async function deleteVendor(vendorId: string) {
  await requirePermission("vendor.manage");
  const session = await auth();
  const vendor = await db.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) throw new Error("Vendor not found");
  const [assets, items, licenses] = await Promise.all([
    db.asset.count({ where: { vendorId } }),
    db.inventoryItem.count({ where: { vendorId } }),
    db.license.count({ where: { vendorId } }),
  ]);
  if (assets + items + licenses > 0) {
    throw new Error("Cannot delete: vendor is referenced by assets, inventory, or licenses");
  }
  await db.vendor.delete({ where: { id: vendorId } });
  await audit({
    actorId: session?.user?.id,
    action: "vendor.deleted",
    entity: "Vendor",
    entityId: vendorId,
    before: { name: vendor.name },
  });
  revalidatePath("/vendors");
  return { ok: true };
}

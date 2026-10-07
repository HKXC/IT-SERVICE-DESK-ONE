"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth-helpers";
import { userCreateSchema, slaPolicySchema, holidaySchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

// ─── Users ──────────────────────────────────────────────────────────────────
export async function createUser(raw: unknown) {
  await requireCapability("user.manage");
  const input = userCreateSchema.parse(raw);
  const existing = await db.user.findUnique({ where: { email: input.email.toLowerCase().trim() } });
  if (existing) throw new Error("Email already in use");
  const user = await db.user.create({
    data: {
      name: input.name.trim(),
      email: input.email.toLowerCase().trim(),
      passwordHash: await bcrypt.hash(input.password, 12),
      roleId: input.roleId,
      departmentId: input.departmentId || null,
      locationId: input.locationId || null,
    },
  });
  revalidatePath("/users");
  return { id: user.id };
}

export async function setUserActive(userId: string, isActive: boolean) {
  await requireCapability("user.manage");
  const session = await auth();
  if (userId === session?.user?.id && !isActive) {
    throw new Error("You cannot deactivate your own account");
  }
  await db.user.update({ where: { id: userId }, data: { isActive } });
  revalidatePath("/users");
  return { ok: true };
}

export async function changeUserRole(userId: string, roleId: string) {
  await requireCapability("user.manage");
  const session = await auth();
  if (userId === session?.user?.id) {
    throw new Error("You cannot change your own role");
  }
  const role = await db.role.findUnique({ where: { id: roleId } });
  if (!role) throw new Error("Role not found");
  await db.user.update({ where: { id: userId }, data: { roleId } });
  revalidatePath("/users");
  return { ok: true };
}

// ─── SLA & settings ─────────────────────────────────────────────────────────
export async function saveSLAPolicy(policyId: string | null, raw: unknown) {
  await requireCapability("settings.manage");
  const input = slaPolicySchema.parse(raw);
  if (policyId) {
    const before = await db.sLAPolicy.findUnique({ where: { id: policyId } });
    if (!before) throw new Error("Policy not found");
    if (input.isDefault) {
      await db.sLAPolicy.updateMany({ where: { NOT: { id: policyId } }, data: { isDefault: false } });
    }
    await db.sLAPolicy.update({ where: { id: policyId }, data: { ...input } });
  } else {
    if (input.isDefault) {
      await db.sLAPolicy.updateMany({ data: { isDefault: false } });
    }
    await db.sLAPolicy.create({ data: { ...input } });
  }
  revalidatePath("/settings");
  return { ok: true };
}

export async function addHoliday(raw: unknown) {
  await requireCapability("settings.manage");
  const input = holidaySchema.parse(raw);
  const date = new Date(input.date);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  const dup = await db.holiday.findUnique({ where: { date } });
  if (dup) throw new Error("Holiday on this date already exists");
  const h = await db.holiday.create({ data: { name: input.name.trim(), date } });
  revalidatePath("/settings");
  return { id: h.id };
}

export async function deleteHoliday(holidayId: string) {
  await requireCapability("settings.manage");
  await db.holiday.delete({ where: { id: holidayId } });
  revalidatePath("/settings");
  return { ok: true };
}

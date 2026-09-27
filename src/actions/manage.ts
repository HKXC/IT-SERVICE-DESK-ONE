"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import {
  userCreateSchema,
  softwareSchema,
  licenseSchema,
  licenseAssignSchema,
  kbArticleSchema,
  slaPolicySchema,
  holidaySchema,
} from "@/lib/validations";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

// ─── Users ──────────────────────────────────────────────────────────────────
export async function createUser(raw: unknown) {
  await requirePermission("user.manage");
  const session = await auth();
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
  await audit({
    actorId: session?.user?.id,
    action: "user.created",
    entity: "User",
    entityId: user.id,
    after: { email: user.email },
  });
  revalidatePath("/users");
  return { id: user.id };
}

export async function setUserActive(userId: string, isActive: boolean) {
  await requirePermission("user.manage");
  const session = await auth();
  if (userId === session?.user?.id && !isActive) {
    throw new Error("You cannot deactivate your own account");
  }
  await db.user.update({ where: { id: userId }, data: { isActive } });
  await audit({
    actorId: session?.user?.id,
    action: isActive ? "user.activated" : "user.deactivated",
    entity: "User",
    entityId: userId,
  });
  revalidatePath("/users");
  return { ok: true };
}

export async function changeUserRole(userId: string, roleId: string) {
  await requirePermission("user.manage");
  const session = await auth();
  if (userId === session?.user?.id) {
    throw new Error("You cannot change your own role");
  }
  const role = await db.role.findUnique({ where: { id: roleId } });
  if (!role) throw new Error("Role not found");
  await db.user.update({ where: { id: userId }, data: { roleId } });
  await audit({
    actorId: session?.user?.id,
    action: "user.role_changed",
    entity: "User",
    entityId: userId,
    after: { role: role.name },
  });
  revalidatePath("/users");
  return { ok: true };
}

// ─── Software & licenses ────────────────────────────────────────────────────
export async function createSoftware(raw: unknown) {
  await requirePermission("license.manage");
  const session = await auth();
  const input = softwareSchema.parse(raw);
  const sw = await db.software.create({
    data: {
      name: input.name.trim(),
      vendor: input.vendor || null,
      version: input.version || null,
      category: input.category || null,
      licenseType: input.licenseType || null,
      description: input.description || null,
    },
  });
  await audit({
    actorId: session?.user?.id,
    action: "software.created",
    entity: "Software",
    entityId: sw.id,
    after: { name: sw.name },
  });
  revalidatePath("/software");
  return { id: sw.id };
}

export async function createLicense(raw: unknown) {
  await requirePermission("license.manage");
  const session = await auth();
  const input = licenseSchema.parse(raw);
  if (input.key) {
    const dup = await db.license.findUnique({ where: { key: input.key.trim() } });
    if (dup) throw new Error("License key already exists");
  }
  const lic = await db.license.create({
    data: {
      softwareId: input.softwareId,
      key: input.key?.trim() || null,
      seatsTotal: input.seatsTotal,
      purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
      expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
      cost: input.cost ?? null,
      vendorId: input.vendorId || null,
    },
  });
  await audit({
    actorId: session?.user?.id,
    action: "license.created",
    entity: "License",
    entityId: lic.id,
  });
  revalidatePath("/software");
  return { id: lic.id };
}

export async function assignLicense(raw: unknown) {
  await requirePermission("license.manage");
  const session = await auth();
  const input = licenseAssignSchema.parse(raw);
  const result = await db.$transaction(async (tx) => {
    const lic = await tx.license.findUnique({
      where: { id: input.licenseId },
      include: { _count: { select: { assignments: true } } },
    });
    if (!lic) throw new Error("License not found");
    const active = await tx.licenseAssignment.count({
      where: { licenseId: input.licenseId, revokedAt: null },
    });
    if (active >= lic.seatsTotal) throw new Error("No seats available");
    const existing = await tx.licenseAssignment.findUnique({
      where: { licenseId_userId: { licenseId: input.licenseId, userId: input.userId } },
    });
    if (existing && !existing.revokedAt) throw new Error("Already assigned to this user");
    if (existing) {
      return tx.licenseAssignment.update({
        where: { id: existing.id },
        data: { revokedAt: null },
      });
    }
    return tx.licenseAssignment.create({
      data: { licenseId: input.licenseId, userId: input.userId },
    });
  });
  await audit({
    actorId: session?.user?.id,
    action: "license.assigned",
    entity: "License",
    entityId: input.licenseId,
    after: { userId: input.userId },
  });
  revalidatePath("/software");
  return { id: result.id };
}

export async function revokeLicense(assignmentId: string) {
  await requirePermission("license.manage");
  const session = await auth();
  const a = await db.licenseAssignment.findUnique({ where: { id: assignmentId } });
  if (!a) throw new Error("Assignment not found");
  await db.licenseAssignment.update({ where: { id: assignmentId }, data: { revokedAt: new Date() } });
  await audit({
    actorId: session?.user?.id,
    action: "license.revoked",
    entity: "License",
    entityId: a.licenseId,
  });
  revalidatePath("/software");
  return { ok: true };
}

// ─── Knowledge base ─────────────────────────────────────────────────────────
function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9\u0E00-\u0E7F]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || `article-${Date.now()}`
  );
}

export async function createArticle(raw: unknown) {
  await requirePermission("kb.manage");
  const session = await auth();
  const input = kbArticleSchema.parse(raw);
  let slug = slugify(input.title);
  if (await db.knowledgeArticle.findUnique({ where: { slug } })) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }
  const article = await db.knowledgeArticle.create({
    data: {
      title: input.title.trim(),
      slug,
      summary: input.summary || null,
      body: input.body,
      categoryId: input.categoryId || null,
      authorId: session?.user?.id,
      tags: input.tags,
      isPublished: input.isPublished,
    },
  });
  await audit({
    actorId: session?.user?.id,
    action: "kb.created",
    entity: "KnowledgeArticle",
    entityId: article.id,
    after: { title: article.title },
  });
  revalidatePath("/knowledge");
  return { id: article.id, slug };
}

export async function updateArticle(articleId: string, raw: unknown) {
  await requirePermission("kb.manage");
  const session = await auth();
  const input = kbArticleSchema.parse(raw);
  const before = await db.knowledgeArticle.findUnique({ where: { id: articleId } });
  if (!before) throw new Error("Article not found");
  await db.knowledgeArticle.update({
    where: { id: articleId },
    data: {
      title: input.title.trim(),
      summary: input.summary || null,
      body: input.body,
      categoryId: input.categoryId || null,
      tags: input.tags,
      isPublished: input.isPublished,
    },
  });
  await audit({
    actorId: session?.user?.id,
    action: "kb.updated",
    entity: "KnowledgeArticle",
    entityId: articleId,
    before: { title: before.title },
    after: { title: input.title },
  });
  revalidatePath("/knowledge");
  revalidatePath(`/knowledge/${before.slug}`);
  return { ok: true };
}

export async function deleteArticle(articleId: string) {
  await requirePermission("kb.manage");
  const session = await auth();
  const before = await db.knowledgeArticle.findUnique({ where: { id: articleId } });
  if (!before) throw new Error("Article not found");
  await db.knowledgeArticle.delete({ where: { id: articleId } });
  await audit({
    actorId: session?.user?.id,
    action: "kb.deleted",
    entity: "KnowledgeArticle",
    entityId: articleId,
    before: { title: before.title },
  });
  revalidatePath("/knowledge");
  return { ok: true };
}

// ─── SLA & settings ─────────────────────────────────────────────────────────
export async function saveSLAPolicy(policyId: string | null, raw: unknown) {
  await requirePermission("sla.manage");
  const session = await auth();
  const input = slaPolicySchema.parse(raw);
  if (policyId) {
    const before = await db.sLAPolicy.findUnique({ where: { id: policyId } });
    if (!before) throw new Error("Policy not found");
    if (input.isDefault) {
      await db.sLAPolicy.updateMany({ where: { NOT: { id: policyId } }, data: { isDefault: false } });
    }
    await db.sLAPolicy.update({ where: { id: policyId }, data: { ...input } });
    await audit({
      actorId: session?.user?.id,
      action: "sla.updated",
      entity: "SLAPolicy",
      entityId: policyId,
      after: { name: input.name },
    });
  } else {
    if (input.isDefault) {
      await db.sLAPolicy.updateMany({ data: { isDefault: false } });
    }
    const created = await db.sLAPolicy.create({ data: { ...input } });
    await audit({
      actorId: session?.user?.id,
      action: "sla.created",
      entity: "SLAPolicy",
      entityId: created.id,
      after: { name: input.name },
    });
  }
  revalidatePath("/settings");
  return { ok: true };
}

export async function savePriorityMatrix(matrix: Record<string, string>) {
  await requirePermission("settings.manage");
  const session = await auth();
  const allowed = ["P1", "P2", "P3", "P4"];
  for (const [k, v] of Object.entries(matrix)) {
    if (!/^(HIGH|MEDIUM|LOW):(HIGH|MEDIUM|LOW)$/.test(k) || !allowed.includes(v)) {
      throw new Error(`Invalid matrix entry ${k}=${v}`);
    }
  }
  await db.systemSetting.upsert({
    where: { key: "priority_matrix" },
    update: { value: matrix as never },
    create: { key: "priority_matrix", value: matrix as never },
  });
  await audit({
    actorId: session?.user?.id,
    action: "settings.matrix_updated",
    entity: "SystemSetting",
    entityId: "priority_matrix",
    after: matrix,
  });
  revalidatePath("/settings");
  return { ok: true };
}

export async function addHoliday(raw: unknown) {
  await requirePermission("settings.manage");
  const session = await auth();
  const input = holidaySchema.parse(raw);
  const date = new Date(input.date);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  const dup = await db.holiday.findUnique({ where: { date } });
  if (dup) throw new Error("Holiday on this date already exists");
  const h = await db.holiday.create({ data: { name: input.name.trim(), date } });
  await audit({
    actorId: session?.user?.id,
    action: "holiday.added",
    entity: "Holiday",
    entityId: h.id,
    after: { name: h.name },
  });
  revalidatePath("/settings");
  return { id: h.id };
}

export async function deleteHoliday(holidayId: string) {
  await requirePermission("settings.manage");
  const session = await auth();
  await db.holiday.delete({ where: { id: holidayId } });
  await audit({
    actorId: session?.user?.id,
    action: "holiday.deleted",
    entity: "Holiday",
    entityId: holidayId,
  });
  revalidatePath("/settings");
  return { ok: true };
}

"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requirePermission, canViewInternalNotes } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { nextTicketNumber } from "@/lib/ticket-number";
import { resolvePriority } from "@/lib/priority-matrix";
import { isValidTransition, SLA_PAUSE_STATUSES } from "@/lib/workflow";
import { computeDeadlines } from "@/lib/sla-engine";
import {
  ticketCreateSchema,
  commentSchema,
  workLogSchema,
  ticketStatusSchema,
} from "@/lib/validations";
import { revalidatePath } from "next/cache";
import type { TicketStatus } from "@prisma/client";

// ─── Create ticket ──────────────────────────────────────────────────────────
export async function createTicket(raw: unknown) {
  await requirePermission("ticket.create");
  const session = await auth();
  const input = ticketCreateSchema.parse(raw);

  const priority = await resolvePriority(input.impact, input.urgency);
  const ticketNo = await nextTicketNumber(input.type);
  const { policyId, responseDue, resolutionDue } = await computeDeadlines({
    createdAt: new Date(),
    priority,
  });

  const ticket = await db.ticket.create({
    data: {
      ticketNo,
      title: input.title.trim(),
      description: input.description.trim(),
      type: input.type,
      category: input.category,
      subcategory: input.subcategory || null,
      impact: input.impact,
      urgency: input.urgency,
      priority,
      requesterId: session!.user!.id!,
      locationId: input.locationId || null,
      assetId: input.assetId || null,
      slaPolicyId: policyId,
      slaResponseDueAt: responseDue,
      slaResolutionDueAt: resolutionDue,
      timeline: {
        create: {
          actorId: session!.user!.id!,
          event: "CREATED",
          detail: `Ticket created with priority ${priority}`,
        },
      },
    },
  });

  await audit({
    actorId: session?.user?.id,
    action: "ticket.created",
    entity: "Ticket",
    entityId: ticket.id,
    after: { ticketNo, title: ticket.title },
  });

  revalidatePath("/tickets");
  return { id: ticket.id, ticketNo };
}

// ─── Change status (workflow-guarded, SLA pause-aware, timeline-logged) ─────
export async function changeTicketStatus(
  ticketId: string,
  toRaw: unknown,
  note?: string
) {
  await requirePermission("ticket.update");
  const session = await auth();
  const to = ticketStatusSchema.parse(toRaw) as TicketStatus;

  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new Error("Ticket not found");
  if (!isValidTransition(ticket.status, to)) {
    throw new Error(`Invalid transition ${ticket.status} → ${to}`);
  }
  if ((to === "RESOLVED" || to === "CLOSED") && !(await canResolve())) {
    throw new Error("Forbidden: missing ticket.resolve/ticket.close");
  }

  const now = new Date();
  const enteringPause = (SLA_PAUSE_STATUSES as string[]).includes(to);
  const leavingPause = (SLA_PAUSE_STATUSES as string[]).includes(ticket.status) && !enteringPause;

  const data: Record<string, unknown> = { status: to };
  if (!ticket.firstResponseAt && ticket.status === "NEW") data.firstResponseAt = now;
  if (to === "RESOLVED") data.resolvedAt = now;
  if (to === "CLOSED") {
    data.closedAt = now;
    if (!ticket.resolvedAt) data.resolvedAt = now;
  }
  if (to === "IN_PROGRESS" && ticket.status === "CLOSED") {
    data.closedAt = null; // reopen
    data.resolvedAt = null;
  }
  // Pause bookkeeping
  if (enteringPause && !ticket.slaPauseStartedAt) {
    data.slaPauseStartedAt = now;
    data.slaPausedSeconds = ticket.slaPausedSeconds;
  }
  if (leavingPause && ticket.slaPauseStartedAt) {
    const delta = Math.floor((now.getTime() - new Date(ticket.slaPauseStartedAt).getTime()) / 1000);
    data.slaPausedSeconds = ticket.slaPausedSeconds + Math.max(0, delta);
    data.slaPauseStartedAt = null;
  }

  const updated = await db.$transaction(async (tx) => {
    const t = await tx.ticket.update({ where: { id: ticketId }, data: data as never });
    await tx.ticketTimelineEvent.create({
      data: {
        ticketId,
        actorId: session!.user!.id!,
        event: "STATUS_CHANGED",
        fromStatus: ticket.status,
        toStatus: to,
        detail: note ?? `Status changed ${ticket.status} → ${to}`,
      },
    });
    if (enteringPause) {
      await tx.sLAPauseInterval.create({
        data: { ticketId, reason: to },
      });
    }
    if (leavingPause) {
      const open = await tx.sLAPauseInterval.findFirst({
        where: { ticketId, resumedAt: null },
        orderBy: { pausedAt: "desc" },
      });
      if (open) await tx.sLAPauseInterval.update({ where: { id: open.id }, data: { resumedAt: now } });
    }
    return t;
  });

  await audit({
    actorId: session?.user?.id,
    action: "ticket.status_changed",
    entity: "Ticket",
    entityId: ticketId,
    before: { status: ticket.status },
    after: { status: to },
  });

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
  return { status: updated.status };
}

async function canResolve(): Promise<boolean> {
  const { hasPermission } = await import("@/lib/auth-helpers");
  return (await hasPermission("ticket.resolve")) || (await hasPermission("ticket.close"));
}

// ─── Assign ─────────────────────────────────────────────────────────────────
export async function assignTicket(ticketId: string, assigneeId: string | null) {
  await requirePermission("ticket.assign");
  const session = await auth();
  const before = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!before) throw new Error("Ticket not found");

  const data: Record<string, unknown> = { assigneeId };
  // Auto-advance NEW → ASSIGNED on first assignment
  if (assigneeId && (before.status === "NEW" || before.status === "ACKNOWLEDGED")) {
    data.status = "ASSIGNED";
  }

  const ticket = await db.ticket.update({ where: { id: ticketId }, data: data as never });
  await db.ticketTimelineEvent.create({
    data: {
      ticketId,
      actorId: session!.user!.id!,
      event: "ASSIGNED",
      fromStatus: before.status,
      toStatus: ticket.status,
      detail: assigneeId ? `Assigned to ${assigneeId}` : "Unassigned",
    },
  });
  await audit({
    actorId: session?.user?.id,
    action: "ticket.assigned",
    entity: "Ticket",
    entityId: ticketId,
    before: { assigneeId: before.assigneeId },
    after: { assigneeId },
  });
  revalidatePath(`/tickets/${ticketId}`);
  return { ok: true };
}

// ─── Comments (internal filtered server-side on READ, not just write) ───────
export async function addComment(raw: unknown) {
  const input = commentSchema.parse(raw);
  await requirePermission(input.type === "INTERNAL" ? "ticket.update" : "ticket.read");
  const session = await auth();

  const comment = await db.ticketComment.create({
    data: {
      ticketId: input.ticketId,
      authorId: session!.user!.id!,
      type: input.type,
      body: input.body.trim(),
    },
  });
  await db.ticketTimelineEvent.create({
    data: {
      ticketId: input.ticketId,
      actorId: session!.user!.id!,
      event: input.type === "INTERNAL" ? "INTERNAL_NOTE_ADDED" : "COMMENT_ADDED",
    },
  });
  revalidatePath(`/tickets/${input.ticketId}`);
  return { id: comment.id };
}

export async function getTicketComments(ticketId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const internal = await canViewInternalNotes();
  return db.ticketComment.findMany({
    where: {
      ticketId,
      ...(internal ? {} : { type: "PUBLIC" }), // server-side filter
    },
    include: { author: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
}

// ─── Work logs + spare-part usage (atomic stock decrement) ──────────────────
export async function addWorkLog(raw: unknown) {
  await requirePermission("ticket.update");
  const session = await auth();
  const input = workLogSchema.parse(raw);

  // If parts used → single DB transaction: worklog + stock txn + decrement
  if (input.inventoryItemId && input.quantityUsed > 0) {
    const result = await db.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id: input.inventoryItemId } });
      if (!item) throw new Error("Inventory item not found");
      if (item.quantity < input.quantityUsed) {
        throw new Error(`Insufficient stock: ${item.quantity} available`);
      }
      const workLog = await tx.workLog.create({
        data: {
          ticketId: input.ticketId,
          authorId: session!.user!.id!,
          title: input.title || null,
          body: input.body,
          timeSpentMin: input.timeSpentMin,
          inventoryItemId: input.inventoryItemId,
          quantityUsed: input.quantityUsed,
        },
      });
      await tx.stockTransaction.create({
        data: {
          itemId: input.inventoryItemId!,
          type: "REPAIR_USAGE",
          quantity: -input.quantityUsed,
          quantityBefore: item.quantity,
          quantityAfter: item.quantity - input.quantityUsed,
          ticketId: input.ticketId,
          reason: `Used on ticket (worklog ${workLog.id})`,
          actorId: session!.user!.id!,
        },
      });
      await tx.inventoryItem.update({
        where: { id: input.inventoryItemId },
        data: { quantity: { decrement: input.quantityUsed } },
      });
      await tx.ticketTimelineEvent.create({
        data: {
          ticketId: input.ticketId,
          actorId: session!.user!.id!,
          event: "PART_USED",
          detail: `Used ${input.quantityUsed}× ${item.name}`,
        },
      });
      return workLog;
    });
    await audit({
      actorId: session?.user?.id,
      action: "ticket.part_used",
      entity: "Ticket",
      entityId: input.ticketId,
    });
    revalidatePath(`/tickets/${input.ticketId}`);
    return { id: result.id };
  }

  const wl = await db.workLog.create({
    data: {
      ticketId: input.ticketId,
      authorId: session!.user!.id!,
      title: input.title || null,
      body: input.body,
      timeSpentMin: input.timeSpentMin,
    },
  });
  revalidatePath(`/tickets/${input.ticketId}`);
  return { id: wl.id };
}

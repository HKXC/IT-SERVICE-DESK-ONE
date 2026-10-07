"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireCapability, canViewInternalNotes } from "@/lib/auth-helpers";
import { nextTicketNumber } from "@/lib/ticket-number";
import { isValidTransition, isReopen, SLA_PAUSE_STATUSES } from "@/lib/workflow";
import { computeDeadlines } from "@/lib/sla-engine";
import {
  ticketCreateSchema,
  commentSchema,
  ticketStatusSchema,
  ticketPrioritySchema,
} from "@/lib/validations";
import { revalidatePath } from "next/cache";
import type { TicketStatus, TicketPriority } from "@prisma/client";

// Legacy comment timeline rows are ignored: a comment is the history entry.
const COMMENT_EVENT_TYPES = ["COMMENT_ADDED", "INTERNAL_NOTE_ADDED"];

// ─── Create ticket ──────────────────────────────────────────────────────────
export async function createTicket(raw: unknown) {
  await requireCapability("ticket.create");
  const session = await auth();
  const input = ticketCreateSchema.parse(raw);

  const priority = input.priority;
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

  // Linking an asset is a notable asset-history event (light Asset module).
  if (input.assetId) {
    await db.assetHistoryEvent.create({
      data: {
        assetId: input.assetId,
        event: "TICKET_LINKED",
        detail: `Ticket ${ticketNo} linked`,
        actorId: session!.user!.id!,
      },
    });
  }

  revalidatePath("/tickets");
  return { id: ticket.id, ticketNo };
}

// ─── Change status (workflow-guarded, timeline-logged) ──────────────────────
export async function changeTicketStatus(
  ticketId: string,
  toRaw: unknown,
  note?: string
) {
  await requireCapability("ticket.update");
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
  const leavingPause =
    (SLA_PAUSE_STATUSES as string[]).includes(ticket.status) && !enteringPause;
  const reopening = isReopen(ticket.status, to);

  const data: Record<string, unknown> = { status: to };
  if (!ticket.firstResponseAt && ticket.status === "NEW") data.firstResponseAt = now;
  if (to === "RESOLVED") data.resolvedAt = now;
  if (to === "CLOSED") {
    data.closedAt = now;
    if (!ticket.resolvedAt) data.resolvedAt = now;
  }
  if (reopening) {
    data.resolvedAt = null;
    data.closedAt = null;
  }
  if (enteringPause && !ticket.slaPauseStartedAt) {
    data.slaPauseStartedAt = now;
    data.slaPausedSeconds = ticket.slaPausedSeconds;
  }
  if (leavingPause && ticket.slaPauseStartedAt) {
    const delta = Math.floor(
      (now.getTime() - new Date(ticket.slaPauseStartedAt).getTime()) / 1000
    );
    data.slaPausedSeconds = ticket.slaPausedSeconds + Math.max(0, delta);
    data.slaPauseStartedAt = null;
  }

  const event =
    to === "RESOLVED"
      ? "RESOLVED"
      : to === "CLOSED"
        ? "CLOSED"
        : reopening
          ? "REOPENED"
          : "STATUS_CHANGED";

  const updated = await db.$transaction(async (tx) => {
    const t = await tx.ticket.update({ where: { id: ticketId }, data: data as never });
    await tx.ticketTimelineEvent.create({
      data: {
        ticketId,
        actorId: session!.user!.id!,
        event,
        fromStatus: ticket.status,
        toStatus: to,
        detail: note ?? `Status changed ${ticket.status} → ${to}`,
      },
    });
    if (enteringPause) {
      await tx.sLAPauseInterval.create({ data: { ticketId, reason: to } });
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

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
  return { status: updated.status };
}

async function canResolve(): Promise<boolean> {
  const { hasCapability } = await import("@/lib/auth-helpers");
  return (await hasCapability("ticket.resolve")) || (await hasCapability("ticket.close"));
}

// ─── Set priority (direct) ──────────────────────────────────────────────────
export async function changePriority(ticketId: string, priorityRaw: unknown) {
  await requireCapability("ticket.update");
  const session = await auth();
  const priority = ticketPrioritySchema.parse(priorityRaw) as TicketPriority;

  const before = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!before) throw new Error("Ticket not found");
  if (before.priority === priority) return { priority: before.priority };

  const updated = await db.$transaction(async (tx) => {
    const t = await tx.ticket.update({ where: { id: ticketId }, data: { priority } });
    await tx.ticketTimelineEvent.create({
      data: {
        ticketId,
        actorId: session!.user!.id!,
        event: "PRIORITY_CHANGED",
        detail: `Priority ${before.priority} → ${priority}`,
      },
    });
    return t;
  });

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
  return { priority: updated.priority };
}

// ─── Assign ─────────────────────────────────────────────────────────────────
export async function assignTicket(ticketId: string, assigneeId: string | null) {
  await requireCapability("ticket.assign");
  const session = await auth();
  const before = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!before) throw new Error("Ticket not found");

  const data: Record<string, unknown> = { assigneeId };
  if (assigneeId && before.status === "NEW") {
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
  revalidatePath(`/tickets/${ticketId}`);
  return { ok: true };
}

// ─── Comments (internal filtered server-side on READ, not just write) ───────
export async function addComment(raw: unknown) {
  const input = commentSchema.parse(raw);
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (input.type === "INTERNAL") {
    await requireCapability("ticket.update");
  }

  const comment = await db.ticketComment.create({
    data: {
      ticketId: input.ticketId,
      authorId: session.user.id,
      type: input.type,
      body: input.body.trim(),
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
    where: { ticketId, ...(internal ? {} : { type: "PUBLIC" }) },
    include: { author: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
}

// ─── Timeline (comments + events) ───────────────────────────────────────────
export async function getTicketTimeline(ticketId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const internal = await canViewInternalNotes();
  const [comments, events] = await Promise.all([
    db.ticketComment.findMany({
      where: { ticketId, ...(internal ? {} : { type: "PUBLIC" }) },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.ticketTimelineEvent.findMany({
      where: { ticketId, event: { notIn: COMMENT_EVENT_TYPES } },
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  return { comments, events };
}

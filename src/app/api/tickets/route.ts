import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { ticketCreateSchema } from "@/lib/validations";
import { nextTicketNumber } from "@/lib/ticket-number";
import { resolvePriority } from "@/lib/priority-matrix";
import { computeDeadlines } from "@/lib/sla-engine";

// REST integration endpoint (email-to-ticket, external systems, AI agents).
// Auth: session with ticket.create. For machine tokens, front with gateway.
export async function GET(req: Request) {
  try {
    await requirePermission("ticket.read");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const take = Math.min(100, Number(searchParams.get("take") ?? 20) || 20);
  const tickets = await db.ticket.findMany({ orderBy: { createdAt: "desc" }, take });
  return NextResponse.json({ data: tickets });
}

export async function POST(req: Request) {
  try {
    await requirePermission("ticket.create");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = ticketCreateSchema.safeParse({ ...body, source: undefined });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  // Resolve requester: API caller's own id (no impersonation without ticket.assign)
  const { auth } = await import("@/auth");
  const session = await auth();
  const priority = await resolvePriority(parsed.data.impact, parsed.data.urgency);
  const ticketNo = await nextTicketNumber(parsed.data.type);
  const { policyId, responseDue, resolutionDue } = await computeDeadlines({
    createdAt: new Date(),
    priority,
  });
  const ticket = await db.ticket.create({
    data: {
      ticketNo,
      title: parsed.data.title,
      description: parsed.data.description,
      type: parsed.data.type,
      category: parsed.data.category,
      subcategory: parsed.data.subcategory || null,
      impact: parsed.data.impact,
      urgency: parsed.data.urgency,
      priority,
      source: (body.source as never) ?? "API",
      requesterId: session!.user!.id!,
      slaPolicyId: policyId,
      slaResponseDueAt: responseDue,
      slaResolutionDueAt: resolutionDue,
    },
  });
  return NextResponse.json({ data: ticket }, { status: 201 });
}

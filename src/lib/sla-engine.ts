import { db } from "@/lib/db";
import type { Ticket, TicketPriority, TicketStatus } from "@prisma/client";
import { SLA_PAUSE_STATUSES } from "@/lib/workflow";

export type SlaState = "HEALTHY" | "AT_RISK" | "BREACHED" | "MET" | "PAUSED";

/**
 * SLA engine (§7):
 * - targets per priority from SLAPolicy (configurable, never hardcoded)
 * - business-hours aware deadline computation (working days + holidays)
 * - pause/resume tracked as accumulated seconds + SLAPauseInterval rows
 * - state is always COMPUTED, never stored as a static flag
 */

export function targetsFor(
  policy: {
    p1ResponseMin: number;
    p1ResolutionMin: number;
    p2ResponseMin: number;
    p2ResolutionMin: number;
    p3ResponseMin: number;
    p3ResolutionMin: number;
    p4ResponseMin: number;
    p4ResolutionMin: number;
  },
  priority: TicketPriority
): { responseMin: number; resolutionMin: number } {
  switch (priority) {
    case "CRITICAL":
      return { responseMin: policy.p1ResponseMin, resolutionMin: policy.p1ResolutionMin };
    case "HIGH":
      return { responseMin: policy.p2ResponseMin, resolutionMin: policy.p2ResolutionMin };
    case "LOW":
      return { responseMin: policy.p4ResponseMin, resolutionMin: policy.p4ResolutionMin };
    default:
      return { responseMin: policy.p3ResponseMin, resolutionMin: policy.p3ResolutionMin };
  }
}

/** Add business minutes to a date, skipping non-working days + holidays. */
export async function addBusinessMinutes(
  from: Date,
  minutes: number,
  workingDays = [1, 2, 3, 4, 5],
  startHour = 9,
  endHour = 18
): Promise<Date> {
  const holidays = new Set(
    (
      await db.holiday.findMany({
        where: { date: { gte: new Date(from.getTime() - 86400000 * 2) } },
        take: 500,
      })
    ).map((h) => h.date.toISOString().slice(0, 10))
  );

  let cursor = new Date(from);
  let remaining = minutes;
  // Guard against infinite loops
  let guard = 0;
  while (remaining > 0 && guard++ < 60 * 24 * 30) {
    const day = cursor.getDay();
    const iso = cursor.toISOString().slice(0, 10);
    const inWorkDay = workingDays.includes(day) && !holidays.has(iso);
    const hour = cursor.getHours() + cursor.getMinutes() / 60;
    if (inWorkDay && hour >= startHour && hour < endHour) {
      remaining -= 1;
    }
    cursor = new Date(cursor.getTime() + 60_000);
  }
  return cursor;
}

export async function computeDeadlines(input: {
  createdAt: Date;
  priority: TicketPriority;
  policyId?: string | null;
}) {
  const policy =
    (input.policyId
      ? await db.sLAPolicy.findUnique({
          where: { id: input.policyId },
          include: { businessHours: true },
        })
      : await db.sLAPolicy.findFirst({
          where: { isDefault: true, isActive: true },
          include: { businessHours: true },
        })) ??
    (await db.sLAPolicy.findFirst({
      where: { isActive: true },
      include: { businessHours: true },
    }));

  // Fallback defaults (P1 15m/4h, P2 30m/8h, P3 4h/24h, P4 8h/72h) when no policy exists yet
  const fallback = {
    p1ResponseMin: 15,
    p1ResolutionMin: 240,
    p2ResponseMin: 30,
    p2ResolutionMin: 480,
    p3ResponseMin: 240,
    p3ResolutionMin: 1440,
    p4ResponseMin: 480,
    p4ResolutionMin: 4320,
  };
  const t = policy ? targetsFor(policy, input.priority) : targetsFor(fallback, input.priority);
  const bh = policy?.businessHours;
  const workingDays = bh
    ? ((bh.workingDays as unknown as number[]) ?? [1, 2, 3, 4, 5])
    : [1, 2, 3, 4, 5];
  const [sh] = (bh?.startTime ?? "09:00").split(":").map(Number);
  const [eh] = (bh?.endTime ?? "18:00").split(":").map(Number);

  const responseDue = await addBusinessMinutes(input.createdAt, t.responseMin, workingDays, sh, eh);
  const resolutionDue = await addBusinessMinutes(
    input.createdAt,
    t.resolutionMin,
    workingDays,
    sh,
    eh
  );
  return { policyId: policy?.id ?? null, responseDue, resolutionDue };
}

export function slaStateFor(
  ticket: Pick<
    Ticket,
    | "status"
    | "slaResponseDueAt"
    | "slaResolutionDueAt"
    | "firstResponseAt"
    | "resolvedAt"
    | "createdAt"
  >,
  now = new Date(),
  atRiskPercent = 75
): { response: SlaState; resolution: SlaState } {
  const paused = (SLA_PAUSE_STATUSES as string[]).includes(ticket.status);
  const respDue = ticket.slaResponseDueAt ? new Date(ticket.slaResponseDueAt) : null;
  const resDue = ticket.slaResolutionDueAt ? new Date(ticket.slaResolutionDueAt) : null;
  const createdAt = new Date(ticket.createdAt).getTime();

  const evalOne = (
    due: Date | null,
    doneAt: Date | null,
    target: "response" | "resolution"
  ): SlaState => {
    if (!due) return "HEALTHY";
    if (doneAt) return doneAt <= due ? "MET" : "BREACHED";
    if (paused && target === "resolution") return "PAUSED";
    if (now > due) return "BREACHED";
    const total = due.getTime() - createdAt;
    if (!Number.isFinite(total) || total <= 0) return "HEALTHY";
    const remaining = due.getTime() - now.getTime();
    const consumedPct = (1 - remaining / total) * 100;
    return consumedPct >= atRiskPercent ? "AT_RISK" : "HEALTHY";
  };

  return {
    response: evalOne(respDue, ticket.firstResponseAt ? new Date(ticket.firstResponseAt) : null, "response"),
    resolution: evalOne(resDue, ticket.resolvedAt ? new Date(ticket.resolvedAt) : null, "resolution"),
  };
}

/** Effective elapsed seconds excluding accumulated pause time. */
export function effectiveElapsedSec(createdAt: Date, now: Date, pausedSeconds: number) {
  return Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 1000) - pausedSeconds);
}

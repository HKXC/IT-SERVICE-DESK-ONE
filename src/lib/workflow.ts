import type { TicketStatus } from "@prisma/client";

// Locked ticket workflow. Every transition emits a TimelineEvent
// (enforced in actions/tickets.ts). Reopen is RESOLVED → IN_PROGRESS only.
export const TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["ASSIGNED"],
  ASSIGNED: ["IN_PROGRESS"],
  IN_PROGRESS: ["WAITING_USER", "RESOLVED"],
  WAITING_USER: ["IN_PROGRESS", "RESOLVED"],
  RESOLVED: ["IN_PROGRESS", "CLOSED"],
  CLOSED: [],
};

// Reopen is allowed only from RESOLVED (mission scope).
export const REOPEN_FROM: TicketStatus[] = ["RESOLVED"];

export const SLA_PAUSE_STATUSES: TicketStatus[] = ["WAITING_USER"];

export function isValidTransition(from: TicketStatus, to: TicketStatus) {
  return (TICKET_TRANSITIONS[from] ?? []).includes(to);
}

export function isReopen(from: TicketStatus, to: TicketStatus) {
  return from === "RESOLVED" && to === "IN_PROGRESS";
}

export const STATUS_META: Record<TicketStatus, { label: string; tone: string }> = {
  NEW: { label: "New", tone: "bg-blue-100 text-blue-800" },
  ASSIGNED: { label: "Assigned", tone: "bg-violet-100 text-violet-800" },
  IN_PROGRESS: { label: "In Progress", tone: "bg-amber-100 text-amber-900" },
  WAITING_USER: { label: "Waiting for User", tone: "bg-orange-100 text-orange-800" },
  RESOLVED: { label: "Resolved", tone: "bg-emerald-100 text-emerald-800" },
  CLOSED: { label: "Closed", tone: "bg-slate-100 text-slate-600" },
};

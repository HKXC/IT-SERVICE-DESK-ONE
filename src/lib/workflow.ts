import type { TicketStatus } from "@prisma/client";

// Canonical workflow (§6/§8). Every transition must emit a TimelineEvent
// (enforced in actions/tickets.ts). Reopen returns to IN_PROGRESS.
export const TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["ACKNOWLEDGED", "ASSIGNED"],
  ACKNOWLEDGED: ["ASSIGNED", "IN_PROGRESS"],
  ASSIGNED: ["IN_PROGRESS", "ESCALATED", "ON_HOLD"],
  IN_PROGRESS: [
    "WAITING_USER",
    "WAITING_VENDOR",
    "WAITING_PART",
    "ON_HOLD",
    "ESCALATED",
    "RESOLVED",
  ],
  WAITING_USER: ["IN_PROGRESS", "ON_HOLD", "RESOLVED"],
  WAITING_VENDOR: ["IN_PROGRESS", "ON_HOLD", "RESOLVED"],
  WAITING_PART: ["IN_PROGRESS", "ON_HOLD", "RESOLVED"],
  ON_HOLD: ["IN_PROGRESS", "ESCALATED"],
  ESCALATED: ["IN_PROGRESS", "ASSIGNED", "RESOLVED"],
  RESOLVED: ["PENDING_CONFIRMATION", "IN_PROGRESS", "CLOSED"],
  PENDING_CONFIRMATION: ["CLOSED", "IN_PROGRESS"],
  CLOSED: ["IN_PROGRESS"], // reopen
};

export const SLA_PAUSE_STATUSES: TicketStatus[] = [
  "WAITING_USER",
  "WAITING_VENDOR",
  "WAITING_PART",
];

export function isValidTransition(from: TicketStatus, to: TicketStatus) {
  return (TICKET_TRANSITIONS[from] ?? []).includes(to);
}

export const STATUS_META: Record<TicketStatus, { label: string; tone: string }> = {
  NEW: { label: "New", tone: "bg-blue-100 text-blue-800" },
  ACKNOWLEDGED: { label: "Acknowledged", tone: "bg-indigo-100 text-indigo-800" },
  ASSIGNED: { label: "Assigned", tone: "bg-violet-100 text-violet-800" },
  IN_PROGRESS: { label: "In Progress", tone: "bg-amber-100 text-amber-900" },
  WAITING_USER: { label: "Waiting for User", tone: "bg-orange-100 text-orange-800" },
  WAITING_VENDOR: { label: "Waiting for Vendor", tone: "bg-orange-100 text-orange-800" },
  WAITING_PART: { label: "Waiting for Part", tone: "bg-orange-100 text-orange-800" },
  ON_HOLD: { label: "On Hold", tone: "bg-slate-200 text-slate-700" },
  ESCALATED: { label: "Escalated", tone: "bg-red-100 text-red-800" },
  RESOLVED: { label: "Resolved", tone: "bg-emerald-100 text-emerald-800" },
  PENDING_CONFIRMATION: { label: "Pending Confirmation", tone: "bg-teal-100 text-teal-800" },
  CLOSED: { label: "Closed", tone: "bg-slate-100 text-slate-600" },
};

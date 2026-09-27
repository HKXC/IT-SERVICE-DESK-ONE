import { db } from "@/lib/db";
import type { TicketType } from "@prisma/client";

const PREFIX: Record<TicketType, string> = {
  INCIDENT: "INC",
  SERVICE_REQUEST: "REQ",
  PROBLEM: "PRB",
  CHANGE_REQUEST: "CHG",
  ACCESS_REQUEST: "ACC",
  REPAIR: "REP",
};

/**
 * Atomically generate the next ticket number: PREFIX-YEAR-000001.
 * Uses an upsert + increment inside a transaction — never COUNT(*).
 */
export async function nextTicketNumber(type: TicketType): Promise<string> {
  const prefix = PREFIX[type];
  const year = new Date().getFullYear();

  const seq = await db.$transaction(async (tx) => {
    const existing = await tx.ticketSequence.findUnique({
      where: { prefix_year: { prefix, year } },
    });
    if (!existing) {
      return tx.ticketSequence.create({ data: { prefix, year, last: 1 } });
    }
    return tx.ticketSequence.update({
      where: { prefix_year: { prefix, year } },
      data: { last: { increment: 1 } },
    });
  });

  return `${prefix}-${year}-${String(seq.last).padStart(6, "0")}`;
}

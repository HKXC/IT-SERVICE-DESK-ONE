import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Vercel Cron: /api/cron/sla-check every 5 min (see vercel.json).
// Flags breached tickets so dashboards stay fast; state itself is computed.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const now = new Date();
  const [resp, res] = await Promise.all([
    db.ticket.updateMany({
      where: {
        firstResponseAt: null,
        slaResponseBreached: false,
        slaResponseDueAt: { lt: now },
        status: { notIn: ["CLOSED", "RESOLVED"] },
      },
      data: { slaResponseBreached: true },
    }),
    db.ticket.updateMany({
      where: {
        resolvedAt: null,
        slaResolutionBreached: false,
        slaResolutionDueAt: { lt: now },
        status: { notIn: ["CLOSED", "RESOLVED", "WAITING_USER", "WAITING_VENDOR", "WAITING_PART"] },
      },
      data: { slaResolutionBreached: true },
    }),
  ]);
  return NextResponse.json({ ok: true, responseBreached: resp.count, resolutionBreached: res.count, at: now.toISOString() });
}

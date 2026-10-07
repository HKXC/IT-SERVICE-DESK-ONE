import { db } from "@/lib/db";
import { auth } from "@/auth";
import { hasCapability } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await hasCapability("report.read"))) redirect("/");
  const [byStatus, byPriority, byType, resolved, breached, mttr] = await Promise.all([
    db.ticket.groupBy({ by: ["status"], _count: true }),
    db.ticket.groupBy({ by: ["priority"], _count: true }),
    db.ticket.groupBy({ by: ["type"], _count: true }),
    db.ticket.count({ where: { status: { in: ["RESOLVED", "CLOSED"] } } }),
    db.ticket.count({ where: { OR: [{ slaResponseBreached: true }, { slaResolutionBreached: true }] } }),
    db.ticket.aggregate({ _avg: { slaPausedSeconds: true } }),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Reports & Analytics</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{resolved}</p><p className="text-xs text-muted-foreground">Resolved / Closed</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{breached}</p><p className="text-xs text-muted-foreground">SLA Breached (flagged)</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{Math.round(mttr._avg.slaPausedSeconds ?? 0)}s</p><p className="text-xs text-muted-foreground">Avg paused time / ticket</p></CardContent></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm">By Status</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {byStatus.map((r) => <p key={r.status} className="font-mono text-xs">{r.status} · {r._count}</p>)}
          </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">By Priority</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {byPriority.map((r) => <p key={r.priority} className="font-mono text-xs">{r.priority} · {r._count}</p>)}
          </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">By Type</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {byType.map((r) => <p key={r.type} className="font-mono text-xs">{r.type} · {r._count}</p>)}
          </CardContent></Card>
      </div>
    </div>
  );
}
